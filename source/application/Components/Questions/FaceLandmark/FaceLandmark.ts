import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import demo from './LandMarkExample';
import PortalClient from 'PortalClient';
import { postTimeSeriesAsJson } from 'Utility/TimeSeries';
import template from 'Components/Questions/FaceLandmark/FaceLandmark.html';
import { FaceLandmarkerOptions, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  FaceLandmarkComponentConfig,
  ValidateConfig,
  NormalizeConfig,
  transformDatapoint,
  NormalizedLandmarkComponentConfig,
} from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { compressDatapoint } from 'Components/Questions/FaceLandmark/CompressedFaceLandmarkerResult';
import { AccumulatableRecord } from 'Components/Questions/FaceLandmark/DatapointAccumulator';

class DatapointAccumulator {
  public dataPoints: any[] = [];
  public debouncer: ReturnType<typeof setTimeout> | null = null;
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

class FaceLandmark extends QuestionBase<{ CalibrationAccuracy: number }> {
  public config: NormalizedLandmarkComponentConfig;

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'FaceLandmark', 'Instrument', method, data);
  }

  constructor(question: QuestionModel) {
    super(question, true);

    this.config = NormalizeConfig(question.Input as FaceLandmarkComponentConfig);
    ValidateConfig(this.config);
    console.dir(this.config);

    const datapointAccumulator = new DatapointAccumulator();

    throw new Error('FaceLandmark not implemented');

    import('@mediapipe/tasks-vision').then((visionImport) => {
      const { FaceLandmarker, FilesetResolver, DrawingUtils } = visionImport;

      const options: FaceLandmarkerOptions = {
        numFaces: this.config.NumberOfFaces || 1,
        outputFacialTransformationMatrixes: this.config.FaceTransformation || false,
        outputFaceBlendshapes: this.config.Blendshapes || true,
      };

      demo(
        FaceLandmarker,
        FilesetResolver,
        DrawingUtils,
        options,
        (dataPoint: FaceLandmarkerResult, timestamp: DOMHighResTimeStamp) => {
          // const transformedDataPoint = transformDatapoint(this.config, dataPoint);
          // datapointAccumulator.accumulateAndDebounce(transformedDataPoint);

          const compressedDataPoint = compressDatapoint(this.config, dataPoint, timestamp) as AccumulatableRecord;
          datapointAccumulator.accumulateAndDebounce(compressedDataPoint as Record<string, unknown>);
        },
      );
    });
  }

  protected HasValidAnswer(_answer: any): boolean {
    return true;
  }
}

knockout.components.register('Questions/FaceLandmark', {
  viewModel: FaceLandmark,
  template,
});

export default FaceLandmark;
