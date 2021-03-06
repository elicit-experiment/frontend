﻿import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");
import { shuffleInPlace } from "Utility/ShuffleInPlace";

type ItemInfo = { Id: string; Label: string; };
type Item = { Label: string; Id: string; Selected: string };

class RadioButtonGroup extends QuestionBase<{Id:string}>
{
    private _isOptional: boolean;

    public Id: string;
	public HeaderLabel: string;
	public AudioLabel: string;
	public AudioInfo: AudioInfo = null;
	public Items: ItemInfo[];
	public RowedItems: ItemInfo[][];
	public Answer: KnockoutObservable<string> = knockout.observable<string>(null);
	public HasMedia: boolean = false;
	public CanAnswer: KnockoutObservable<boolean>; 
	public AddFillerItem:KnockoutComputed<boolean>;
	public AddOneFillerItem:KnockoutComputed<boolean>;
	public AddHalfFillerItem:KnockoutComputed<boolean>;

    public IsStimuliBlockVisible: boolean = true;

    private _alignForStimuli: boolean = true;
    private _questionsPerRow: number = 4;

    constructor(question: QuestionModel)
	{
		super(question);

		this.Id = this.Model.Id;
		this.HeaderLabel = this.GetInstrumentFormatted("HeaderLabel");

		var alignForStimuli = this.GetInstrument("AlignForStimuli");
		var questionsPerRow = this.GetInstrument("QuestionsPerRow");
		var randomizeOrder = this.GetInstrument("RandomizeOrder");
        this._alignForStimuli = alignForStimuli === undefined || alignForStimuli === "1";
        this._questionsPerRow = questionsPerRow === undefined ? 4 : questionsPerRow;
        this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

		var stimulus = this.GetInstrument("Stimulus");
		if (stimulus != null)
		{
			this.AudioLabel = this.GetFormatted(stimulus.Label);

			this.AudioInfo = AudioInfo.Create(stimulus);
			this.TrackAudioInfo("/Instrument/Stimulus", this.AudioInfo);
			this.HasMedia = true;
		}

        this._isOptional = parseInt(this.GetInstrument("IsOptional")) == 1;

        this.CanAnswer = this.WhenAllAudioHavePlayed(this.AudioInfo, true);

		this.Items = this.GetItems<Item, ItemInfo>(item => this.ItemInfo(item));
		if (randomizeOrder) {
			this.Items = shuffleInPlace(this.Items)
		}
		this.AddEvent("Render", "", JSON.stringify(this.Items))
		this.RowedItems = this.RowItems(this.Items, this._questionsPerRow);

		this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
		this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
		this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

		if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
		this.Answer.subscribe(v =>
		{
			this.AddEvent("Change", "Mouse/Left/Down", v);
			this.SetAnswer({ Id: v });
		});
	}

	protected HasValidAnswer(answer: any): boolean
	{
		if (this._isOptional) return true;
		return answer.Id != undefined && answer.Id != null;
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "RadioButtonGroup", "Instrument", method, data);
	}

	private ItemInfo(data: Item): ItemInfo
	{
		if (data.Selected === "1")
			this.Answer(data.Id);

		var info = {
			Id: data.Id,
			Label: this.GetFormatted(data.Label)
		};

		return info;
	}
}

export = RadioButtonGroup;