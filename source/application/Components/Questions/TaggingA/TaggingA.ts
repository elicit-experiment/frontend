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
	public CanAnswer: KnockoutObservable<boolean>;
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

		this.CanAnswer = this.WhenAllAudioHavePlayed(this.AudioInfo, true);

		this.SelectionItems.push(... this.CreateTags(this.GetInstrument("SelectionTags").sort((a:PredefinedTag,b:PredefinedTag) => a.Position - b.Position)));
		this.UserItems.push(... this.CreateTags(this.GetInstrument("UserTags").sort((a:PredefinedTag,b:PredefinedTag) => a.Position - b.Position)));

		this.HasSelectionItems = this.PureComputed(()=> this.SelectionItems().some(t => !t.IsAdded()));
		this.HasUserItems = this.PureComputed(()=> this.UserItems().some(t => !t.IsAdded()));
		this.HasAddedItems = this.PureComputed(()=> this.AddedItems().length != 0);

		/*this.Items = this.GetItems<Item, ItemInfo>(item => this.ItemInfo(item));

		if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
		this.Answer.subscribe(v =>
		{
			this.AddEvent("Change", "/Instrument", "Mouse/Left/Down", v);
			this.SetAnswer({ Id: v });
		});*/
	}

	public AddText():void
	{
		if(this.TextInput() == "") return;

		this.AddedItems.push(this.CreateTag({Id: null, Label: this.TextInput(), Position: null}, true));

		this.AddEvent("Change", "/Instrument", "Keyboard", this.TextInput());
		this.UpdateAnswer();
		this.TextInput("");
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
		{
			this.AddedItems.remove(tag);
			tag.IsAdded(false);
		}
		else
		{
			this.AddedItems.push(tag);
			tag.IsAdded(true);
		}

		this.AddEvent("Change", "/Instrument", "Mouse/Left/Down", tag.Data.Label);
		this.UpdateAnswer();
	}

	private UpdateAnswer():void
	{
		this.SetAnswer( {Tags: this.AddedItems().map(t => ({Id: t.Data.Id, Label: t.Data.Label}))});
	}

	protected HasValidAnswer(answer: any): boolean
	{
		return !this.AnswerIsRequired || answer != undefined && answer.Tags != undefined && answer.Tags.length !== 0;
	}
}

export = TaggingA;