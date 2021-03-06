﻿import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");
import { shuffleInPlace } from "Utility/ShuffleInPlace";

type ItemInfo = { Id: string; Label: string; IsEnabled: KnockoutComputed<boolean>; };
type Item = { Label: string; Id: string; Selected: string };

class CheckBoxGroup extends QuestionBase<{Selections:string[]}>
{
	private _minNoOfSelections: number;
	private _maxNoOfSelections: number;

	public Id: string;
	public HeaderLabel: string;
	public AudioLabel: string;
	public AudioInfo: AudioInfo = null;
	public Items: ItemInfo[];
	public RowedItems: ItemInfo[][];
	public Answer: KnockoutObservableArray<string> = knockout.observableArray<string>();
	public CanSelectMore: KnockoutComputed<boolean>;
	public HasMedia: boolean = false;
	public CanAnswer: KnockoutObservable<boolean>;
	public AddFillerItem: KnockoutComputed<boolean>;
	public AddOneFillerItem: KnockoutComputed<boolean>;
	public AddHalfFillerItem: KnockoutComputed<boolean>;

	public IsStimuliBlockVisible: boolean = true;
    private _alignForStimuli: boolean = true;

	constructor(question: QuestionModel)
	{
		super(question);

		this.Id = this.Model.Id;
		this.HeaderLabel = this.GetInstrumentFormatted("HeaderLabel");
		this._minNoOfSelections = parseInt(this.GetInstrument("MinNoOfSelections"));
		this._maxNoOfSelections = parseInt(this.GetInstrument("MaxNoOfSelections"));
		var randomizeOrder = this.GetInstrument("RandomizeOrder");
		var alignForStimuli = this.GetInstrument("AlignForStimuli");
		var randomizeOrder = this.GetInstrument("RandomizeOrder");
        this._alignForStimuli = alignForStimuli === undefined || alignForStimuli === "1";
        this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

		var stimulus = this.GetStimulusInstrument("Stimulus");
		if (stimulus != null)
		{
			this.AudioLabel = this.GetFormatted(stimulus.Label);

			this.AudioInfo = new AudioInfo([{ Type: stimulus.Type, Source: stimulus.URI }]);
			this.TrackAudioInfo("/Instrument/Stimulus", this.AudioInfo);
			this.HasMedia = true;
		}

		this.CanAnswer = this.WhenAllAudioHavePlayed(this.AudioInfo, true);

		this.CanSelectMore = knockout.computed(() => this.Answer().length < this._maxNoOfSelections);

		this.Items = this.GetItems<Item, ItemInfo>(v => this.CreateItemInfo(v));
		if (randomizeOrder) {
			this.Items = shuffleInPlace(this.Items)
		}
		this.AddEvent("Render", "", JSON.stringify(this.Items))
		this.RowedItems = this.RowItems(this.Items, 4);

		this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
		this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
		this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

		if (this.HasAnswer())
		{
			if (this.GetAnswer()["Selections"])
				this.Answer.push.apply(this.Answer, this.GetAnswer().Selections);
		}
		else
			this.SetAnswer({ Selections: [] });
		
		this.Answer.subscribe(v =>
		{
			this.AddEvent("Change", "Mouse/Left/Down", v.join(","));
			this.SetAnswer({ Selections: v });
		});
	}

	protected HasValidAnswer(answer: any): boolean
	{
		if (this._minNoOfSelections === 0) return true;
		if (!answer.Selections) return false;

		return answer.Selections.length >= this._minNoOfSelections;
	}

	private CreateItemInfo(data: Item):ItemInfo
	{
		if (data.Selected === "1")
			this.Answer.push(data.Id);

		var info = {
			Id: data.Id,
			Label: this.GetFormatted(data.Label),
			IsEnabled: knockout.computed(() => this.CanAnswer() && (this.Answer.indexOf(data.Id) !== -1 || this.CanSelectMore()))
		};

		return info;
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "CheckBoxGroup", "Instrument", method, data);
	}
}

export = CheckBoxGroup;