import knockout from 'knockout';
import SlideModel = require('Models/Slide');
import QuestionModel = require('Models/Question');
import ExperimentManager = require('Managers/Portal/Experiment');
import CockpitPortal = require('Managers/Portal/Cockpit');
import { KoComponent } from '../../../Utility/KoDecorators';

class Default {
  private _slide: SlideModel;
  private _uiLessQuestions: IQuestionViewModel[] = [];
  private _activeAnsweSets: knockout.Observable<number> = knockout.observable(0);
  private _isWorking: knockout.Observable<boolean> = knockout.observable(false);

  private _loadingQuestions: knockout.Observable<boolean> = knockout.observable(true);

  public Questions: QuestionModel[] = [];
  public HaveActiveAnswersSets: knockout.Computed<boolean>;

  constructor(slide: SlideModel) {
    this._slide = slide;
    this._slide.CanGoToNextSlide(false);
    this._loadingQuestions(true);
    slide.SlideCompleted = (callback) => this.SlideCompleted(callback);
    slide.ScrollToFirstInvalidAnswerCallback = () => this.ScrollToFirstInvalidAnswer();

    this.HaveActiveAnswersSets = knockout.computed(() => this._activeAnsweSets() !== 0);
    slide.SetIsWorking(knockout.computed(() => this._isWorking() || this.HaveActiveAnswersSets()));

    this.InitializeQuestions(slide.Questions);
  }

  private InitializeQuestions(questions: CockpitPortal.IQuestion[]): void {
    this._slide.SetIsWorking(knockout.computed(() => true));
    //console.log('Default.ts:InitializeQuestions');
    let numberToLoad = questions.length;
    const loaded = () => {
      if (--numberToLoad === 0) this.SlideLoaded();
    };

    for (let i = 0; i < questions.length; i++) {
      const questionModel = new QuestionModel(
        questions[i],
        this._slide.SlideCurrentStep,
        (question) => this.AnswerChanged(question),
        loaded,
      );
      questionModel.HasValidAnswer.subscribe(() => this.CheckIfAllQuestionsAreAnswered());
      this._slide.SlideHasFeedbackToShow(this._slide.SlideHasFeedbackToShow() || questionModel.HasFeedbackToShow());

      if (questionModel.HasFeedbackToShow()) {
        this._slide.SlideHasFeedbackToShow.subscribe(
          (feedbackToShow) => !feedbackToShow && questionModel.HasFeedbackToShow(feedbackToShow),
        );
      }

      this.Questions.push(questionModel);

      // The UI-less elements won't get created by knockout, so we have to create them ourselves
      if (!questionModel.HasUIElement) {
        knockout.components.get(questionModel.Type, (definition: knockout.components.Component) => {
          const question = definition.createViewModel(questionModel, {
            element: document.getElementsByTagName('body')[0],
            templateNodes: [],
          });
          // @ts-ignore
          this._uiLessQuestions.push(question);
        });
      }
    }

    if (questions.length === 0) {
      this.SlideLoaded();
    }
  }

  private SlideLoaded(): void {
    console.log('Default.ts:SlideLoaded');

    for (let i = 0; i < this._uiLessQuestions.length; i++) this._uiLessQuestions[i].SlideLoaded();

    this._loadingQuestions(false);
    this.CheckIfAllQuestionsAreAnswered();
    this._slide.SetIsWorking(knockout.computed(() => false));
  }

  private SlideCompleted(completed: () => void): void {
    let waitForAnswerSaved = false;

    for (let i = 0; i < this._uiLessQuestions.length; i++) {
      waitForAnswerSaved = this._uiLessQuestions[i].SlideCompleted() || waitForAnswerSaved;
    }

    if (waitForAnswerSaved) {
      const sub = this.HaveActiveAnswersSets.subscribe((v) => {
        if (!v) {
          sub.dispose();
          completed();
        }
      });
    } else completed();
  }

  private ScrollToFirstInvalidAnswer(): void {
    const question = this.GetFirstQuestionWithoutValidAnswer();

    if (question != null) question.ScrollTo(ExperimentManager.ScrollToInvalidAnswerDuration);
  }

  private AnswerChanged(question: QuestionModel): void {
    if (question.HasValidAnswer()) {
      this._activeAnsweSets(this._activeAnsweSets() + 1);

      ExperimentManager.SaveQuestionAnswer(question.Id, question.Answer(), (success) => {
        if (!success) question.HasValidAnswer(false);

        this._isWorking(true);
        this._activeAnsweSets(this._activeAnsweSets() - 1);
        this.CheckIfAllQuestionsAreAnswered();
        this._isWorking(false);
      });
    }

    this.CheckIfAllQuestionsAreAnswered();
  }

  private GetFirstQuestionWithoutValidAnswer(): QuestionModel {
    //console.log(`Default.ts: GetFirstQuestionWithoutValidAnswer for ${this.Questions.length} questions`);

    for (let i = 0; i < this.Questions.length; i++) {
      //console.log(`Default.ts: GetFirstQuestionWithoutValidAnswer ${i}: RequiresInput ${this.Questions[i].RequiresInput} Has Valid Answer ${this.Questions[i].HasValidAnswer()}`);
      // This is Question.ts:HasValidAnswer(). NOT the HasValidAnswer of the question models
      if (
        this.Questions[i].RequiresInput &&
        !this.Questions[i].HasValidAnswer() &&
        !this.Questions[i].AllRequiredMediaHavePlayed()
      ) {
        //console.log(`Default.ts: GetFirstQuestionWithoutValidAnswer Question ${i} is invalid`);
        return this.Questions[i];
      }
    }

    return null;
  }

  private CheckIfAllQuestionsAreAnswered(): void {
    const firstQuestionWithInvalidAnswer = this.GetFirstQuestionWithoutValidAnswer();

    const allAnswered = !firstQuestionWithInvalidAnswer && !this.HaveActiveAnswersSets();

    // console.log(`Default.ts: CheckIfAllQuestionsAreAnswered loading questions? ${this._loadingQuestions()} ${firstQuestionWithInvalidAnswer} ${this.HaveActiveAnswersSets()} => ${allAnswered}`);

    if (this._loadingQuestions()) return this._slide.CanGoToNextSlide(false);

    this._slide.CanGoToNextSlide(allAnswered);
  }
}

import template = require('Components/Slides/Default/Default.html');
knockout.components.register('Slides/Default', {
  viewModel: Default,
  template: template.default,
});

export = Default;
