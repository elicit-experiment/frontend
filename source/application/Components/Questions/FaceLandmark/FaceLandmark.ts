import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import demo from './LandMarkExample';
import ExperimentManager from 'Managers/Portal/Experiment';
import PortalClient from 'PortalClient';
import { postTimeSeriesAsJson }  from 'Utility/TimeSeries';

class FaceLandmark extends QuestionBase<{ CalibrationAccuracy: number }> {
  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    console.log(data);
    super.AddRawEvent(eventType, 'FaceLandmark', 'Instrument', method, data);
  }

  constructor(question: QuestionModel) {
    super(question, true);

    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    const sessionGuid = serviceCaller.GetCurrentSession().Guid;

    import('@mediapipe/tasks-vision').then((visionImport) => {
      const { FaceLandmarker, FilesetResolver, DrawingUtils } = visionImport;
      demo(FaceLandmarker, FilesetResolver, DrawingUtils, (dataPoint: any) => {
        postTimeSeriesAsJson({ sessionGUID: sessionGuid, seriesType: 'face_landmark', data: dataPoint }, 'face_landmark')
          .then((json) => (1))
          .catch((err) => console.error(err));
        // ExperimentManager.SendSlideDataPoint('face_landmark', { seriesType: 'face_landmark', data: dataPoint}, (err) => {
        //   if (!err) {
        //     console.error('datapoint error');
        //   }
        });
      });
  }

  protected HasValidAnswer(answer: any): boolean {
    return true;
  }
}

import template from 'Components/Questions/FaceLandmark/FaceLandmark.html';

knockout.components.register('Questions/FaceLandmark', {
  viewModel: FaceLandmark,
  template,
});

export default FaceLandmark;
