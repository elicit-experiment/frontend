import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import { FaceLandmarkCalibrationPage } from '../FaceLandmarkCalibration/FaceLandmarkCalibrationPage';
import template from './FaceLandmarkDemo.html';
import { FaceLandmarker, FaceLandmarkerResult, Classifications } from '@mediapipe/tasks-vision';
import {
  FaceLandmarkComponentConfig,
  NormalizeConfig,
  ValidateConfig,
} from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { FaceLandmarkerState, getFaceLandmarkerManager } from 'Managers/FaceLandmarkerManager';

// TODO: generalize this so that all Inputs have the correct type.
export interface CalibrationInput {
  Instruments: InstrumentElement[];
}
export interface InstrumentElement {
  Instrument: InstrumentInstrument;
}

export interface InstrumentInstrument {
  FaceLandmarkCalibration?: FaceLandmarkCalibrationInstrument;
  Monitor?: MonitorInstrument;
}

export interface FaceLandmarkCalibrationInstrument {
  NumberOfFaces: number;
  Landmarks: boolean;
  Blendshapes: boolean;
  FaceTransformation: boolean;
  CalibrationDuration: number;
  StripZCoordinates: boolean;
  IncludeBlendshapes: string;
  IncludeLandmarks: string;
  MaximumSendRateHz: number;
}

export interface MonitorInstrument {
  MouseTracking?: boolean;
  KeyboardTracking?: boolean;
}

interface Demo {}

class FaceLandmarkDemo extends QuestionBase<Demo> {
  public CanAnswer: ko.Observable<boolean> = knockout.observable<boolean>(false);
  public Answer: ko.Observable<Demo> = knockout.observable<Demo>(null);

  public EnableDisableLabel: ko.Observable<string> = knockout.observable<string>('Enable Webcam');

  public page: FaceLandmarkCalibrationPage;

  DrawingUtilsClass: any;

  public VideoHeight: ko.Observable<number> = knockout.observable<number>(200);

  public BlendShapes: ko.Observable<Classifications[]> = knockout.observable<Classifications[]>([]);

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'FaceLandmarkDemo', 'FaceLandmarkDemo', method, data);
  }
  public Id: string;

  constructor(question: QuestionModel) {
    super(question, true);
    this.Id = this.Model.Id;

    let config: FaceLandmarkComponentConfig;
    if ('TrialType' in question.Input) {
      config = NormalizeConfig(question.Input as FaceLandmarkComponentConfig);
    } else {
      const input: CalibrationInput = question.Input as unknown as CalibrationInput;
      const instrumentConfiguration = input.Instruments.find(
        (instrument) => instrument.Instrument.FaceLandmarkCalibration,
      );
      config = NormalizeConfig(
        instrumentConfiguration.Instrument.FaceLandmarkCalibration as FaceLandmarkComponentConfig,
      );
    }

    ValidateConfig(config);

    getFaceLandmarkerManager()
      .Init(config)
      .then((visionImport) => {
        this.DrawingUtilsClass = visionImport.DrawingUtils;

        this.hideSlideShellNavigationElements();

        this.page = new FaceLandmarkCalibrationPage('webcam', 'demo-overlay-canvas', 'video');

        if (this.page.hasGetUserMedia()) {
          this.page.startPrediction(this.DrawingUtilsClass, this.ReceiveDatapoint.bind(this));

          this.EnableDisableLabel('Enable Webcam');

          getFaceLandmarkerManager().SetState(FaceLandmarkerState.Calibrating);
        } else {
          this.EnableDisableLabel('Webcam Unsupported');
        }
      });

    // No Media to play, but we can't progress without calling this, which will set AllMediaHavePlayed to true.
    this.WhenAllMediaHavePlayed([], true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected HasValidAnswer(_answer: unknown): boolean {
    return true;
  }

  protected EnableDisableClick(event) {
    if (!this.page?.videoConfigured) {
      this.page.enableCam(event);
    } else {
      if (getFaceLandmarkerManager().webcamIsRunning()) {
        this.EnableDisableLabel('Start Prediction');
        getFaceLandmarkerManager().stopWebcam();
      } else {
        getFaceLandmarkerManager().startWebcam();
        this.EnableDisableLabel('Stop Prediction');
        this.page.ensurePredictionLoop();
      }
    }
  }

  protected RenderFaceMeshOverlay(faceLandmarkerResult: FaceLandmarkerResult) {
    if (faceLandmarkerResult.faceLandmarks?.length == 0) {
      return;
    }

    const canvas = document.getElementById('demo-overlay-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new this.DrawingUtilsClass(ctx);
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: '#C0C0C070',
        lineWidth: 1,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#FF3030' });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: '#FF3030' });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#30FF30' });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: '#30FF30' });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#E0E0E0' });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
        color: '#E0E0E0',
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: '#FF3030' });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: '#30FF30' });
    }
  }

  protected ReceiveDatapoint(
    dataPoint: FaceLandmarkerResult,
    timestamp: DOMHighResTimeStamp,
    analyzeDuration: DOMHighResTimeStamp,
    frameJitter: DOMHighResTimeStamp,
  ) {
    this.RenderFaceMeshOverlay(dataPoint);
    this.BlendShapes(dataPoint.faceBlendshapes);
    getFaceLandmarkerManager().queueForSend(dataPoint, timestamp, analyzeDuration, frameJitter);
  }

  // sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
  private sleep(time: number) {
    return new Promise<never>((resolve) => setTimeout(resolve, time));
  }

  private ClearCanvas() {
    $('.Calibration').hide();

    const canvas = <HTMLCanvasElement>document.getElementById('plotting-canvas');
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  //
  // Suppress Slide Navigation
  //
  private hideSlideShellNavigationElements() {
    $('.panel-heading').hide();
    $('.panel-footer').hide();
    $('.shell-footer').hide();
    $('.panel-body').css('height', 'calc(100vh - 100px)');
  }

  private showSlideShellNavigationElements() {
    $('.panel-heading').show();
    $('.panel-footer').show();
    $('.shell-footer').show();
    $('.panel-body').css('height', 'auto');
  }

  BlendshapesHtml() {
    if (!this.BlendShapes()?.length) {
      return;
    }

    let htmlMaker = '';
    this.BlendShapes()[0].categories.map((shape) => {
      htmlMaker += `
      <li class="blend-shapes-item">
        <span class="blend-shapes-label">${shape.displayName || shape.categoryName}</span>
        <span class="blend-shapes-value" style="width: calc(${+shape.score * 100}% - 120px)">${(+shape.score).toFixed(
        4,
      )}</span>
      </li>
    `;
    });

    return htmlMaker;
  }
}

knockout.components.register('Questions/FaceLandmarkDemo', {
  viewModel: FaceLandmarkDemo,
  template,
});

export default FaceLandmarkDemo;
