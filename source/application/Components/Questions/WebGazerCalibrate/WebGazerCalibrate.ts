import knockout = require("knockout");
import swal = require("sweetalert");
import ExperimentManager = require("Managers/Portal/Experiment");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import WebGazerManager = require("Managers/WebGazerManager");

class WebGazerCalibrate extends QuestionBase<any>
{
    public AnswerIsRequired: boolean = true;
    public HasMedia: boolean = false;
    public CanAnswer: KnockoutObservable<boolean>;
    public Answer: KnockoutObservable<boolean> = knockout.observable<boolean>(null);

    public PointCalibrate = 0;
    public CalibrationPoints = <any>[];
    public currentAccuracy: number;

    constructor(question: QuestionModel) {
        super(question, true);

        this.hidePanelElements();

        const me = this;
        WebGazerManager.Init().then(() => {
            console.log('CALIBRATION: webgazer initted')
            me.ClearCanvas();

            me.ShowHelpModal();

            $(".Calibration").on('click', (event) => me.HandleCalibrationClick(event))
        });

        this.CanAnswer = knockout.computed(() => true);
        //this.Answer(true); // we can immediately go to next slide

        this.Answer.subscribe(v => {
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
     * Restart the calibration process by clearing the local storage and reseting the calibration point
     */
    public Restart(showInstructions: boolean) {
        const accuracy = document.getElementById("Accuracy");
        if (accuracy) {
            accuracy.innerHTML = "<a>Not yet Calibrated</a>";
        }
        this.ClearCalibration();
        if (showInstructions) {
            this.PopUpInstruction();
        }
    }

    public HideWebGazerVideo() {
        ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) => $('#' + s).hide());
    }

    public SlideCompleted(): boolean {
        console.log('completed');
        ExperimentManager.SlideTitle("");

        return false;
    }

    protected HasValidAnswer(answer: any): boolean {
        console.log(this.CanAnswer());
        return answer;
    }

    private ClearCanvas() {
        $(".Calibration").hide();
        var canvas = <HTMLCanvasElement>document.getElementById("plotting_canvas");
        if (canvas) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    private ShowHelpModal() {
        $('#helpModal').modal('show');
    }

    private PopUpInstruction() {
        this.ClearCanvas();
        swal({
            title: "Calibration",
            text: "Please click on each of the 9 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.",
            buttons: {
                cancel: false,
                confirm: true
            }
        }).then(() => {
            console.log('Starting calibration.');
            WebGazerManager.StartCalibration();
            this.ShowCalibrationPoint();
        });
    }

    private ShowCalibrationPoint() {
        $(".Calibration").show();
        $("#Pt5").hide(); // initially hides the middle button
    }

    /**
    * This function clears the calibration buttons memory
    */
    private ClearCalibration() {
        window.localStorage.clear();

        $(".Calibration").css('background-color', 'red');
        $(".Calibration").css('opacity', 0.2);
        $(".Calibration").prop('disabled', false);

        this.CalibrationPoints = {};
        this.PointCalibrate = 0;
    }

    // sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
    private sleep(time: number) {
        return new Promise<any>((resolve) => setTimeout(resolve, time));
    }

    private CalibrationCompleted() {
        const wgCalibrate = knockout.contextFor(document.getElementById("webgazer-calibration"));

        const slideShell = knockout.contextFor($('.panel').get(0)).$data

        wgCalibrate.$data.Answer(true);

        WebGazerManager.StartTracking();

        // TODO: maybe investigate parent of wgCalibrate from context?
        slideShell.GoToNextSlide();
    }

    /**
     * Restart the calibration process by clearing the local storage and reseting the calibration point
     */
    private RestartCalibration() {
        console.log('HELLO');
        this.Restart(true);
    }

    private HandleCalibrationClick(event: Event) {
        const me = this;
        var id = $(event.currentTarget).attr('id');
        const $cal = $(event.currentTarget);

        if (!this.CalibrationPoints[id]) { // initialises if not done
            this.CalibrationPoints[id] = 0;
        }
        this.CalibrationPoints[id]++; // increments values

        if (this.CalibrationPoints[id] == 5) { //only turn to yellow after 5 clicks
            $cal.css('background-color', 'yellow');
            $cal.prop('disabled', true); //disables the button
            this.PointCalibrate++;
        } else if (this.CalibrationPoints[id] < 5) {
            //Gradually increase the opacity of calibration points when click to give some indication to user.
            var opacity = 0.2 * this.CalibrationPoints[id] + 0.2;
            $cal.css('opacity', opacity);
        }

        //Show the middle calibration point after all other points have been clicked.
        if (this.PointCalibrate == 8) {
            $("#Pt5").show();
        }

        if (this.PointCalibrate >= 9) { // last point is calibrated
            //using jquery to grab every element in Calibration class and hide them except the middle point.
            $(".Calibration").hide();
            $("#Pt5").show();

            // clears the canvas
            var canvas = <HTMLCanvasElement>document.getElementById("plotting_canvas");
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // notification for the measurement process
            swal({
                title: "Calculating measurement",
                text: "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
                closeOnEsc: false,
                allowOutsideClick: false,
                closeModal: true
            }).then(() => {

                // makes the variables true for 5 seconds & plots the points
                $(document).ready(function () {

                    me.store_points_variable(); // start storing the prediction points

                    me.sleep(5000).then(() => {
                        me.stop_storing_points_variable(); // stop storing the prediction points
                        var past50 = me.get_points() // retrieve the stored points
                        var precision_measurement = me.calculatePrecision(past50);
                        var accuracyLabel = "<a>Accuracy | " + precision_measurement + "%</a>";
                        document.getElementById("Accuracy").innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
                        me.currentAccuracy = precision_measurement;
                        let buttons:any = {};
                        let title = `Your accuracy measure is ${precision_measurement}%`;

                        if (me.currentAccuracy < 80.0) {
                            buttons['confirm'] = "Go on to the survey";
                        } else {
                            buttons['cancel'] = "Recalibrate";
                            title += '. The experiment requires more accuracy. Please try again.';
                        }
                        
                        swal({
                            title,
                            allowOutsideClick: false,
                            buttons
                        }).then((isConfirm: boolean) => {
                            if (isConfirm) {
                                //clear the calibration & hide the last middle button
                                me.ClearCanvas();
                                me.CalibrationCompleted();
                            } else {
                                //use restart function to restart the calibration
                                me.ClearCalibration();
                                me.ClearCanvas();
                                me.ShowCalibrationPoint();
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
        var past50 = new Array(2);
        past50[0] = xPast50;
        past50[1] = yPast50;
        return past50;
    }

    private calculatePrecision(past50Array: number[][]) {
        var windowHeight = $(window).height();
        var windowWidth = $(window).width();

        // Retrieve the last 50 gaze prediction points
        var x50 = past50Array[0];
        var y50 = past50Array[1];

        // Calculate the position of the point the user is staring at
        var staringPointX = windowWidth / 2;
        var staringPointY = windowHeight / 2;

        var precisionPercentages = new Array(50);
        this.calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY);
        var precision = this.calculateAverage(precisionPercentages);

        // Return the precision measurement as a rounded percentage
        return Math.round(precision);
    };

    /*
     * Calculate percentage accuracy for each prediction based on distance of
     * the prediction point from the centre point (uses the window height as
     * lower threshold 0%)
     */
    private calculatePrecisionPercentages(precisionPercentages: number[], windowHeight: number, x50: number[], y50: number[], staringPointX: number, staringPointY: number) {
        for (let x = 0; x < 50; x++) {
            // Calculate distance between each prediction and staring point
            var xDiff = staringPointX - x50[x];
            var yDiff = staringPointY - y50[x];
            var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

            // Calculate precision percentage
            var halfWindowHeight = windowHeight / 2;
            var precision = 0;
            if (distance <= halfWindowHeight && distance > -1) {
                precision = 100 - (distance / halfWindowHeight * 100);
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
        var precision = 0;
        for (let x = 0; x < 50; x++) {
            precision += precisionPercentages[x];
        }
        precision = precision / 50;
        return precision;
    }
}


export = WebGazerCalibrate;