import * as knockout from 'knockout';
import QuestionBase from 'Components/Questions/QuestionBase';
import QuestionModel from 'Models/Question';
import demo from './LandMarkExample';
import ExperimentManager from 'Managers/Portal/Experiment';
import PortalClient from 'PortalClient';
import { postTimeSeriesAsJson }  from 'Utility/TimeSeries';

class DatapointAccumulator {
  public dataPoints: any[] = [];
  public debouncer: number | null = null;
  public sessionGuid: string;

  constructor() {
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }

  accumulateAndDebounce(dataPoint) {
    this.dataPoints.push({ timeStamp: new Date().getTime(), ...dataPoint });

    if (this.debouncer == null) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 2000)
    }
  }

  debouncerCallback() {
    // duplicate this.dataPoints
    const sendDataPoints = this.dataPoints;
    this.dataPoints = [];
    this.debouncer = null;

    postTimeSeriesAsJson({
      sessionGUID: this.sessionGuid,
      seriesType: 'face_landmark',
      data: sendDataPoints
    }, 'face_landmark')
      .then((json) => (1))
      .catch((err) => console.error(err));
    // ExperimentManager.SendSlideDataPoint('face_landmark', { seriesType: 'face_landmark', data: dataPoint}, (err) => {
    //   if (!err) {
    //     console.error('datapoint error');
    //   }
  }
}

class FaceLandmark extends QuestionBase<{ CalibrationAccuracy: number }> {
  public AddEvent(eventType: string, method = 'None', data = 'None'): void {
    console.log(data);
    super.AddRawEvent(eventType, 'FaceLandmark', 'Instrument', method, data);
  }

  constructor(question: QuestionModel) {
    super(question, true);

    const datapointAccumulator = new DatapointAccumulator()

    import('@mediapipe/tasks-vision').then((visionImport) => {
      const { FaceLandmarker, FilesetResolver, DrawingUtils } = visionImport;
      demo(FaceLandmarker, FilesetResolver, DrawingUtils, (dataPoint: any) => {
        datapointAccumulator.accumulateAndDebounce(dataPoint);
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
