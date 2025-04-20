import { postTimeSeriesRawAsJson } from 'Utility/TimeSeries';
import PortalClient from 'PortalClient';
import { NormalizedLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { WorkerResponse } from './FaceLandmarkWorker';
import { CompressedFaceLandmarkerResult } from './CompressedFaceLandmarkerResult';
import { ProgressCallback, ProgressKind } from './FaceLandmarkTypes';

export class DatapointAccumulator {
  public pendingTimestamps: Map<number, DOMHighResTimeStamp> = new Map();
  public compressedDataPoints: Map<number, CompressedFaceLandmarkerResult | string> = new Map();
  public queuedDataPoints: (CompressedFaceLandmarkerResult | string)[] = [];
  public sender: ReturnType<typeof setInterval> | null = null;
  public sessionGuid: string;
  public lastQueuedTimestamp: number | null = null;
  public config: NormalizedLandmarkComponentConfig;
  private minimumInterDataPointIntervalMs: number;
  private sendRateMs: number;
  private progressCallback: ProgressCallback | null = null;
  private worker: Worker | null = null;

  // Permit 1ms of jitter around the debounce to account for processing and other delays.
  public static RATE_LIMIT_JITTER = 1;

  constructor(
    config: NormalizedLandmarkComponentConfig,
    sendRateMs: number = 2000,
    progressCallback: ProgressCallback | null,
  ) {
    this.config = config;
    this.minimumInterDataPointIntervalMs = 1000.0 / config.MaximumSendRateHz - DatapointAccumulator.RATE_LIMIT_JITTER;
    this.sendRateMs = sendRateMs;
    this.lastQueuedTimestamp = null;
    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();
    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
    this.progressCallback = progressCallback;

    // Initialize the web worker
    this.initWorker();

    // Start the sender interval
    this.ensureSenderInterval();
  }

  initWorker() {
    // Create the web worker using Webpack 5's native support
    this.worker = new Worker(new URL('./FaceLandmarkWorker.ts', import.meta.url));

    // Set up the message handler for worker responses
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { timestamp, compressedDataPoint } = event.data;

      console.log(typeof compressedDataPoint);
      if (compressedDataPoint) {
        // Store the compressed datapoint, keyed by timestamp
        this.compressedDataPoints.set(timestamp, compressedDataPoint);

        // Process datapoints in timestamp order
        this.processCompressedDataPoints();

        const compressTime = performance.now() - this.pendingTimestamps.get(timestamp);
        if (this.progressCallback) {
          this.progressCallback(ProgressKind.COMPRESSED, compressTime, 0, 0);
        }
      }

      // Remove from pending set
      this.pendingTimestamps.delete(timestamp);
    };

    // Handle errors
    this.worker.onerror = (error) => {
      console.error('Web worker error:', error);
    };
  }

  processCompressedDataPoints() {
    // Get all timestamps, sort them chronologically
    const timestamps = Array.from(this.compressedDataPoints.keys()).sort((a, b) => a - b);

    // Process each datapoint in order
    for (const timestamp of timestamps) {
      const datapoint = this.compressedDataPoints.get(timestamp);
      if (datapoint) {
        this.queuedDataPoints.push(datapoint);
        this.compressedDataPoints.delete(timestamp);
      }
    }
  }

  stop() {
    this.sender && clearTimeout(this.sender);
    this.sender = null;

    // Terminate the worker when stopping
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  accumulateAndDebounce(
    dataPoint: FaceLandmarkerResult,
    timestamp: DOMHighResTimeStamp,
    analyzeDuration: DOMHighResTimeStamp,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    frameJitter: DOMHighResTimeStamp,
  ) {
    if (this.progressCallback) {
      this.progressCallback(ProgressKind.ANALYZED, analyzeDuration, 0, 0);
      this.progressCallback(ProgressKind.QUEUED, 1, 0, 0);
    }

    // Check if we should process this datapoint based on rate limiting
    const timeSinceLastSend = timestamp - (this.lastQueuedTimestamp || 0);
    if (this.lastQueuedTimestamp === null || timeSinceLastSend >= this.minimumInterDataPointIntervalMs) {
      // Rate limiting passed, update timestamp
      this.lastQueuedTimestamp = timestamp;

      // Send to worker for compression
      if (this.worker) {
        // Add to pending set
        this.pendingTimestamps.set(timestamp, performance.now());

        this.worker.postMessage({
          timestamp,
          config: this.config,
          dataPoint,
          toJson: true,
        });
      }
    } else {
      // Skip this datapoint due to rate limiting
      if (this.progressCallback) {
        this.progressCallback(ProgressKind.SKIPPED, 1, 0, 0);
      }
    }
  }

  ensureSenderInterval() {
    if (this.sender == null) {
      this.sender = setInterval(this.sendQueuedDataPoints.bind(this), this.sendRateMs);
    }
  }

  sendQueuedDataPoints() {
    // Make sure to process any compressed datapoints that may have arrived
    this.processCompressedDataPoints();

    const dataPoints = this.queuedDataPoints;
    this.queuedDataPoints = [];

    const dataPointCount = dataPoints.length;
    if (dataPointCount > 0) {
      const toSend =
        Array.isArray(dataPoints) && typeof dataPoints[0] === 'string'
          ? dataPoints.join()
          : (dataPoints as CompressedFaceLandmarkerResult[]);
      this.sendDataPoints(toSend, dataPointCount)
        .then(() => {
          console.log(`Sent ${dataPointCount} data points`);
        })
        .catch(() => {
          console.error(`Failed to send ${dataPointCount} data points`);
        });
    }
  }

  async sendDataPoints(dataPoints: CompressedFaceLandmarkerResult[] | string, dataPointCount: number) {
    if (dataPointCount < 1) {
      return;
    }

    try {
      if (this.progressCallback) this.progressCallback(ProgressKind.POSTED, dataPointCount, 0, 0);

      const resp = (await postTimeSeriesRawAsJson('face_landmark', this.sessionGuid, dataPoints)) as {
        rawBytes: number;
        compressedBytes: number;
      };

      if (this.progressCallback)
        this.progressCallback(ProgressKind.ACKNOWLEDGED, dataPointCount, resp.rawBytes, resp.compressedBytes);
    } catch (err) {
      console.error(err);
    }
  }
}
