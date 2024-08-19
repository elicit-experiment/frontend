import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import demo from './LandMarkExample';
import PortalClient from 'PortalClient';
import { postTimeSeriesAsJson } from 'Utility/TimeSeries';
import template from 'Components/Questions/FaceLandmark/FaceLandmark.html';
import { FaceLandmarkerOptions, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

class DatapointAccumulator {
  public dataPoints: any[] = [];
  public debouncer: number | null = null;
  public sessionGuid: string;

  constructor() {
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }

  accumulateAndDebounce(dataPoint) {
    this.dataPoints.push({ timeStamp: new Date().getTime(), ...dataPoint });

    if (this.debouncer == null) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 2000);
    }
  }

  debouncerCallback() {
    // duplicate this.dataPoints
    const sendDataPoints = this.dataPoints;
    this.dataPoints = [];
    this.debouncer = null;

    postTimeSeriesAsJson(
      {
        sessionGUID: this.sessionGuid,
        seriesType: 'face_landmark',
        data: sendDataPoints,
      },
      'face_landmark',
    )
      .then(() => 1)
      .catch((err) => console.error(err));
    // ExperimentManager.SendSlideDataPoint('face_landmark', { seriesType: 'face_landmark', data: dataPoint}, (err) => {
    //   if (!err) {
    //     console.error('datapoint error');
    //   }
  }
}

type FaceLandmarkComponentConfig = {
  NumberOfFaces?: number;
  CalibrationDuration?: number;
  Landmarks?: boolean;
  Blendshapes?: boolean;
  FaceTransformation?: boolean;
  StripZCoordinates?: boolean;
  IncludeBlandshapes?: string; // TODO: Deprecate Blandshapes
  IncludeBlendshapes?: string;
};

class FaceLandmark extends QuestionBase<{ CalibrationAccuracy: number }> {
  public config: FaceLandmarkComponentConfig;

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'FaceLandmark', 'Instrument', method, data);
  }

  constructor(question: QuestionModel) {
    super(question, true);

    this.config = question.Input as FaceLandmarkComponentConfig;

    const datapointAccumulator = new DatapointAccumulator();

    import('@mediapipe/tasks-vision').then((visionImport) => {
      const { FaceLandmarker, FilesetResolver, DrawingUtils } = visionImport;

      const options: FaceLandmarkerOptions = {
        numFaces: this.config.NumberOfFaces || 1,
        outputFacialTransformationMatrixes: this.config.FaceTransformation || false,
        outputFaceBlendshapes: this.config.Blendshapes || true,
      };

      demo(FaceLandmarker, FilesetResolver, DrawingUtils, options, (dataPoint: FaceLandmarkerResult) => {
        if (!this.config.FaceTransformation && dataPoint.hasOwnProperty('facialTransformationMatrixes')) {
          delete dataPoint.facialTransformationMatrixes;
        }
        if (!this.config.Blendshapes && dataPoint.hasOwnProperty('faceBlendshapes')) {
          delete dataPoint.faceBlendshapes;
        }
        if (!this.config.Landmarks && dataPoint.hasOwnProperty('faceLandmarks')) {
          delete dataPoint.faceBlendshapes;
        }
        if (this.config.StripZCoordinates) {
          dataPoint.faceLandmarks.forEach((face) => face.forEach((landmarks) => delete landmarks.z));
        }
        if (this.config.IncludeBlandshapes || this.config.IncludeBlendshapes) {
          const blendShapeToIndex = dataPoint.faceBlendshapes.map((faceBlendShape) =>
            Object.fromEntries(faceBlendShape.categories.map((blendShape, index) => [blendShape.categoryName, index])),
          );

          let indexRemapIndex = 0;
          let faceLandmarks = [];
          // TODO: Deprecate Blandshapes
          const includeBlendshapes = (this.config.IncludeBlendshapes || this.config.IncludeBlandshapes).split(',');
          dataPoint.faceBlendshapes = dataPoint.faceBlendshapes.map((faceBlendshape, faceIndex) => {
            const blendShapeIndices = includeBlendshapes.map((blendShape) => blendShapeToIndex[faceIndex][blendShape]);
            const categories = blendShapeIndices.map((index) => faceBlendshape.categories[index]);

            Object.fromEntries(
              categories.map((blendShape) => {
                const oldIndex = blendShape.index;
                faceLandmarks = faceLandmarks.concat(dataPoint.faceLandmarks[faceIndex][oldIndex]);
                blendShape.index = indexRemapIndex;
                return [oldIndex, indexRemapIndex++];
              }),
            );
            return {
              ...faceBlendshape,
              categories,
            };
          });
          dataPoint.faceLandmarks = faceLandmarks;
        }
        datapointAccumulator.accumulateAndDebounce(dataPoint);
      });
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    return true;
  }
}

knockout.components.register('Questions/FaceLandmark', {
  viewModel: FaceLandmark,
  template,
});

export default FaceLandmark;
