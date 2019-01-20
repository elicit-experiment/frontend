import knockout = require("knockout");
import CockpitPortal = require("Managers/Portal/Cockpit");
import QuestionMap = require("Components/Questions/QuestionMap");

class Question
{
	public Id: string;
	public Type: string;
	public APIType:string;
	public HasUIElement: boolean;
	public Input: any[];
	public Component: any[];
	public Answer: KnockoutObservable<CockpitPortal.IOutput> = knockout.observable<CockpitPortal.IOutput>();
	public HasValidAnswer: KnockoutObservable<boolean> = knockout.observable(false);
	public RequiresInput: boolean;
	public ScrollToCallback: KnockoutObservable<(duration: number) => void> = knockout.observable(null);

	private _loadedCallback:()=>void;

	constructor(question: CockpitPortal.IQuestion, answerChangedCallback: (question: Question)=>void, questionLoadedCallback:()=>void)
	{
		var questionMap:any;
		var input;

		if (question.Type.indexOf('NewComponent') == 0) {
			console.log(question.Type);
			const component = question.Component as any;
			console.dir(component);

			if (question.Type == 'NewComponent::WebGazerCalibrate') {
				questionMap = QuestionMap.Get('WebGazerCalibrate');
				input = component
			} else if (component.hasOwnProperty('Stimuli')) {
				questionMap = QuestionMap.Get('SoloStimulus');
				input = component.Stimuli; // TODO: Handle more than one stimulus ?
			} else if (component.hasOwnProperty('Instruments')) {
				input = [component.Instruments[0].Instrument]; // TODO: Handle more than one instrument
				const type = Object.keys(input[0])[0];
				input = input.map((x) => {return {Instrument: x[type]} });
				questionMap = QuestionMap.Get(type);
			}
			console.dir(input);
			console.dir(questionMap);
		} else {
			input = question.Component;
			questionMap = QuestionMap.Get(question.Type);
		}
		this.Id = question.Id;
		this.Type = questionMap.Type;
		this.HasUIElement = questionMap.HasUIElement;
		this.APIType = question.Type;
		this._loadedCallback = questionLoadedCallback;

		if (question.Output)
			this.Answer(question.Output);

		this.Input = input;
		this.Component = question.Component;

		this.Answer.extend({ rateLimit: { timeout: 200, method: "notifyWhenChangesStop" } });
		this.Answer.subscribe(() => answerChangedCallback(this));
	}

	public Loaded():void
	{
		if (this._loadedCallback === null) return;
		this._loadedCallback();
		this._loadedCallback = null;
	}

	public ScrollTo(duration:number):void
	{
		if (this.ScrollToCallback() == null) throw new Error("SrollTo not ready");
		this.ScrollToCallback()(duration);
	}
}

export = Question;