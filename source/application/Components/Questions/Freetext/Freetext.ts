import FreetextBase from 'Components/Questions/Freetext/FreetextBase';
import QuestionModel from 'Models/Question';
import * as knockout from 'knockout';

type Answer = { Text: string };

class Freetext extends FreetextBase<Answer> {
  constructor(question: QuestionModel) {
    super(question);
  }

  protected readonly InstrumentTemplateName = 'Freetext';

  protected UpdateAnswer(text: string): void {
    this.AddEvent('Change', 'Keyboard', text);
    super.UpdateAnswer(text);
  }

  protected LoadText(answer: Answer): string {
    return answer == null || answer.Text == null ? '' : answer.Text;
  }

  protected SaveText(answer: string): Answer {
    return { Text: answer };
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'Freetext', 'Instrument', method, data);
  }
}

import template from 'Components/Questions/Freetext/Freetext.html';
knockout.components.register('Questions/Freetext', {
  viewModel: Freetext,
  template,
});

export default Freetext;
