import knockout = require("knockout");
import jquery = require("jquery");
import MediaInfo = require("Components/Players/MediaInfo");

type Source = { Type: string; Source: string; };

// TODO: probably should be refactored into a container for HTMLVideo or YouTubeVideo children
class Video
{
	public PlayerElement: KnockoutObservable<HTMLVideoElement> = knockout.observable<HTMLVideoElement>();
	public YouTubePlayerElement: KnockoutObservable<HTMLElement> = knockout.observable<HTMLElement>();
	public Sources: Source[];
	public IsPlaying: KnockoutObservable<boolean>;
	public SourceType: string;

	private _info: MediaInfo;
	private static _activePlayer:Video = null;
	private _youTubePlayer:YT.Player;


	constructor(info:MediaInfo)
	{
		this._info = info;
		this.IsPlaying = this._info.IsPlaying;

		this.Sources = this._info.Sources;
		this.SourceType = this._info.Sources[0].Type == 'video/youtube' ? 'youtube' : 'html5';

		var sub = this.PlayerElement.subscribe(e =>
		{
			sub.dispose();
			this.InitializePlayer(e);
		});
		var sub2 = this.YouTubePlayerElement.subscribe(e =>
			{
				sub2.dispose();
				this.InitYouTube(e);
			});
		}

	public TogglePlay():void
	{
		if (this.SourceType == 'youtube') {
			if (this.IsPlaying())
			{
				Video._activePlayer = null;
				this._youTubePlayer.pauseVideo();
			}
			else
			{
				if (Video._activePlayer !== null && Video._activePlayer !== this && Video._activePlayer.IsPlaying())
					Video._activePlayer.TogglePlay();
	
				Video._activePlayer = this;
				this._youTubePlayer.playVideo();
			}	

		} else {
			if (this.IsPlaying())
			{
				Video._activePlayer = null;
				this.PlayerElement().pause();
				this.PlayerElement().currentTime = 0;
			}
			else
			{
				if (Video._activePlayer !== null && Video._activePlayer !== this && Video._activePlayer.IsPlaying())
					Video._activePlayer.TogglePlay();
	
				Video._activePlayer = this;
				this.PlayerElement().play();
			}	
		}
	}

	public InitYouTube(playerDiv:any):void
	{
		// TODO: safer url to id mappings?
		const videoId = this.Sources[0].Source.replace('https://youtu.be', '');

		// From: https://developers.google.com/youtube/iframe_api_reference#Getting_Started

		// 2. This code loads the IFrame Player API code asynchronously.
		var tag = document.createElement('script');

		tag.src = "https://www.youtube.com/iframe_api";
		var firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

		// 3. This function creates an <iframe> (and YouTube player)
		//    after the API code downloads.
		var self = this;
		window.onYouTubeIframeAPIReady = () => {
			self._youTubePlayer = new YT.Player('player', {
				height: '390',
				width: '640',
				videoId: videoId,
				playerVars: {rel: 0},
				events: {
					'onReady': onPlayerReady,
					'onStateChange': onPlayerStateChange
				}
			});
		}

		// 4. The API will call this function when the video player is ready.
		function onPlayerReady(event:any) {
			//event.target.playVideo();
		}

		// 5. The API calls this function when the player's state changes.
		function onPlayerStateChange(event:any) {
			if (event.data == YT.PlayerState.PLAYING) {
				self._info.IsPlaying(true);
			}
			if (event.data == YT.PlayerState.PAUSED ||
				event.data == YT.PlayerState.ENDED ||
			    event.data == YT.PlayerState.UNSTARTED) {
				self._info.IsPlaying(false);
			}
		}
		function stopVideo() {
			self._youTubePlayer.stopVideo();
		}
	}

	private InitializePlayer(player:HTMLVideoElement):void
	{
		var $player = jquery(player);

		$player.on("playing", () =>
		{
			this._info.IsPlaying(true);
		}).on("pause", () =>
		{
			this._info.IsPlaying(false);
		}).on("ended", () =>
		{
			this._info.IsPlaying(false);
		});

		this.Sources.forEach(s => $player.append(`<Source type="${s.Type}" src="${s.Source}"/>`));
	}
}

export = Video;