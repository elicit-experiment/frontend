import knockout = require('knockout');
import jquery = require('jquery');
import MediaInfo = require('Components/Players/MediaInfo');
import { KoComponent } from '../../../Utility/KoDecorators';

type Source = { Source: string; Width: string; Height: string };

@KoComponent({ template: require('./Image.html'), name: 'Players/Image/Image' })
class Image {
  public PlayerElement: KnockoutObservable<HTMLVideoElement> = knockout.observable<HTMLVideoElement>();
  public Sources: Source[];
  public Width: string;
  public Height: string;

  private _info: MediaInfo;

  constructor(info: MediaInfo) {
    this._info = info;
    this.Sources = this._info.Sources;

    const sub = this.PlayerElement.subscribe((e) => {
      sub.dispose();
      const $player = jquery(e);

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

export = Image;
