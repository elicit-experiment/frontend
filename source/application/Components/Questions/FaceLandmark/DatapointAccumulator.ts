import { postTimeSeriesAsJson, postTimeSeriesRawAsJson } from 'Utility/TimeSeries';
import PortalClient from 'PortalClient';
import { Classifications, NormalizedLandmark } from '@mediapipe/tasks-vision';

// Copied from vision.d.ts since it's not exported.
declare interface Matrix {
  /** The number of rows. */
  rows: number;
  /** The number of columns. */
  columns: number;
  /** The values as a flattened one-dimensional array. */
  data: number[];
}

type ElicitNormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
  index?: number;
};

type ElicitLandmark = NormalizedLandmark | ElicitNormalizedLandmark;

export declare interface ElicitFaceLandmarkerResult {
  /** Detected face landmarks in normalized image coordinates. */
  faceLandmarks: ElicitLandmark[][];
  /** Optional face blendshapes results. */
  faceBlendshapes: Classifications[];
  /** Optional facial transformation matrix. */
  facialTransformationMatrixes: Matrix[];
  timeStamp?: number;
}

export class DatapointAccumulator {
  public dataPoints: ElicitFaceLandmarkerResult[] = [];
  public debouncer: ReturnType<typeof setTimeout> | null = null;
  public sessionGuid: string;

  constructor() {
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }

  accumulateAndDebounce(dataPoint: ElicitFaceLandmarkerResult) {
    this.dataPoints.push({ timeStamp: new Date().getTime(), ...dataPoint });

    if (this.debouncer == null) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 2000);
    }
  }

  debouncerCallback() {
    // duplicate this.dataPoints
    const sendDataPoints = this.dataPoints;
    this.dataPoints = [];
    this.debouncer = null;

    postTimeSeriesRawAsJson('face_landmark', this.sessionGuid, sendDataPoints)
      .then(() => 1)
      .catch((err) => console.error(err));

    // ExperimentManager.SendSlideDataPoint('face_landmark', { seriesType: 'face_landmark', data: dataPoint}, (err) => {
    //   if (!err) {
    //     console.error('datapoint error');
    //   }
  }
}
