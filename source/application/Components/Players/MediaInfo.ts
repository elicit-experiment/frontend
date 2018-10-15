import knockout = require("knockout");

type Source = {Type:string; Source:string; IsPausable: boolean};

class MediaInfo
{
	public Sources: Source[];
	public IsPlaying: KnockoutObservable<boolean> = knockout.observable(false);

	constructor(sources:Source[])
	{
		this.Sources = sources;
	}

	public AddIsPlayingCallback(callback: (isPlaying: boolean) => void, onlyCallOnce:boolean = false)
	{
		var sub = this.IsPlaying.subscribe(v =>
		{
			if (onlyCallOnce) sub.dispose();
			callback(v);
		});
	}

	public static Create(stimulus:IStimulus):MediaInfo
	{
		if (stimulus === null) return null;
		return new MediaInfo([{ Type: stimulus.Type, Source: stimulus.URI, IsPausable: (stimulus.IsPausable || true) }]);
	}
}

export = MediaInfo;