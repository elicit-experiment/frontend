import knockout = require('knockout');
import MultiselectQuestionBase, { Item, ItemInfo } from '../MultiselectQuestionBase';
import QuestionModel = require('Models/Question');

class RadioButtonGroup extends MultiselectQuestionBase<{ Id: string; Correct: boolean }> {
  private _isOptional: boolean;

  public Answer: KnockoutObservable<string> = knockout.observable<string>(null);

  public CorrectnessClass: KnockoutComputed<string>;
  public CorrectnessLabel: KnockoutComputed<string>;

  public FeedbackText: KnockoutObservable<string> = knockout.observable<string>(null);
  public IsAnswerable: KnockoutObservable<boolean>;

  protected readonly InstrumentTemplateName = 'RadioButtonGroupButtons';

  constructor(question: QuestionModel) {
    super(question);

    this._isOptional = parseInt(this.GetInstrument('IsOptional')) == 1;

    this.SetItems(this.GetItems<Item, ItemInfo>((item) => this.ItemInfo(item)));

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

  protected HasValidAnswer(answer: any): boolean {
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

    const info: ItemInfo = {
      Id: item.Id,
      Label: this.GetFormatted(item.Label),
      IsEnabled: knockout.computed(() => true),
      Feedback: item.Feedback,
      Correct: item.Correct,
    };

    return info;
  }
}

import template = require('Components/Questions/RadioButtonGroup/RadioButtonGroup.html');
knockout.components.register('Questions/RadioButtonGroup', {
  viewModel: RadioButtonGroup,
  template: template.default,
});

export = RadioButtonGroup;
