import knockout = require("knockout");
import TaggingA = require("Components/Questions/TaggingA/TaggingA");
import Taggle = require("Taggle");

type PredefinedTag = { Label:string; Id:string; Position:number };
type TagData = {Id: string; Label: string;};
type Tag = {Data:TagData, IsAdded:KnockoutObservable<boolean>, Toggle:()=>void};

class TaggingB extends TaggingA
{
	public TagBoxElement = knockout.observable<HTMLElement>();
	protected readonly InstrumentTemplateName = TaggingB.name;

	constructor(question: QuestionModel)
	{
		super(question);

		this.SubscribeUntilChange(this.TagBoxElement, e => this.InitializeTagBox(e));
	}

	private InitializeTagBox(element: HTMLElement)
	{
		let isModifying = false;

		let taggle = new Taggle(element, {
			tags: this.AddedItems().map(t => t.Data.Label),
			preserveCase: true,
			placeholder: this.InputPlaceholder,
			onTagAdd: (e, tag) => {
				if(isModifying) return;
				isModifying = true;
				this.AddTagByLabel(tag);
				isModifying = false;
			},
			onBeforeTagAdd:
			(e, tag) => !this.IsTagAdded(tag),
			onTagRemove: (e, tag) => {
				if(isModifying) return;
				isModifying = true;
				this.RemoveTagByLabel(tag);
				isModifying = false;
			}
		});

		this.SubscribeToArray(this.AddedItems, (tag, status)=> {
			if(isModifying) return;
			isModifying = true;
			if(status === "added")
				taggle.add(tag.Data.Label);
			else if(status === "removed")
				taggle.remove(tag.Data.Label);
			isModifying = false;
		});
	}

	private RemoveTagByLabel(tagLabel: string)
	{
		let existingTag = this.GetTagByLabel(tagLabel);

		if(existingTag != null)
			this.RemoveTag(existingTag);
	}

	public AddEvent(eventType:string, method:string = "None", data:string = "None"):void
	{
		super.AddRawEvent(eventType, "TaggingB", "Instrument", method, data);
	}
}

export = TaggingB;