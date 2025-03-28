﻿class TextFormatter {
  private _formatFinder = /\{\{((?:(?!\{\{).)+?)\}\}/g;
  private _formatters: { [key: string]: (input: string[]) => string };

  constructor() {
    this._formatters = {
      b: (i: string[]) => `<b>${i[0]}</b>`,
      i: (i: string[]) => `<i>${i[0]}</i>`,
      u: (i: string[]) => `<u>${i[0]}</u>`,
      s: (i: string[]) => `<s>${i[0]}</s>`,
      sub: (i: string[]) => `<sub>${i[0]}</sub>`,
      super: (i: string[]) => `<sup>${i[0]}</sup>`,
      mark: (i: string[]) => `<mark>${i[0]}</mark>`,
      tiny: (i: string[]) => `<span class="Tiny">${i[0]}</span>`,
      small: (i: string[]) => `<span class="Small">${i[0]}</span>`,
      large: (i: string[]) => `<span class="Large">${i[0]}</span>`,
      color: (i: string[]) => `<span style="color:${i[0]}">${i[1]}</span>`,
      style: (i: string[]) => `<span style="${i[0]}">${i[1]}</span>`,
      url: (i: string[]) => this.GetLinkFormat(i),
      link: (i: string[]) => this.GetLinkFormat(i),
      image: (i: string[]) => this.GetImageFormat(i),
      n: (i: string[]) => '<br/>',
      tab: (i: string[]) => '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',
      left: (i: string[]) => `<span class="SingleLineLeft">${i[0]}</span>`,
      right: (i: string[]) => `<span class="SingleLineRight">${i[0]}</span>`,
      center: (i: string[]) => `<span class="SingleLineCenter">${i[0]}</span>`,
      justify: (i: string[]) => `<span class="SingleLineJustify">${i[0]}</span>`,
    };
  }

  public Format(input: string): string {
    if (input == null) return null;

    let result: string;

    input = this.EscapeHtml(input);

    while (input !== (result = input.replace(this._formatFinder, (m: string, f: string) => this.Replace(f))))
      input = result;

    return result;
  }

  private Replace(optionsString: string): string {
    const options = optionsString.split('|');

    if (options[0].toLocaleLowerCase() in this._formatters)
      return this._formatters[options[0].toLocaleLowerCase()](options.slice(1));

    return `[Uknown format type: ${options[0].toLocaleLowerCase()}]`;
  }

  private EscapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private GetLinkFormat(parameters: string[]): string {
    const url = parameters[0];
    const text = parameters.length >= 2 ? parameters[1] : url;
    const target = parameters.length >= 3 && parameters[2].toLocaleLowerCase() === 'current' ? '_self' : '_blank';

    return `<a target="${target}" href="${url}">${text}</a>`;
  }

  private GetImageFormat(parameters: string[]): string {
    let width = '';
    let height = '';
    let style = '';

    if (parameters.length > 1) {
      const second = parameters[1].toLocaleLowerCase();
      if (second === 'left' || second === 'right') {
        style = `style="float: ${second};"`;
      } else {
        width = `width="${second}"`;
        if (parameters.length === 2) height = `height="${second}"`;
        else {
          height = `height="${parameters[2]}"`;

          if (parameters.length > 3) style = `style="float: ${parameters[3]};"`;
        }
      }
    }

    return `<img src="${parameters[0]}" ${width} ${height} ${style}/>`;
  }
}

const instance = new TextFormatter();

export default instance;
