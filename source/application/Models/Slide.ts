import * as knockout from 'knockout';
import { IQuestion } from 'Managers/Portal/Cockpit';
import SlideStep from './SlideStep';

class Slide {
  public Index: number;
  public Name: string;
  public IsWorking: ko.Computed<boolean>;
  public CanGoToNextSlide: ko.Observable<boolean>;
  public SlideHasFeedbackToShow: ko.Observable<boolean>;
  public SlideCurrentStep: ko.Observable<SlideStep>;
  public Questions: IQuestion[];
  public SlideCompleted: (completed: () => void) => void;
  public ScrollToFirstInvalidAnswerCallback: () => void;

  private _isWorking: ko.Observable<ko.Computed<boolean>> = knockout.observable(null);

  constructor(
    name: string,
    index: number = null,
    canGoToNextSlide: ko.Observable<boolean> = null,
    showFeedback: ko.Observable<boolean> = null,
    currentSlideStep: ko.Observable<SlideStep> = null,
    questions: IQuestion[] = null,
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

  public SetIsWorking(observeable: ko.Computed<boolean>): void {
    this._isWorking(observeable);
  }
}

export default Slide;
