import ExperimentManager = require('Managers/Portal/Experiment');
import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');
import knockout from 'knockout';

class Header extends QuestionBase<any> {
  public HeaderLabel: string;

  constructor(question: QuestionModel) {
    super(question, false);

    this.HeaderLabel = this.GetInstrumentFormatted('HeaderLabel');

    if (!this.HeaderLabel) throw new Error('HeaderLabel not found for Header');

    ExperimentManager.SlideTitle(this.HeaderLabel);
  }

  public SlideCompleted(): boolean {
    ExperimentManager.SlideTitle('');

    return false;
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'Header', 'Instrument', method, data);
  }
}

import template = require('Components/Questions/Header/Header.html');
knockout.components.register('Questions/Header', {
  viewModel: Header,
  template: template.default,
});

export = Header;
