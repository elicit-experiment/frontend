import knockout = require("knockout");

type Source = {Type:string; Source:string; IsPausable: boolean};

class MediaInfo
{
	public Sources: Source[];
	public IsPlaying: KnockoutObservable<boolean> = knockout.observable(false);
	public IsPlayed: KnockoutObservable<boolean> = knockout.observable(false);
	public IsStartable: KnockoutObservable<boolean>;

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
	
	public static Create(stimulus:IStimulus, startable: KnockoutObservable<boolean> = knockout.observable(true)):MediaInfo
	{
		if (stimulus === null) return null;
		const config = { Type: stimulus.Type, Source: stimulus.URI, IsPausable: (stimulus.IsPausable || true) };
		return new MediaInfo([config], startable);
	}
}

export = MediaInfo;