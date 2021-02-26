import knockout = require("knockout");
import CockpitPortal = require("Managers/Portal/Cockpit");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");
import MediaInfo = require("Components/Players/MediaInfo");
import DisposableComponent = require("Components/DisposableComponent");
import TextFormatter = require("Managers/TextFormatter");

import QuestionsBase = require("Components/Questions/QuestionBase");

abstract class QuestionsWithStimulusBase<T> extends QuestionsBase<T>
{
	public IsStimuliBlockVisible: boolean = true;
	public StimulusCssClass: string = 'col-xs-12';
	public InstrumentCssClass: string = 'col-xs-12';

	protected _alignForStimuli: boolean = true;
	protected _layout: string = 'row';
	protected _columnWidthPercent: number = 100.0;

	public AudioLabel: string;
	public MediaInfo: MediaInfo = null;

	public HasMedia: boolean = false;

	public CanAnswer: KnockoutObservable<boolean>;

	public IsColumnLayout: boolean = false;

	constructor(question: QuestionModel) {
		super(question);

		var alignForStimuli = this.GetInstrument("AlignForStimuli");
		this._alignForStimuli = alignForStimuli === undefined || alignForStimuli === "1";

		var layout = this.GetInstrument("Layout");
		this._layout = layout === 'row' ? 'row' : 'column';

		this.IsColumnLayout = this._layout !== 'row';

		var columnWidthPercent = this.GetInstrument("ColumnWidthPercent") || '30';
		this._columnWidthPercent = parseInt(columnWidthPercent || "100", 10);

		if (this.IsColumnLayout) {
			const instrumentCols = Math.ceil(this._columnWidthPercent * 12 / 100);
			const stimulusCols = 12 - instrumentCols;
			this.StimulusCssClass = `col-xs-${stimulusCols}`;
			this.InstrumentCssClass = `col-xs-${instrumentCols}`;
		}

		var stimulus = this.GetInstrument("Stimulus");
		if (stimulus != null)
		{
			this.AudioLabel = this.GetFormatted(stimulus.Label);

			this.MediaInfo = MediaInfo.Create(stimulus);
			this.TrackMediaInfo("/Instrument/Stimulus", this.MediaInfo);
			this.HasMedia = true;
		}

		this.IsStimuliBlockVisible = this._alignForStimuli || this.HasMedia;

		this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
	}
}

export = QuestionsWithStimulusBase;
