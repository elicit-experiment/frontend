import QuestionModel = require("Models/Question");
import MediaInfo = require("Components/Players/MediaInfo");

import QuestionsBase = require("Components/Questions/QuestionBase");

abstract class QuestionsWithStimulusBase<T> extends QuestionsBase<T>
{
	public IsStimuliBlockVisible: boolean = true;
	public StimulusCssClass: string = 'col-xs-12';
	public InstrumentCssClass: string = 'col-xs-12';

	private _questionsPerRow: number = 4;

	protected _alignForStimuli: boolean = true;
	protected _layout: string = 'row';
	protected _columnWidthPercent: number = 100.0;

	public MediaLabel: string;
	public MediaInfo: MediaInfo = null;

	public Id: string;
	public HeaderLabel: string;
	public HasMedia: boolean = false;
	public CanAnswer: KnockoutObservable<boolean>;
	public IsColumnLayout: boolean = false;
	public QuestionsPerRow() { return this._questionsPerRow };

	constructor(question: QuestionModel) {
		super(question);

		this.Id = this.Model.Id;
		this.HeaderLabel = this.GetInstrumentFormatted("HeaderLabel");

		var alignForStimuli = this.GetInstrument("AlignForStimuli");
		this._alignForStimuli = !(alignForStimuli === undefined || alignForStimuli === "0");

		var layout = this.GetInstrument("Layout");
		this._layout = layout === 'row' ? 'row' : 'column';

		this.IsColumnLayout = this._layout !== 'row';

		var questionsPerRow = this.GetInstrument("QuestionsPerRow");
		this._questionsPerRow = questionsPerRow === undefined ? 4 : questionsPerRow;

		var columnWidthPercent = this.GetInstrument("ColumnWidthPercent") || '30';
		this._columnWidthPercent = parseInt(columnWidthPercent || "100", 10);

		var stimulus = this.GetInstrument("Stimulus");
		if (stimulus != null)
		{
			this.MediaLabel = this.GetFormatted(stimulus.Label);

			this.MediaInfo = MediaInfo.Create(stimulus);
			this.TrackMediaInfo("/Instrument/Stimulus", this.MediaInfo);
			this.HasMedia = true;
		}

		this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

		if (this.IsColumnLayout && this.IsStimuliBlockVisible) {
			const instrumentCols = Math.ceil(this._columnWidthPercent * 12 / 100);
			const stimulusCols = 12 - instrumentCols;
			this.StimulusCssClass = `col-xs-${stimulusCols}`;
			this.InstrumentCssClass = `col-xs-${instrumentCols}`;
		}

		console.log(`${this.InstrumentCssClass} and ${this.StimulusCssClass}`)

		this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
	}
}

export = QuestionsWithStimulusBase;
