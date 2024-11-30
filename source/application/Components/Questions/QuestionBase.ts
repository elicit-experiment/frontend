import * as knockout from 'knockout';
import { IQuestionEvent } from 'Managers/Portal/Cockpit';
import QuestionModel from 'Models/Question';
import MediaInfo from 'Components/Players/MediaInfo';
import DisposableComponent from 'Components/DisposableComponent';
import TextFormatter from 'Managers/TextFormatter';

abstract class QuestionsBase<T> extends DisposableComponent implements IQuestionViewModel {
  protected Model: QuestionModel;
  protected HasAnswer: ko.Computed<boolean>;
  private _events: IQuestionEvent[];
  public StimulusCssClass = 'col-12';
  public InstrumentCssClass = 'col-12';
  public IsColumnLayout = false;

  constructor(question: QuestionModel, requiresInput = true) {
    super();
    this.Model = question;
    this.Model.RequiresInput = requiresInput;
    this.HasAnswer = knockout.computed(
      () => this.Model.Answer() != null && this.HasNoneEventsProperty(this.GetAnswer()),
    );

    const answer = this.Model.Answer();
    this._events = answer != null && answer.Events ? answer.Events : [];

    this.configureLayout();

    setTimeout(() => {
      console.log(this.constructor.name + ' -> LOADED');
      this.UpdateIsAnswerValid();
      this.Model.Loaded();
    }, 0); //Give descendant time to override HasValidAnswer
  }

  private configureLayout() {
    this.IsColumnLayout = this.Model.Layout?.Type === 'column';

    if (this.IsColumnLayout) {
      const stimulusCols = Math.ceil((this.Model.Layout.ColumnWidthPercent[0] * 12) / 100);
      const instrumentCols = 12 - stimulusCols;
      this.StimulusCssClass = `col-${stimulusCols}`;
      this.InstrumentCssClass = `col-${instrumentCols}`;
    }
  }

  protected UpdateIsAnswerValid(answer?: T): void {
    answer = answer || this.GetAnswer();

    this.Model.HasValidAnswer(this.HasValidAnswer(answer));
  }

  protected HasValidAnswer(answer?: T): boolean {
    answer = answer || this.GetAnswer();

    return !this.Model.RequiresInput || this.HasNoneEventsProperty(answer);
  }

  private HasNoneEventsProperty(answer: T): boolean {
    for (const key in answer) if (key !== 'Events') return true;

    return false;
  }

  protected GetFormatted(unformatted: string): string {
    return unformatted === null || unformatted === undefined ? unformatted : TextFormatter.Format(unformatted);
  }

  protected GetStimulusInstrument(key: string): IStimulus {
    return this.GetInstrument(key);
  }

  protected GetInstrument(key: string): any {
    return this.GetIntrumentObject()[key];
  }

  protected GetInputs(): any[] {
    return this.Model === null || this.Model.Input === null ? new Array<any>() : this.Model.Input;
  }

  protected GetComponent(): any[] {
    return this.Model === null || this.Model.Component === null ? new Array<any>() : this.Model.Component;
  }

  protected GetInstrumentFormatted(key: string): string {
    const instrument = this.GetInstrument(key);

    if (instrument === null || instrument === undefined) return instrument;
    if (typeof instrument === 'string') return this.GetFormatted(instrument);

    throw new Error(`Instrument ${key} is not a string but: ${instrument}`);
  }

  private GetIntrumentObject(): { [key: string]: any } {
    const inputs = this.GetInputs();

    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].Instrument) return inputs[i].Instrument;
    }

    throw new Error('Instrument object not found in input');
  }

  protected HasInstrument(): boolean {
    const inputs = this.GetInputs();

    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].Instrument) return true;
    }
    return false;
  }

  protected GetAnswer(): T {
    const answer = <any>this.Model.Answer();

    return answer ? answer : {};
  }

  protected SetAnswer(answer: T): void {
    this.UpdateIsAnswerValid(answer);

    const output = <any>answer;
    output.Events = this._events.map(this.CloneEvent);

    // becaue of rate limiting, we cannot simply
    //		output.Events = this._events;
    //this._events = [];

    this.Model.Answer(output);
  }

  protected GetArray<TItem>(data: TItem | TItem[]): TItem[] {
    if (data instanceof Array) return <TItem[]>data;
    return [<TItem>data];
  }

  protected GetItems<TInput, TOutput>(converter: (item: TInput) => TOutput): TOutput[] {
    return this.GetArray<TInput>(this.GetInstrument('Items').Item).map(converter);
  }

  protected RowItems<TItem>(items: TItem[], columnCount: number): TItem[][] {
    const result = new Array<TItem[]>();
    let row: TItem[];

    items.forEach((item, index) => {
      if (index % columnCount === 0) {
        row = new Array<TItem>();
        result.push(row);
      }

      row.push(item);
    });

    return result;
  }

  abstract AddEvent(eventType: string, method: string, data: string): void;

  protected AddRawEvent(
    eventType: string,
    id: string = null,
    entityType = 'Unknown',
    method = 'None',
    data = 'None',
  ): void {
    const event = {
      Id: id === null ? 'None' : id,
      Type: eventType,
      EntityType: entityType,
      Method: method,
      Data: data,
      DateTime: new Date(),
    };

    this._events.push(event);

    this.TriggerAnswerUpdate();
  }

  protected TriggerAnswerUpdate(): void {
    this.SetAnswer(this.GetAnswer());
  }

  private CloneEvent(event: IQuestionEvent): IQuestionEvent {
    return {
      Id: event.Id,
      Type: event.Type,
      EntityType: event.EntityType,
      Method: event.Method,
      Data: event.Data,
      DateTime: event.DateTime,
    };
  }

  protected TrackMediaInfo(id: string, mediaInfo: MediaInfo): void {
    mediaInfo.AddIsPlayingCallback((isPlaying) =>
      this.AddRawEvent(isPlaying ? 'Start' : 'Stop', mediaInfo.EventType(), 'Stimulus', id, mediaInfo.Sources[0].Type),
    );
    mediaInfo.AddIsPlayedCallback((isPlayed) =>
      this.AddRawEvent(
        isPlayed ? 'Completed' : 'Incomplete',
        mediaInfo.EventType(),
        'Stimulus',
        id,
        mediaInfo.Sources[0].Type,
      ),
    );
    mediaInfo.OnEvent.subscribe((newValue: { eventName: string; entityType: string }) => {
      this.AddRawEvent(newValue.eventName, mediaInfo.EventType(), 'Stimulus', id, newValue.entityType);
    });
  }

  protected WhenAllMediaHavePlayed(media: MediaInfo | MediaInfo[], _returnTrueOnAnswer = false): ko.Computed<boolean> {
    media = media || [];

    if (media instanceof MediaInfo) media = [<MediaInfo>media];

    const requiredMedia: MediaInfo[] = media.filter((medium) => !medium.IsOptional());

    if (requiredMedia.length === 0) {
      return knockout.computed(() => true);
    }

    let numberOfPlays = 0;

    (<MediaInfo[]>requiredMedia).forEach((a) => {
      if (a === null) numberOfPlays++;
      else {
        a.AddIsPlayedCallback(() => {
          const allPlayed = ++numberOfPlays === (<MediaInfo[]>requiredMedia).length;
          if (allPlayed) this.Model.AllRequiredMediaHavePlayed(true);
        }, true);
      }
    });

    this.Model.AllRequiredMediaHavePlayed(numberOfPlays === (<MediaInfo[]>requiredMedia).length);

    return knockout.computed(() => this.HasAnswer() || this.Model.AllRequiredMediaHavePlayed());
  }

  public SlideLoaded(): void {}

  public SlideCompleted(): boolean {
    return false;
  }
}

export default QuestionsBase;
