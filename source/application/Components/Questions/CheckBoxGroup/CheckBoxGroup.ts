import * as knockout from 'knockout';
import MultiselectQuestionBase, { Item, ItemInfo } from '../MultiselectQuestionBase';
import QuestionModel from 'Models/Question';

type AnswerType = { Selections: string[]; Correct: boolean };

class CheckBoxGroup extends MultiselectQuestionBase<AnswerType> {
  private readonly _minNoOfSelections: number;
  private readonly _maxNoOfSelections: number;

  public Answer: ko.ObservableArray<string> = knockout.observableArray<string>();

  public CanSelectMore: ko.Computed<boolean>;

  public ItemCorrectness: boolean[];

  public FeedbackCorrect = knockout.observable<string>('');
  public FeedbackIncorrect = knockout.observable<string>('');

  protected readonly InstrumentTemplateName = 'CheckboxGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    const restoredSelections = this.HasAnswer() ? this.GetAnswer().Selections : undefined;

    this.FeedbackCorrect(this.GetInstrument('FeedbackCorrect'));
    this.FeedbackIncorrect(this.GetInstrument('FeedbackIncorrect'));

    this._minNoOfSelections = this.GetNumberInstrument('MinNoOfSelections');
    this._maxNoOfSelections = this.GetNumberInstrument('MaxNoOfSelections');

    this.CanSelectMore = knockout.computed(() => {
      //console.log(`${this.Answer().length} ${this.Answer().length < this._maxNoOfSelections}`);
      return this.Answer().length < this._maxNoOfSelections;
    });
    this.SetItems(this.GetItems<Item, ItemInfo>((v) => this.CreateItemInfo(v)));
    this.computeAlignmentPaddingItems();

    this.AddEvent('Render', '', JSON.stringify(this.Items));

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

    // Persist untouched defaults without recording a synthetic mouse interaction.
    // A restored empty selection is intentional and replaces every default.
    this.Answer(restoredSelections === undefined ? this.Answer().slice() : restoredSelections.slice());
    this.UpdateSelection(this.Answer().slice());

    this.Answer.subscribe((selectedIds) => {
      this.AddEvent('Change', 'Mouse/Left/Down', selectedIds.join(','));
      this.UpdateSelection(selectedIds);
    });

    const superClassItemCssClass = this.ItemCssClass;

    this.ItemCssClass = knockout.computed(() => ({
      'checkbox-button-group': true,
      ...superClassItemCssClass(),
    }));
  }

  protected HasValidAnswer(answer: AnswerType): boolean {
    if (this._minNoOfSelections === 0) return true;
    if (!answer.Selections) return false;

    return answer.Selections.length >= this._minNoOfSelections;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'CheckBoxGroup', 'Instrument', method, data);
  }

  private UpdateSelection(selectedIds: string[]): void {
    this.ItemCorrectness = this.Items.map((item) =>
      selectedIds.indexOf(item.Id) !== -1 ? item.Correct : !item.Correct,
    );
    this.SetAnswer({ Selections: selectedIds, Correct: this.ItemCorrectness.reduce((a, b) => a && b, true) });
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
      Preselected: item.Selected === '1',
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

import template from 'Components/Questions/CheckBoxGroup/CheckBoxGroup.html';
knockout.components.register('Questions/CheckBoxGroup', {
  viewModel: CheckBoxGroup,
  template,
});

export default CheckBoxGroup;
