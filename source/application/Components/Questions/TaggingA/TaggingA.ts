import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");

type PredefinedTag = { Label:string; Id:string; Position:number };
type TagData = {Id: string; Label: string;};
type Tag = {Data:TagData, IsAdded:KnockoutObservable<boolean>, Toggle:()=>void};

class TaggingA extends QuestionBase<{Tags:TagData[]}>
{
	public Id: string;
	public HeaderLabel: string;
	public SelectionTagsLabel: string;
	public UserTagsLabel: string;
	public InputPlaceholder: string;

	public TextInput = knockout.observable("");

	public AudioLabel: string;
	public AudioInfo: AudioInfo = null;

	public SelectionItems = knockout.observableArray<Tag>();
	public UserItems = knockout.observableArray<Tag>();
	public AddedItems = knockout.observableArray<Tag>();

	public HasSelectionItems:KnockoutComputed<boolean>;
	public HasUserItems:KnockoutComputed<boolean>;
	public HasAddedItems:KnockoutComputed<boolean>;

	public HasMedia: boolean = false;
	public AnswerIsRequired: boolean = true;

	constructor(question: QuestionModel)
	{
		super(question);

		this.Id = this.Model.Id;
		this.HeaderLabel = this.GetInstrumentFormatted("HeaderLabel");
		this.SelectionTagsLabel = this.GetInstrumentFormatted("SelectionTagBoxLabel");
		this.UserTagsLabel = this.GetInstrumentFormatted("UserTagBoxLabel");
		this.InputPlaceholder = this.GetInstrument("TextField");

		let stimulus = this.GetInstrument("Stimulus");
		if (stimulus != null)
		{
			this.AudioLabel = this.GetFormatted(stimulus.Label);

			this.AudioInfo = AudioInfo.Create(stimulus);
			this.TrackAudioInfo("/Instrument/Stimulus", this.AudioInfo);
			this.HasMedia = true;
		}

		this.SelectionItems.push(... this.CreateTags(this.GetInstrument("SelectionTags").Item.sort((a:PredefinedTag,b:PredefinedTag) => a.Position - b.Position)));
		this.UserItems.push(... this.CreateTags(this.GetInstrument("UserTags").Item.sort((a:PredefinedTag,b:PredefinedTag) => a.Position - b.Position)));

		this.HasSelectionItems = this.PureComputed(()=> this.SelectionItems().some(t => !t.IsAdded()));
		this.HasUserItems = this.PureComputed(()=> this.UserItems().some(t => !t.IsAdded()));
		this.HasAddedItems = this.PureComputed(()=> this.AddedItems().length != 0);

		this.InitializeAnswer();
	}

	private InitializeAnswer():void
	{
		if(!this.HasAnswer()) return;

		let answer = this.GetAnswer();

		if(!answer.Tags || answer.Tags.length == 0) return;

		for(let tag of answer.Tags)
		{
			if(tag.Id == null || tag.Id == "")
			{
				this.AddedItems.push(this.CreateTag({Id: null, Label: tag.Label, Position: null}, true));
			}
			else
			{
				let existingTag = this.GetTagById(tag.Id);

				if(existingTag != null)
				{
					existingTag.IsAdded(true);
					this.AddedItems.push(existingTag);
				}
			}
		}
	}

	protected GetTagByLabel(label:string):Tag
	{
		label = label.toLocaleLowerCase();

		for(let predefinedTag of this.SelectionItems())
		{
			if(predefinedTag.Data.Label.toLocaleLowerCase() == label)
				return predefinedTag
		}
		for(let predefinedTag of this.UserItems())
		{
			if(predefinedTag.Data.Label.toLocaleLowerCase() == label)
				return predefinedTag
		}
		for(let predefinedTag of this.AddedItems())
		{
			if(predefinedTag.Data.Label.toLocaleLowerCase() == label)
				return predefinedTag
		}

		return null;
	}

	protected IsTagAdded(label:string):boolean
	{
		label = label.toLocaleLowerCase();
		for(let tag of this.AddedItems())
		{
			if(tag.Data.Label.toLocaleLowerCase() == label)
				return true;
		}
		return false;
	}

	protected GetTagById(id:string):Tag
	{
		for(let predefinedTag of this.SelectionItems())
		{
			if(predefinedTag.Data.Id == id)
				return predefinedTag
		}
		for(let predefinedTag of this.UserItems())
		{
			if(predefinedTag.Data.Id== id)
				return predefinedTag
		}

		return null;
	}

	public AddText():void
	{
		if(this.TextInput() == "" || this.IsTagAdded(this.TextInput())) return;

		if(this.AddTagByLabel(this.TextInput()))
			this.TextInput("");
	}

	protected AddTagByLabel(label:string):boolean
	{
		let tag = this.GetTagByLabel(label);

		if(tag == null)
			tag = this.CreateTag({Id: null, Label: label, Position: null}, true);

		return this.AddTag(tag);
	}

	protected AddTag(tag:Tag):boolean
	{
		if(this.AddedItems.indexOf(tag) != -1) return false;

		tag.IsAdded(true);
		this.AddedItems.push(tag);

		this.AddEvent("Change", "Mouse/Left/Down", tag.Data.Label);
		this.UpdateAnswer();

		return true;
	}

	protected RemoveTag(tag:Tag):void
	{
		if(this.AddedItems.indexOf(tag) == -1) return;

		tag.IsAdded(false);
		this.AddedItems.remove(tag);

		this.AddEvent("Change", "Mouse/Left/Down", tag.Data.Label);
		this.UpdateAnswer();
	}

	private CreateTags(tags:PredefinedTag[]):Tag[]
	{
		return tags.map(t => this.CreateTag(t));
	}

	private CreateTag(data:PredefinedTag, isAdded = false):Tag
	{
		let tag:Tag = {
			Data: {Id: data.Id, Label: data.Label},
			Toggle: null,
			IsAdded: knockout.observable(isAdded)
		};

		tag.Toggle = () => this.ToggleTag(tag);

		return tag;
	}

	private ToggleTag(tag:Tag):void
	{
		if(tag.IsAdded())
			this.RemoveTag(tag);
		else
			this.AddTag(tag);
	}

	private UpdateAnswer():void
	{
		this.SetAnswer( {Tags: this.AddedItems().map(t => ({Id: t.Data.Id, Label: t.Data.Label}))});
	}

	protected HasValidAnswer(answer: any): boolean
	{
		return !this.AnswerIsRequired || answer != undefined && answer.Tags != undefined && answer.Tags.length !== 0;
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "TaggingA", "Instrument", method, data);
	}
}

export = TaggingA;