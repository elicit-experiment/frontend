import * as knockout from 'knockout';
import MultiselectQuestionBase, { Item, ItemInfo } from '../MultiselectQuestionBase';
import QuestionModel from 'Models/Question';

type AnswerType = { Id: string; Correct: boolean };

class RadioButtonGroup extends MultiselectQuestionBase<AnswerType> {
  private _isOptional: boolean;

  public Answer: ko.Observable<string> = knockout.observable<string>(null);

  public CorrectnessClass: ko.Computed<string>;
  public CorrectnessLabel: ko.Computed<string>;

  public FeedbackText: ko.Observable<string> = knockout.observable<string>(null);
  public IsAnswerable: ko.Computed<boolean>;

  protected readonly InstrumentTemplateName = 'RadioButtonGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this._isOptional = parseInt(this.GetInstrument('IsOptional')) == 1;

    this.SetItems(
      this.GetItems<Item, ItemInfo>((item) => this.ItemInfo(item)),
    );

    this.AddEvent('Render', '', JSON.stringify(this.Items));

    this.RevealAnswers.subscribe((reveal: boolean) => {
      if (!reveal) return;

      const item = this.Items.find((item) => item.Id === this.GetAnswer().Id);

      this.FeedbackText(item.Feedback);
    });

    this.IsAnswerable = knockout.computed(() => {
      const canAnswer = this.CanAnswer();
      const hasAnswer = this.HasAnswer();
      return canAnswer && (!this.AnswerOnce || !hasAnswer);
    });

    if (this.HasAnswer()) this.Answer(this.GetAnswer().Id);
    this.Answer.subscribe((id) => {
      const item = this.Items.find((item) => item.Id === id);
      this.AddEvent('Change', 'Mouse/Left/Down', id);
      this.SetAnswer({ Id: id, Correct: item.Correct });
    });
  }

  protected HasValidAnswer(answer: AnswerType): boolean {
    const item = this.Items.find((item) => item.Id === answer.Id);
    if (this.MustAnswerCorrectly && !item?.Correct) return false;
    if (this._isOptional) return true;
    return answer.Id != undefined;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'RadioButtonGroup', 'Instrument', method, data);
  }

  private ItemInfo(item: Item): ItemInfo {
    if (item.Selected === '1') this.Answer(item.Id);

    const AnsweredCorrectly = knockout.observable<boolean | null>(null);
    return {
      Id: item.Id,
      Label: this.GetFormatted(item.Label),
      IsEnabled: knockout.computed(() => true),
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

import template from 'Components/Questions/RadioButtonGroup/RadioButtonGroup.html';
knockout.components.register('Questions/RadioButtonGroup', {
  viewModel: RadioButtonGroup,
  template,
});

export default RadioButtonGroup;
