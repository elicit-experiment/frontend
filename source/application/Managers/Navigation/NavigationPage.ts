import knockout from 'knockout';

class NavigationPage {
  public Name: knockout.Observable<string> = knockout.observable<string>();
  public Data: knockout.Observable<any> = knockout.observable<any>();

  constructor(name?: string, data?: any) {
    this.Name(name);
    this.Data(data);
  }
}

export = NavigationPage;
