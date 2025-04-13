import { postTimeSeriesRawAsJson } from 'Utility/TimeSeries';
import PortalClient from 'PortalClient';
import { Classifications, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { NormalizedLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { compressDatapoint } from 'Components/Questions/FaceLandmark/CompressedFaceLandmarkerResult';

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
  QUEUED = 'QUEUED',
  POSTED = 'POSTED',
  SKIPPED = 'SKIPPED',
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
  public candidateDataPoints: [FaceLandmarkerResult, DOMHighResTimeStamp][] = [];
  public queuedDataPoints: AccumulatableRecord[] = [];
  public debouncer: ReturnType<typeof setTimeout> | null = null;
  public sender: ReturnType<typeof setInterval> | null = null;
  public sessionGuid: string;
  public lastQueuedTimestamp: number | null = null; // public for testing...
  public config: NormalizedLandmarkComponentConfig;
  private maximumSampleRateHz: number; // Configurable rate limit — can be adjusted as needed
  private minimumInterDataPointIntervalMs: number;
  private sendRateMs: number;
  private progressCallback: ProgressCallback | null = null;

  // Permit 1ms of jitter around the debounce to account for processing and other delays.
  // Note that the frame rate of the webcam effectively rate limits the datapoints upstream of the accumulator
  // so we should never see two samples within < 1/frame rate, which is always much larger than this value.
  public static RATE_LIMIT_JITTER = 1;

  constructor(
    config: NormalizedLandmarkComponentConfig,
    sendRateMs: number = 2000,
    progressCallback: ProgressCallback | null,
  ) {
    this.config = config;
    this.minimumInterDataPointIntervalMs = 1000.0 / config.MaximumSendRateHz - DatapointAccumulator.RATE_LIMIT_JITTER;
    this.sendRateMs = sendRateMs;
    this.lastQueuedTimestamp = null; // Initialize as null to indicate no datapoints have been sent yet
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
    this.progressCallback = progressCallback;
    this.config = config;
  }

  stop() {
    this.debouncer && clearTimeout(this.debouncer);
    this.sender && clearTimeout(this.sender);
    this.sender = null;
  }

  accumulateAndDebounce(dataPoint: FaceLandmarkerResult, timestamp: DOMHighResTimeStamp) {
    if (this.progressCallback) {
      this.progressCallback(ProgressKind.QUEUED, 1, 0, 0);
    }

    // Push new data point with timestamp
    const timeSinceLastSend = timestamp - this.lastQueuedTimestamp;
    if (timeSinceLastSend >= this.minimumInterDataPointIntervalMs) {
      this.candidateDataPoints.push([dataPoint, timestamp]);
      this.lastQueuedTimestamp = timestamp;

      this.ensureDebouncerInterval();
      this.ensureSenderInterval();
    } else {
      if (this.progressCallback) {
        this.progressCallback(ProgressKind.SKIPPED, 1, 0, 0);
      }
    }
  }

  debouncerCallback() {
    // Filter data points to respect the maximumSampleRateHz limit
    while (this.candidateDataPoints.length > 0) {
      const [candidate, t] = this.candidateDataPoints.shift(); // Always take the most recent point
      if (!candidate) break;

      const compressedDataPoint = compressDatapoint(this.config, candidate, t) as AccumulatableRecord;

      this.queuedDataPoints.push(compressedDataPoint); // Add to the queued list
    }
  }

  ensureDebouncerInterval() {
    if (this.debouncer == null) {
      this.debouncer = setInterval(this.debouncerCallback.bind(this), this.minimumInterDataPointIntervalMs);
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
    if (dataPoints.length < 1) {
      return;
    }

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
