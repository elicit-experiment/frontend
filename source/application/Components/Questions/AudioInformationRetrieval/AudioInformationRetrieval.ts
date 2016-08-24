import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");

type Selection = {Identifier:string};

type Segment = {Title:string, Start:number, End:number, Length:number};
type Channel = {Title:string, Segments:Segment[], TrackElement:KnockoutObservable<HTMLElement>};

class AudioInformationRetrieval extends QuestionBase<{Selections:Selection[]}>
{
	public SearchViewHeader = knockout.observable("");
	public SearchViewButtonLabel = knockout.observable("");
	public ZoomLevel = knockout.observable(1);
	public TracksElement = knockout.observable<HTMLElement>(null);
	public TracksLength = knockout.observable<number>();

	public Channels = knockout.observableArray<Channel>();

	constructor(question: QuestionModel)
	{
		super(question);

		var searchView = this.GetInstrument("SearchView");

		this.SearchViewHeader(searchView["Header"]["Label"]);
		this.SearchViewButtonLabel(searchView["Button"]["Label"]);

		this.Channels.push(this.CreateChannel("Taler"), this.CreateChannel("Transkriptioner"))

		this.UpdateTracksLength();
	}

	public Search():void
	{

	}

	public CreateChannel(title:string):Channel
	{
		return {
			Title: title,
			Segments: this.CreateSegments(),
			TrackElement: knockout.observable(null)
		};
	}
	
	public CreateSegments():Segment[] {
		var segments:Segment[] = [];

		for (let i = 0; i < 1000; i++)
			segments.push(this.CreateSegment("Segment " + i, i * 80, i * 80 + 50));

		return segments;
	}

	public ZoomTracks(viewModel:any, event:JQueryMouseEventObject):void
	{
		var originalEvent = (<WheelEvent>(<any>event).originalEvent);

		this.ZoomLevel(this.ZoomLevel() * (originalEvent.deltaY > 0 ? 1.1 : 0.9));

		setTimeout(() => {
			if(this.TracksElement() != null && this.TracksElement().scrollLeft > this.TracksElement().scrollWidth - this.TracksElement().clientWidth)
			{
				this.TracksElement().scrollLeft = this.TracksElement().scrollWidth - this.TracksElement().clientWidth
			}
		});
	}

	private UpdateTracksLength():void
	{
		var length = 0;
		for(var channel of this.Channels())
		{
			for(var segment of channel.Segments)
			{
				if(segment.End > length)
					length = segment.End;
			}
		}

		this.TracksLength(length);
	}

	private CreateSegment(title:string, start:number, end:number):Segment
	{
		var result:Segment = {
			Title: title,
			Start: start,
			End: end,
			Length: end - start
		};

		return result;
	}
}

export  = AudioInformationRetrieval;