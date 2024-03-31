import QuestionModel = require('Models/Question');
import MediaInfo = require('Components/Players/MediaInfo');
import knockout from 'knockout';
import QuestionsBase = require('Components/Questions/QuestionBase');

abstract class QuestionsWithStimulusBase<T> extends QuestionsBase<T> {
  public IsStimuliBlockVisible = true;
  public StimulusCssClass = 'col-xs-12';
  public InstrumentCssClass = 'col-xs-12';

  private _questionsPerRow = 4;

  protected _alignForStimuli = true;
  protected _layout = 'row';
  protected _columnWidthPercent = 100.0;

  public MediaLabel: string;
  public MediaInfo: MediaInfo = null;

  public Id: string;
  public HeaderLabel: string;
  public HasMedia = false;
  public CanAnswer: knockout.Observable<boolean> | knockout.Computed<boolean>;
  public IsColumnLayout = false;
  public QuestionsPerRow() {
    return this._questionsPerRow;
  }

  constructor(question: QuestionModel) {
    super(question);

    this.Id = this.Model.Id;
    this.HeaderLabel = this.GetInstrumentFormatted('HeaderLabel');

    const alignForStimuli = this.GetInstrument('AlignForStimuli');
    this._alignForStimuli = !(alignForStimuli === undefined || alignForStimuli === '0');

    const layout = this.GetInstrument('Layout');
    this._layout = layout === 'row' ? 'row' : 'column';

    this.IsColumnLayout = this._layout !== 'row';

    const questionsPerRow = this.GetInstrument('QuestionsPerRow');
    this._questionsPerRow = questionsPerRow === undefined ? 4 : questionsPerRow;

    const columnWidthPercent = this.GetInstrument('ColumnWidthPercent') || '30';
    this._columnWidthPercent = parseInt(columnWidthPercent || '100', 10);

    const stimulus = this.GetInstrument('Stimulus');
    if (stimulus != null) {
      this.MediaLabel = this.GetFormatted(stimulus.Label);

      this.MediaInfo = MediaInfo.Create(stimulus);
      this.TrackMediaInfo('/Instrument/Stimulus', this.MediaInfo);
      this.HasMedia = true;
    }

    this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

    if (this.IsColumnLayout && this.IsStimuliBlockVisible) {
      const instrumentCols = Math.ceil((this._columnWidthPercent * 12) / 100);
      const stimulusCols = 12 - instrumentCols;
      this.StimulusCssClass = `col-xs-${stimulusCols}`;
      this.InstrumentCssClass = `col-xs-${instrumentCols}`;
    }

    // console.log(`${this.InstrumentCssClass} and ${this.StimulusCssClass} -- ${this.HasMedia}`);

    this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
  }
}

export = QuestionsWithStimulusBase;
