import FreetextBase = require("Components/Questions/Freetext/FreetextBase");
import QuestionModel = require("Models/Question");

type Answer = { Text: string };

class Freetext extends FreetextBase<Answer>
{
	constructor(question: QuestionModel)
	{
		super(question);
	}

	protected readonly InstrumentTemplateName = 'Freetext';

	protected UpdateAnswer(text: string): void
	{
		this.AddEvent("Change", "Keyboard", text);
		super.UpdateAnswer(text);
	}

	protected LoadText(answer: Answer): string
	{
		return answer == null || answer.Text == null ? "" : answer.Text;
	}

	protected SaveText(answer: string): Answer
	{
		return { Text: answer };
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "Freetext", "Instrument", method, data);
	}
}

export = Freetext;