import * as knockout from 'knockout';
import MultiselectQuestionBase, { Item, ItemInfo } from '../MultiselectQuestionBase';
import QuestionModel from 'Models/Question';

type AnswerType = { Id: string; Correct: boolean };

class RadioButtonGroup extends MultiselectQuestionBase<AnswerType> {
  private readonly _isOptional: boolean;

  public Answer: ko.Observable<string> = knockout.observable<string>(null);

  public CorrectnessClass: ko.Computed<string>;
  public CorrectnessLabel: ko.Computed<string>;

  public FeedbackText: ko.Observable<string> = knockout.observable<string>(null);

  protected readonly InstrumentTemplateName = 'RadioButtonGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this._isOptional = this.GetBooleanInstrument('IsOptional');

    this.SetItems(this.GetItems<Item, ItemInfo>((item) => this.ItemInfo(item)));

    this.computeAlignmentPaddingItems();

    this.AddEvent('Render', '', JSON.stringify(this.Items));

    this.RevealAnswers.subscribe((reveal: boolean) => {
      if (!reveal) return;

      const item = this.Items.find((item) => item.Id === this.GetAnswer().Id);

      this.FeedbackText(item.Feedback);
    });

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
    this.Answer.subscribe((id) => {
      const item = this.Items.find((item) => item.Id === id);
      if (!item) return;

      this.AddEvent('Change', 'Mouse/Left/Down', id);
      this.SetAnswer({ Id: id, Correct: item.Correct });
    });

    const superClassItemCssClass = this.ItemCssClass;

    this.ItemCssClass = knockout.computed(() => ({
      'radio-button-group': true,
      ...superClassItemCssClass(),
    }));
  }

  protected HasValidAnswer(answer: AnswerType): boolean {
    // console.log(`HasValidAnswer is ${this.Answer()} ${answer.Id}`);
    const item = this.Items.find((item) => item.Id === this.Answer());
    if (this.MustAnswerCorrectly && !item?.Correct) return false;
    if (this._isOptional) return true;
    return this.Answer() != undefined;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'RadioButtonGroup', 'Instrument', method, data);
  }

  private ItemInfo(item: Item): ItemInfo {
    if (item.Selected === '1' && !this._isOptional) this.Answer(item.Id);

    const AnsweredCorrectly = knockout.observable<boolean | null>(null);
    return {
      Id: item.Id,
      Label: this.GetFormatted(item.Label),
      IsEnabled: knockout.computed(() => true), // RadioButtons are always enabled, unlike checkboxbuttons
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

  protected ApplyPreselectIfNeeded() {
    this.Items.forEach((item: ItemInfo) => {
      if (item.Preselected) {
        if (this.Answer()) {
          if (this.Answer() === item.Id) {
            this.Answer(null);
          } else {
            return;
          }
        }

        if (!this.Answer()) {
          console.log(`ApplyPreselectIfNeeded[${this.Id}]: ${this.Answer()} ${item.Id} `);
          this.Answer(item.Id);
        }
      }
    });
  }
}

import template from 'Components/Questions/RadioButtonGroup/RadioButtonGroup.html';
knockout.components.register('Questions/RadioButtonGroup', {
  viewModel: RadioButtonGroup,
  template,
});

export default RadioButtonGroup;
