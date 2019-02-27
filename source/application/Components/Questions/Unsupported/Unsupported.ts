import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");

class Unsupported extends QuestionBase<any>
{
	constructor(question: QuestionModel)
	{
		super(question, false);
		console.log("Unsupported question type: " + question.APIType);
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "Unsupported", "Instrument", method, data);
	}
}

export = Unsupported; 