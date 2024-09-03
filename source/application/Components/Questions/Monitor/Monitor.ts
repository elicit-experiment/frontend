import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import MouseTrackingManager from 'Managers/MouseTrackingManager';

class Monitor extends QuestionBase<{ Context: { Type: string; Data: string }; TimeZone: { Offset: number } }> {
  public KeyDownHandler: { (event: KeyboardEvent): void } | null = null;
  public MouseMoveHandler: { (event: MouseEvent): void } | null = null;

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

    MouseTrackingManager.Instance.StartTracking();
    this.MouseMoveHandler = (event: MouseEvent) => {
      MouseTrackingManager.Instance.ProcessPoint(
        { x: event.x, y: event.y, timeStamp: new Date().getTime() },
        new Date().getTime(),
      );
    };
    document.addEventListener('mousemove', this.MouseMoveHandler);
  }

  public SlideCompleted(): boolean {
    this.AddEvent('Stop', 'Monitor');

    this.UpdateAnswer();

    MouseTrackingManager.Instance.StopTracking();

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

knockout.components.register('Questions/Monitor', {
  viewModel: Monitor,
  template: '<div></div>',
});

export default Monitor;
