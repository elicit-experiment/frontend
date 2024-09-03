import * as knockout from 'knockout';

type Source = { Type: string; Source: string };

class AudioInfo {
  public Sources: Source[];
  public IsPlaying: ko.Observable<boolean> = knockout.observable(false);

  constructor(sources: Source[]) {
    this.Sources = sources;
  }

  public AddIsPlayingCallback(callback: (isPlaying: boolean) => void, onlyCallOnce = false) {
    const sub = this.IsPlaying.subscribe((v) => {
      if (onlyCallOnce) sub.dispose();
      callback(v);
    });
  }

  public static Create(stimulus: IStimulus): AudioInfo {
    if (stimulus === null) return null;
    return new AudioInfo([{ Type: stimulus.Type, Source: stimulus.URI }]);
  }
}

export default AudioInfo;
