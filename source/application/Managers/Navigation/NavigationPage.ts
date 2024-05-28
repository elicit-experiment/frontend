import * as knockout from 'knockout';

class NavigationPage {
  public Name: ko.Observable<string> = knockout.observable<string>();
  public Data: ko.Observable<any> = knockout.observable<any>();

  constructor(name?: string, data?: any) {
    this.Name(name);
    this.Data(data);
  }
}

export default NavigationPage;
