import knockout = require("knockout");
import ExperimentManager = require("Managers/Portal/Experiment");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import MediaInfo = require("Components/Players/MediaInfo");

class SoloStimulus extends QuestionBase<any>
{
	public MediaLabel: string = "";
	public MediaInfo: MediaInfo = null;
    public HasMedia: boolean = true;
    public AnswerIsRequired: boolean = true;
    public CanAnswer: KnockoutObservable<boolean>;
	public Answer: KnockoutObservable<string> = knockout.observable<string>(null);
    public MediaComponentName: string = 'Players/Audio';

    constructor(question: QuestionModel)
	{
		super(question, true);

		var stimulus = (this.GetComponent() as any).Stimuli[0];

        console.dir(stimulus);
        
        this.MediaComponentName = SoloStimulus.MimeTypeToPlayerType[stimulus.Type];

        if (this.MediaComponentName == undefined) {
            console.error(`MediaComponentName unknown for ${stimulus.Type}`);
        }

        this.MediaLabel = this.GetFormatted(stimulus.Label);

        this.MediaInfo = MediaInfo.Create(stimulus);
        this.TrackAudioInfo("/Instrument/Stimulus", this.MediaInfo);
        this.HasMedia = true;

        this.CanAnswer = this.WhenAllMediaHavePlayed(this.MediaInfo, true);
        this.CanAnswer.subscribe(v =>
            {
                console.dir(v)
            });
    }

	public SlideCompleted(): boolean
	{
		ExperimentManager.SlideTitle("");

		return false;
    }
    
    protected HasValidAnswer(answer: any): boolean
	{
        console.log(this.CanAnswer());
        return this.CanAnswer();
    }

    public static MimeTypeToPlayerType:any = {
        'video/mp4': 'Players/Video',
        'video/youtube': 'Players/Video',
        'audio/mpeg': 'Players/Audio',
    };
}

export = SoloStimulus;