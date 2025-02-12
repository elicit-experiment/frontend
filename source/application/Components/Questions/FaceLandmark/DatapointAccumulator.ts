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
type AccumulatableBaseRecord = Record<string, unknown>;
type AccumulatableRecord = AccumulatableBaseRecord & {
  t: number;
};

export enum ProgressKind {
  POSTED = 'POSTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export type ProgressCallback = (
  kind: ProgressKind,
  count: number,
  totalBytes: number,
  totalCompressedBytes: number,
) => void;

export declare interface ElicitFaceLandmarkerResult {
  /** Detected face landmarks in normalized image coordinates. */
  faceLandmarks: ElicitLandmark[][];
  /** Optional face blendshapes results. */
  faceBlendshapes: Classifications[];
  /** Optional facial transformation matrix. */
  facialTransformationMatrixes: Matrix[];
  t?: number;
}

export class DatapointAccumulator {
  public dataPoints: AccumulatableRecord[] = [];
  public debouncer: ReturnType<typeof setTimeout> | null = null;
  public sessionGuid: string;
  private lastSendTimestamp = 0;
  private maximumSendRateHz = 5; // Configurable rate limit — can be adjusted as needed
  private progressCallback: ProgressCallback | null = null;

  constructor(maximumSendRateHz: number, progressCallback: ProgressCallback | null) {
    this.maximumSendRateHz = maximumSendRateHz;
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
    this.progressCallback = progressCallback;
  }

  accumulateAndDebounce(dataPoint: AccumulatableBaseRecord) {
    // Push new data point with timestamp
    this.dataPoints.push({ t: new Date().getTime(), ...dataPoint });

    // Initiate the debouncing process if not already running
    if (this.debouncer == null) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 1000);
    }
  }

  debouncerCallback() {
    const interval = 1000 / this.maximumSendRateHz;

    // Filter data points to respect the maximumSendRateHz limit
    const limitedDataPoints: AccumulatableRecord[] = [];
    while (this.dataPoints.length > 0) {
      const candidate = this.dataPoints.shift(); // Always take the most recent point
      if (!candidate) break;

      // Check if candidate respects the send interval
      if (candidate.t - this.lastSendTimestamp >= interval) {
        this.lastSendTimestamp = candidate.t;
        limitedDataPoints.push(candidate); // Add to the limited list
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

  async sendDataPoints(dataPoints: AccumulatableRecord[]) {
    try {
      if (this.progressCallback) this.progressCallback(ProgressKind.POSTED, dataPoints.length, 0, 0);
      const resp = (await postTimeSeriesRawAsJson('face_landmark', this.sessionGuid, dataPoints)) as {
        rawBytes: number;
        compressedBytes: number;
      };
      if (this.progressCallback)
        this.progressCallback(ProgressKind.ACKNOWLEDGED, dataPoints.length, resp.rawBytes, resp.compressedBytes);
    } catch (err) {
      console.error(err);
    }
  }
}
