import knockout = require('knockout');

type Source = {
  Type: string;
  Source: string;
  IsPausable: boolean;
  IsReplayable: boolean;
  IsOptional: boolean;
  MaxReplayCount: number | undefined;
  Width: string;
  Height: string;
};

class MediaInfo {
  public Sources: Source[];
  public IsPlaying: KnockoutObservable<boolean> = knockout.observable(false);
  public IsPlayed: KnockoutObservable<boolean> = knockout.observable(false);
  public IsStartable: KnockoutObservable<boolean>;
  public IsLayedOut: KnockoutObservable<ClientRect | DOMRect> = knockout.observable(null);

  constructor(sources: Source[], startable: KnockoutObservable<boolean> = knockout.observable(true)) {
    this.Sources = sources;
    this.IsStartable = startable;
  }

  public IsOptional(): boolean {
    return this.Sources[0].IsOptional;
  }

  public AddIsPlayingCallback(callback: (isPlaying: boolean) => void, onlyCallOnce = false) {
    const sub = this.IsPlaying.subscribe((v) => {
      if (onlyCallOnce) sub.dispose();
      callback(v);
    });
  }

  public AddIsPlayedCallback(callback: (isPlaying: boolean) => void, onlyCallOnce = false) {
    const sub = this.IsPlayed.subscribe((v) => {
      if (onlyCallOnce) sub.dispose();
      callback(v);
    });
  }

  public AddScreenElementLocationCallback(callback: (bbox: ClientRect | DOMRect) => void) {
    const sub = this.IsLayedOut.subscribe((v) => {
      sub.dispose();
      callback(v);
    });
  }

  public EventType(): string {
    return this.Sources[0].Type.match(/.*[vV]ideo.*/) ? 'Video' : 'Audio';
  }

  public static MimeTypeToPlayerType: any = {
    'video/mp4': 'Players/Video',
    'video/youtube': 'Players/Video',
    'video/mp4+webgazer': 'Players/Video',
    'video/youtube+webgazer': 'Players/Video',
    'audio/mpeg': 'Players/Audio',
    image: 'Players/Image',
  };

  public ComponentName(): string {
    return MediaInfo.MimeTypeToPlayerType[this.Sources[0].Type];
  }

  public static Create(
    stimulus: IStimulus,
    startable: KnockoutObservable<boolean> = knockout.observable(true),
    mimeType: string = null,
  ): MediaInfo {
    if (stimulus === null) return null;
    const config = {
      Type: mimeType || stimulus.Type,
      Source: stimulus.URI,
      IsPausable: !!stimulus.IsPausable,
      IsReplayable: !!stimulus.IsReplayable,
      IsOptional: !!stimulus.IsOptional,
      MaxReplayCount: stimulus.MaxReplayCount,
      Width: stimulus.Width,
      Height: stimulus.Height,
    };
    return new MediaInfo([config], startable);
  }
}

export = MediaInfo;
