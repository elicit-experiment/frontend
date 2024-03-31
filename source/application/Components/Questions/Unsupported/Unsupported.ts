import knockout from 'knockout';
import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');

class Unsupported extends QuestionBase<any> {
  constructor(question: QuestionModel) {
    super(question, false);
    console.warn('Unsupported question type: ' + question.APIType);
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'Unsupported', 'Instrument', method, data);
  }
}

export = Unsupported;
