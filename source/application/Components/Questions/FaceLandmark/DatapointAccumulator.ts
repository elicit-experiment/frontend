import { postTimeSeriesRawAsJson } from 'Utility/TimeSeries';
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
  private lastSendTimestamp = 0;
  private static readonly DATAPOINTS_PER_SECOND = 5; // Configurable rate limit — can be adjusted as needed

  constructor() {
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }

  accumulateAndDebounce(dataPoint: ElicitFaceLandmarkerResult) {
    // Push new data point with timestamp
    this.dataPoints.push({ timeStamp: new Date().getTime(), ...dataPoint });

    // Initiate the debouncing process if not already running
    if (this.debouncer == null) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 1000);
    }
  }

  debouncerCallback() {
    const now = new Date().getTime();
    const interval = 1000 / DatapointAccumulator.DATAPOINTS_PER_SECOND;

    // Filter data points to respect the DATAPOINTS_PER_SECOND limit
    const limitedDataPoints: ElicitFaceLandmarkerResult[] = [];
    while (this.dataPoints.length > 0 && limitedDataPoints.length < DatapointAccumulator.DATAPOINTS_PER_SECOND) {
      const candidate = this.dataPoints.pop(); // Always take the most recent point
      if (!candidate) break;

      // Check if candidate respects the send interval
      if (now - this.lastSendTimestamp >= interval) {
        this.lastSendTimestamp = now;
        limitedDataPoints.unshift(candidate); // Add to the limited list
      } else {
        continue; // Skip old data points that don't fit within the rate limit
      }
    }

    // Send filtered data points
    this.sendDataPoints(limitedDataPoints);

    // Reset debouncer
    this.debouncer = null;

    // If remaining data points exist, restart debouncer
    if (this.dataPoints.length > 0) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 1000);
    }
  }

  private async sendDataPoints(dataPoints: ElicitFaceLandmarkerResult[]) {
    try {
      await postTimeSeriesRawAsJson('face_landmark', this.sessionGuid, dataPoints);
    } catch (err) {
      console.error(err);
    }
  }
}
