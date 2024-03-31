import knockout from 'knockout';
import QuestionBase = require('Components/Questions/QuestionBase');
import QuestionModel = require('Models/Question');
import bootstrap = require('bootstrap');
import demo from './LandMarkExample';

class FaceLandmark extends QuestionBase<{ CalibrationAccuracy: number }> {
  public AnswerIsRequired = true;

  constructor(question: QuestionModel) {
    super(question, true);

    import('@mediapipe/tasks-vision').then((visionImport) => {
      const { FaceLandmarker, FilesetResolver, DrawingUtils } = visionImport;
      demo(FaceLandmarker, FilesetResolver, DrawingUtils);
    });
  }

  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    super.AddRawEvent(eventType, 'WebGazerCalibrate', 'Instrument', method, data);
  }
}


import template = require('Components/Questions/FaceLandmark/FaceLandmark.html');
knockout.components.register('Questions/FaceLandmark', {
  viewModel: FaceLandmark,
  template: template.default,
});
console.log('FaceLandmark');
export default FaceLandmark;
