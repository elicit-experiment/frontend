import FreetextBase = require('Components/Questions/Freetext/FreetextBase');
import QuestionModel = require('Models/Question');

type Answer = { Text: string };

function makeCompletionCode() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

class CompletionCode extends FreetextBase<Answer> {
  public completionCode: string;
  constructor(question: QuestionModel) {
    super(question);

    this.completionCode = makeCompletionCode();

    this.Answer(this.completionCode);
  }

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

  public copyToClipboard(event: any, ev: any) {
    const inputEl = ev.currentTarget.querySelector('input');
    inputEl.select();
    document.execCommand('copy');
    document.getSelection().removeAllRanges();
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'CompletionCode', 'Instrument', method, data);
  }
}

export = CompletionCode;
