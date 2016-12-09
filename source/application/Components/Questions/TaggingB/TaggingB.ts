import knockout = require("knockout");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");
import TaggingA = require("Components/Questions/TaggingA/TaggingA");
import Taggle = require("Taggle");

type PredefinedTag = { Label:string; Id:string; Position:number };
type TagData = {Id: string; Label: string;};
type Tag = {Data:TagData, IsAdded:KnockoutObservable<boolean>, Toggle:()=>void};

class TaggingB extends TaggingA
{
	public TagBoxElement = knockout.observable<HTMLElement>();

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
				this.AddTagByName(tag);
				isModifying = false;
			},
			onTagRemove: (e, tag) => {
				if(isModifying) return;
				isModifying = true;
				this.RemoveTagByName(tag);
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

	private AddTagByName(tagLabel: string)
	{
		let existingTag = this.FindTagByLabel(tagLabel);

		if(existingTag != null)
		{
			existingTag.IsAdded(true);
			this.AddedItems.push(existingTag);
		}
	}

	private RemoveTagByName(tagLabel: string)
	{
		let existingTag = this.FindTagByLabel(tagLabel);

		if(existingTag != null)
		{
			existingTag.IsAdded(false);
			this.AddedItems.remove(existingTag);
		}
	}
}

export = TaggingB;