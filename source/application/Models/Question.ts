import * as knockout from 'knockout';
import { IOutput, IQuestion } from 'Managers/Portal/Cockpit';
import { Get as QuestionMapGet } from 'Components/Questions/QuestionMap';
import SlideStep from './SlideStep';

type QuestionLayout = {
  Type: 'row' | 'column';
  ColumnWidthPercent: [number, number] | null;
};

const DEFAULT_LAYOUT: QuestionLayout = { Type: 'row', ColumnWidthPercent: null };

class Question {
  public Id: string;
  public Type: string;
  public APIType: string;
  public HasUIElement: boolean;
  public Input: any[];
  public Component: any[];
  public Layout: QuestionLayout;
  public Answer: ko.Observable<IOutput> = knockout.observable<IOutput>();
  public HasValidAnswer: ko.Observable<boolean> = knockout.observable(false);
  public SlideStep: ko.Observable<SlideStep>;
  public RequiresInput: boolean;
  public ScrollToCallback: ko.Observable<(duration: number) => void> = knockout.observable(null);
  public AllRequiredMediaHavePlayed = knockout.observable(false);
  public HasFeedbackToShow = knockout.observable(false);
  private _loadedCallback: () => void;

  constructor(
    question: IQuestion,
    slideStep: ko.Observable<SlideStep>,
    answerChangedCallback: (question: Question) => void,
    questionLoadedCallback: () => void,
  ) {
    this.SlideStep = slideStep;

    let questionMap: any;
    let input;

    if (question.Type.indexOf('NewComponent') == 0) {
      //console.log(question.Type);
      const component = question.Component as any;
      //console.dir(component);

      if (question.Type == 'NewComponent::WebGazerCalibrate') {
        questionMap = QuestionMapGet('WebGazerCalibrate');
        input = component;
      } else if (question.Type == 'NewComponent::FaceLandmark') {
        questionMap = QuestionMapGet('FaceLandmark');
        input = component;
      } else if (question.Type == 'NewComponent::FaceLandmarkCalibration') {
        questionMap = QuestionMapGet('FaceLandmarkCalibration');
        input = component;
      } else if (question.Type == 'NewComponent') {
        const numStimuli = 'Stimuli' in component ? component.Stimuli.length : 0;
        const numInstruments = 'Instruments' in component ? component.Instruments.length : 0;

        //console.log(`i: ${numInstruments} s: ${numStimuli}`);
        if (numStimuli == 1 && numInstruments == 0) {
          questionMap = QuestionMapGet('SoloStimulus');
          input = component.Stimuli; // TODO: Handle more than one stimulus ?
        }
        if (numStimuli == 0 && numInstruments == 1) {
          input = [component.Instruments[0].Instrument]; // TODO: Handle more than one instrument
          const type = Object.keys(input[0])[0];
          input = input.map((x) => {
            return { Instrument: x[type] };
          });
          questionMap = QuestionMapGet(type);
        }
        if (numStimuli == 1 && numInstruments == 1) {
          input = [component.Instruments[0].Instrument]; // TODO: Handle more than one instrument
          const type = Object.keys(input[0])[0];
          input = input.map((x) => {
            return { Instrument: { ...x[type], Stimulus: component.Stimuli[0] } };
          });
          questionMap = QuestionMapGet(type);
        }

        let layout = component.Layout as QuestionLayout;
        if (layout == null && numInstruments > 0) {
          // Old style layout definition lives on the instrument
          const instrument = component.Instruments[0].Instrument;
          const layoutType = instrument[Object.keys(instrument)[0]].Layout || 'row';

          layout = { Type: layoutType, ColumnWidthPercent: null };
          if (layoutType === 'column') {
            const columnWidthPercent = instrument[Object.keys(instrument)[0]].ColumnWidthPercent;
            layout.ColumnWidthPercent = [100 - columnWidthPercent, columnWidthPercent];
          }
        }
        this.Layout = layout || DEFAULT_LAYOUT;
      }
      //console.dir(input);
      //console.dir(questionMap);
    } else {
      input = question.Component;
      questionMap = QuestionMapGet(question.Type);
    }
    this.Id = question.Id;
    this.Type = questionMap.Type;
    this.HasUIElement = questionMap.HasUIElement;
    this.APIType = question.Type;
    const instrumentsHaveFeedback = Array.isArray(input)
      ? input.reduce(
          (showFeedback: boolean, instrument: any) =>
            showFeedback || instrument?.Instrument?.ShowFeedback || instrument?.Instrument?.ShowCorrectness,
          false,
        )
      : false;

    this.HasFeedbackToShow(this.HasFeedbackToShow?.call(this) || instrumentsHaveFeedback);
    this._loadedCallback = questionLoadedCallback;

    if (question.Output) this.Answer(question.Output);

    this.Input = input;
    this.Component = question.Component;

    this.Answer.extend({ rateLimit: { timeout: 200, method: 'notifyWhenChangesStop' } });
    this.Answer.subscribe(() => answerChangedCallback(this));
  }

  public Loaded(): void {
    if (this._loadedCallback === null) return;
    this._loadedCallback();
    this._loadedCallback = null;
  }

  public ScrollTo(duration: number): void {
    if (this.ScrollToCallback() == null) throw new Error('SrollTo not ready');
    this.ScrollToCallback()(duration);
  }
}

export default Question;
