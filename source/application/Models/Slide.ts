import knockout = require('knockout');
import CockpitPortal = require('Managers/Portal/Cockpit');
import SlideStep from './SlideStep';

class Slide {
  public Index: number;
  public Name: string;
  public IsWorking: KnockoutComputed<boolean>;
  public CanGoToNextSlide: KnockoutObservable<boolean>;
  public SlideHasFeedbackToShow: KnockoutObservable<boolean>;
  public SlideCurrentStep: KnockoutObservable<SlideStep>;
  public Questions: CockpitPortal.IQuestion[];
  public SlideCompleted: (completed: () => void) => void;
  public ScrollToFirstInvalidAnswerCallback: () => void;

  private _isWorking: KnockoutObservable<KnockoutComputed<boolean>> = knockout.observable(null);

  constructor(
    name: string,
    index: number = null,
    canGoToNextSlide: KnockoutObservable<boolean> = null,
    showFeedback: KnockoutObservable<boolean> = null,
    currentSlideStep: KnockoutObservable<SlideStep> = null,
    questions: CockpitPortal.IQuestion[] = null,
  ) {
    this.Index = index;
    this.Name = name;
    this.CanGoToNextSlide = canGoToNextSlide;
    this.SlideHasFeedbackToShow = showFeedback;
    this.SlideCurrentStep = currentSlideStep;
    this.Questions = questions;
    this.IsWorking = knockout.computed(() => {
      return this._isWorking() != null ? this._isWorking()() : false;
    });
  }

  public Complete(callback: () => void): void {
    if (this.SlideCompleted != null) this.SlideCompleted(callback);
  }

  public ScrollToFirstInvalidAnswer(): void {
    if (this.ScrollToFirstInvalidAnswerCallback != null) this.ScrollToFirstInvalidAnswerCallback();
  }

  public SetIsWorking(observeable: KnockoutComputed<boolean>): void {
    this._isWorking(observeable);
  }
}

export = Slide;
