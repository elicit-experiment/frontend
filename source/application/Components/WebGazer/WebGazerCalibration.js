define(['webgazer', 'swal', 'knockout'], (webgazer, swal, ko) => {
  var PointCalibrate = 0;
  var CalibrationPoints = {};
  var currentAccuracy;

  /*
      BEGIN www/js/precision_store_points.js
    */
  /*
   * Sets store_points to true, so all the occuring prediction
   * points are stored
   */
  function store_points_variable() {
    store_points_var = true;
  }

  /*
   * Sets store_points to false, so prediction points aren't
   * stored any more
   */
  function stop_storing_points_variable() {
    store_points_var = false;
  }

  /*
   * Returns the stored tracker prediction points
   */
  function get_points() {
    var past50 = new Array(2);
    past50[0] = xPast50;
    past50[1] = yPast50;
    return past50;
  }

  /*
    END www/js/precision_store_points.js
     */

  /*
      BEGIN precision_calculation.js
    */
  /*
   * This function calculates a measurement for how precise
   * the eye tracker currently is which is displayed to the user
   */
  function calculatePrecision(past50Array) {
    var windowHeight = $(window).height();
    var windowWidth = $(window).width();

    // Retrieve the last 50 gaze prediction points
    var x50 = past50Array[0];
    var y50 = past50Array[1];

    // Calculate the position of the point the user is staring at
    var staringPointX = windowWidth / 2;
    var staringPointY = windowHeight / 2;

    var precisionPercentages = new Array(50);
    calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY);
    var precision = calculateAverage(precisionPercentages);

    // Return the precision measurement as a rounded percentage
    return Math.round(precision);
  }

  /*
   * Calculate percentage accuracy for each prediction based on distance of
   * the prediction point from the centre point (uses the window height as
   * lower threshold 0%)
   */
  function calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY) {
    for (let x = 0; x < 50; x++) {
      // Calculate distance between each prediction and staring point
      var xDiff = staringPointX - x50[x];
      var yDiff = staringPointY - y50[x];
      var distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

      // Calculate precision percentage
      var halfWindowHeight = windowHeight / 2;
      var precision = 0;
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
  function calculateAverage(precisionPercentages) {
    var precision = 0;
    for (let x = 0; x < 50; x++) {
      precision += precisionPercentages[x];
    }
    precision = precision / 50;
    return precision;
  }

  /*
    END precision_calculation.js
    */

  /**
   * Clear the canvas and the calibration button.
   */
  function ClearCanvas() {
    $('.Calibration').hide();
    var canvas = document.getElementById('plotting_canvas');
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Show the instruction of using calibration at the start up screen.
   */
  function PopUpInstruction() {
    ClearCanvas();
    swal({
      title: 'Calibration',
      text:
        'Please click on each of the 9 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.',
      buttons: {
        cancel: false,
        confirm: true,
      },
    }).then((isConfirm) => {
      console.log('Starting calibration.');
      ShowCalibrationPoint();
    });
  }

  /**
   * Show the help instructions right at the start.
   */
  function helpModalShow() {
    $('#helpModal').modal('show');
  }

  /**
   * Load this function when the index page starts.
   * This function listens for button clicks on the html page
   * checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
   */
  function init() {
    onload();

    ClearCanvas();

    helpModalShow();

    $('.Calibration').click(function () {
      // click event on the calibration buttons

      var id = $(this).attr('id');

      if (!CalibrationPoints[id]) {
        // initialises if not done
        CalibrationPoints[id] = 0;
      }
      CalibrationPoints[id]++; // increments values

      if (CalibrationPoints[id] == 5) {
        //only turn to yellow after 5 clicks
        $(this).css('background-color', 'yellow');
        $(this).prop('disabled', true); //disables the button
        PointCalibrate++;
      } else if (CalibrationPoints[id] < 5) {
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        var opacity = 0.2 * CalibrationPoints[id] + 0.2;
        $(this).css('opacity', opacity);
      }

      //Show the middle calibration point after all other points have been clicked.
      if (PointCalibrate == 8) {
        $('#Pt5').show();
      }

      if (PointCalibrate >= 9) {
        // last point is calibrated
        //using jquery to grab every element in Calibration class and hide them except the middle point.
        $('.Calibration').hide();
        $('#Pt5').show();

        // clears the canvas
        var canvas = document.getElementById('plotting_canvas');
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        // notification for the measurement process
        swal({
          title: 'Calculating measurement',
          text:
            "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
          closeOnEsc: false,
          allowOutsideClick: false,
          closeModal: true,
        }).then((isConfirm) => {
          // makes the variables true for 5 seconds & plots the points
          $(document).ready(function () {
            store_points_variable(); // start storing the prediction points

            sleep(5000).then(() => {
              stop_storing_points_variable(); // stop storing the prediction points
              var past50 = get_points(); // retrieve the stored points
              var precision_measurement = calculatePrecision(past50);
              var accuracyLabel = '<a>Accuracy | ' + precision_measurement + '%</a>';
              document.getElementById('Accuracy').innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
              currentAccuracy = precision_measurement;
              swal({
                title: 'Your accuracy measure is ' + precision_measurement + '%',
                allowOutsideClick: false,
                buttons: {
                  cancel: 'Recalibrate',
                  confirm: 'Go on to the survey',
                },
              }).then((isConfirm) => {
                if (isConfirm) {
                  //clear the calibration & hide the last middle button
                  ClearCanvas();

                  CalibrationCompleted();
                } else {
                  //use restart function to restart the calibration
                  ClearCalibration();
                  ClearCanvas();
                  ShowCalibrationPoint();
                }
              });
            });
          });
        });
      }
    });
  }

  /**
   * Show the Calibration Points
   */
  function ShowCalibrationPoint() {
    $('.Calibration').show();
    $('#Pt5').hide(); // initially hides the middle button
  }

  /**
   * This function clears the calibration buttons memory
   */
  function ClearCalibration() {
    window.localStorage.clear();

    $('.Calibration').css('background-color', 'red');
    $('.Calibration').css('opacity', 0.2);
    $('.Calibration').prop('disabled', false);

    CalibrationPoints = {};
    PointCalibrate = 0;
  }

  // sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  function CalibrationCompleted() {
    const wgCalibrate = ko.contextFor(document.getElementById('webgazer-calibration'));

    const slideShell = ko.contextFor($('.panel').get(0)).$data;

    wgCalibrate.$data.Answer(true);

    // TODO: maybe investigate parent of wgCalibrate from context?
    slideShell.GoToNextSlide();
  }

  /**
   * Restart the calibration process by clearing the local storage and reseting the calibration point
   */
  function Restart(showInstructions) {
    const accuracy = document.getElementById('Accuracy');
    if (accuracy) {
      accuracy.innerHTML = '<a>Not yet Calibrated</a>';
    }
    ClearCalibration();
    if (showInstructions) {
      PopUpInstruction();
    }
  }

  let currentPoint = ko.observable({});

  function onload() {
    //start the webgazer tracker
    webgazer
      .setRegression('ridge') /* currently must set regression and tracker */
      .setTracker('TFFacemesh')
      .setGazeListener(function (data, clock) {
        currentPoint({
          data: data /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */,
          clock_ms: clock /* elapsed time in milliseconds since webgazer.begin() was called */,
          timestamp: new Date(),
        });
      })
      .begin()
      .showPredictionPoints(true); /* shows a square every 100 milliseconds where current prediction is */

    //Set up the webgazer video feedback.
    var setup = function () {
      //Set up the main canvas. The main canvas is used to calibrate the webgazer.
      var canvas = document.getElementById('plotting_canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
      }
    };

    function checkIfReady() {
      if (webgazer.isReady()) {
        setup();
      } else {
        setTimeout(checkIfReady, 100);
      }
    }

    setTimeout(checkIfReady, 100);
  }

  function end() {
    try {
      webgazer.end();
    } catch (e) {
      console.error(e);
    }
  }

  /// ** REFACTOR **

  return {
    init: init,
    end: end,
    ready: () => (webgazer ? webgazer.isReady() : false),
    Restart: Restart,
    currentPoint: currentPoint,
    HideWebGazerVideo: () => {
      ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) =>
        $('#' + s).hide(),
      );
    },
    calibrationAccuracy: (newValue) => {
      if (typeof newValue === 'undefined') {
        return currentAccuracy;
      }
      currentAccuracy = newValue;
    },
    swal, // so ghetto ;(
  };
});
