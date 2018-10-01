import ExperimentManager = require("Managers/Portal/Experiment");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");

class Header extends QuestionBase<any>
{
	constructor(question: QuestionModel)
	{
		super(question, false);

		var header = this.GetComponent() as any;

		console.dir(header);
		if (header === undefined || header.HeaderLabel == undefined) throw new Error("HeaderLabel not found for Header");

		ExperimentManager.SlideTitle(this.GetFormatted(header.HeaderLabel));
	}

	public SlideCompleted(): boolean
	{
		ExperimentManager.SlideTitle("");

		return false;
	}
}

export = Header;