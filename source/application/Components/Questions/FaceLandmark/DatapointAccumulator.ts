import { postTimeSeriesRawAsJsonStream } from 'Utility/TimeSeries';
import PortalClient from 'PortalClient';
import { NormalizedLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { WorkerResponse } from './FaceLandmarkWorker';
import { ProgressCallback, ProgressKind } from './FaceLandmarkTypes';
import { SharedBufferManager, BufferReference } from './SharedBufferManager';
import { compressDatapoint } from './CompressedFaceLandmarkerResult';

interface SizedGenerator<T> extends Generator<T, void, unknown> {
  count: number;
}

export class DatapointAccumulator {
  // Use private with getters where possible to prevent direct access and mutations
  public pendingTimestamps: Map<number, DOMHighResTimeStamp> = new Map();
  public compressedDataPoints: Map<number, string | BufferReference> = new Map();
  private sender: ReturnType<typeof setInterval> | null = null;
  private sessionGuid: string;
  public lastQueuedTimestamp: number | null = null; // public for testing
  public config: NormalizedLandmarkComponentConfig;
  private minimumInterDataPointIntervalMs: number;
  private sendRateMs: number;
  private progressCallback: ProgressCallback | null = null;
  private worker: Worker | null = null;
  private sharedBufferManager: SharedBufferManager | null = null;
  private useSharedBuffers = false;
  private bufferMetrics = {
    sharedBufferUsed: 0,
    fallbackUsed: 0,
    totalDataSize: 0,
  };

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

    // Initialize shared buffer manager if supported
    try {
      this.useSharedBuffers = SharedBufferManager.isSupported();
      if (this.useSharedBuffers) {
        this.sharedBufferManager = new SharedBufferManager();
        console.log('SharedBufferManager initialized in main thread');
      }
    } catch (e) {
      console.warn('SharedArrayBuffer not supported:', e);
      this.useSharedBuffers = false;
    }

    // Initialize the web worker
    if (this.useSharedBuffers && this.sharedBufferManager) {
      this.initWorker();
    }

    // Start the sender interval
    this.ensureSenderInterval();
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
    this.lastQueuedTimestamp = null;
    this.progressCallback = null;
    this.sharedBufferManager = null;
  }

  initWorker() {
    // Create the web worker using Webpack 5's native support
    this.worker = new Worker(new URL('./FaceLandmarkWorker.ts', import.meta.url));

    // Initialize worker with shared buffers if available
    this.worker.postMessage({
      type: 'init',
      buffers: this.sharedBufferManager.getBuffers(),
    });

    // Set up the message handler for worker responses
    this.worker.onmessage = this.workerMessageHandler.bind(this);

    // Handle errors
    this.worker.onerror = this.workerErrorHandler.bind(this);
  }

  workerMessageHandler(event: MessageEvent<WorkerResponse>) {
    // Handle different response types
    if ('type' in event.data) {
      if (event.data.type === 'buffer') {
        // Shared buffer reference received
        this.handleSharedBufferResponse(event.data.bufferRef);
      } else if (event.data.type === 'fallback') {
        // Fallback response with direct data
        this.handleFallbackResponse(event.data.timestamp, event.data.compressedDataPoint);
        this.bufferMetrics.fallbackUsed++;
      }
    }

    // Log buffer usage metrics occasionally
    if ((this.bufferMetrics.sharedBufferUsed + this.bufferMetrics.fallbackUsed) % 100 === 0) {
      const sharedPct = Math.round(
        (this.bufferMetrics.sharedBufferUsed * 100) /
          (this.bufferMetrics.sharedBufferUsed + this.bufferMetrics.fallbackUsed),
      );
      console.log(
        `SharedBuffer usage: ${sharedPct}% (${this.bufferMetrics.sharedBufferUsed} shared / ${this.bufferMetrics.fallbackUsed} fallback)`,
      );
      console.log(
        `Average data size: ${Math.round(
          this.bufferMetrics.totalDataSize / (this.bufferMetrics.sharedBufferUsed + this.bufferMetrics.fallbackUsed),
        )} bytes`,
      );
    }
  }

  workerErrorHandler(error: ErrorEvent) {
    console.error('Web worker error:', error);
  }

  handleSharedBufferResponse(bufferRef: BufferReference) {
    if (!this.sharedBufferManager) return;

    const { timestamp, dataLength } = bufferRef;

    // Store the compressed data
    this.compressedDataPoints.set(timestamp, bufferRef);

    // Update metrics
    this.bufferMetrics.sharedBufferUsed++;
    this.bufferMetrics.totalDataSize += dataLength;

    if (this.progressCallback) {
      const compressTime = performance.now() - (this.pendingTimestamps.get(timestamp) || 0);
      this.progressCallback(ProgressKind.COMPRESSED, compressTime, 0, 0);
    }

    // Remove from pending set
    this.pendingTimestamps.delete(timestamp);
  }

  handleFallbackResponse(timestamp: number, compressedDataPoint: string) {
    if (compressedDataPoint) {
      // Store the compressed datapoint, keyed by timestamp
      this.compressedDataPoints.set(timestamp, compressedDataPoint);

      // Update metrics
      if (typeof compressedDataPoint === 'string') {
        this.bufferMetrics.totalDataSize += compressedDataPoint.length;
      }

      const compressTime = performance.now() - (this.pendingTimestamps.get(timestamp) || 0);
      if (this.progressCallback) {
        this.progressCallback(ProgressKind.COMPRESSED, compressTime, 0, 0);
      }
    }

    // Remove from pending set
    this.pendingTimestamps.delete(timestamp);
  }

  generateCompressedDataPoints(): SizedGenerator<BufferReference | string> {
    const dataPointCount = this.compressedDataPoints.size;
    const timestamps = Array.from(this.compressedDataPoints.keys());
    const compressedDataPoints = this.compressedDataPoints;

    const generator = (function* () {
      // Only process if there are compressed datapoints
      if (dataPointCount === 0) return;

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const datapoint: BufferReference | string = compressedDataPoints.get(timestamp);
        compressedDataPoints.delete(timestamp);
        if (datapoint) {
          yield datapoint;
        }
      }
    })() as SizedGenerator<BufferReference | string>;

    generator.count = timestamps.length;

    return generator;
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

      // Add to pending set
      this.pendingTimestamps.set(timestamp, performance.now());

      // Send to worker for compression
      if (this.worker) {
        this.worker.postMessage({
          type: 'compress',
          timestamp,
          config: this.config,
          dataPoint,
          toJson: true,
        });
      } else {
        // if the worker isn't running, just compress the data point and send it directly in the main thread
        const compressedDataPoint = `${JSON.stringify(compressDatapoint(this.config, dataPoint, timestamp))}\n`;
        this.handleFallbackResponse(timestamp, compressedDataPoint);
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
    const generator = this.generateCompressedDataPoints();
    const dataPointCount = generator.count;

    const sendStream = new ReadableStream({
      start: async (controller) => {
        for (const datapoint of generator) {
          if (typeof datapoint === 'string') {
            controller.enqueue(new TextEncoder().encode(datapoint));
          } else if ((datapoint as BufferReference).hasOwnProperty('index')) {
            controller.enqueue(
              new TextEncoder().encode(this.sharedBufferManager.readFromBuffer((datapoint as BufferReference).index)),
            );
          }
        }
        controller.close();
      },
    });

    this.sendDataPoints(sendStream, dataPointCount)
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

  async sendDataPoints(dataPoints: string[] | ReadableStream<Uint8Array>, dataPointCount: number) {
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
    }
  }
}
