import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');
import { KoComponent } from '../../../Utility/KoDecorators';

@KoComponent({
  template: null,
  name: 'Questions/TextBlock',
})
class TextBlock extends QuestionBase<any> {
  public Text: string;
  public HeaderLabel: string;
  public HasHeader: boolean;

  constructor(question: QuestionModel) {
    super(question, false);

    this.HeaderLabel = this.GetInstrumentFormatted('HeaderLabel');
    this.HasHeader = this.HeaderLabel != null && this.HeaderLabel !== '';

    this.Text = this.GetInstrumentFormatted('Text');
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'TextBlock', 'Instrument', method, data);
  }
}

export = TextBlock;
