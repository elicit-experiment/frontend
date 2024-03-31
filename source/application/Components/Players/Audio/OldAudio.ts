import knockout from 'knockout';
import jquery = require('jquery');
import AudioInfo = require('Components/Players/Audio/AudioInfo');

type Source = { Type: string; Source: string };

class OldAudio {
  public PlayerElement: knockout.Observable<HTMLAudioElement> = knockout.observable<HTMLAudioElement>();
  public Sources: Source[];
  public IsPlaying: knockout.Observable<boolean>;

  private _info: AudioInfo;
  private static _activePlayer: OldAudio = null;

  constructor(info: AudioInfo) {
    this._info = info;
    this.IsPlaying = this._info.IsPlaying;

    this.Sources = this._info.Sources;

    const sub = this.PlayerElement.subscribe((e) => {
      sub.dispose();
      this.InitializePlayer(e);
    });
  }

  public TogglePlay(): void {
    if (this.IsPlaying()) {
      OldAudio._activePlayer = null;
      this.PlayerElement().pause();
      this.PlayerElement().currentTime = 0;
    } else {
      if (OldAudio._activePlayer !== null && OldAudio._activePlayer !== this && OldAudio._activePlayer.IsPlaying())
        OldAudio._activePlayer.TogglePlay();

      OldAudio._activePlayer = this;
      this.PlayerElement().play();
    }
  }

  private InitializePlayer(player: HTMLAudioElement): void {
    const $player = jquery(player);

    $player
      .on('playing', () => {
        this._info.IsPlaying(true);
      })
      .on('pause', () => {
        this._info.IsPlaying(false);
      })
      .on('ended', () => {
        this._info.IsPlaying(false);
      });

    this.Sources.forEach((s) => $player.append(`<Source type="${s.Type}" src="${s.Source}"/>`));
  }
}

export = OldAudio;
