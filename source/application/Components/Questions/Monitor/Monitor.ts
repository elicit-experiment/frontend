import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');
import mouseTrackingManager = require('Managers/MouseTrackingManager');

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

    mouseTrackingManager.StartTracking();
    this.MouseMoveHandler = (event: MouseEvent) => {
      mouseTrackingManager.ProcessPoint(
        { x: event.x, y: event.y, timeStamp: new Date().getTime() },
        new Date().getTime(),
      );
    };
    document.addEventListener('mousemove', this.MouseMoveHandler);
  }

  public SlideCompleted(): boolean {
    this.AddEvent('Stop', 'Monitor');

    this.UpdateAnswer();

    mouseTrackingManager.StopTracking();

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
