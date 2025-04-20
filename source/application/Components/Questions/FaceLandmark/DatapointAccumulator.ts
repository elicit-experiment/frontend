import { postTimeSeriesRawAsJsonStream } from 'Utility/TimeSeries';
import PortalClient from 'PortalClient';
import { NormalizedLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { WorkerResponse } from './FaceLandmarkWorker';
import { CompressedFaceLandmarkerResult } from './CompressedFaceLandmarkerResult';
import { ProgressCallback, ProgressKind } from './FaceLandmarkTypes';
import FaceLandmarkerManager from 'Managers/FaceLandmarkerManager';

export class DatapointAccumulator {
  // Use private with getters where possible to prevent direct access and mutations
  public pendingTimestamps: Map<number, DOMHighResTimeStamp> = new Map();
  public compressedDataPoints: Map<number, CompressedFaceLandmarkerResult | string> = new Map();
  public queuedDataPoints: (CompressedFaceLandmarkerResult | string)[] = [];
  private sender: ReturnType<typeof setInterval> | null = null;
  private sessionGuid: string;
  public lastQueuedTimestamp: number | null = null; // public for testing
  public config: NormalizedLandmarkComponentConfig;
  private minimumInterDataPointIntervalMs: number;
  private sendRateMs: number;
  private progressCallback: ProgressCallback | null = null;
  private worker: Worker | null = null;

  // Expose count getters rather than direct array/map access
  public get pendingCount(): number {
    return this.pendingTimestamps.size;
  }
  public get compressedCount(): number {
    return this.compressedDataPoints.size;
  }
  public get queuedCount(): number {
    return this.queuedDataPoints.length;
  }

  // Permit 1ms of jitter around the debounce to account for processing and other delays.
  public static RATE_LIMIT_JITTER = 1;

  private sendQueuedDataPointsBoundMethod: () => void;

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

    this.sendQueuedDataPointsBoundMethod = this.sendQueuedDataPoints.bind(this);

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

      if (compressedDataPoint) {
        // Store the compressed datapoint, keyed by timestamp
        this.compressedDataPoints.set(timestamp, compressedDataPoint);

        const compressTime = performance.now() - (this.pendingTimestamps.get(timestamp) || 0);
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
    // Only process if there are compressed datapoints
    if (this.compressedDataPoints.size === 0) return;

    // Use Map's built-in iterator, which is in insertion order
    // This avoids allocating a new array and sorting it
    for (const [timestamp, datapoint] of this.compressedDataPoints) {
      this.queuedDataPoints.push(datapoint);
    }

    // Clear the map without deallocating it
    this.compressedDataPoints.clear();
  }

  stop() {
    // Clear interval and clean up reference
    if (this.sender) {
      clearInterval(this.sender);
      this.sender = null;
    }

    // Terminate the worker when stopping
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clear all data structures to release memory
    this.pendingTimestamps.clear();
    this.compressedDataPoints.clear();
    this.queuedDataPoints.length = 0;
    this.lastQueuedTimestamp = null;
    this.progressCallback = null;
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
      this.sender = setInterval(this.sendQueuedDataPointsBoundMethod, this.sendRateMs);
    }
  }

  sendQueuedDataPoints() {
    // Make sure to process any compressed datapoints that may have arrived
    this.processCompressedDataPoints();

    // Don't do anything if there's no data
    const dataPointCount = this.queuedDataPoints.length;
    if (dataPointCount === 0) return;

    // Create a reference to the current queue
    const dataPoints = this.queuedDataPoints;

    // Create a new array only when needed (reuse the array reference)
    this.queuedDataPoints = [];

    const toSend =
      Array.isArray(dataPoints) && typeof dataPoints[0] === 'string'
        ? (dataPoints as string[])
        : (dataPoints as CompressedFaceLandmarkerResult[]);

    this.sendDataPoints(toSend, dataPointCount)
      .then(() => {
        if (dataPointCount > 10) {
          // Only log for larger batches
          console.log(`Sent ${dataPointCount} data points`);
        }
      })
      .catch(() => {
        console.error(`Failed to send ${dataPointCount} data points`);
      });
  }

  async sendDataPoints(dataPoints: CompressedFaceLandmarkerResult[] | string[], dataPointCount: number) {
    if (dataPointCount < 1) {
      return;
    }

    try {
      if (this.progressCallback) this.progressCallback(ProgressKind.POSTED, dataPointCount, 0, 0);

      const resp = (await postTimeSeriesRawAsJsonStream('face_landmark', this.sessionGuid, dataPoints, true)) as {
        rawBytes: number;
        compressedBytes: number;
      };

      if (this.progressCallback)
        this.progressCallback(ProgressKind.ACKNOWLEDGED, dataPointCount, resp.rawBytes, resp.compressedBytes);
    } catch (err) {
      // FaceLandmarkerManager.getInstance().StopTracking();
      console.error(err);
    } finally {
      // Clear references even on error
      (dataPoints as any[]).length = 0;
    }
  }
}
