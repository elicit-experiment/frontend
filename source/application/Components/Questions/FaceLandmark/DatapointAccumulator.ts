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
export type AccumulatableRecord = AccumulatableBaseRecord & {
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
  public candidateDataPoints: AccumulatableRecord[] = [];
  public queuedDataPoints: AccumulatableRecord[] = [];
  public debouncer: ReturnType<typeof setTimeout> | null = null;
  public sender: ReturnType<typeof setInterval> | null = null;
  public sessionGuid: string;
  public lastSendTimestamp = 0; // public for testing...
  private maximumSampleRateHz: number; // Configurable rate limit — can be adjusted as needed
  private minimumInterDataPointIntervalMs: number;
  private sendRateMs: number;
  private progressCallback: ProgressCallback | null = null;

  constructor(maximumSampleRateHz: number, sendRateMs: number = 2000, progressCallback: ProgressCallback | null) {
    this.maximumSampleRateHz = maximumSampleRateHz;
    this.minimumInterDataPointIntervalMs = 1000.0 / maximumSampleRateHz;
    this.sendRateMs = sendRateMs;
    this.lastSendTimestamp = new Date().getTime() - this.minimumInterDataPointIntervalMs; // ensure we send the first one right away.
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
    this.progressCallback = progressCallback;
  }

  stop() {
    this.debouncer && clearTimeout(this.debouncer);
    this.sender && clearInterval(this.sender);
    this.sender = null;
  }

  accumulateAndDebounce(dataPoint: AccumulatableRecord) {
    const now = new Date().getTime();
    // Push new data point with timestamp
    this.candidateDataPoints.push(dataPoint);

    this.ensureSenderInterval();

    if (this.debouncer == null) {
      const timeSinceLastSend = dataPoint.t - this.lastSendTimestamp;
      if (timeSinceLastSend >= this.minimumInterDataPointIntervalMs) {
        // Send right away if it's been long enough since the last send.
        this.debouncerCallback();
      } else {
        // Initiate the debouncing process if not already running
        this.debouncer = setTimeout(
          this.debouncerCallback.bind(this),
          this.minimumInterDataPointIntervalMs - timeSinceLastSend,
        );
      }
    }
  }

  debouncerCallback() {
    // Filter data points to respect the maximumSampleRateHz limit
    while (this.candidateDataPoints.length > 0) {
      const candidate = this.candidateDataPoints.shift(); // Always take the most recent point
      if (!candidate) break;

      // Check if candidate respects the send interval
      const deltaTime = candidate.t - this.lastSendTimestamp;
      if (deltaTime >= this.minimumInterDataPointIntervalMs) {
        this.lastSendTimestamp = candidate.t;
        this.queuedDataPoints.push(candidate); // Add to the queued list
      } else {
        continue; // Skip old data points that don't fit within the rate limit
      }
    }

    // Reset debouncer
    this.debouncer = null;

    // If remaining data points exist, restart debouncer
    if (this.candidateDataPoints.length > 0) {
      this.debouncer = setTimeout(this.debouncerCallback.bind(this), 1000);
    }
  }

  ensureSenderInterval() {
    if (this.sender == null) {
      this.sender = setInterval(this.sendQueuedDataPoints.bind(this), this.sendRateMs);
    }
  }

  sendQueuedDataPoints() {
    const dataPoints = this.queuedDataPoints;
    this.queuedDataPoints = [];
    this.sendDataPoints(dataPoints)
      .then(() => {
        console.log(`Sent ${dataPoints.length} data points`);
      })
      .catch(() => {
        console.error(`Failed to send ${dataPoints.length} data points`);
      });
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
