import knockout = require("knockout");
import CockpitPortal = require("Managers/Portal/Cockpit");
import Notification = require("Managers/Notification");
import Configuration = require("Managers/Configuration");
import QuestionModel = require("Models/Question");
import QuestionBase = require("Components/Questions/QuestionBase");
import AudioInfo = require("Components/Players/Audio/AudioInfo");
import WayfAuthenticator from "Components/Questions/AudioInformationRetrieval/WayfAuthenticator";
import Audio from "Utility/Audio";

type Selection = {Identifier:string};
type Segment = {Title:string, Start:number, End:number, Length:number};
type Channel = {Title:string, Segments:Segment[], TrackElement:KnockoutObservable<HTMLElement>};
type TimeSegment = {Text:string, Position:number};

class AudioInformationRetrieval extends QuestionBase<{Selections:Selection[]}>
{
	public SearchViewHeader = knockout.observable("");
	public SearchViewButtonLabel = knockout.observable("");
	public SearchResults = knockout.observableArray<any>();

	public ZoomLevel = knockout.observable(1);
	public TracksElement = knockout.observable<HTMLElement>(null);
	public TracksLength = knockout.observable<number>();
	public TimeSegments = knockout.observableArray<TimeSegment>();

	public Channels = knockout.observableArray<Channel>();

	public CanLogin:KnockoutObservable<boolean>;
	private _wayfAuthenticator:WayfAuthenticator;

	private _larmClient:CHAOS.Portal.Client.IPortalClient;

	constructor(question: QuestionModel)
	{
		super(question);

		this._wayfAuthenticator = new WayfAuthenticator();
		this.CanLogin = this._wayfAuthenticator.CanLogin;

		let searchView = this.GetInstrument("SearchView");

		this.SearchViewHeader(searchView["Header"]["Label"]);
		this.SearchViewButtonLabel(searchView["Button"]["Label"]);

		this.TracksLength(80000);

		this.Channels.push(this.CreateChannel("Taler"), this.CreateChannel("Transkriptioner"));

		this.AddTimeSegments();
	}

	public Login():void
	{
		this._wayfAuthenticator.Login();
	}

	public GetTest():void
	{
		this._wayfAuthenticator.GetAsset("f091ae97-3360-4a25-bc9d-ec05df6924a5", asset => {
			console.log(asset);

			let audio = new Audio(asset.Files[0].Destinations[0].Url);
			this.AddAction(audio.IsReady, () => {
				audio.Play()
			});
		});
	}

	public Search():void
	{
		CockpitPortal.AudioInformation.Search().WithCallback(response => {
			if(response.Error != null)
			{
				Notification.Error("Failed to search: " + response.Error.Message);
				return;
			}
			console.log(response.Body.Results[0]);
			this.SearchResults.push(...response.Body.Results);
		});
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
		let segments:Segment[] = [];

		for (let i = 0; i < 1000; i++)
			segments.push(this.CreateSegment("Segment " + i, i * 80, i * 80 + 50));

		return segments;
	}

	public ZoomTracks(viewModel:any, event:JQueryMouseEventObject):void
	{
		let originalEvent = (<WheelEvent>(<any>event).originalEvent);

		this.ZoomLevel(this.ZoomLevel() * (originalEvent.deltaY > 0 ? 1.1 : 0.9));

		setTimeout(() => {
			if(this.TracksElement() != null && this.TracksElement().scrollLeft > this.TracksElement().scrollWidth - this.TracksElement().clientWidth)
			{
				this.TracksElement().scrollLeft = this.TracksElement().scrollWidth - this.TracksElement().clientWidth
			}
		});
	}

	private AddTimeSegments():void
	{
		this.TimeSegments.removeAll();

		for(let i = 0; i < this.TracksLength(); i += 1000)
		{
			this.TimeSegments.push(this.CreateTimeSegment(i));
		}
	}

	private CreateTimeSegment(position:number):TimeSegment
	{
		return {
			Text: this.GetTimeCode(position),
			Position: position
		};
	}

	private CreateSegment(title:string, start:number, end:number):Segment
	{
		let result:Segment = {
			Title: title,
			Start: start,
			End: end,
			Length: end - start
		};

		return result;
	}

	private GetTimeCode(position: number):string
	{
		let hours = Math.floor(position / (60 * 60 * 1000));
		let minutes = Math.floor((position % (60 * 60 * 1000)) / (60 * 1000));
		let seconds = Math.floor((position % (60 * 1000)) / 1000);
		let milliseconds = position % 1000;

		return `${hours}:${this.ToTwoDigits(minutes)}:${this.ToTwoDigits(seconds)}.${milliseconds}`;
	}

	private ToTwoDigits(value:number):string
	{
		return value < 10 ? "0" + value : value.toString();
	}
}

export  = AudioInformationRetrieval;