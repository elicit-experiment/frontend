import knockout = require('knockout');
import MultiselectQuestionBase, { Item, ItemInfo } from '../MultiselectQuestionBase';
import QuestionModel = require('Models/Question');

class CheckBoxGroup extends MultiselectQuestionBase<{ Selections: string[]; Correct: boolean }> {
  private _minNoOfSelections: number;
  private _maxNoOfSelections: number;

  public Answer: KnockoutObservableArray<string> = knockout.observableArray<string>();

  public CanSelectMore: KnockoutComputed<boolean>;

  public ItemCorrectness: boolean[];

  protected readonly InstrumentTemplateName = 'CheckboxGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this._minNoOfSelections = parseInt(this.GetInstrument('MinNoOfSelections'));
    this._maxNoOfSelections = parseInt(this.GetInstrument('MaxNoOfSelections'));
    this.CanSelectMore = knockout.computed(() => this.Answer().length < this._maxNoOfSelections);
    this.SetItems(this.GetItems<Item, ItemInfo>((v) => this.CreateItemInfo(v)));

    this.RevealAnswers.subscribe((reveal: boolean) => {
      if (!reveal) return;

      const firstIncorrectItemIndex = this.ItemCorrectness.findIndex((x: boolean) => !x);
      if (!firstIncorrectItemIndex) return;

      const firstIncorrectItem = this.Items[firstIncorrectItemIndex];
      if (firstIncorrectItem) {
        this.FeedbackText(firstIncorrectItem.Feedback);
      }
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
