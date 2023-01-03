import knockout = require('knockout');
import QuestionWithStimulusBase = require('Components/Questions/QuestionWithStimulusBase');
import QuestionModel = require('Models/Question');
import { shuffleInPlace } from 'Utility/ShuffleInPlace';

type ItemInfo = { Id: string; Label: string; IsEnabled: KnockoutComputed<boolean>; Correct: boolean; Feedback: string };
type Item = { Label: string; Id: string; Selected: string; Correct: boolean; Feedback: string };

class CheckBoxGroup extends QuestionWithStimulusBase<{ Selections: string[]; Correct: boolean }> {
  private _minNoOfSelections: number;
  private _maxNoOfSelections: number;

  public Items: ItemInfo[];
  public RowedItems: ItemInfo[][];
  public Answer: KnockoutObservableArray<string> = knockout.observableArray<string>();
  public CanSelectMore: KnockoutComputed<boolean>;
  public AddFillerItem: KnockoutComputed<boolean>;
  public AddOneFillerItem: KnockoutComputed<boolean>;
  public AddHalfFillerItem: KnockoutComputed<boolean>;
  public ShowFeedback: boolean;
  public AnswerOnce: boolean;
  public MustAnswerCorrectly: boolean;
  public ShowCorrectness: boolean;
  public FeedbackText: KnockoutObservable<string> = knockout.observable<string>(null);
  public CorrectnessClass: KnockoutComputed<string>;
  public CorrectnessLabel: KnockoutComputed<string>;

  protected readonly InstrumentTemplateName = 'CheckboxGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this.MustAnswerCorrectly = !!this.GetInstrument('MustAnswerCorrectly');
    this.ShowFeedback = !!this.GetInstrument('ShowFeedback');
    this.ShowCorrectness = !!this.GetInstrument('ShowCorrectness');
    this.AnswerOnce = !!this.GetInstrument('AnswerOnce');
    this._minNoOfSelections = parseInt(this.GetInstrument('MinNoOfSelections'));
    this._maxNoOfSelections = parseInt(this.GetInstrument('MaxNoOfSelections'));
    const randomizeOrder = this.GetInstrument('RandomizeOrder');

    this.CanSelectMore = knockout.computed(() => this.Answer().length < this._maxNoOfSelections);

    this.Items = this.GetItems<Item, ItemInfo>((v) => this.CreateItemInfo(v));
    if (randomizeOrder) {
      this.Items = shuffleInPlace(this.Items);
    }
    this.AddEvent('Render', '', JSON.stringify(this.Items));
    this.RowedItems = this.RowItems(this.Items, this.QuestionsPerRow());

    this.AddOneFillerItem = knockout.computed(() => this.Items.length === 2);
    this.AddHalfFillerItem = knockout.computed(() => this.Items.length === 3);
    this.AddFillerItem = knockout.computed(() => this.AddOneFillerItem() || this.AddHalfFillerItem());

    this.CorrectnessClass = knockout.computed(() => {
      const hasAnswer = this.HasAnswer();
      const isCorrect = this.GetAnswer()?.Correct;
      if (!this.ShowCorrectness || !hasAnswer) return '';
      return isCorrect ? 'correct' : 'incorrect';
    });

    this.CorrectnessLabel = knockout.computed(() => {
      switch (this.CorrectnessClass()) {
        case 'correct':
          return '✓';
        case 'incorrect':
          return '✗';
      }
    });

    if (this.HasAnswer()) {
      if (this.GetAnswer()['Selections']) this.Answer.push.apply(this.Answer, this.GetAnswer().Selections);
    } else this.SetAnswer({ Selections: [], Correct: false });

    this.Answer.subscribe((selectedIds) => {
      this.AddEvent('Change', 'Mouse/Left/Down', selectedIds.join(','));
      const itemCorrectness = this.Items.map((item) =>
        selectedIds.indexOf(item.Id) !== -1 ? item.Correct : !item.Correct,
      );
      this.SetAnswer({ Selections: selectedIds, Correct: itemCorrectness.reduce((a, b) => a && b, true) });
      const firstIncorrectItem = this.Items.find((item) => !item.Correct);
      if (firstIncorrectItem) {
        this.FeedbackText(firstIncorrectItem.Feedback);
      }
    });
  }

  protected HasValidAnswer(answer: any): boolean {
    if (this._minNoOfSelections === 0) return true;
    if (!answer.Selections) return false;

    return answer.Selections.length >= this._minNoOfSelections;
  }

  private CreateItemInfo(item: Item): ItemInfo {
    if (item.Selected === '1') this.Answer.push(item.Id);

    const info: ItemInfo = {
      Id: item.Id,
      Label: this.GetFormatted(item.Label),
      IsEnabled: knockout.computed(
        () => this.CanAnswer() && (this.Answer.indexOf(item.Id) !== -1 || this.CanSelectMore()),
      ),
      Correct: item.Correct,
      Feedback: item.Feedback,
    };

    return info;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'CheckBoxGroup', 'Instrument', method, data);
  }
}

import template = require('Components/Questions/CheckBoxGroup/CheckBoxGroup.html');
knockout.components.register('Questions/CheckBoxGroup', {
  viewModel: CheckBoxGroup,
  template: template.default,
});

export = CheckBoxGroup;
