import knockout = require('knockout');
// TODO: fix this grossness
import swal = require('sweetalert');
//import swal2 = require("sweetalert2");
//import { swal as swal2 } from 'sweetalert2';
import Swal, { SweetAlertResult } from 'sweetalert2';
const swal2 = Swal;

import ExperimentManager = require('Managers/Portal/Experiment');
import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');
import WebGazerManager = require('Managers/WebGazerManager');

class WebGazerCalibrate extends QuestionBase<any> {
  public AnswerIsRequired = true;
  public HasMedia = false;
  public CanAnswer: KnockoutObservable<boolean> = knockout.observable<boolean>(false);
  public Answer: KnockoutObservable<number> = knockout.observable<number>(null);

  public PointCalibrate = 0;
  public CalibrationPoints = <any>[];
  public currentAccuracy: number;
  public MaxNoOfAttempts: number;
  public NoOfAttempts = 1;
  public MinCalibrationAccuracyPct: number;
  public CalibrationFailed: KnockoutObservable<boolean> = knockout.observable<boolean>(false);

  constructor(question: QuestionModel) {
    super(question, true);

    this.hidePanelElements();

    this.MaxNoOfAttempts = (question.Input as any).MaxNoOfAttempts;
    this.MinCalibrationAccuracyPct = (question.Input as any).MinCalibrationAccuracyPct;

    const me = this;
    WebGazerManager.Init()
      .then(() => {
        console.log('WebGazerCalibration: webgazer initialized');
        me.ClearCanvas();

        me.ShowHelpModal();

        $('.Calibration').on('click', (event) => me.HandleCalibrationClick(event));
      })
      .catch((exception) => {
        console.error('WebGazerCalibration: failed to upload test packet');
        console.error(exception);
        swal2({
          title: 'Calibration',
          html: 'Failed to initialize calibration.  Experiment cannot be taken',
          showLoaderOnConfirm: true,
          buttonsStyling: false,
          confirmButtonClass: 'btn btn-primary btn-lg',
          cancelButtonClass: 'btn btn-lg',
          showCancelButton: true,
        }).then(() => {
          ExperimentManager.ExperimentCompleted();
        });
      });

    this.Answer.subscribe((calibrationPct) => {
      this.SetAnswer({ CalibrationAccuracy: calibrationPct });
      this.HideWebGazerVideo();
      this.showPanelElements();
    });
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
  public Restart(showInstructions: boolean) {
    const accuracy = document.getElementById('Accuracy');
    if (accuracy) {
      accuracy.innerHTML = '<a>Not yet Calibrated</a>';
    }
    this.ClearCalibration();
    if (showInstructions) {
      this.PopUpInstruction();
    }
  }

  public HideWebGazerVideo() {
    ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) =>
      $('#' + s).hide(),
    );
  }

  public ShowWebGazerVideo() {
    ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) =>
      $('#' + s).show(),
    );
  }

  public SlideCompleted(): boolean {
    console.log('WebGazerCalibration: Completed');
    ExperimentManager.SlideTitle('');

    return false;
  }

  public FailedToCalibrate() {
    console.log('WebGazerCalibration: Failed');
    ExperimentManager.SlideTitle('Calibration failed');

    WebGazerManager.HideCalibrationElements();
    this.ClearCanvas();
    this.CalibrationFailed(true);

    WebGazerManager.End();
  }

  protected HasValidAnswer(answer: any): boolean {
    answer = answer || this.GetAnswer();

    /*
        console.log(`WGCalibrate CanAnswer: ${this.CanAnswer()}`);
        console.log(`WGCalibrate answer: ${answer}`);
        console.log(`WGCalibrate answer: ${this.GetAnswer()}`);
        console.dir(answer);
*/

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
    $('#helpModal').modal('show');
  }

  private PopUpInstruction() {
    /*
        let instructions = "<div>"+
        "<ul class='calibrate-instructions'><li>Click on each of the 9 points on the screen.</li>" +
        "<li>You must click on each point 5 times till it goes yellow.</li>"+
        "<li>Please ensure that your face is visible within the rectangle within the webcam video.</li>"+
        "<li>When you've positioned it correctly, the rectangle will turn green and a sketch of the detected face will appear.</li>" +
        "<li>Then click on each of the 4 points on the screen. You must click on each point a number times till it goes yellow.</li>"+ 
        "<li>Please try to hold your head steady during the process.  This will calibrate your eye movements.</li>" + 
        "</ul></div>";

        if (!!this.GetMinCalibrationAccuracyPct()) {
            instructions += `<b>You must score ${this.GetMinCalibrationAccuracyPct()}% accuracy to continue</b><br/>`;
        }
        if (!!this.MaxNoOfAttempts) {
            instructions += `  You have <b>${this.MaxNoOfAttempts}</b> attempts.`
        }
*/

    const accuracyRequirement =
      !!this.GetMinCalibrationAccuracyPct() && !!this.MaxNoOfAttempts
        ? `You have ${this.MaxNoOfAttempts} attempts to achieve ${this.GetMinCalibrationAccuracyPct()}% accuracy.<br/>`
        : '';

    const instructions =
      '<div>' +
      'Ready to calibrate<br/>' +
      accuracyRequirement +
      'Remember to keep still during the entire experiment.<br/>' +
      "<span class='soto-voce'>(press help in the upper right corner to see instructions again)</span>" +
      '</div>';

    this.ClearCanvas();
    swal2({
      title: 'Calibration',
      html: instructions,
      showLoaderOnConfirm: true,
      buttonsStyling: false,
      confirmButtonClass: 'btn btn-primary btn-lg',
      cancelButtonClass: 'btn btn-lg',
      showCancelButton: true,
    }).then(() => {
      console.log('WebGazerCalibration: Starting calibration.');
      WebGazerManager.StartCalibration();
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
    WebGazerManager.RestartCalibration();

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

    this.ShowWebGazerVideo();

    WebGazerManager.StartTracking();

    // TODO: maybe investigate parent of wgCalibrate from context?
    slideShell.GoToNextSlide();
  }

  /**
   * Restart the calibration process by clearing the local storage and resetting the calibration point
   */
  private RestartCalibration() {
    this.Restart(true);
  }

  private HandleCalibrationClick(event: Event) {
    const me = this;
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
      swal({
        title: 'Calculating measurement',
        text:
          "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
        closeOnEsc: false,
        allowOutsideClick: false,
        closeModal: true,
      }).then(() => {
        // makes the variables true for 5 seconds & plots the points
        $(document).ready(function () {
          me.store_points_variable(); // start storing the prediction points

          me.sleep(5000).then(() => {
            me.stop_storing_points_variable(); // stop storing the prediction points
            const past50 = me.get_points(); // retrieve the stored points
            const precision_measurement = me.calculatePrecision(past50);
            const accuracyLabel = '<a>Accuracy | ' + precision_measurement + '%</a>';
            document.getElementById('Accuracy').innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
            me.currentAccuracy = precision_measurement;
            let title = '';
            let html = `Your accuracy measure is ${precision_measurement}%<br/>`;
            let showCancelButton = false;
            const minimumCalibrationAccuracy = me.GetMinCalibrationAccuracyPct();
            let confirmButtonText = '';
            let cancelButtonText = '';
            let confirmIsRecalibrate = false;

            if (me.currentAccuracy >= minimumCalibrationAccuracy) {
              confirmButtonText = 'Go on to the survey';
              cancelButtonText = 'Recalibrate';
              showCancelButton = true;
            } else {
              confirmButtonText = 'Recalibrate';
              confirmIsRecalibrate = true;
              title = 'Calibration Failed';

              html += `The experiment requires a minimum of ${minimumCalibrationAccuracy}.<br/>`;
              html += 'Please try again.<br/>';

              if (!!me.MaxNoOfAttempts) {
                const remainingAttempts = me.MaxNoOfAttempts - me.NoOfAttempts;
                console.log(`WebGazerCalibration: remaining attempts ${remainingAttempts}`);
                if (remainingAttempts > 0) {
                  html += `  You have ${remainingAttempts} attempts remaining`;
                } else {
                  me.FailedToCalibrate();
                  return;
                }
              }
            }

            me.NoOfAttempts += 1;

            swal2({
              title,
              html,
              allowOutsideClick: false,
              showCancelButton,
              confirmButtonText,
              cancelButtonText,
            }).then((result: SweetAlertResult) => {
              if (result.value && !confirmIsRecalibrate) {
                //clear the calibration & hide the last middle button
                me.ClearCanvas();
                me.CalibrationCompleted();
              } else {
                // TODO: I cannot figure out how to clear the webgazer calibration and restart it.
                // It fails to begin() after end() is called.  See WebgazerManager#ClearCalibration.
                // So the best that seems possible is this gross hack.

                // delete the session GUID so we don't kill the experiment because of USER reload
                document.cookie = 'session_guid=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';

                window.location.reload();
                /*
                                me.ClearCalibration();
                                me.ClearCanvas();
                                me.ShowCalibrationPoint();
                                */
              }
            });
          });
        });
      });
    }
  }

  private store_points_variable() {
    store_points_var = true;
  }

  /*
   * Sets store_points to false, so prediction points aren't
   * stored any more
   */
  private stop_storing_points_variable() {
    store_points_var = false;
  }

  /*
   * Returns the stored tracker prediction points
   */
  private get_points() {
    const past50 = new Array(2);
    past50[0] = xPast50;
    past50[1] = yPast50;
    return past50;
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

export = WebGazerCalibrate;
