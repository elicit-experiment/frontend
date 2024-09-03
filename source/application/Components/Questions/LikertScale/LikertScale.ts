import * as knockout from 'knockout';
import QuestionWithStimulusBase from 'Components/Questions/QuestionWithStimulusBase';
import QuestionModel from 'Models/Question';

type ItemInfo = { Id: string; Label: string };
type Item = { Label: string; Id: string; Selected: string };

class LikertScale extends QuestionWithStimulusBase<{ Id: string }> {
  public Items: ItemInfo[];
  public Answer: ko.Observable<string> = knockout.observable<string>(null);
  public CanAnswer: ko.Observable<boolean>;
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

import template from 'Components/Questions/LikertScale/LikertScale.html';
knockout.components.register('Questions/LikertScale', {
  viewModel: LikertScale,
  template,
});

export default LikertScale;
