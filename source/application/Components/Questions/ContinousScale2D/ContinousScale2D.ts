import * as knockout from 'knockout';
import QuestionWithStimulusBase from 'Components/Questions/QuestionWithStimulusBase';
import QuestionModel from 'Models/Question';

type ContinousScale2DAnswer = { X: number; Y: number; T: number } | null;

class ContinousScale2D extends QuestionWithStimulusBase<ContinousScale2DAnswer> {
  private static BackgroundStrokeColor = '#eee';
  private static BackgroundLineSpacing = 10;
  private static BorderStrokeColor = '#000';
  private static AxisStrokeColor = '#000';
  private static PositionStrokeColor = '#000';
  private static PositionFillColor = '#999';
  private static LabelColor = '#000';
  private static LabelMargin = 5;

  private DefaultPosition: ContinousScale2DAnswer = null;
  private Position: ContinousScale2DAnswer = null;
  public Answer: ko.Observable<ContinousScale2DAnswer> = knockout.observable<ContinousScale2DAnswer>(null);
  public IsValueNotSet: ko.Computed<boolean>;

  public Context: ko.Observable<CanvasRenderingContext2D> = knockout.observable<CanvasRenderingContext2D>();
  public Width: ko.Observable<number> = knockout.observable<number>();
  public Height: ko.Observable<number> = knockout.observable<number>();

  private XMinLabel = 'Cheap';
  private XMaxLabel = 'Expensive';
  private YMinLabel = 'Cool';
  private YMaxLabel = 'Uncool';

  protected readonly InstrumentTemplateName = 'TwoDScale';

  constructor(question: QuestionModel) {
    super(question);

    this.Subscribe(this.Context, () => this.Update());
    this.Subscribe(this.Width, () => this.Update());
    this.Subscribe(this.Height, () => this.Update());

    const defaultPos = this.GetInstrumentFormatted('Position');
    if (defaultPos) this.DefaultPosition = JSON.parse(defaultPos);

    this.IsValueNotSet = knockout.computed(
      () => !((this.HasAnswer() && this.HasValidAnswer()) || this.DefaultPosition !== undefined),
    );

    if (this.HasAnswer()) this.Answer(this.GetAnswer());
    else this.Answer(this.DefaultPosition);

    this.Answer.subscribe((v) => {
      this.AddEvent('Change', 'Mouse/Left/Down', v.toString());
      this.SetAnswer(v);
    });
  }

  public SetPosition(x: number, y: number): void {
    const context = this.Context();

    context.clearRect(0, 0, this.Width(), this.Height());
    this.DrawBackground();

    context.beginPath();

    const canvasRect = context.canvas.getBoundingClientRect();

    x -= canvasRect.left - context.canvas.offsetLeft;
    y -= canvasRect.top - context.canvas.offsetTop;

    context.arc(x, y, 5, 0, Math.PI * 2, false);

    context.closePath();

    context.strokeStyle = ContinousScale2D.PositionStrokeColor;
    context.stroke();
    context.fillStyle = ContinousScale2D.PositionFillColor;
    context.fill();

    this.Answer({ X: x / canvasRect.width - 0.5, Y: y / canvasRect.height - 0.5, T: 0 });
  }

  private Update(): void {
    if (this.Context() == null || this.Width() == null || this.Height() == null) return;

    this.DrawBackground();
  }

  private DrawBackground(): void {
    this.DrawGrid();
    this.DrawAxis();
    this.DrawLabels();
    this.DrawBorder();
  }

  private DrawGrid(): void {
    const context = this.Context();
    const width = this.Width();
    const height = this.Height();

    context.beginPath();

    for (let x = 0.5; x < width; x += ContinousScale2D.BackgroundLineSpacing) {
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }

    for (let y = 0.5; y < height; y += ContinousScale2D.BackgroundLineSpacing) {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }

    context.strokeStyle = ContinousScale2D.BackgroundStrokeColor;
    context.stroke();
  }

  private DrawAxis(): void {
    const context = this.Context();
    const width = this.Width();
    const height = this.Height();

    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);

    context.strokeStyle = ContinousScale2D.AxisStrokeColor;
    context.stroke();
  }

  private DrawLabels(): void {
    const context = this.Context();
    const width = this.Width();
    const height = this.Height();

    context.fillStyle = ContinousScale2D.LabelColor;
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(this.XMinLabel, ContinousScale2D.LabelMargin, height / 2 - ContinousScale2D.LabelMargin);
    context.textAlign = 'right';
    context.fillText(this.XMaxLabel, width - ContinousScale2D.LabelMargin, height / 2 - ContinousScale2D.LabelMargin);
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(this.YMinLabel, width / 2 + ContinousScale2D.LabelMargin, ContinousScale2D.LabelMargin);
    context.textBaseline = 'bottom';
    context.fillText(this.YMaxLabel, width / 2 + ContinousScale2D.LabelMargin, height - ContinousScale2D.LabelMargin);
  }

  private DrawBorder(): void {
    const context = this.Context();
    const width = this.Width();
    const height = this.Height();

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, 0);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();

    context.strokeStyle = ContinousScale2D.BorderStrokeColor;
    context.stroke();
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'TwoDScale', 'Instrument', method, data);
  }
}

import template from 'Components/Questions/ContinousScale2D/ContinousScale2D.html';
knockout.components.register('Questions/ContinousScale2D', {
  viewModel: ContinousScale2D,
  template,
});

export default ContinousScale2D;
