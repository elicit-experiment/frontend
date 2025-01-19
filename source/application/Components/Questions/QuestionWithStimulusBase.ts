import QuestionModel from 'Models/Question';
import MediaInfo from 'Components/Players/MediaInfo';
import QuestionsBase from 'Components/Questions/QuestionBase';

abstract class QuestionsWithStimulusBase<T> extends QuestionsBase<T> {
  public IsStimuliBlockVisible = true;

  private _questionsPerRow = 4;

  protected _alignForStimuli = true;

  public MediaLabel: string;
  public MediaInfo: MediaInfo = null;

  public Id: string;
  public HeaderLabel: string;
  public HasMedia = false;
  public CanAnswer: ko.Observable<boolean> | ko.Computed<boolean>;

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
    this._questionsPerRow = questionsPerRow === undefined ? 4 : questionsPerRow;

    const stimulus = this.GetInstrument('Stimulus');
    if (stimulus != null) {
      this.MediaLabel = this.GetFormatted(stimulus.Label);

      this.MediaInfo = MediaInfo.Create(stimulus);
      this.TrackMediaInfo('/Instrument/Stimulus', this.MediaInfo);
      this.HasMedia = true;
    }

    this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

    // console.log(`${this.InstrumentCssClass} and ${this.StimulusCssClass} -- ${this.HasMedia}`);

    this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
  }
}

export default QuestionsWithStimulusBase;
