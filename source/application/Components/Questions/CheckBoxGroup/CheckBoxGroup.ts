import knockout from 'knockout';
import MultiselectQuestionBase, { Item, ItemInfo } from '../MultiselectQuestionBase';
import QuestionModel = require('Models/Question');

type AnswerType = { Selections: string[]; Correct: boolean };

class CheckBoxGroup extends MultiselectQuestionBase<AnswerType> {
  private readonly _minNoOfSelections: number;
  private readonly _maxNoOfSelections: number;

  public Answer: knockout.ObservableArray<string> = knockout.observableArray<string>();

  public CanSelectMore: knockout.Computed<boolean>;

  public ItemCorrectness: boolean[];

  public FeedbackCorrect = knockout.observable<string>('');
  public FeedbackIncorrect = knockout.observable<string>('');

  protected readonly InstrumentTemplateName = 'CheckboxGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this.FeedbackCorrect(this.GetInstrument('FeedbackCorrect'));
    this.FeedbackIncorrect(this.GetInstrument('FeedbackIncorrect'));

    this._minNoOfSelections = parseInt(this.GetInstrument('MinNoOfSelections'));
    this._maxNoOfSelections = parseInt(this.GetInstrument('MaxNoOfSelections'));

    console.log(this._minNoOfSelections);
    this.CanSelectMore = knockout.computed(() => {
      //console.log(`${this.Answer().length} ${this.Answer().length < this._maxNoOfSelections}`);
      return this.Answer().length < this._maxNoOfSelections;
    });
    this.SetItems(
      this.GetItems<Item, ItemInfo>((v) => this.CreateItemInfo(v)),
    );

    this.RevealAnswers.subscribe((reveal: boolean) => {
      if (!reveal) return;

      const firstIncorrectItemIndex = this.ItemCorrectness.findIndex((x: boolean) => !x);
      if (firstIncorrectItemIndex === -1) return;

      const firstIncorrectItem = this.Items[firstIncorrectItemIndex];
      if (firstIncorrectItem) {
        this.FeedbackText(this.FeedbackIncorrect());
      } else {
        this.FeedbackText(this.FeedbackCorrect());
      }
      //console.dir(this.ItemCorrectness);

      this.ItemCorrectness.forEach((correct, index) =>
        this.GetAnswer().Selections.indexOf(this.Items[index].Id) !== -1 || !correct
          ? this.Items[index].AnsweredCorrectly(correct)
          : '',
      );
    });

    if (this.HasAnswer()) {
      if (this.GetAnswer()['Selections']) this.Answer.push.apply(this.Answer, this.GetAnswer().Selections);
    } else this.SetAnswer({ Selections: [], Correct: false });

    this.Answer.subscribe((selectedIds) => {
      this.AddEvent('Change', 'Mouse/Left/Down', selectedIds.join(','));
      this.ItemCorrectness = this.Items.map((item) =>
        selectedIds.indexOf(item.Id) !== -1 ? item.Correct : !item.Correct,
      );

      this.SetAnswer({ Selections: selectedIds, Correct: this.ItemCorrectness.reduce((a, b) => a && b, true) });
    });
  }

  protected HasValidAnswer(answer: AnswerType): boolean {
    if (this._minNoOfSelections === 0) return true;
    if (!answer.Selections) return false;

    return answer.Selections.length >= this._minNoOfSelections;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'CheckBoxGroup', 'Instrument', method, data);
  }

  private CreateItemInfo(item: Item): ItemInfo {
    if (item.Selected === '1') this.Answer.push(item.Id);

    const AnsweredCorrectly = knockout.observable<boolean | null>(null);
    return {
      Id: item.Id,
      Label: this.GetFormatted(item.Label),
      IsEnabled: knockout.computed(() => {
        // console.dir([this.CanAnswer(), this.Answer().indexOf(item.Id) !== -1, this.CanSelectMore()]);
        const canAnswer = this.CanAnswer();
        const alreadyAnswered = this.Answer().indexOf(item.Id) !== -1;
        const canSelectMore = this.CanSelectMore();

        return canAnswer && (canSelectMore || alreadyAnswered);
      }),
      Correct: item.Correct,
      Feedback: item.Feedback,
      AnsweredCorrectly,
      CorrectnessClass: knockout.computed(() => {
        if (AnsweredCorrectly() === null) return '';

        return AnsweredCorrectly() ? 'correct' : 'incorrect';
      }),
    };
  }
}

import template = require('Components/Questions/CheckBoxGroup/CheckBoxGroup.html');
knockout.components.register('Questions/CheckBoxGroup', {
  viewModel: CheckBoxGroup,
  template: template.default,
});

export = CheckBoxGroup;
