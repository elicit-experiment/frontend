﻿import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");

class Monitor extends QuestionBase<{Context: {Type:string; Data:string}; TimeZone: {Offset: number}}>
{
	constructor(question: QuestionModel)
	{
		super(question, false);
	}

	public SlideLoaded(): void
	{
		this.AddEvent("Start", "Monitor");

		this.UpdateAnswer();
	}

	public SlideCompleted(): boolean
	{
		this.AddEvent("Stop", "Monitor");

		this.UpdateAnswer();

		return true;
	}

	private UpdateAnswer():void
	{
		this.SetAnswer({ Context: { Type: "UserAgent", Data: navigator.userAgent }, TimeZone: { Offset: new Date().getTimezoneOffset() } });
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "Monitor", "Instrument", method, data);
	}
}

export = Monitor;