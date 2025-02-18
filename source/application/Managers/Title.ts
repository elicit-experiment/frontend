﻿import * as knockout from 'knockout';

class Title {
  public Title: ko.Observable<string>;
  private isDefault = true;
  private static defaultName: string = document.title;

  constructor() {
    this.Title = knockout.observable(Title.defaultName);
    this.Title.subscribe((v) => {
      document.title = v;
      this.isDefault = false;
    });
  }

  public ToDefault(subName: string = null): void {
    this.Title((subName == null ? '' : subName + ' - ') + Title.defaultName);
    this.isDefault = true;
  }
}

const instance = new Title();

export default instance;
