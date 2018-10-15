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
        
        this.CanAnswer = knockout.computed(() => true);
        //this.Answer(true); // we can immediately go to next slide

        this.Answer.subscribe(v =>
            {
                this.HideWebGazerVideo();
            });
    }

    public RestartCalibration() {
        console.log('restarting');
        this._webGazerCalibration.Restart();
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