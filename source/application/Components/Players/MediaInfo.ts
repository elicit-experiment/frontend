import knockout = require("knockout");

type Source = {Type:string; Source:string; IsPausable: boolean};

class MediaInfo
{
	public Sources: Source[];
	public IsPlaying: KnockoutObservable<boolean> = knockout.observable(false);
	public IsPlayed: KnockoutObservable<boolean> = knockout.observable(false);
	public IsStartable: KnockoutObservable<boolean>;
	public IsLayedOut: KnockoutObservable<(ClientRect | DOMRect)> = knockout.observable(null);

	constructor(sources:Source[], startable: KnockoutObservable<boolean> = knockout.observable(true))
	{
		this.Sources = sources;
		this.IsStartable = startable;
	}

	public AddIsPlayingCallback(callback: (isPlaying: boolean) => void, onlyCallOnce:boolean = false)
	{
		var sub = this.IsPlaying.subscribe(v =>
		{
			if (onlyCallOnce) sub.dispose();
			callback(v);
		});
	}


	public AddIsPlayedCallback(callback: (isPlaying: boolean) => void, onlyCallOnce:boolean = false)
	{
		var sub = this.IsPlayed.subscribe(v =>
		{
			if (onlyCallOnce) sub.dispose();
			callback(v);
		});
	}
	
	public AddScreenElementLocationCallback(callback: (bbox: ClientRect|DOMRect) => void) 
	{
		var sub = this.IsLayedOut.subscribe(v =>
			{
				sub.dispose();
				callback(v);
			});	
	}

	public EventType():string
	{
		return this.Sources[0].Type.match(/.*[vV]ideo.*/) ? "Video" : "Audio"
	}

	public static MimeTypeToPlayerType: any = {
        'video/mp4': 'Players/Video',
        'video/youtube': 'Players/Video',
        'video/mp4+webgazer': 'Players/Video',
        'video/youtube+webgazer': 'Players/Video',
        'audio/mpeg': 'Players/Audio',
    };

	public static Create(stimulus:IStimulus, startable: KnockoutObservable<boolean> = knockout.observable(true), mimeType:string = null):MediaInfo
	{
		if (stimulus === null) return null;
		const config = { Type: mimeType || stimulus.Type, Source: stimulus.URI, IsPausable: !!stimulus.IsPausable };
		return new MediaInfo([config], startable);
	}
}

export = MediaInfo;