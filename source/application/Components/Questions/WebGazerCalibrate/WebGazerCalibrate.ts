import knockout = require("knockout");
import ExperimentManager = require("Managers/Portal/Experiment");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import webGazerCalibration = require("Components/WebGazer/WebGazerCalibration");

class WebGazerCalibrate extends QuestionBase<any>
{
    public AnswerIsRequired: boolean = true;
    public HasMedia: boolean = false;
    public CanAnswer: KnockoutObservable<boolean>;
	public Answer: KnockoutObservable<boolean> = knockout.observable<boolean>(null);
    public _webGazerCalibration = webGazerCalibration;

    constructor(question: QuestionModel)
	{
		super(question, true);

        $('.panel-heading').hide();
        $('.panel-footer').hide();
        $('.panel-body').css('height', 'calc(100vh - 100px)');
        //$('.container').hide();
        //$("#webgazer-calibration").appendTo("body");

        console.log('ctor');
        //console.dir(webgazer);
        //webgazer.begin();
        this._webGazerCalibration = webGazerCalibration;
        this._webGazerCalibration.init();

        var pointIndex: number = 0;
        this._webGazerCalibration.currentPoint.subscribe((v:any) => {
            pointIndex = (pointIndex++)%10;
            if (pointIndex == 0) {
                if (v.eyeFeatures) {
                    var dataPoint = {
                        x: v.x,
                        y: v.y,
                        clock_ms: v.clock_ms,
                        timestamp: v.timestamp,
                        left_image_x: v.eyeFeatures.left.imagex,
                        left_image_y: v.eyeFeatures.left.imagey,
                        left_width: v.eyeFeatures.left.width,
                        left_height: v.eyeFeatures.left.height,
                        right_image_x: v.eyeFeatures.right.imagex,
                        right_image_y: v.eyeFeatures.right.imagey,
                        right_width: v.eyeFeatures.right.width,
                        right_height: v.eyeFeatures.right.height,
                    }
                    console.dir(dataPoint);
                    console.log(JSON.stringify(v).length);        
                }
            }
        });
        
        this.CanAnswer = knockout.computed(() => true);
        //this.Answer(true); // we can immediately go to next slide

        this.Answer.subscribe(v =>
            {
                this.HideWebGazerVideo();
            });
    }

    public RestartCalibration() {
        console.log('restarting');
        this._webGazerCalibration.Restart(true);
    }

    public HideWebGazerVideo() {
        ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'].forEach((s) => $('#'+s).hide());
    }

	public SlideCompleted(): boolean
	{
        console.log('completed');
		ExperimentManager.SlideTitle("");

		return false;
    }
    
    protected HasValidAnswer(answer: any): boolean
	{
        console.log(this.CanAnswer());
        return answer;
    }
}

export = WebGazerCalibrate;