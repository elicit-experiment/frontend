import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import * as knockout from 'knockout';

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

import template from 'Components/Questions/TextBlock/TextBlock.html';
knockout.components.register('Questions/TextBlock', {
  viewModel: TextBlock,
  template,
});

export default TextBlock;
