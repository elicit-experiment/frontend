import * as knockout from 'knockout';
import QuestionModel from 'Models/Question';
import QuestionWithStimulusBase from 'Components/Questions/QuestionWithStimulusBase';

class FreetextBase<T> extends QuestionWithStimulusBase<T> {
  public Id: string;
  public Label = '';
  public Answer: ko.Observable<string> = knockout.observable<string>(null);
  public LabelPosition = 'left';
  public LabelPositionLeft = false;
  public LabelPositionTop = false;
  public LabelPositionRight = false;
  public LabelPositionBottom = false;

  private _validation: RegExp;
  private _boxHeight: string = null;
  private _boxWidth: string = null;
  private _resizeable = false;

  constructor(question: QuestionModel) {
    super(question);

    if (this.HasInstrument()) {
      this.Label = this.GetInstrumentFormatted('Label');

      const validation = this.GetInstrument('Validation');

      if (validation) this._validation = new RegExp(validation);

      this._resizeable = !!this.GetInstrument('Resizeable');
      this._boxHeight = this.GetInstrumentFormatted('BoxHeight');
      this._boxWidth = this.GetInstrumentFormatted('BoxWidth');
    }

    this.LabelPosition = this.GetInstrument('LabelPosition');

    switch (this.LabelPosition) {
      case 'left':
        this.LabelPositionLeft = true;
        break;
      case 'top':
        this.LabelPositionTop = true;
        break;
      case 'right':
        this.LabelPositionRight = true;
        break;
      case 'bottom':
        this.LabelPositionBottom = true;
        break;
    }

    if (this.HasAnswer()) this.Answer(this.LoadText(this.GetAnswer()));

    this.Answer.extend({ rateLimit: { method: 'notifyWhenChangesStop', timeout: 200 } });
    this.Answer.subscribe((v) => this.UpdateAnswer(v));
  }

  protected IsResizeable(): boolean {
    console.log(this._resizeable);
    return this._resizeable;
  }
  protected BoxHeight(): string {
    return this._boxHeight;
  }
  protected BoxWidth(): string {
    return this._boxWidth;
  }

  protected GetResizableDimensions() {
    const properties: any = {};
    if (this._boxWidth) {
      properties.cols = this._boxWidth;
    }
    if (this._boxHeight) {
      properties.rows = this._boxHeight;
    }

    console.dir(properties);

    return properties;
  }

  protected UpdateAnswer(text: string): void {
    this.SetAnswer(this.SaveText(text));
  }

  protected LoadText(answer: T): string {
    throw new Error('Not implemented');
  }

  protected SaveText(answer: string): T {
    throw new Error('Not implemented');
  }

  protected HasValidAnswer(answer: T): boolean {
    if (!this._validation) return true;

    const text = answer == null ? '' : this.LoadText(answer);

    return this._validation.test(text);
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'FreeText', 'Instrument', method, data);
  }
}

export default FreetextBase;
