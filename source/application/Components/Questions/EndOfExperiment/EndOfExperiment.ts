import ExperimentManager from 'Managers/Portal/Experiment';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import * as knockout from 'knockout';

class EndOfExperiment extends QuestionBase<any> {
  constructor(question: QuestionModel) {
    super(question, false);

    ExperimentManager.ExperimentCompleted();
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'EndOfExperiment', 'Instrument', method, data);
  }
}

knockout.components.register('Questions/EndOfExperiment', {
  viewModel: EndOfExperiment,
  template: '',
});

export default EndOfExperiment;
