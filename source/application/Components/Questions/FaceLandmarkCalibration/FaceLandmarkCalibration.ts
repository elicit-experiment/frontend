import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import calibrate from './FaceLandmarkCalibrationPage';
import template from 'Components/Questions/FaceLandmarkCalibration/FaceLandmarkCalibration.html';
import { FaceLandmarker, FaceLandmarkerOptions, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { DatapointAccumulator } from 'Components/Questions/FaceLandmark/DatapointAccumulator';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { Modal } from 'bootstrap';
import {
  FaceLandmarkComponentConfig,
  NormalizeConfig,
  ValidateConfig,
  transformDatapoint,
} from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';

const FLOAT_MAX_VALUE = 3.40282347e38; // largest positive number in float32

const CLICKS_NEEDED = 1;

class BoundingBox {
  x: Float32Array;
  y: Float32Array;

  constructor() {
    this.x = new Float32Array([FLOAT_MAX_VALUE, -FLOAT_MAX_VALUE]);
    this.y = new Float32Array([FLOAT_MAX_VALUE, -FLOAT_MAX_VALUE]);
  }

  public add(x: number, y: number) {
    if (x < this.x[0]) {
      this.x[0] = x;
    }

    if (x > this.x[1]) {
      this.x[1] = x;
    }

    if (y < this.y[0]) {
      this.y[0] = y;
    }

    if (y > this.y[1]) {
      this.y[1] = y;
    }
  }

  public volume() {
    const width = this.x[1] - this.x[0];
    const height = this.y[1] - this.y[1];

    return Math.sqrt(width * width + height * height);
  }
}

interface CalibrationClick {
  x: number;
  y: number;
  timeStamp: number;
}

interface CalibrationPoint {
  [key: string]: CalibrationClick[];
}

type Calibration = {
  calibrationPoints: CalibrationPoint;
};

enum CALIBRATION_STATE {
  LOADING,
  INITIAL_CALIBRATION,
  DETAIL_CALIBRATION,
}

const MINIMUM_VOLUME_CALIBRATION_TIME = 5.0;
const MINIMUM_VOLUME = 0.15;

class FaceLandmarkCalibration extends QuestionBase<Calibration> {
  public config: FaceLandmarkComponentConfig;
  public includeLandmarks?: number[];
  public datapointAccumulator: DatapointAccumulator;
  public currentState: knockout.Observable<CALIBRATION_STATE> = knockout.observable<CALIBRATION_STATE>();
  public PointCalibrate = 0;
  public CalibrationPoints: CalibrationPoint = {};
  public currentAccuracy: number;
  public MaxNoOfAttempts: number;
  public NoOfAttempts = 1;
  public MinCalibrationAccuracyPct: number;
  public CalibrationFailed: ko.Observable<boolean> = knockout.observable<boolean>(false);

  public AnswerIsRequired = true;
  public HasMedia = false;
  public CanAnswer: ko.Observable<boolean> = knockout.observable<boolean>(false);
  public Answer: ko.Observable<Calibration> = knockout.observable<Calibration>(null);

  private _initialCalibrationModal: Modal = null;
  private _loadingModal: Modal = null;

  private oldestAcceptableVolume = knockout.observable<Date | null>(null);

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'FaceLandmarkCalibration', 'FaceLandmarkCalibration', method, data);
  }
  public Id: string;

  constructor(question: QuestionModel) {
    super(question, true);
    this.Id = this.Model.Id;

    this.config = question.Input as FaceLandmarkComponentConfig;
    this.includeLandmarks = NormalizeConfig(question.Input as FaceLandmarkComponentConfig)?.includeLandmarks;
    console.dir(this.includeLandmarks);
    ValidateConfig(this.config);

    this.datapointAccumulator = new DatapointAccumulator();

    this._initialCalibrationModal = new Modal(document.getElementById('initialCalibrationModal'));
    this._loadingModal = new Modal(document.getElementById('loadingModal'));

    this.hideSlideShellNavigationElements();

    this.currentState.subscribe((newState: CALIBRATION_STATE) => {
      switch (newState) {
        case CALIBRATION_STATE.LOADING:
          this._loadingModal.show();
          this._initialCalibrationModal.hide();
          break;
        case CALIBRATION_STATE.INITIAL_CALIBRATION:
          this._loadingModal.hide();
          this._initialCalibrationModal.show();
          break;
        default:
          this._loadingModal.hide();
          this._initialCalibrationModal.hide();
      }
    });

    this.currentState(CALIBRATION_STATE.LOADING);

    import('@mediapipe/tasks-vision').then((visionImport) => {
      const { FaceLandmarker, FilesetResolver, DrawingUtils } = visionImport;

      const options: FaceLandmarkerOptions = {
        numFaces: this.config.NumberOfFaces || 1,
        outputFacialTransformationMatrixes: this.config.FaceTransformation || false,
        outputFaceBlendshapes: this.config.Blendshapes || true,
      };

      calibrate(FaceLandmarker, FilesetResolver, DrawingUtils, options, this.ReceiveDatapoint.bind(this)).then(() => {
        this.currentState(CALIBRATION_STATE.INITIAL_CALIBRATION);
      });
    });

    this.Answer.subscribe((calibration: Calibration) => {
      this.AddEvent('calibrated');
      this.SetAnswer(calibration);
    });
  }

  protected StartDetailedCalibration() {
    this.currentState(CALIBRATION_STATE.DETAIL_CALIBRATION);

    this.ShowCalibrationPoint();
    $('.Calibration').on('click', (event) => this.HandleCalibrationClick(event));
  }

  protected HasValidAnswer(_answer: any): boolean {
    return true;
  }

  protected ComputeAndUpdateInitialCalibration(dataPoint: FaceLandmarkerResult) {
    const calibrationStatus = document.querySelector('#initial-validation-value') as HTMLDivElement;

    if (dataPoint.faceLandmarks?.length == 0) {
      return;
    }

    const faceOvalBounds = FaceLandmarker.FACE_LANDMARKS_FACE_OVAL.reduce((boundingBox: BoundingBox, connection) => {
      const firstFace = dataPoint.faceLandmarks[0];
      const v1 = firstFace[connection.start];
      const v2 = firstFace[connection.end];
      boundingBox.add(v1.x, v1.y);
      boundingBox.add(v2.x, v2.y);
      return boundingBox;
    }, new BoundingBox());

    this.AddNewCalibrationVolume(faceOvalBounds.volume(), new Date());
    let acceptable: string | number | null = this.secondsOfAcceptableVolume();
    let calibrated = false;

    if (acceptable) {
      calibrated = acceptable > MINIMUM_VOLUME_CALIBRATION_TIME;
      acceptable = acceptable.toFixed(1);

      calibrationStatus.innerHTML =
        `<span>Keep your face centered for 5 seconds.</span><br/>` +
        `<div>` +
        `<span style="margin-right: 10px;">${calibrated ? '🟢' : '🔴'}</span>` +
        `<span>${acceptable}</span>` +
        `<span>/</span>` +
        `<span>${MINIMUM_VOLUME_CALIBRATION_TIME.toFixed(1)}s</span>` +
        `</div>`;
    } else {
      calibrationStatus.innerHTML = `<span>Center your face front of the webcam.`;
    }

    $('#initialCalibrationModal .calibrate-button').toggle(calibrated);
  }

  protected AddNewCalibrationVolume(volume: number, timeStamp: Date) {
    if (this.oldestAcceptableVolume()) {
      if (volume < MINIMUM_VOLUME) {
        this.oldestAcceptableVolume(null);
      }
    } else {
      if (volume > MINIMUM_VOLUME) {
        this.oldestAcceptableVolume(timeStamp);
      }
    }
  }

  protected ReceiveDatapoint(dataPoint: FaceLandmarkerResult) {
    if (this.currentState() == CALIBRATION_STATE.INITIAL_CALIBRATION) {
      this.ComputeAndUpdateInitialCalibration(dataPoint);
    }

    const transformedDataPoint = transformDatapoint(this.config, dataPoint, this.includeLandmarks);

    this.datapointAccumulator.accumulateAndDebounce(transformedDataPoint);
  }

  // Calibration times

  private ShowCalibrationPoint() {
    $('.Calibration').show();
    $('#Pt5').hide(); // initially hides the middle button
  }

  private HandleCalibrationClick(event: JQueryEventObject) {
    const id = $(event.currentTarget).attr('id');
    const $cal = $(event.currentTarget);

    const calibrationPoint = {
      x: event.clientX,
      y: event.clientY,
      timeStamp: new Date().getTime(),
    };

    if (!this.CalibrationPoints[id]) {
      // initializes if not done
      this.CalibrationPoints[id] = [];
    }
    this.CalibrationPoints[id].push(calibrationPoint); // increments values

    if (this.CalibrationPoints[id].length == CLICKS_NEEDED) {
      //only turn to yellow after 5 clicks
      $cal.css('background-color', 'yellow');
      $cal.prop('disabled', true); //disables the button
      this.PointCalibrate++;
    } else if (this.CalibrationPoints[id].length < CLICKS_NEEDED) {
      //Gradually increase the opacity of calibration points when click to give some indication to user.
      const opacity = (1.0 / CLICKS_NEEDED) * this.CalibrationPoints[id].length + 1.0 / CLICKS_NEEDED;
      $cal.css('opacity', opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    if (this.PointCalibrate == 8) {
      $('#Pt5').show();
    }

    if (this.PointCalibrate >= 9) {
      // last point is calibrated
      //using jquery to grab every element in Calibration class and hide them except the middle point.
      $('.Calibration').hide();
      $('#Pt5').show();

      // clears the canvas
      const canvas = <HTMLCanvasElement>document.getElementById('plotting-canvas');
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

      this.RecalibrateOrProceed();
    }
  }

  // sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
  private sleep(time: number) {
    return new Promise<any>((resolve) => setTimeout(resolve, time));
  }

  private RecalibrateOrProceed() {
    const swalConfig = {
      title: '',
      html: `Calibration Complete`,
      allowOutsideClick: false,
      showCancelButton: true,
      confirmButtonText: 'Go on to the survey',
      cancelButtonText: 'Recalibrate',
    };

    Swal.fire(swalConfig).then((result: SweetAlertResult) => {
      if (result.value) {
        //clear the calibration & hide the last middle button
        this.ClearCanvas();
        this.CalibrationCompleted();
      } else {
        // TODO: I cannot figure out how to clear the webgazer calibration and restart it.
        // It fails to begin() after end() is called.  See WebgazerManager#ClearCalibration.
        // So the best that seems possible is this gross hack.

        // delete the session GUID so we don't kill the experiment because of USER reload
        document.cookie = 'session_guid=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';

        const parser = new URL(window.location.href);
        parser.searchParams.set('attempt', this.NoOfAttempts.toString(10));
        window.location.href = parser.href;
      }
    });
  }

  private CalibrationCompleted() {
    console.log('Calibration: calibration complete');

    const calibrationStatus = knockout.contextFor(document.getElementById('calibration-status'));
    const slideShell = knockout.contextFor($('.panel').get(0)).$data;

    this.CanAnswer(true);

    console.dir(calibrationStatus.$data);
    console.dir(this);

    this.Answer({ calibrationPoints: this.CalibrationPoints });

    this.showSlideShellNavigationElements();

    slideShell.GoToNextSlide();
  }

  private ClearCanvas() {
    $('.Calibration').hide();

    const canvas = <HTMLCanvasElement>document.getElementById('plotting-canvas');
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private evaluateCalibration() {
    {
      //this.stop_storing_points_variable(); // stop storing the prediction points
      // const past50 = this.webgazerManager.webgazer.getStoredPoints(); // retrieve the stored points
      // const precisionMeasurement = this.calculatePrecision(past50);
      const precisionMeasurement = 50.0;
      const accuracyLabel = '<a>Accuracy | ' + precisionMeasurement + '%</a>';
      document.getElementById('Accuracy').innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
      this.currentAccuracy = precisionMeasurement;
      let title = '';
      let html = `Your accuracy measure is ${precisionMeasurement}%<br/>`;
      let showCancelButton = false;
      const minimumCalibrationAccuracy = 50.0; // this.GetMinCalibrationAccuracyPct();
      let confirmButtonText = '';
      let cancelButtonText = '';
      let confirmIsRecalibrate = false;

      if (this.currentAccuracy >= minimumCalibrationAccuracy) {
        confirmButtonText = 'Go on to the survey';
        cancelButtonText = 'Recalibrate';
        showCancelButton = true;
      } else {
        confirmButtonText = 'Recalibrate';
        confirmIsRecalibrate = true;
        title = 'Calibration Failed';

        html += `The experiment requires a minimum of ${minimumCalibrationAccuracy}.<br/>`;
        html += 'Please try again.<br/>';

        if (!!this.MaxNoOfAttempts) {
          const remainingAttempts = this.MaxNoOfAttempts - this.NoOfAttempts;
          console.log(`Calibration: remaining attempts ${remainingAttempts}`);
          if (remainingAttempts > 0) {
            html += `  You have ${remainingAttempts} attempts remaining`;
          } else {
            // this.FailedToCalibrate();
            return;
          }
        }
      }

      this.NoOfAttempts += 1;

      Swal.fire({
        title,
        html,
        allowOutsideClick: false,
        showCancelButton,
        confirmButtonText,
        cancelButtonText,
      }).then((result: SweetAlertResult) => {
        if (result.value && !confirmIsRecalibrate) {
          //clear the calibration & hide the last middle button
          // this.ClearCanvas();
          // this.CalibrationCompleted();
        } else {
          // TODO: I cannot figure out how to clear the webgazer calibration and restart it.
          // It fails to begin() after end() is called.  See WebgazerManager#ClearCalibration.
          // So the best that seems possible is this gross hack.

          // delete the session GUID so we don't kill the experiment because of USER reload
          document.cookie = 'session_guid=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';

          const parser = new URL(window.location.href);
          parser.searchParams.set('attempt', this.NoOfAttempts.toString(10));
          window.location.href = parser.href;
        }
      });
    }
  }

  private RestartCalibration() {
    // this._helpModal.hide();
    // this.Restart(true);
  }

  private ShowHelpModal() {}
  private HideHelpModal() {}

  private secondsOfAcceptableVolume(): number | null {
    const oldestVolume = this.oldestAcceptableVolume();
    return oldestVolume ? (new Date().getTime() - (oldestVolume as Date).getTime()) / 1000.0 : null;
  }

  //
  // Suppress Slide Navigation
  //
  private hideSlideShellNavigationElements() {
    $('.panel-heading').hide();
    $('.panel-footer').hide();
    $('.panel-body').css('height', 'calc(100vh - 100px)');
  }

  private showSlideShellNavigationElements() {
    $('.panel-heading').show();
    $('.panel-footer').show();
    $('.panel-body').css('height', 'auto');
  }
}

knockout.components.register('Questions/FaceLandmarkCalibration', {
  viewModel: FaceLandmarkCalibration,
  template,
});

export default FaceLandmarkCalibration;
