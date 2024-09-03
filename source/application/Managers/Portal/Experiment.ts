import * as knockout from 'knockout';
import Portal from 'Managers/Portal/Portal';
import {
  Slide,
  Experiment as CockpitExperiment,
  IQuestion,
  Question as CockpitQuestion,
  Answer,
} from 'Managers/Portal/Cockpit';
import Navigation from 'Managers/Navigation/Navigation';
import Title from 'Managers/Title';
import Notification from 'Managers/Notification';
import CallRepeater from 'Managers/CallRepeater';
import CallQueue from 'Managers/CallQueue';
import DisposableComponent from 'Components/DisposableComponent';
import TestExperiment from 'Managers/Portal/TestExperiment';

class Experiment extends DisposableComponent {
  private static TestId = 'test';

  public get IsTestExperiment(): boolean {
    return this._id === Experiment.TestId;
  }
  private _testExperiment: TestExperiment;

  public IsReady: ko.Observable<boolean> = knockout.observable<boolean>(false);

  public CurrentSlideIndex: ko.Observable<number> = knockout.observable(0);
  public NumberOfSlides: ko.Observable<number> = knockout.observable<number>(0);

  public IsExperimentCompleted: ko.Observable<boolean> = knockout.observable(false);

  public Title: ko.Observable<string> = knockout.observable('');
  public SlideTitle: ko.Observable<string> = knockout.observable('');
  public FooterLabel: ko.Observable<string> = knockout.observable(null);
  public StyleSheet: ko.Observable<string> = knockout.observable(null);
  public CompletedUrl: ko.Observable<string> = knockout.observable(null);
  public ScrollToInvalidAnswerDuration = 2000;

  public CloseExperimentEnabled: ko.Computed<boolean>;
  public CloseSlidesEnabled: ko.Observable<boolean> = knockout.observable(false);
  public GoToPreviousSlideEnabled: ko.Observable<boolean> = knockout.observable(true);

  private _id: string;
  private _hasLoadedCurrentSlide = false;
  private _listExperiments: { [listId: string]: string } = {};
  private _callQueue: CallQueue;

  private _styleSheetElement: HTMLLinkElement;

  constructor() {
    super();
    this.StyleSheet.subscribe((path) => {
      if (this._styleSheetElement != null) document.head.removeChild(this._styleSheetElement);

      if (path != null) {
        this._styleSheetElement = document.createElement('link');
        this._styleSheetElement.rel = 'stylesheet';
        this._styleSheetElement.type = 'text/css';
        this._styleSheetElement.href = path;
        document.head.appendChild(this._styleSheetElement);
      }
    });
    this.Title.subscribe((title) => Title.ToDefault(title == '' ? null : title));

    this.CloseExperimentEnabled = knockout.computed(() => this.CompletedUrl() != null);
    this._callQueue = new CallQueue(true);

    Navigation.ExperimentId.subscribe((id) => {
      if (id != null) this.Load(id);
    });
    Navigation.ExperimentListId.subscribe((id) => {
      if (id != null) this.LoadNext(id);
    });

    if (Navigation.ExperimentId() != null) this.Load(Navigation.ExperimentId());
    else if (Navigation.ExperimentListId() != null) this.LoadNext(Navigation.ExperimentListId());
  }

  public ExperimentCompleted(): void {
    Portal.AllowPageLoads();

    Slide.Completed(this._id, this.NumberOfSlides() - 1).WithCallback((response) => {
      if (response.Error != null) Notification.Error(`Failed to complete experiment: ${response.Error.Message}`);
    });

    this.IsExperimentCompleted(true);
  }

  public Load(id: string): void {
    this._id = id;

    this.IsReady(false);
    this._hasLoadedCurrentSlide = false;

    if (!this.IsTestExperiment) {
      this.AddAction(Portal.IsReady, () => {
        CockpitExperiment.Get(this._id).WithCallback((response) => {
          if (response.Error != null) {
            Notification.Error(`Failed to load Experiment: ${response.Error.Message}`);
            Navigation.Navigate(`ExperimentNotFound/${id}`);
            return;
          }
          if (response.Body.Results.length === 0) {
            Navigation.Navigate(`ExperimentNotFound/${id}`);
            Notification.Error('No Experiment data returned');
            return;
          }

          const config = response.Body.Results[0];

          this.Title(config.Name);
          this.CloseSlidesEnabled(config.LockQuestion);
          this.GoToPreviousSlideEnabled(config.EnablePrevious);
          this.FooterLabel(config.FooterLabel);
          this.CurrentSlideIndex(config.CurrentSlideIndex);
          this.IsExperimentCompleted(false);
          this.StyleSheet(config.Css);
          this.CompletedUrl(config.RedirectOnCloseUrl);

          // TODO: If uses WebGazer, then...

          this.IsReady(true);
        });
      });
    } else {
      this._testExperiment = new TestExperiment();
      Notification.Debug('Loading test experiment');

      this.Title('Test Experiment');
      this.CloseSlidesEnabled(false);
      this.GoToPreviousSlideEnabled(true);
      this.FooterLabel('Test experiment');
      this.CurrentSlideIndex(0);
      this.IsExperimentCompleted(false);
      this.StyleSheet(null);
      this.CompletedUrl(null);

      this.IsReady(true);
    }
  }

  public LoadNext(listId: string): void {
    if (this._listExperiments[listId]) {
      Navigation.Navigate(`Experiment/${this._listExperiments[listId]}`);
      return;
    }

    CockpitExperiment.Next(listId).WithCallback((response) => {
      if (response.Error != null) {
        Navigation.Navigate('NoMoreExperiments');
        return;
      }

      if (response.Body.Results.length === 0) Navigation.Navigate('NoMoreExperiments');
      else {
        this._listExperiments[listId] = response.Body.Results[0].Id;

        Navigation.Navigate(`Experiment/${response.Body.Results[0].Id}`);
      }
    });
  }

  public LoadNextSlide(callback: (slideIndex: number, questions: IQuestion[]) => void): void {
    this.LoadSlide(this.CurrentSlideIndex() + (this._hasLoadedCurrentSlide ? 1 : 0), callback);
  }

  public LoadPreviousSlide(callback: (slideIndex: number, questions: IQuestion[]) => void): void {
    this.LoadSlide(this.CurrentSlideIndex() + -1, callback);
  }

  private LoadSlide(index: number, callback: (slideIndex: number, questions: IQuestion[]) => void): void {
    if (!this.IsTestExperiment) {
      CockpitQuestion.Get(this._id, index).WithCallback((response) => {
        if (response.Error != null) {
          if (response.Error.Fullname === 'Chaos.Cockpit.Core.Core.Exceptions.SlideLockedException')
            Navigation.Navigate('SlideLocked');
          else if (response.Error.Message === 'No Questionaire found by that Id')
            Navigation.Navigate(`ExperimentNotFound/${this._id}`);
          else Notification.Error(`Failed to get slide: ${response.Error.Message}`);

          return;
        }

        if (response.Body.Count === 0) {
          Notification.Error('No slide returned');
          return;
        }

        this.NumberOfSlides(response.Body.FoundCount);

        this._hasLoadedCurrentSlide = true;
        this.CurrentSlideIndex(index);

        callback(index, response.Body.Results);
      });
    } else {
      setTimeout(() => {
        Notification.Debug('Loading test slide: ' + index);

        this.NumberOfSlides(this._testExperiment.Slides.length);
        this._hasLoadedCurrentSlide = true;
        this.CurrentSlideIndex(index);

        callback(index, this._testExperiment.Slides[index]);
      }, 100);
    }
  }

  public SaveQuestionAnswer(id: string, answer: any, callback: (success: boolean) => void): void {
    this._callQueue.Queue(
      id,
      new CallRepeater((c) => {
        if (!this.IsTestExperiment) {
          Answer.Set(id, answer).WithCallback((response) => {
            if (response.Error != null) {
              if (response.Error.Fullname !== 'Chaos.Cockpit.Core.Core.Exceptions.ValidationException') {
                c(false, false);
                Notification.Error(`Failed to save answer: ${response.Error.Message}`);
              } else c(false, true);
            } else c(true, false);
          });
        } else {
          setTimeout(() => {
            Notification.Debug('Saving test answer: ' + id + '\n' + JSON.stringify(answer));
            c(true, false);
          }, 100);
        }
      }, callback),
    );
  }

  public SendSlideDataPoint(id: string, datapoint: any, callback: (success: boolean) => void): void {
    this._callQueue.Queue(
      id,
      new CallRepeater((c) => {
        if (!this.IsTestExperiment) {
          Slide.DataPoint(id, datapoint).WithCallback((response) => {
            if (response.Error != null) {
              console.dir(response.Error);
              if (response.Error.Fullname !== 'Chaos.Cockpit.Core.Core.Exceptions.ValidationException') {
                c(false, false);
                Notification.Error(`Failed to save datapoint: ${response.Error.Message}`);
              } else c(false, true);
            } else c(true, false);
          });
        } else {
          setTimeout(() => {
            Notification.Debug('Saving test answer: ' + id + '\n' + JSON.stringify(datapoint));
            c(true, false);
          }, 100);
        }
      }, callback),
    );
  }

  public CallOnQueue(queueId: string, caller: () => Promise<any>): Promise<number> {
    return new Promise<number>((resolve) => {
      let callCount = 0;
      this._callQueue.Queue(
        queueId,
        new CallRepeater(
          (c: (success: boolean, fatal: boolean) => void) => {
            if (!this.IsTestExperiment) {
              callCount++;
              caller()
                .then(() => c(true, false))
                .catch((fatal) => c(false, !!fatal));
            } else {
              setTimeout(() => {
                c(true, false);
              }, 100);
            }
          },
          () => resolve(callCount),
        ),
      );
    });
  }

  public CloseSlide(index: number): void {
    if (!this.IsTestExperiment) {
      Slide.Completed(this._id, index).WithCallback((response) => {
        if (response.Error != null) Notification.Error(`Failed to close slide: ${response.Error.Message}`);
      });
    } else {
      Notification.Debug('Closing test slide: ' + index);
    }
  }

  public Close(): any {
    const completedUrl = new URL(this.CompletedUrl());

    if (completedUrl.pathname === '/chaos/endexperiment') {
      //let currentSearchParams = new URLSearchParams(window.location.search);
      const queryParams = window.location.search
        .replace(/^\?(.*)/, '$1')
        .split('&')
        .map((p) => {
          const x = p.split(/=/);
          const y: { [param: string]: string } = {};
          y[x[0]] = x[1];
          return y;
        })
        .reduce((l: object, r: object) => {
          return { ...l, ...r };
        }, {});

      console.log(JSON.stringify(queryParams, null, 2));

      for (const k in queryParams) {
        completedUrl.searchParams.set(k, queryParams[k]);
      }
    }

    document.location.href = completedUrl.href;
  }
}

const instance = new Experiment();

export default instance;
