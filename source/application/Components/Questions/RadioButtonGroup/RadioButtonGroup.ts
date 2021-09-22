import knockout = require('knockout');
import QuestionWithStimulusBase = require('Components/Questions/QuestionWithStimulusBase');
import QuestionModel = require('Models/Question');
import { shuffleInPlace } from 'Utility/ShuffleInPlace';

type ItemInfo = { Id: string; Label: string; Correct: boolean; Feedback: string };
type Item = { Label: string; Id: string; Selected: string; Correct: boolean; Feedback: string };

class RadioButtonGroup extends QuestionWithStimulusBase<{ Id: string; Correct: boolean }> {
  private _isOptional: boolean;

  public Items: ItemInfo[];
  public RowedItems: ItemInfo[][];
  public Answer: KnockoutObservable<string> = knockout.observable<string>(null);
  public AddFillerItem: KnockoutComputed<boolean>;
  public AddOneFillerItem: KnockoutComputed<boolean>;
  public AddHalfFillerItem: KnockoutComputed<boolean>;
  public CorrectnessClass: KnockoutComputed<string>;
  public ShowFeedback: boolean;
  public MustAnswerCorrectly: boolean;
  public ShowCorrectness: boolean;
  public FeedbackText: KnockoutObservable<string> = knockout.observable<string>(null);

  protected readonly InstrumentTemplateName = 'RadioButtonGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this.MustAnswerCorrectly = !!this.GetInstrument('MustAnswerCorrectly');
    this.ShowFeedback = !!this.GetInstrument('ShowFeedback');
    this.ShowCorrectness = !!this.GetInstrument('ShowCorrectness');
    const randomizeOrder = this.GetInstrument('RandomizeOrder');
    this._isOptional = parseInt(this.GetInstrument('IsOptional')) == 1;

    this.Items = this.GetItems<Item, ItemInfo>((item) => this.ItemInfo(item));
    if (randomizeOrder) {
      this.Items = shuffleInPlace(this.Items);
    }
    this.AddEvent('Render', '', JSON.stringify(this.Items));
    this.RowedItems = this.RowItems(this.Items, this.QuestionsPerRow());

    this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
    this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
    this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

    this.CorrectnessClass = knockout.computed(() => {
      const hasAnswer = this.HasAnswer();
      const isCorrect = this.GetAnswer()?.Correct;
      if (!this.ShowCorrectness || !hasAnswer) return '';
      return isCorrect ? 'correct' : 'incorrect';
    });

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
    this.Answer.subscribe((id) => {
      const item = this.Items.find((item) => item.Id === id);
      this.AddEvent('Change', 'Mouse/Left/Down', id);
      this.SetAnswer({ Id: id, Correct: item.Correct });
      this.FeedbackText(item.Feedback);
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    const item = this.Items.find((item) => item.Id === answer.Id);
    if (this.MustAnswerCorrectly && !item?.Correct) return false;
    if (this._isOptional) return true;
    return answer.Id != undefined && answer.Id != null;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'RadioButtonGroup', 'Instrument', method, data);
  }

  private ItemInfo(item: Item): ItemInfo {
    if (item.Selected === '1') this.Answer(item.Id);

    const info: ItemInfo = {
      Id: item.Id,
      Label: this.GetFormatted(item.Label),
      Feedback: item.Feedback,
      Correct: item.Correct,
    };

    return info;
  }
}

export = RadioButtonGroup;
