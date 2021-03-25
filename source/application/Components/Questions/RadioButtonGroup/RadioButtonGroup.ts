import knockout = require("knockout");
import QuestionWithStimulusBase = require("Components/Questions/QuestionWithStimulusBase");
import QuestionModel = require("Models/Question");
import {shuffleInPlace} from "Utility/ShuffleInPlace";

type ItemInfo = { Id: string; Label: string; };
type Item = { Label: string; Id: string; Selected: string };

class RadioButtonGroup extends QuestionWithStimulusBase<{ Id: string }> {
  private _isOptional: boolean;

  public Items: ItemInfo[];
  public RowedItems: ItemInfo[][];
  public Answer: KnockoutObservable<string> = knockout.observable<string>(null);
  public AddFillerItem: KnockoutComputed<boolean>;
  public AddOneFillerItem: KnockoutComputed<boolean>;
  public AddHalfFillerItem: KnockoutComputed<boolean>;

  constructor(question: QuestionModel) {
    super(question);

    var randomizeOrder = this.GetInstrument("RandomizeOrder");
    this._isOptional = parseInt(this.GetInstrument("IsOptional")) == 1;

    this.Items = this.GetItems<Item, ItemInfo>(item => this.ItemInfo(item));
    if (randomizeOrder) {
      this.Items = shuffleInPlace(this.Items)
    }
    this.AddEvent("Render", "", JSON.stringify(this.Items))
    this.RowedItems = this.RowItems(this.Items, this.QuestionsPerRow());

    this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
    this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
    this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
    this.Answer.subscribe(v => {
      this.AddEvent("Change", "Mouse/Left/Down", v);
      this.SetAnswer({Id: v});
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    if (this._isOptional) return true;
    return answer.Id != undefined && answer.Id != null;
  }

  public AddEvent(eventType: string, method: string = "None", data: string = "None"): void {
    super.AddRawEvent(eventType, "RadioButtonGroup", "Instrument", method, data);
  }

  private ItemInfo(data: Item): ItemInfo {
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