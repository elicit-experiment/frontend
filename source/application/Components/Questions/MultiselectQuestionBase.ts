import * as knockout from 'knockout';
import QuestionWithStimulusBase from './QuestionWithStimulusBase';
import QuestionModel from 'Models/Question';
import SlideStep from '../../Models/SlideStep';
import { shuffleInPlace } from '../../Utility/ShuffleInPlace';

export type ItemInfo = {
  Id: string;
  Label: string;
  IsEnabled: ko.Computed<boolean>;
  Preselected: boolean;
  Correct: boolean;
  Feedback: string;
  AnsweredCorrectly: ko.Observable<boolean>;
  CorrectnessClass: ko.Computed<string>;
};
export type Item = {
  Label: string;
  Id: string;
  Selected: string;
  PreSelected: string;
  Correct: boolean;
  Feedback: string;
};

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
  public IsOptional: boolean;
  public RevealAnswers: ko.Observable<boolean> = knockout.observable<boolean>(false);

  public AddFillerItem: ko.Computed<boolean>;
  public AddOneFillerItem: ko.Computed<boolean>;
  public AddHalfFillerItem: ko.Computed<boolean>;

  public FeedbackText: ko.Observable<string> = knockout.observable<string>(null);
  public CorrectnessClass: ko.Computed<string>;
  public CorrectnessLabel: ko.Computed<string>;

  public IsAnswerable: ko.Computed<boolean>;

  protected constructor(question: QuestionModel) {
    super(question);

    this.MustAnswerCorrectly = this.GetBooleanInstrument('MustAnswerCorrectly');
    this.ShowFeedback = this.GetBooleanInstrument('ShowFeedback');
    this.ShowCorrectness = this.GetBooleanInstrument('ShowCorrectness');
    this.AnswerOnce = this.GetBooleanInstrument('AnswerOnce');
    this.IsOptional = this.GetBooleanInstrument('IsOptional');

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
      if (newValue === SlideStep.ANSWERING_COMPLETED) {
        this.ApplyPreselectIfNeeded();
      }

      if (newValue == SlideStep.REVEALING && this.ShowFeedback) {
        this.RevealAnswers(true);
      }
    });

    this.IsAnswerable = knockout.computed(() => {
      const canAnswer = this.CanAnswer();
      const hasAnswer = this.HasAnswer();
      return canAnswer && (!this.AnswerOnce || !hasAnswer);
    });
  }

  protected SetItems(items: ItemInfo[]): void {
    this.Items = items;

    const randomizeOrder = this.GetBooleanInstrument('RandomizeOrder');
    if (randomizeOrder) {
      this.Items = shuffleInPlace(this.Items);
    }

    this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
    this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
    this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

    if (this.Items.length < this.QuestionsPerRow()) {
      this.QuestionsPerRow(this.Items.length);
    }
    this.RowedItems = this.RowItems(this.Items, this.QuestionsPerRow());
  }

  // We don't show the pre-selections when the instrument IsOptional, but if the user hasn't selected an option before they hit 'next',
  // we need to select the pre-selections and send the change event.
  protected ApplyPreselectIfNeeded() {}

  protected computeAlignmentPaddingItems() {
    if (this.QuestionsPerRow() > 1) {
      // Prevent the last row from having misaligned columns.
      const lastRowEmptyColumnCount =
        (this.QuestionsPerRow() - (this.Items.length % this.QuestionsPerRow())) % this.QuestionsPerRow();
      this.AlignmentPaddingItems(Array(lastRowEmptyColumnCount).fill(true));
    } else {
      this.AlignmentPaddingItems([]);
    }
  }
}

export default MultiselectQuestionBase;
