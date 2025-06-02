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

const LANDMARK_CONFIG = new Map([
  ['FACE_LANDMARKS_TESSELATION', { color: '#C0C0C070', lineWidth: 1 }],
  ['FACE_LANDMARKS_RIGHT_EYE', { color: '#FF3030' }],
  ['FACE_LANDMARKS_RIGHT_EYEBROW', { color: '#FF3030' }],
  ['FACE_LANDMARKS_LEFT_EYE', { color: '#30FF30' }],
  ['FACE_LANDMARKS_LEFT_EYEBROW', { color: '#30FF30' }],
  ['FACE_LANDMARKS_FACE_OVAL', { color: '#E0E0E0' }],
  ['FACE_LANDMARKS_LIPS', { color: '#E0E0E0' }],
  ['FACE_LANDMARKS_RIGHT_IRIS', { color: '#FF3030' }],
  ['FACE_LANDMARKS_LEFT_IRIS', { color: '#30FF30' }],
]);

console.dir(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);

class FaceLandmarkDemo extends QuestionBase<Demo> {
  public CanAnswer: ko.Observable<boolean> = knockout.observable<boolean>(false);
  public Answer: ko.Observable<Demo> = knockout.observable<Demo>(null);

  public EnableDisableLabel: ko.Observable<string> = knockout.observable<string>('Enable Webcam');

  public page: FaceLandmarkCalibrationPage;

  DrawingUtilsClass: any;

  public VideoHeight: ko.Observable<number> = knockout.observable<number>(200);

  public BlendShapes: ko.Observable<Classifications[]> = knockout.observable<Classifications[]>([]);

  public overlayCanvas: HTMLCanvasElement;
  public overlayCanvasContext: CanvasRenderingContext2D;
  public drawingUtils: any;

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

        this.overlayCanvas = document.getElementById('demo-overlay-canvas') as HTMLCanvasElement;
        this.overlayCanvasContext = this.overlayCanvas.getContext('2d');
        this.drawingUtils = new this.DrawingUtilsClass(this.overlayCanvasContext);

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
      this.EnableDisableLabel('Stop Prediction');
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

  private prevBoundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  protected RenderFaceMeshOverlay(faceLandmarkerResult: FaceLandmarkerResult) {
    if (faceLandmarkerResult.faceLandmarks?.length == 0) {
      if (this.prevBoundingBox) {
        // Clear the previous bounding box area if we had one
        this.overlayCanvasContext.clearRect(
          this.prevBoundingBox.minX - 5,
          this.prevBoundingBox.minY - 5,
          this.prevBoundingBox.maxX - this.prevBoundingBox.minX + 10,
          this.prevBoundingBox.maxY - this.prevBoundingBox.minY + 10,
        );
        this.prevBoundingBox = null;
      }
      return;
    }

    // Calculate current bounding box
    let minX = this.overlayCanvas.width;
    let minY = this.overlayCanvas.height;
    let maxX = 0;
    let maxY = 0;

    // Pre-scan to find bounding box
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
      for (const landmark of landmarks) {
        const x = landmark.x * this.overlayCanvas.width;
        const y = landmark.y * this.overlayCanvas.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    // Add padding to the bounding box
    const padding = 20; // Pixels of padding around landmarks
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(this.overlayCanvas.width, maxX + padding);
    maxY = Math.min(this.overlayCanvas.height, maxY + padding);

    // Clear previous bounding box if it exists
    if (this.prevBoundingBox) {
      this.overlayCanvasContext.clearRect(
        this.prevBoundingBox.minX,
        this.prevBoundingBox.minY,
        this.prevBoundingBox.maxX - this.prevBoundingBox.minX,
        this.prevBoundingBox.maxY - this.prevBoundingBox.minY,
      );
    } else {
      // No previous bounding box, clear the entire canvas once
      this.overlayCanvasContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    // Draw all landmarks
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
      LANDMARK_CONFIG.forEach((config, landmarkType) => {
        this.drawingUtils.drawConnectors(landmarks, FaceLandmarker[landmarkType], config);
      });
    }

    // Store current bounding box for next frame
    this.prevBoundingBox = { minX, minY, maxX, maxY };
  }

  protected ReceiveDatapoint(
    dataPoint: FaceLandmarkerResult,
    timestamp: DOMHighResTimeStamp,
    analyzeDuration: DOMHighResTimeStamp,
    frameJitter: DOMHighResTimeStamp,
  ) {
    requestAnimationFrame(() => {
      this.RenderFaceMeshOverlay(dataPoint);
      this.BlendShapes(dataPoint.faceBlendshapes);
    });
    getFaceLandmarkerManager().queueForSend(dataPoint, timestamp, analyzeDuration, frameJitter);
  }

  // sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
  private sleep(time: number) {
    return new Promise<never>((resolve) => setTimeout(resolve, time));
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
