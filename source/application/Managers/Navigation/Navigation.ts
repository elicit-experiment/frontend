import * as knockout from 'knockout';
import Routie from 'routie';
import NavigationPage from 'Managers/Navigation/NavigationPage';
import Title from 'Managers/Title';

class Navigation {
  public CurrentPage: ko.Observable<NavigationPage> = knockout.observable<NavigationPage>();
  public ExperimentId: ko.Observable<string> = knockout.observable(null);
  public ExperimentListId: ko.Observable<string> = knockout.observable(null);

  constructor() {
    Routie({
      '': () => {
        this.LoadPage('Welcome');
      },
      X: () => {
        this.LoadPage('Welcome');
      },
      WebGazer: () => {
        this.LoadPage('WebGazer');
      },
      'Experiment/:id': (id: string) => {
        this.LoadSlide(id);
      },
      'ExperimentList/:id': (id: string) => {
        this.LoadExperimentFromList(id);
      },
      NoMoreExperiments: () => {
        this.LoadPage('NoMoreExperiments');
      },
      SlideLocked: () => {
        this.LoadPage('SlideLocked');
      },
      TextFormat: () => {
        this.LoadPage('TextFormat');
      },
      CreateExperiment: () => {
        this.LoadPage('CreateExperiment');
      },
      'ExperimentNotFound/:id': (id: string) => {
        this.LoadPage('ExperimentNotFound', id);
      },
      '*': () => {
        this.LoadPage('NotFound');
      },
    });
  }

  public Navigate(path: string): void {
    Routie(path);
  }

  private LoadPage(name: string, data?: any): void {
    Title.ToDefault();
    this.CurrentPage(new NavigationPage(name, data));
  }

  private LoadSlide(id: string): void {
    this.ExperimentId(id);

    if (this.CurrentPage() == null || this.CurrentPage().Name() !== 'SlideShell') this.LoadPage('SlideShell');
  }

  private LoadExperimentFromList(id: string): void {
    this.ExperimentId(null);
    this.ExperimentListId(id);
  }
}

const instance = new Navigation();

export default instance;
