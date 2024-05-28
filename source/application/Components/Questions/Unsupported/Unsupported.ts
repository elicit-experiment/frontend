import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';

class Unsupported extends QuestionBase<any> {
  constructor(question: QuestionModel) {
    super(question, false);
    console.warn('Unsupported question type: ' + question.APIType);
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'Unsupported', 'Instrument', method, data);
  }
}

export default Unsupported;
