import * as knockout from 'knockout';
import Swal, { SweetAlertResult } from 'sweetalert2';
import ExperimentManager from 'Managers/Portal/Experiment';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import { Modal } from 'bootstrap';
import type WebGazerManager from 'Managers/WebGazerManager';

interface CalibrationPoint {
  [key: string]: number;
}

class WebGazerCalibrate extends QuestionBase<{ CalibrationAccuracy: number }> {
  public AnswerIsRequired = true;
  public HasMedia = false;
  public CanAnswer: ko.Observable<boolean> = knockout.observable<boolean>(false);
  public Answer: ko.Observable<number> = knockout.observable<number>(null);

  public PointCalibrate = 0;
  public CalibrationPoints: CalibrationPoint = {};
  public currentAccuracy: number;
  public MaxNoOfAttempts: number;
  public NoOfAttempts = 1;
  public MinCalibrationAccuracyPct: number;
  public CalibrationFailed: ko.Observable<boolean> = knockout.observable<boolean>(false);

  private _helpModal: Modal = null;
  private _loadingModal: Modal = null;

  private webgazerManager: WebGazerManager = null;

  constructor(question: QuestionModel) {
    super(question, true);

    this.hidePanelElements();

    const parser = new URL(window.location.href);
    if (parser.searchParams.get('attempt')) {
      this.NoOfAttempts = parseInt(parser.searchParams.get('attempt'), 10);
    }

    this.MaxNoOfAttempts = (question.Input as any).MaxNoOfAttempts;
    this.MinCalibrationAccuracyPct = (question.Input as any).MinCalibrationAccuracyPct;

    this._loadingModal = new Modal(document.getElementById('loadingModal'));
    this._loadingModal.show();
    this.ClearCanvas();

    import('Managers/WebGazerManager')
      .then((webgazerManagerImport) => {
        this.webgazerManager = webgazerManagerImport.getInstance();
      })
      .then(() => this.webgazerManager.Init())
      .then(() => {
        console.log('WebGazerCalibration: webgazer initialized');
        console.timeStamp('WebGazerCalibration: webgazer initialized');
        //window.requestIdleCallback(
        window.setTimeout(
          () => {
            this._loadingModal.hide();
            this.ShowHelpModalWithCalibration();
          },
          10000,
          //,{ timeout: 10000 },
        );

        $('.Calibration').on('click', (event) => this.HandleCalibrationClick(event));
      })
      .catch((exception) => {
        console.error('WebGazerCalibration: failed to upload test packet');
        console.error(exception);
        Swal.fire({
          title: 'Calibration',
          html: 'Failed to initialize calibration.  Experiment cannot be taken',
          buttonsStyling: false,
          showCancelButton: true,
          customClass: {
            confirmButton: 'btn btn-primary btn-lg',
            cancelButton: 'btn btn-lg',
          },
        }).then(() => {
          ExperimentManager.ExperimentCompleted();
        });
      });

    this.Answer.subscribe((calibrationPct) => {
      this.SetAnswer({ CalibrationAccuracy: calibrationPct });
      this.HideWebGazerVideo();
      this.showPanelElements();
    });

    // No Media to play, but we can't progress without calling this, which will set AllMediaHavePlayed to true.
    this.WhenAllMediaHavePlayed([], true);
  }

  private hidePanelElements() {
    $('.panel-heading').hide();
    $('.panel-footer').hide();
    $('.panel-body').css('height', 'calc(100vh - 100px)');
  }

  private showPanelElements() {
    $('.panel-heading').show();
    $('.panel-footer').show();
    $('.panel-body').css('height', 'auto');
  }

  /**
   * Restart the calibration process by clearing the local storage and resetting the calibration point
   */
  public Restart(showInstructions: boolean): void {
    const accuracy = document.getElementById('Accuracy');
    if (accuracy) {
      accuracy.innerHTML = '<a>Not yet Calibrated</a>';
    }
    this.ClearCalibration();
    if (showInstructions) {
      this.PopUpInstruction();
    }
  }

  public HideWebGazerVideo(): void {
    ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) =>
      $('#' + s).hide(),
    );
  }

  public ShowWebGazerVideo(): void {
    ['webgazerVideoFeed', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) => $('#' + s).show());
  }

  public SlideCompleted(): boolean {
    console.timeStamp('WebGazerCalibration: Completed');
    ExperimentManager.SlideTitle('');

    return false;
  }

  public FailedToCalibrate(): void {
    console.timeStamp('WebGazerCalibration: Failed');
    ExperimentManager.SlideTitle('Calibration failed');

    this.webgazerManager.HideCalibrationElements();
    this.ClearCanvas();
    this.CalibrationFailed(true);

    this.webgazerManager.End();
  }

  protected HasValidAnswer(answer: any): boolean {
    answer = answer || this.GetAnswer();

    return 'CalibrationAccuracy' in answer && answer.CalibrationAccuracy > this.GetMinCalibrationAccuracyPct();
  }

  private ClearCanvas() {
    $('.Calibration').hide();
    const canvas = <HTMLCanvasElement>document.getElementById('plotting_canvas');
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private ShowHelpModal() {
    this._ShowHelpModal(false);
  }
  private ShowHelpModalWithCalibration() {
    this._ShowHelpModal(true);
  }
  private _ShowHelpModal(showCalibration: boolean | undefined) {
    const helpModal = document.getElementById('helpModal');
    helpModal.querySelectorAll('.d-none').forEach((button) => {
      button.classList.remove('d-none');
    });
    console.log(`ShowCalibration: ${showCalibration}`);
    if (showCalibration) {
      helpModal.querySelector('.close-button').classList.add('d-none');
    } else {
      helpModal.querySelector('.calibrate-button').classList.add('d-none');
    }

    this._helpModal = new Modal(document.getElementById('helpModal')); // creating modal object
    this._helpModal.show();
    console.log('Show helpmodal');
    console.timeStamp('Show helpmodal');
  }

  private PopUpInstruction() {
    const attemptsRemaining = this.MaxNoOfAttempts - this.NoOfAttempts;
    const accuracyRequirement =
      !!this.GetMinCalibrationAccuracyPct() && !!this.MaxNoOfAttempts
        ? `You have ${
            this.MaxNoOfAttempts
          } attempts to achieve ${this.GetMinCalibrationAccuracyPct()}% accuracy.<br/>This is attempt number ${
            this.NoOfAttempts
          }.<br/>`
        : '';

    const instructions =
      '<div>' +
      'Ready to calibrate<br/>' +
      accuracyRequirement +
      'Remember to keep still during the entire experiment.<br/>' +
      "<span class='soto-voce'>(press help in the at the top of the screen to see instructions again)</span>" +
      '</div>';

    this.ClearCanvas();

    Swal.fire({
      title: 'Calibration',
      html: instructions,
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-primary btn-lg',
        cancelButton: 'btn btn-lg',
      },
      showCancelButton: true,
    }).then(() => {
      console.log('WebGazerCalibration: Starting calibration.');
      this.webgazerManager.StartCalibration();
      this.ShowCalibrationPoint();
    });
  }

  private ShowCalibrationPoint() {
    $('.Calibration').show();
    $('#Pt5').hide(); // initially hides the middle button
  }

  /**
   * This function clears the calibration buttons memory
   */
  private ClearCalibration() {
    this.webgazerManager.RestartCalibration().then(() => console.timeStamp('ClearCalibration complete'));

    const $Calibration = $('.Calibration');
    $Calibration.css('background-color', 'red');
    $Calibration.css('opacity', 0.2);
    $Calibration.prop('disabled', false);

    this.CalibrationPoints = {};
    this.PointCalibrate = 0;
  }

  // sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
  private sleep(time: number) {
    return new Promise<any>((resolve) => setTimeout(resolve, time));
  }

  private CalibrationCompleted() {
    console.log('WebGazerCalibration: calibration complete');
    const wgCalibrate = knockout.contextFor(document.getElementById('webgazer-calibration'));

    const slideShell = knockout.contextFor($('.panel').get(0)).$data;

    wgCalibrate.$data.CanAnswer = knockout.computed(() => true);

    wgCalibrate.$data.Answer(wgCalibrate.$data.currentAccuracy);

    this.HideWebGazerVideo();

    this.webgazerManager.StartTracking();

    // TODO: maybe investigate parent of wgCalibrate from context?
    slideShell.GoToNextSlide();
  }

  private HideHelpModal(_x: any, event: Event) {
    this._helpModal.hide();

    console.log('wut');
    console.log(event.target);
    if ((event.target as Element).classList.contains('calibrate-button')) {
      this.BeginCalibration();
    }
  }
  /**
   * Restart the calibration process by clearing the local storage and resetting the calibration point
   */
  private BeginCalibration() {
    (document.querySelector('p.text-muted') as any).style['display'] = 'none';
    return new Promise(() => {
      this.Restart(true);
    });
  }

  private RestartCalibration() {
    this._helpModal.hide();
    this.Restart(true);
  }

  private HandleCalibrationClick(event: Event) {
    const id = $(event.currentTarget).attr('id');
    const $cal = $(event.currentTarget);

    if (!this.CalibrationPoints[id]) {
      // initialises if not done
      this.CalibrationPoints[id] = 0;
    }
    this.CalibrationPoints[id]++; // increments values

    if (this.CalibrationPoints[id] == 5) {
      //only turn to yellow after 5 clicks
      $cal.css('background-color', 'yellow');
      $cal.prop('disabled', true); //disables the button
      this.PointCalibrate++;
    } else if (this.CalibrationPoints[id] < 5) {
      //Gradually increase the opacity of calibration points when click to give some indication to user.
      const opacity = 0.2 * this.CalibrationPoints[id] + 0.2;
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
      const canvas = <HTMLCanvasElement>document.getElementById('plotting_canvas');
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      // notification for the measurement process
      Swal.fire({
        title: 'Calculating measurement',
        html: "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
        allowEscapeKey: false,
        allowOutsideClick: false,
        showCancelButton: false,
        customClass: { container: 'calibration-confirmation' },
        // customClass: 'calibration-confirmation',
      }).then(() => {
        // makes the variables true for 5 seconds & plots the points
        $(document).ready(() => {
          this.store_points_variable(); // start storing the prediction points

          this.sleep(5000).then(() => {
            this.stop_storing_points_variable(); // stop storing the prediction points
            const past50 = this.webgazerManager.webgazer.getStoredPoints(); // retrieve the stored points
            const precisionMeasurement = this.calculatePrecision(past50);
            const accuracyLabel = '<a>Accuracy | ' + precisionMeasurement + '%</a>';
            document.getElementById('Accuracy').innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
            this.currentAccuracy = precisionMeasurement;
            let title = '';
            let html = `Your accuracy measure is ${precisionMeasurement}%<br/>`;
            let showCancelButton = false;
            const minimumCalibrationAccuracy = this.GetMinCalibrationAccuracyPct();
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
                console.log(`WebGazerCalibration: remaining attempts ${remainingAttempts}`);
                if (remainingAttempts > 0) {
                  html += `  You have ${remainingAttempts} attempts remaining`;
                } else {
                  this.FailedToCalibrate();
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
          });
        });
      });
    }
  }

  private store_points_variable() {
    this.webgazerManager.webgazer.params.storingPoints = true;
  }

  /*
   * Sets store_points to false, so prediction points aren't
   * stored any more
   */
  private stop_storing_points_variable() {
    this.webgazerManager.webgazer.params.storingPoints = false;
  }

  private calculatePrecision(past50Array: number[][]) {
    const windowHeight = $(window).height();
    const windowWidth = $(window).width();

    // Retrieve the last 50 gaze prediction points
    const x50 = past50Array[0];
    const y50 = past50Array[1];

    // Calculate the position of the point the user is staring at
    const staringPointX = windowWidth / 2;
    const staringPointY = windowHeight / 2;

    const precisionPercentages = new Array(50);
    this.calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY);
    const precision = this.calculateAverage(precisionPercentages);

    // Return the precision measurement as a rounded percentage
    return Math.round(precision);
  }

  /*
   * Calculate percentage accuracy for each prediction based on distance of
   * the prediction point from the centre point (uses the window height as
   * lower threshold 0%)
   */
  private calculatePrecisionPercentages(
    precisionPercentages: number[],
    windowHeight: number,
    x50: number[],
    y50: number[],
    staringPointX: number,
    staringPointY: number,
  ) {
    for (let x = 0; x < 50; x++) {
      // Calculate distance between each prediction and staring point
      const xDiff = staringPointX - x50[x];
      const yDiff = staringPointY - y50[x];
      const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

      // Calculate precision percentage
      const halfWindowHeight = windowHeight / 2;
      let precision = 0;
      if (distance <= halfWindowHeight && distance > -1) {
        precision = 100 - (distance / halfWindowHeight) * 100;
      } else if (distance > halfWindowHeight) {
        precision = 0;
      } else if (distance > -1) {
        precision = 100;
      }

      // Store the precision
      precisionPercentages[x] = precision;
    }
  }

  /*
   * Calculates the average of all precision percentages calculated
   */
  private calculateAverage(precisionPercentages: number[]) {
    let precision = 0;
    for (let x = 0; x < 50; x++) {
      precision += precisionPercentages[x];
    }
    precision = precision / 50;
    return precision;
  }

  private GetMinCalibrationAccuracyPct(): number {
    let minimumCalibrationAccuracy = this.MinCalibrationAccuracyPct;
    if (!minimumCalibrationAccuracy) return null;
    if ('minimumCalibrationAccuracy' in window) {
      minimumCalibrationAccuracy = window.minimumCalibrationAccuracy;
    }
    return minimumCalibrationAccuracy;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'WebGazerCalibrate', 'Instrument', method, data);
  }
}

import template from 'Components/Questions/WebGazerCalibrate/WebGazerCalibrate.html';

knockout.components.register('Questions/WebGazerCalibrate', {
  viewModel: WebGazerCalibrate,
  template,
});

export default WebGazerCalibrate;
