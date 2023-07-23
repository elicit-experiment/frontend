import knockout = require('knockout');
import QuestionWithStimulusBase from './QuestionWithStimulusBase';
import QuestionModel = require('Models/Question');
import SlideStep from '../../Models/SlideStep';
import { shuffleInPlace } from '../../Utility/ShuffleInPlace';

export type ItemInfo = {
  Id: string;
  Label: string;
  IsEnabled: KnockoutComputed<boolean>;
  Correct: boolean;
  Feedback: string;
  AnsweredCorrectly: KnockoutObservable<boolean>;
  CorrectnessClass: KnockoutComputed<string>;
};
export type Item = { Label: string; Id: string; Selected: string; Correct: boolean; Feedback: string };

export interface CorrectableAnswer {
  Correct: boolean;
}

abstract class MultiselectQuestionBase<T extends CorrectableAnswer> extends QuestionWithStimulusBase<T> {
  public Items: ItemInfo[] = [];
  public RowedItems: ItemInfo[][] = [];

  public ShowFeedback: boolean;
  public AnswerOnce: boolean;
  public MustAnswerCorrectly: boolean;
  public ShowCorrectness: boolean;
  public RevealAnswers: KnockoutObservable<boolean> = knockout.observable<boolean>(false);

  public AddFillerItem: KnockoutComputed<boolean>;
  public AddOneFillerItem: KnockoutComputed<boolean>;
  public AddHalfFillerItem: KnockoutComputed<boolean>;

  public FeedbackText: KnockoutObservable<string> = knockout.observable<string>(null);
  public CorrectnessClass: KnockoutComputed<string>;
  public CorrectnessLabel: KnockoutComputed<string>;

  protected constructor(question: QuestionModel) {
    super(question);

    this.MustAnswerCorrectly = !!this.GetInstrument('MustAnswerCorrectly');
    this.ShowFeedback = !!this.GetInstrument('ShowFeedback');
    this.ShowCorrectness = !!this.GetInstrument('ShowCorrectness');
    this.AnswerOnce = !!this.GetInstrument('AnswerOnce');

    this.AddEvent('Render', '', JSON.stringify(this.Items));

    this.CorrectnessClass = knockout.computed(() => {
      if (!this.RevealAnswers()) return '';

      const hasAnswer = this.HasAnswer();
      const isCorrect = this.GetAnswer()?.Correct;
      if (!this.ShowCorrectness || !hasAnswer) return '';

      return isCorrect ? 'correct' : 'incorrect';
    });

    this.CorrectnessLabel = knockout.computed(() => {
      if (!this.RevealAnswers()) return '';

      switch (this.CorrectnessClass()) {
        case 'correct':
          return '✓';
        case 'incorrect':
          return '✗';
      }
    });

    this.Model.SlideStep.subscribe((newValue: SlideStep) => {
      if (newValue == SlideStep.REVEALING && this.ShowFeedback) {
        this.RevealAnswers(true);
      }
    });
  }

  protected SetItems(items: ItemInfo[]): void {
    this.Items = items;

    const randomizeOrder = this.GetInstrument('RandomizeOrder');
    if (randomizeOrder) {
      this.Items = shuffleInPlace(this.Items);
    }

    this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
    this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
    this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

    this.RowedItems = this.RowItems(this.Items, this.QuestionsPerRow());
  }
}

export default MultiselectQuestionBase;
