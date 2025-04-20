import { compressDatapoint } from './CompressedFaceLandmarkerResult';
import { NormalizedLandmarkComponentConfig } from './FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { CompressedFaceLandmarkerResult } from './CompressedFaceLandmarkerResult';

// Define message types for communication between main thread and worker
export type WorkerRequest = {
  timestamp: DOMHighResTimeStamp;
  config: NormalizedLandmarkComponentConfig;
  dataPoint: FaceLandmarkerResult;
  toJson: boolean;
};

export type WorkerResponse = {
  timestamp: DOMHighResTimeStamp;
  compressedDataPoint: CompressedFaceLandmarkerResult | string;
};

// Handle messages from the main thread
self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { toJson, timestamp, config, dataPoint } = event.data;

  // Compress the datapoint
  const compressedDataPoint = compressDatapoint(config, dataPoint, timestamp);

  const compressedReturnValue = toJson ? `${JSON.stringify(compressedDataPoint)}\n` : compressedDataPoint;

  // Send the result back to the main thread with the same timestamp to maintain order
  const response: WorkerResponse = {
    timestamp,
    compressedDataPoint: compressedReturnValue,
  };

  self.postMessage(response);
});
