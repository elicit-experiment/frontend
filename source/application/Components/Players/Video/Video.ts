import * as knockout from 'knockout';
import * as jQuery from 'jquery';
import MediaInfo from 'Components/Players/MediaInfo';

type Source = { Type: string; Source: string; Width: string; Height: string };

declare global {
  interface Window {
    onYouTubeIframeAPIReady: any;
  }
}

// TODO: probably should be refactored into a container for HTMLVideo or YouTubeVideo children
class Video {
  public PlayerElement: ko.Observable<HTMLVideoElement> = knockout.observable<HTMLVideoElement>();
  public PlayerControlsElement: ko.Observable<HTMLDivElement> = knockout.observable<HTMLDivElement>();
  public YouTubePlayerElement: ko.Observable<HTMLElement> = knockout.observable<HTMLElement>();
  public PlayButtonElement: ko.Observable<HTMLElement> = knockout.observable<HTMLElement>();
  public Sources: Source[];
  public IsPlaying: ko.Observable<boolean>;
  public IsPlayed: ko.Observable<boolean>;
  public IsPausable: boolean;
  public IsReplayable: boolean;
  public MaxReplayCount: number;
  public PlayCount: ko.Observable<number> = knockout.observable(0);
  public PlayTimestamp: ko.Computed<number>;
  public IsOptional: boolean;
  public SourceType: string;
  public PlayerElementId: ko.Observable<string>;

  private _info: MediaInfo;
  private static _activePlayer: Video = null;
  private static _playerCounter = 0;
  private _youTubePlayer: YT.Player;

  constructor(info: MediaInfo) {
    this._info = info;
    this.IsPlaying = this._info.IsPlaying;
    this.IsPlayed = this._info.IsPlayed;

    this.PlayerElementId = knockout.observable<string>(`player${Video._playerCounter}`);
    Video._playerCounter++;

    this.Sources = this._info.Sources;
    this.SourceType = this._info.Sources[0].Type == 'video/youtube' ? 'youtube' : 'html5';
    this.IsPausable = this._info.Sources[0].IsPausable;
    this.IsReplayable = this._info.Sources[0].IsReplayable;
    this.MaxReplayCount = this._info.Sources[0].MaxReplayCount;
    this.IsOptional = this._info.Sources[0].IsOptional;

    const sub = this.PlayerElement.subscribe((e) => {
      sub.dispose();
      this.InitializeHTML5VideoPlayer(e);
    });

    const sub2 = this.YouTubePlayerElement.subscribe((e) => {
      sub2.dispose();
      const callback = this.CreateYouTubePlayer.bind(this);
      Video.OnYouTubeInit(callback);
    });
    const sub3 = this.PlayerControlsElement.subscribe((e) => {
      sub3.dispose();
      e.classList.remove('loading');
    });

    this.PlayTimestamp = knockout.computed(() => {
      return this._youTubePlayer?.getCurrentTime();
    });

    this._info.AddMediateStateProvider(() => {
      return {
        PlaybackTimestamp: this._youTubePlayer?.getCurrentTime(),
      };
    });
  }

  private static _isYouTubeLoaded = false;
  private static _youTubeInitList: Array<CallableFunction> = [];

  private static OnYouTubeInit(cb: CallableFunction): void {
    if (Video._isYouTubeLoaded) {
      cb();
      return;
    }

    // From: https://developers.google.com/youtube/iframe_api_reference#Getting_Started

    // 2. This code loads the IFrame Player API code asynchronously.
    const youtubeScriptId = 'youtube-api';
    const youtubeScript = document.getElementById(youtubeScriptId);

    if (youtubeScript === null) {
      const tag = document.createElement('script');
      const firstScript = document.getElementsByTagName('script')[0];

      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = youtubeScriptId;
      firstScript.parentNode.insertBefore(tag, firstScript);

      // 3. This function creates an <iframe> (and YouTube player)
      //    after the API code downloads.
      Video._youTubeInitList.push(cb);
      window.onYouTubeIframeAPIReady = () => {
        Video._youTubeInitList.forEach((initCallback) => initCallback());
        Video._youTubeInitList = [];
        Video._isYouTubeLoaded = true;
      };
    } else {
      Video._youTubeInitList.push(cb);
    }
  }

  public TogglePlay(): void {
    if (!this._info.IsStartable()) {
      console.warn('video not startable');
      return;
    }
    if (this.SourceType == 'youtube') {
      if (this.IsPlaying() && this.IsPausable) {
        Video._activePlayer = null;
        this._youTubePlayer.pauseVideo();
      } else {
        if (Video._activePlayer !== null && Video._activePlayer !== this && Video._activePlayer.IsPlaying())
          Video._activePlayer.TogglePlay();

        Video._activePlayer = this;
        this._youTubePlayer.playVideo();
      }
    } else {
      if (this.IsPlaying() && this.IsPausable) {
        Video._activePlayer = null;
        this.PlayerElement().pause();
      } else {
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
    const youtubeScriptId = 'youtube-api';
    const youtubeScript = document.getElementById(youtubeScriptId);

    if (youtubeScript === null) {
      const tag = document.createElement('script');
      const firstScript = document.getElementsByTagName('script')[0];

      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = youtubeScriptId;
      firstScript.parentNode.insertBefore(tag, firstScript);

      // 3. This function creates an <iframe> (and YouTube player)
      //    after the API code downloads.
      const self = this;
      window.onYouTubeIframeAPIReady = () => {
        self.CreateYouTubePlayer();
      };
    } else {
      this.CreateYouTubePlayer();
    }
  }

  private CreateYouTubePlayer() {
    // TODO: safer url to id mappings?
    const source = this.Sources[0];
    const videoId = source.Source.replace('https://youtu.be/', '');

    let height: string | number = '100%'; //window.innerHeight * 0.65;
    let width: string | number = '100%'; //window.innerWidth * 0.80;

    // console.log(
    //   `Creating YouTube player for ${videoId} ${this.PlayerElementId()} ${source.Width}x${source.Height} ${
    //     this.IsPausable
    //   } ${this.IsReplayable} ${this.MaxReplayCount} ${this.IsOptional}`,
    // );

    const playerStateName: { [index: string]: string } = {};
    // @ts-ignore
    Object.keys(YT.PlayerState).forEach((key) => {
      // @ts-ignore
      playerStateName[YT.PlayerState[key]] = key;
    });

    if (source.Width) {
      width = parseInt(source.Width);
    }
    if (source.Height) {
      height = parseInt(source.Height);
    }

    this._youTubePlayer = new YT.Player(this.PlayerElementId(), {
      height,
      width,
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 0,
        enablejsapi: 1,
        loop: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    });

    const self = this;

    // 4. The API will call this function when the video player is ready.
    function onPlayerReady(event: any) {
      const player = document.getElementById(self.PlayerElementId());
      const playerBBox = player.getBoundingClientRect();
      self._info.IsLayedOut(playerBBox);
    }

    // 5. The API calls this function when the player's state changes.
    function onPlayerStateChange(event: any) {
      self._info.AddEvent(playerStateName[<string>event.data]);

      if (event.data == YT.PlayerState.PLAYING) {
        self._info.IsPlaying(true);
      }
      if (
        event.data == YT.PlayerState.PAUSED ||
        event.data == YT.PlayerState.ENDED ||
        event.data == YT.PlayerState.UNSTARTED
      ) {
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
    const $player = jQuery(player);

    $player
      .on('playing', () => this._info.IsPlaying(true))
      .on('pause', () => this._info.IsPlaying(false))
      .on('ended', () => {
        this._info.IsPlaying(false);
        this.Played();
      });

    this.Sources.forEach((s) => $player.append(`<Source type="${s.Type}" src="${s.Source}"/>`));

    const playerBBox = player.getBoundingClientRect();

    this._info.IsLayedOut(playerBBox);
  }

  private Played(): void {
    this._info.IsPlayed(true);
    this.PlayCount(this.PlayCount() + 1);
    // console.log(`PlayCount ${this.PlayCount()}/ ${this.MaxReplayCount}`);
    if (this.IsReplayable) {
      if (!this.MaxReplayCount || this.PlayCount() < this.MaxReplayCount) {
        return;
      }
    }
    $(this.PlayButtonElement()).prop('disabled', true);
  }
}

import template from 'Components/Players/Video/Video.html';
knockout.components.register('Players/Video', {
  viewModel: Video,
  template,
});

export default Video;
