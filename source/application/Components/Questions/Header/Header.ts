import ExperimentManager from 'Managers/Portal/Experiment';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import * as knockout from 'knockout';

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

knockout.components.register('Questions/Header', {
  viewModel: Header,
  template: '<div></div>',
});

export default Header;
