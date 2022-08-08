import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');

class Monitor extends QuestionBase<{ Context: { Type: string; Data: string }; TimeZone: { Offset: number } }> {
  public KeyDownHandler: { (event: KeyboardEvent): void } | null = null;

  constructor(question: QuestionModel) {
    super(question, false);
  }

  public SlideLoaded(): void {
    this.AddEvent('Start', 'Monitor');

    this.UpdateAnswer();

    this.KeyDownHandler = (event: KeyboardEvent) => {
      this.AddEvent('KeyDown', 'None', event.code.toString());
    };
    document.addEventListener('keydown', this.KeyDownHandler);
  }

  public SlideCompleted(): boolean {
    this.AddEvent('Stop', 'Monitor');

    this.UpdateAnswer();

    return true;
  }

  private UpdateAnswer(): void {
    this.SetAnswer({
      Context: { Type: 'UserAgent', Data: navigator.userAgent },
      TimeZone: { Offset: new Date().getTimezoneOffset() },
    });
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'Monitor', 'Instrument', method, data);
  }
}

export = Monitor;
