import * as knockout from 'knockout';
import QuestionWithStimulusBase from 'Components/Questions/QuestionWithStimulusBase';
import QuestionModel from 'Models/Question';

type Tick = {
  Label: string;
  Position: number;
  RelativePosition: number;
  IsMinPosition: boolean;
  IsMaxPosition: boolean;
};
type TickData = { Label: string; Position: string };

class OneDScaleT extends QuestionWithStimulusBase<{ Position: number; Time: number }> {
  private static _positionMinValue = -1;
  private static _positionMaxValue = 1;

  public X1Ticks: Tick[];
  public X2Ticks: Tick[];
  public Y1Ticks: Tick[];
  public Y2Ticks: Tick[];

  public X1Height: ko.Observable<number> = knockout.observable(0);
  public X2Height: ko.Observable<number> = knockout.observable(0);

  public HasY1Ticks: boolean;
  public HasY2Ticks: boolean;

  public Answer: ko.Observable<number> = knockout.observable<number>(null);
  public IsValueNotSet: ko.Computed<boolean>;
  public CanAnswer: ko.Observable<boolean>;

  public IsStimuliBlockVisible = true;

  public DefaultPosition: number;

  protected readonly InstrumentTemplateName = 'OneDScaleT';

  constructor(question: QuestionModel) {
    super(question);

    this.DefaultPosition = undefined;
    this.X1Ticks = this.GetTicks('X1AxisTicks');
    this.X2Ticks = this.GetTicks('X2AxisTicks');
    this.Y1Ticks = this.GetTicks('Y1AxisTicks');
    this.Y2Ticks = this.GetTicks('Y2AxisTicks');
    this.HasY1Ticks = this.Y1Ticks.length !== 0;
    this.HasY2Ticks = this.Y2Ticks.length !== 0;

    const defaultPos = this.GetInstrumentFormatted('Position');
    if (defaultPos) this.DefaultPosition = parseFloat(defaultPos);

    this.IsValueNotSet = knockout.computed(
      () => !((this.HasAnswer() && this.HasValidAnswer()) || this.DefaultPosition !== undefined),
    );

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Position);
    else this.Answer(this.DefaultPosition);

    this.Answer.subscribe((v) => {
      const times = this.MediaInfo?.MediaStateProviders?.map((mediaStateProvider) => mediaStateProvider()) || [];
      this.AddEvent('Change', 'Mouse/Left/Down', v.toString());
      this.SetAnswer({ Position: v, Time: times[0]?.PlaybackTimestamp });
    });
  }

  private GetTicks(name: string): Tick[] {
    const ticksContainer = this.GetInstrument(name);

    if (!ticksContainer) return new Array<Tick>();

    const singularTickName = ticksContainer[name.slice(0, -1)];
    const ticks = this.GetArray<TickData>(singularTickName)
      .map((t) => this.CreateTick(t))
      .filter((t) => t != null);

    return ticks;
  }

  private CreateTick(data: TickData): Tick {
    if (data.Label == null || data.Position == null) {
      console.warn('OneDScaleT tick skipped because of missing data: ' + JSON.stringify(data));
      return null;
    }

    const position = parseFloat(data.Position);

    return {
      Label: this.GetFormatted(data.Label),
      Position: position,
      RelativePosition:
        (position - OneDScaleT._positionMinValue) / (OneDScaleT._positionMaxValue - OneDScaleT._positionMinValue),
      IsMinPosition: position === OneDScaleT._positionMinValue,
      IsMaxPosition: position === OneDScaleT._positionMaxValue,
    };
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'OneDScaleT', 'Instrument', method, data);
  }

  public valueUpdated(self: OneDScaleT, event: InputEvent) {
    const times = this.MediaInfo?.MediaStateProviders?.map((mediaStateProvider) => mediaStateProvider()) || [];
    const value = parseFloat((<HTMLInputElement>event.currentTarget).value);
    this.AddEvent('Change', 'Mouse/Left/Down', JSON.stringify({ Position: value, Times: times }));
  }
}

import template from 'Components/Questions/OneDScaleT/OneDScaleT.html';
knockout.components.register('Questions/OneDScaleT', {
  viewModel: OneDScaleT,
  template,
});

export default OneDScaleT;
