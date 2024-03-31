import knockout from 'knockout';
import CockpitPortal = require('Managers/Portal/Cockpit');
import SlideStep from './SlideStep';

class Slide {
  public Index: number;
  public Name: string;
  public IsWorking: knockout.Computed<boolean>;
  public CanGoToNextSlide: knockout.Observable<boolean>;
  public SlideHasFeedbackToShow: knockout.Observable<boolean>;
  public SlideCurrentStep: knockout.Observable<SlideStep>;
  public Questions: CockpitPortal.IQuestion[];
  public SlideCompleted: (completed: () => void) => void;
  public ScrollToFirstInvalidAnswerCallback: () => void;

  private _isWorking: knockout.Observable<knockout.Computed<boolean>> = knockout.observable(null);

  constructor(
    name: string,
    index: number = null,
    canGoToNextSlide: knockout.Observable<boolean> = null,
    showFeedback: knockout.Observable<boolean> = null,
    currentSlideStep: knockout.Observable<SlideStep> = null,
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

  public SetIsWorking(observeable: knockout.Computed<boolean>): void {
    this._isWorking(observeable);
  }
}

export = Slide;
