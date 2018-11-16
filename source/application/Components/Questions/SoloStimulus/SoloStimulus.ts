import knockout = require("knockout");
import swal = require("sweetalert");
import ExperimentManager = require("Managers/Portal/Experiment");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import MediaInfo = require("Components/Players/MediaInfo");
import WebGazerManager = require("Managers/WebGazerManager");

class SoloStimulus extends QuestionBase<any>
{
    public MediaLabel: string = "";
    public MediaInfo: MediaInfo = null;
    public HasMedia: boolean = true;
    public AnswerIsRequired: boolean = true;
    public CanAnswer: KnockoutObservable<boolean>;
    public Calibrating: boolean = false;
    public CalibrationElement: HTMLElement;
    public CalibrationPoints: Array<{ x: number, y: number }> = [];
    public Answer: KnockoutObservable<string> = knockout.observable<string>(null);
    public MediaComponentName: string = 'Players/Audio';
    public CanStartPlaying: KnockoutObservable<boolean> = knockout.observable(false);

    public videoEls = ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'];

    constructor(question: QuestionModel) {
        super(question, true);

        var stimulus = (this.GetComponent() as any).Stimuli[0];

        if (!WebGazerManager.Ready()) {
            WebGazerManager.Init().then(() => {

            //WebGazer.Restart(false);    
            document.getElementsByTagName('body')[0].classList.remove('hide-webgazer-video')

            swal({
                title: "Calibration",
                text: "Please ensure that your face is visible within the rectangle within the webcam video.  When you've positioned it correctly, the rectangle will turn green and a sketch of the detected face will appear.  Then click on each of the 4 points on the screen. You must click on each point a number times till it goes yellow. This will calibrate your eye movements.",
                buttons: {
                    cancel: false,
                    confirm: true
                }
            }).then( (isConfirm:boolean) => {
                console.log('Starting calibration.');

                const player = document.getElementById('player');
                const playerBBox = player.getBoundingClientRect();
                const videoFeed = document.getElementById('webgazerVideoFeed');
                const videoBBox = videoFeed.getBoundingClientRect();
                const scale = Math.round(10.0*Math.min(playerBBox.width/videoBBox.width, playerBBox.height / videoBBox.height))/10.0;
                const tx = Math.round(10.0*(playerBBox.left + playerBBox.width/2 - videoBBox.width/2))/10.0;
                const ty = Math.round(10.0*(playerBBox.top + playerBBox.height/2 - videoBBox.height/2))/10.0;
                const transform = `translate(${tx}px,${ty}px) scale(${scale})`;
                this.videoEls.map((id:string) => document.getElementById(id))
                             .forEach((el:HTMLElement) => el.style.transform = transform )
            });

            });
        } else {
            for (var pt of <HTMLElement[]><any>document.querySelectorAll('.video-calibration-point')) {
                pt.style.display = 'none';
            }
            this.CanStartPlaying(true)
        }

        var pointIndex: number = 0;
        var points: Array<any> = [];
        WebGazerManager.currentPoint.subscribe((v: any) => {
            pointIndex = (pointIndex++) % 1000;

            var dataPoint;

            if (v.data && v.data.eyeFeatures) {
                if (this.Calibrating &&
                    !isNaN(v.data.x) &&
                    !isNaN(v.data.y)) {
                    this.CalibrationPoints.push({ x: v.data.x, y: v.data.y });
                    if (this.CalibrationPoints.length > 50) {
                        this.CalibrationPoints.pop();
                    }
                }
                var eyeFeatures = v.data.eyeFeatures;
                dataPoint = {
                    x: v.data.x,
                    y: v.data.y,
                    clock_ms: v.clock_ms,
                    timestamp: v.timestamp,
                    left_image_x: eyeFeatures.left.imagex,
                    left_image_y: eyeFeatures.left.imagey,
                    left_width: eyeFeatures.left.width,
                    left_height: eyeFeatures.left.height,
                    right_image_x: eyeFeatures.right.imagex,
                    right_image_y: eyeFeatures.right.imagey,
                    right_width: eyeFeatures.right.width,
                    right_height: eyeFeatures.right.height,
                }
            } else {
                dataPoint = {
                    clock_ms: v.clock_ms,
                    timestamp: v.timestamp,
                }
            }

            points.push(dataPoint);

            if (pointIndex === 0) {
                this.AddEvent("Change", "/Instrument", "Gaze", JSON.stringify(points));
                points = [];
            }
        });

        this.MediaComponentName = SoloStimulus.MimeTypeToPlayerType[stimulus.Type];

        if (this.MediaComponentName == undefined) {
            console.error(`MediaComponentName unknown for ${stimulus.Type}`);
        }

        this.MediaLabel = this.GetFormatted(stimulus.Label);

        this.MediaInfo = MediaInfo.Create(stimulus, this.CanStartPlaying);
        this.TrackAudioInfo("/Instrument/Stimulus", this.MediaInfo);
        this.HasMedia = true;

        this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
        this.CanAnswer.subscribe(v => {
            console.dir(v)
        });
    }

    public SlideCompleted(): boolean {
        webgazer.showPredictionPoints(false);

        ExperimentManager.SlideTitle("");

        return false;
    }

    protected HasValidAnswer(answer: any): boolean {
        return this.CanAnswer();
    }

    public Calibrate(data:any, event: Event) {
        var element = event.currentTarget as HTMLElement;

        if (this.Calibrating && element != this.CalibrationElement) {
            return;
        }

        if (element.className.match(/\bpulsate\b/)) {
            var m = element.style.transform.match(/scale\(([0-9\.]+)\)/);
            var scale = parseFloat(m[1]);

            var deltaScale = -0.2;

            if (this.CalibrationPoints.length > 10) {
                console.dir(this.CalibrationPoints);
                var bounds = element.getBoundingClientRect();
                var target = {
                    x: bounds.left + bounds.width / 2,
                    y: bounds.top + bounds.height / 2
                }
                var accuracyPct = this.CalibrationPoints
                    .map((c) => ({ dx: c.x - target.x, dy: c.y - target.y }))
                    .map((e) => (Math.sqrt((e.dx * e.dx) + (e.dy * e.dy)) / window.innerHeight))
                    .map((m) => 1.0 - (m > 1.0 ? 1.0 : m))
                var accuracyAvg = accuracyPct.reduce((l, r) => l + r, 0.0) / this.CalibrationPoints.length;

                console.log(`Accuracy Avg: ${accuracyAvg}`);
                deltaScale = -0.05 - 0.25 * accuracyAvg;
            }

            if (scale > 0.7) {
                element.style.transform = `scale(${scale + deltaScale})`;
                var h = 60 - 60 * ((scale - 0.7) / 1.3);
                element.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
                this.Calibrating = true;
                this.CalibrationElement = element;
            } else {
                this.Calibrating = false;
                this.CalibrationElement = null;
                this.CalibrationPoints = [];
                element.classList.add('calibrated');
                element.classList.remove('pulsate');
                element.style.transform = '';
                element.style.backgroundColor = '';

                const calibrationPoints = Array.prototype.slice.call(<Node[]><any>document.querySelectorAll('.video-calibration-point'));
                const allCalibrated = (calibrationPoints)
                            .map((element:HTMLElement) => !!element.className.match(/\bcalibrated\b/))
                            .reduce((a:boolean,b:boolean) => a && b, true);
                console.log(`calibrated: ${allCalibrated}`);
                if (allCalibrated) {
                    console.log('all calibrations complete');
                    (<HTMLElement>document.querySelector('.calibration-instructions')).style.display = 'none';

                    this.videoEls.map((id:string) => document.getElementById(id))
                                .forEach((el:HTMLElement) => el.style.display = 'none');

                    this.CanStartPlaying(true);
                }
            }
        } else if (element.className.match(/\bcalibrated\b/)) {
            return;
        } else {
            element.classList.add('pulsate');
            element.style.transform = `scale(2.0)`;
            element.style.backgroundColor = `hsl(0, 100%, 50%)`;
        }

        /*setTimeout( () =>  {
                this.SetAnswer({ Id: "foo" })
                console.log('set answer');
                WebGazer.end();
            }, 5000);
            */

        event.preventDefault();
    }

    public static MimeTypeToPlayerType: any = {
        'video/mp4': 'Players/Video',
        'video/youtube': 'Players/Video',
        'audio/mpeg': 'Players/Audio',
    };
}

export = SoloStimulus;