import knockout = require("knockout");
import jquery = require("jquery");
import MediaInfo = require("Components/Players/MediaInfo");

type Source = { Type: string; Source: string; };

declare global {
	interface Window { onYouTubeIframeAPIReady: any; }
}

// TODO: probably should be refactored into a container for HTMLVideo or YouTubeVideo children
class Video {
	public PlayerElement: KnockoutObservable<HTMLVideoElement> = knockout.observable<HTMLVideoElement>();
	public YouTubePlayerElement: KnockoutObservable<HTMLElement> = knockout.observable<HTMLElement>();
	public PlayButtonElement: KnockoutObservable<HTMLElement> = knockout.observable<HTMLElement>();
	public Sources: Source[];
	public IsPlaying: KnockoutObservable<boolean>;
	public IsPlayed: KnockoutObservable<boolean>;
	public IsPausable: boolean;
	public IsReplayable: boolean;
	public MaxReplayCount: number;
	public PlayCount: KnockoutObservable<number> = knockout.observable(0);
	public IsOptional: boolean;
	public SourceType: string;
	public PlayerElementId: string;

	private _info: MediaInfo;
	private static _activePlayer: Video = null;
	private static _playerCounter: number = 0;
	private _youTubePlayer: YT.Player;

	constructor(info: MediaInfo) {
		this._info = info;
		this.IsPlaying = this._info.IsPlaying;
		this.IsPlayed = this._info.IsPlayed;

		this.PlayerElementId = `player${Video._playerCounter}`;
		Video._playerCounter++;

		this.Sources = this._info.Sources;
		this.SourceType = this._info.Sources[0].Type == 'video/youtube' ? 'youtube' : 'html5';
		this.IsPausable = this._info.Sources[0].IsPausable;
		this.IsReplayable = this._info.Sources[0].IsReplayable;
		this.MaxReplayCount = this._info.Sources[0].MaxReplayCount;
		this.IsOptional = this._info.Sources[0].IsOptional;

		var sub = this.PlayerElement.subscribe(e => {
			sub.dispose();
			this.InitializeHTML5VideoPlayer(e);
		});
		var sub2 = this.YouTubePlayerElement.subscribe(e => {
			sub2.dispose();
			this.InitYouTube(e);
		});
	}

	public TogglePlay(): void {
		if (!this._info.IsStartable()) {
			return;
		}
		if (this.SourceType == 'youtube') {
			if (this.IsPlaying() && this.IsPausable) {
				Video._activePlayer = null;
				this._youTubePlayer.pauseVideo();
			}
			else {
				if (Video._activePlayer !== null && Video._activePlayer !== this && Video._activePlayer.IsPlaying())
					Video._activePlayer.TogglePlay();

				Video._activePlayer = this;
				this._youTubePlayer.playVideo();
			}
		} else {
			if (this.IsPlaying() && this.IsPausable) {
				Video._activePlayer = null;
				this.PlayerElement().pause();
				this.PlayerElement().currentTime = 0;
			}
			else {
				if (Video._activePlayer !== null && Video._activePlayer !== this && Video._activePlayer.IsPlaying())
					Video._activePlayer.TogglePlay();

				Video._activePlayer = this;
				this.PlayerElement().play();
			}
		}
	}

	public InitYouTube(playerDiv: any): void {
		// From: https://developers.google.com/youtube/iframe_api_reference#Getting_Started

		// 2. This code loads the IFrame Player API code asynchronously.
		var youtubeScriptId = 'youtube-api';
		var youtubeScript = document.getElementById(youtubeScriptId);

		if (youtubeScript === null) {
			var tag = document.createElement('script');
			var firstScript = document.getElementsByTagName('script')[0];

			tag.src = 'https://www.youtube.com/iframe_api';
			tag.id = youtubeScriptId;
			firstScript.parentNode.insertBefore(tag, firstScript);

			// 3. This function creates an <iframe> (and YouTube player)
			//    after the API code downloads.
			var self = this;
			window.onYouTubeIframeAPIReady = () => { self.CreateYouTubePlayer(); }
		} else {
			this.CreateYouTubePlayer();
		}
	}

	private CreateYouTubePlayer() {
		// TODO: safer url to id mappings?
		const videoId = this.Sources[0].Source.replace('https://youtu.be', '');

		this._youTubePlayer = new YT.Player('player', {
			height: window.innerHeight * 0.65,
			width: window.innerWidth * 0.80,
			videoId: videoId,
			playerVars: {
				autoplay: 0,
				controls: 0,
				disablekb: 0,
				enablejsapi: 1,
				loop: 0,
				modestbranding: 1,
				rel: 0
			},
			events: {
				'onReady': onPlayerReady,
				'onStateChange': onPlayerStateChange
			}
		});

		const self = this;

		// 4. The API will call this function when the video player is ready.
		function onPlayerReady(event: any) {
			const player = document.getElementById('player');
			const playerBBox = player.getBoundingClientRect();
			self._info.IsLayedOut(playerBBox);
		}

		// 5. The API calls this function when the player's state changes.
		function onPlayerStateChange(event: any) {
			if (event.data == YT.PlayerState.PLAYING) {
				self._info.IsPlaying(true);
			}
			if (event.data == YT.PlayerState.PAUSED ||
				event.data == YT.PlayerState.ENDED ||
				event.data == YT.PlayerState.UNSTARTED) {
				self._info.IsPlaying(false);
			}
			if (event.data == YT.PlayerState.ENDED) {
				self.Played();
			}
		}
		function stopVideo() {
			self._youTubePlayer.stopVideo();
		}
	}

	private InitializeHTML5VideoPlayer(player: HTMLVideoElement): void {
		var $player = jquery(player);

		$player.on("playing", () => this._info.IsPlaying(true))
			.on("pause", () => this._info.IsPlaying(false))
			.on("ended", () => {
				this._info.IsPlaying(false);
				this.Played();
			});

		this.Sources.forEach(s => $player.append(`<Source type="${s.Type}" src="${s.Source}"/>`));

		const playerBBox = player.getBoundingClientRect();

		this._info.IsLayedOut(playerBBox);
	}

	private Played() : void {
		this._info.IsPlayed(true);
		this.PlayCount(this.PlayCount() + 1);
		console.log(`PlayCount ${this.PlayCount()}/ ${this.MaxReplayCount}`);
		if (this.IsReplayable) {
			if (!this.MaxReplayCount || this.PlayCount() < this.MaxReplayCount) {
				return;
			}
		}
		console.log(this.PlayButtonElement());
		$(this.PlayButtonElement()).prop('disabled', true);
	}
}

export = Video;