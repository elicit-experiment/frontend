﻿import * as knockout from 'knockout';
import * as jQuery from 'jquery';
import MediaInfo from 'Components/Players/MediaInfo';

type Source = { Type: string; Source: string };

class Audio {
  public PlayerElement: ko.Observable<HTMLAudioElement> = knockout.observable<HTMLAudioElement>();
  public Sources: Source[];
  public IsPlaying: ko.Observable<boolean>;
  public IsPlayed: ko.Observable<boolean>;

  private _info: MediaInfo;
  private static _activePlayer: Audio = null;

  constructor(info: MediaInfo) {
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
      Audio._activePlayer = null;
      this.PlayerElement().pause();
      this.PlayerElement().currentTime = 0;
    } else {
      if (Audio._activePlayer !== null && Audio._activePlayer !== this && Audio._activePlayer.IsPlaying())
        Audio._activePlayer.TogglePlay();

      Audio._activePlayer = this;
      this.PlayerElement().play();
    }
  }

  private InitializePlayer(player: HTMLAudioElement): void {
    const $player = jQuery(player);

    $player
      .on('playing', () => {
        this._info.IsPlaying(true);
      })
      .on('pause', () => {
        this._info.IsPlaying(false);
      })
      .on('ended', () => {
        this._info.IsPlaying(false);
        this._info.IsPlayed(true);
      });

    this.Sources.forEach((s) => $player.append(`<Source type="${s.Type}" src="${s.Source}"/>`));
  }
}

import template from 'Components/Players/Audio/Audio.html';
knockout.components.register('Players/Audio', {
  viewModel: Audio,
  template,
});

export default Audio;
