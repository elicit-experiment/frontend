import knockout from 'knockout';
import ExperimentManager = require('Managers/Portal/Experiment');
import SlideModel = require('Models/Slide');
import CockpitPortal = require('Managers/Portal/Cockpit');
import SlideStep from '../../Models/SlideStep';

class SlideShell {
  public Title: knockout.Observable<string>;
  public HasTitle: knockout.Computed<boolean>;

  public SlideData: knockout.Observable<SlideModel> = knockout.observable<SlideModel>();

  public SlideComponent: knockout.Computed<{ name: string; params: any }>;

  public AreAllQuestionsAnswered: knockout.Observable<boolean> = knockout.observable(false);
  public ShowFeedback: knockout.Observable<boolean> = knockout.observable(false);
  public CurrentSlideStep: knockout.Observable<SlideStep> = knockout.observable(SlideStep.ANSWERING);
  public SlideIndex: knockout.Observable<number>;
  public SlideNumber: knockout.Computed<number>;
  public NumberOfSlides: knockout.Observable<number>;

  public IsLoadingSlide: knockout.Computed<boolean>;

  public IsPreviousSlideVisible: knockout.Computed<boolean>;
  public IsPreviousSlideEnabled: knockout.Computed<boolean>;
  public IsNextSlideVisible: knockout.Computed<boolean>;
  public IsNextSlideEnabled: knockout.Computed<boolean>;
  public IsCloseExperimentVisible: knockout.Computed<boolean>;
  public IsCloseExperimentEnabled: knockout.Computed<boolean>;
  public IsHighlighted: knockout.Observable<boolean> = knockout.observable(false);
  public IsWaiting: knockout.Computed<boolean>;
  public IsWaitingForNext: knockout.Observable<boolean> = knockout.observable(false);
  public NextText: knockout.Computed<string> = knockout.computed(() => {
    return this.ShowFeedback() && this.CurrentSlideStep() == SlideStep.ANSWERING ? 'See Answers' : 'Next';
  });

  private _subscriptions: knockout.Subscription[] = [];

  constructor() {
    this.IsLoadingSlide = knockout.computed(() => {
      return !this.SlideData();
    });

    this.SlideIndex = ExperimentManager.CurrentSlideIndex;
    this.SlideNumber = knockout.computed(() => this.SlideIndex() + 1);
    this.NumberOfSlides = ExperimentManager.NumberOfSlides;

    this.SlideComponent = knockout.computed(() => {
      if (this.SlideData()) {
        return { name: this.SlideData().Name, params: this.SlideData() };
      }
    });

    this.IsWaiting = knockout.computed(() => this.IsWaitingForNext());

    this.IsPreviousSlideVisible = knockout.computed(
      () => ExperimentManager.GoToPreviousSlideEnabled() && !ExperimentManager.CloseSlidesEnabled(),
    );
    this.IsPreviousSlideEnabled = knockout.computed(
      () => this.IsPreviousSlideVisible() && !this.IsLoadingSlide() && this.SlideIndex() !== 0 && !this.IsWaiting(),
    );
    this.IsNextSlideVisible = knockout.computed(() => {
      return this.SlideNumber() !== this.NumberOfSlides();
    });
    this.IsNextSlideEnabled = knockout.computed(() => {
      const enabled = this.IsNextSlideVisible() && !this.IsLoadingSlide() && !this.IsWaiting();
      return enabled;
    });
    this.IsCloseExperimentVisible = knockout.computed(
      () => ExperimentManager.IsExperimentCompleted() && ExperimentManager.CloseExperimentEnabled(),
    );
    this.IsCloseExperimentEnabled = knockout.computed(() => this.IsCloseExperimentVisible() && !this.IsWaiting());

    this.Title = ExperimentManager.SlideTitle;
    this.HasTitle = knockout.computed(() => this.Title() !== '');

    this._subscriptions.push(
      ExperimentManager.IsReady.subscribe((r) => {
        if (!r) return;

        this.LoadNextSlide();
      }),
    );

    this.IsHighlighted.subscribe((value) => {
      if (value) setTimeout(() => this.IsHighlighted(false), 3000); //TODO: add binding to listen to the event for animation complete instead of timeout
    });

    //this.AreAllQuestionsAnswered.subscribe(value => console.log(`AreAllQuestionsAnswered: ${value}`))

    if (ExperimentManager.IsReady()) this.LoadNextSlide();
  }

  public NextAction(): void {
    if (this.ShowFeedback() && this.CurrentSlideStep() == SlideStep.ANSWERING) {
      if (this.AreAllQuestionsAnswered()) {
        this.CurrentSlideStep(SlideStep.REVEALING);
      } else {
        //console.log('SlideShell.ts: GoToNextSlide NOT all questions are answered!');
        this.SlideData().ScrollToFirstInvalidAnswer();

        if (this.IsHighlighted()) {
          this.IsHighlighted(false);
          setTimeout(() => this.IsHighlighted(true), 50);
        } else this.IsHighlighted(true);
      }
    } else {
      this.GoToNextSlide();
    }
  }

  public GoToNextSlide(): void {
    this.IsWaitingForNext(true);

    this.DoWhenDone(
      () => {
        return !this.IsLoadingSlide() && !this.SlideData().IsWorking();
      },
      () => {
        this.IsWaitingForNext(false);

        if (this.AreAllQuestionsAnswered()) {
          //console.log('SlideShell.ts: GoToNextSlide All questions are answered!');
          this.LoadNextSlide();
        } else {
          //console.log('SlideShell.ts: GoToNextSlide NOT all questions are answered!');
          this.SlideData().ScrollToFirstInvalidAnswer();

          if (this.IsHighlighted()) {
            this.IsHighlighted(false);
            setTimeout(() => this.IsHighlighted(true), 50);
          } else this.IsHighlighted(true);
        }
      },
    );
  }

  private LoadNextSlide(): void {
    this.UnloadSlide(true);

    ExperimentManager.LoadNextSlide(this.MakeLoadSlideCallback());
  }

  public GoToPreviousSlide(): void {
    this.UnloadSlide(false);

    ExperimentManager.LoadPreviousSlide(this.MakeLoadSlideCallback());
  }

  public MakeLoadSlideCallback(): (slideIndex: number, questions: CockpitPortal.IQuestion[]) => void {
    return (slideIndex, questions) => {
      this.SlideData(
        new SlideModel(
          'Slides/Default',
          slideIndex,
          this.AreAllQuestionsAnswered,
          this.ShowFeedback,
          this.CurrentSlideStep,
          questions,
        ),
      );
    };
  }

  private DoWhenDone(check: () => boolean, action: () => void): void {
    if (check()) {
      action();
      return;
    }
    const sub = knockout.computed(check).subscribe((v) => {
      sub.dispose();
      action();
    });
    this._subscriptions.push(sub);
  }

  private UnloadSlide(complete: boolean): void {
    this.IsHighlighted(false);

    if (complete && this.SlideData() != null) {
      const oldSlide = this.SlideData();
      this.SlideData().Complete(() => ExperimentManager.CloseSlide(oldSlide.Index));
    }

    ExperimentManager.SlideTitle('');

    this.SlideData(null);
  }

  public Close(): void {
    ExperimentManager.Close();
  }

  public dispose(): void {
    this._subscriptions.forEach((s) => s.dispose());
  }
}

import template = require('Components/SlideShell/SlideShell.html');
knockout.components.register('SlideShell', {
  viewModel: SlideShell,
  template: template.default,
});

export = SlideShell;
