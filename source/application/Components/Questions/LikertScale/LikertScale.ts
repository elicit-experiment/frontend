import knockout = require('knockout');
import QuestionWithStimulusBase = require('Components/Questions/QuestionWithStimulusBase');
import QuestionModel = require('Models/Question');
import { KoComponent } from '../../../Utility/KoDecorators';

type ItemInfo = { Id: string; Label: string };
type Item = { Label: string; Id: string; Selected: string };

@KoComponent({
  template: null,
  name: 'Questions/LikertScale',
})
class LikertScale extends QuestionWithStimulusBase<{ Id: string }> {
  public Items: ItemInfo[];
  public Answer: KnockoutObservable<string> = knockout.observable<string>(null);
  public CanAnswer: KnockoutObservable<boolean>;
  public AnswerIsRequired = true;
  public IsStimuliBlockVisible = true;

  protected readonly InstrumentTemplateName = 'LikertScale';

  constructor(question: QuestionModel) {
    super(question);

    this.AnswerIsRequired = this.GetInstrument('MinNoOfScalings') !== '0';

    this.Items = this.GetItems<Item, ItemInfo>((item) => this.ItemInfo(item));

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
    this.Answer.subscribe((v) => {
      this.AddEvent('Change', 'Mouse/Left/Down', v);
      this.SetAnswer({ Id: v });
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    return !this.AnswerIsRequired || (answer.Id != undefined && answer.Id != null);
  }

  private ItemInfo(data: Item): ItemInfo {
    if (data.Selected === '1') this.Answer(data.Id);

    const info = {
      Id: data.Id,
      Label: this.GetFormatted(data.Label),
    };

    return info;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'LikertScale', 'Instrument', method, data);
  }
}

export = LikertScale;
