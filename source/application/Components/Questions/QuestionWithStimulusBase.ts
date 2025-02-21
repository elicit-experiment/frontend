import QuestionModel from 'Models/Question';
import MediaInfo from 'Components/Players/MediaInfo';
import QuestionsBase from 'Components/Questions/QuestionBase';
import * as knockout from 'knockout';

abstract class QuestionsWithStimulusBase<T> extends QuestionsBase<T> {
  public IsStimuliBlockVisible = true;

  private _questionsPerRow = 3;

  protected _alignForStimuli = true;

  public MediaLabel: string;
  public MediaInfo: MediaInfo = null;

  public Id: string;
  public HeaderLabel: string;
  public HasMedia = false;
  public CanAnswer: ko.Observable<boolean> | ko.Computed<boolean>;

  public ItemCssClass: ko.Observable<Record<string, string | boolean | number>> = knockout.observable({});

  public AlignmentPaddingItems: ko.Observable<Array<boolean>> = knockout.observable([]);

  public QuestionsPerRow() {
    return this._questionsPerRow;
  }

  constructor(question: QuestionModel, requiresInput = true) {
    super(question, requiresInput);

    this.Id = this.Model.Id;
    this.HeaderLabel = this.GetInstrumentFormatted('HeaderLabel');

    const alignForStimuli = this.GetInstrument('AlignForStimuli');
    this._alignForStimuli = !(alignForStimuli === undefined || alignForStimuli === '0');

    this.IsColumnLayout = this.Model.Layout.Type === 'column';

    const questionsPerRow = this.GetInstrument('QuestionsPerRow');
    this._questionsPerRow = questionsPerRow === undefined ? 3 : questionsPerRow;

    // console.log(`${this.InstrumentCssClass} and ${this.StimulusCssClass} -- ${this.HasMedia}`);

    this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);

    this.ItemCssClass({
      [`col-${Math.floor(12 / this._questionsPerRow)}`]: true,
    });

    this.configureLayout();
  }

  public configureLayout() {
    const stimulus = this.GetInstrument('Stimulus');
    if (stimulus != null) {
      this.MediaLabel = this.GetFormatted(stimulus.Label);

      this.MediaInfo = MediaInfo.Create(stimulus);
      this.TrackMediaInfo('/Instrument/Stimulus', this.MediaInfo);
      this.HasMedia = true;
    }

    this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

    if (!this.IsStimuliBlockVisible && this.Model.Layout?.Type === 'column') {
      console.warn('column layout but no stimulus. Resetting to row layout.');
      this.Model.Layout.Type = 'row';
      this.IsColumnLayout = false;
    };

    QuestionsBase.prototype.configureLayout.call(this);
  }
}

export default QuestionsWithStimulusBase;
