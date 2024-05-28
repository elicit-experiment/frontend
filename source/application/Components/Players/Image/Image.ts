import * as knockout from 'knockout';
import * as jQuery from 'jquery';
import MediaInfo from 'Components/Players/MediaInfo';

type Source = { Source: string; Width: string; Height: string };

class Image {
  public PlayerElement: ko.Observable<HTMLVideoElement> = knockout.observable<HTMLVideoElement>();
  public Sources: Source[];
  public Width: string;
  public Height: string;

  private _info: MediaInfo;

  constructor(info: MediaInfo) {
    this._info = info;
    this.Sources = this._info.Sources;

    const sub = this.PlayerElement.subscribe((e) => {
      sub.dispose();
      const $player = jQuery(e);

      this.Sources.forEach((s) => {
        let style = '';

        if (s.Width) {
          style += `width:${s.Width};`;
        }
        if (s.Height) {
          style += `height:${s.Height};`;
        }

        $player.append(`<img style="${style}" src="${s.Source}"/>`);
      });

      this._info.IsPlayed(true);
    });
  }
}

import template from 'Components/Players/Image/Image.html';
knockout.components.register('Players/Image', {
  viewModel: Image,
  template,
});

export default Image;
