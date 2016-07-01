import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");

type Selection = {Identifier:string};

type Segment = {Title:string, Start:number, End:number};
type Channel = {Title:string, Segments:Segment[]};

class AudioInformationRetrieval extends QuestionBase<{Selections:Selection[]}>
{
	public SearchViewHeader = knockout.observable("");
	public SearchViewButtonLabel = knockout.observable("");

	public Channels = knockout.observableArray<Channel>();

	constructor(question: QuestionModel)
	{
		super(question);

		var searchView = this.GetInstrument("SearchView");

		this.SearchViewHeader(searchView["Header"]["Label"]);
		this.SearchViewButtonLabel(searchView["Button"]["Label"]);

		this.Channels.push(this.CreateChannel("Taler"), this.CreateChannel("Transkriptioner"))
	}

	public Search():void
	{

	}

	public CreateChannel(title:string):Channel
	{
		return {
			Title: title,
			Segments: []
		};
	}
}

export  = AudioInformationRetrieval;