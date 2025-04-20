import { NormalizedLandmarkComponentConfig } from './FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { CompressedFaceLandmarkerResult } from './CompressedFaceLandmarkerResult';

// Import the WASM module - use dynamic import to handle different possible paths
// This is more resilient to wasm-pack output structure changes
let wasmInit: any;

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

// Initialize WASM
let wasm: any;
let wasmInitialized = false;

const initializeWasm = async () => {
  if (wasmInitialized) return; // Don't initialize twice

  try {
    // Try different possible import paths
    // Try the main path first with separate files
    wasmInit = await import('FaceLandmarkWasm/face_landmark');

    // Initialize whatever module we found
    if (wasmInit?.default) {
      // Standard wasm-pack output has a default initializer function
      wasm = await wasmInit.default();

      // Verify the expected functions exist
      if (typeof wasm.compress_datapoint === 'function') {
        wasmInitialized = true;
        console.log('WASM module initialized successfully using default export');
      } else {
        throw new Error('WASM module missing compress_datapoint function');
      }
    } else if (wasmInit?.compress_datapoint) {
      // Some configurations might export functions directly
      wasm = wasmInit;
      wasmInitialized = true;
      console.log('WASM module initialized successfully using direct exports');
    } else {
      throw new Error('WASM module does not have expected exports');
    }
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
  }
};

// Start initializing WASM immediately
initializeWasm();

// Handle messages from the main thread
self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { toJson, timestamp, config, dataPoint } = event.data;

  // Make sure WASM is initialized
  if (!wasmInitialized) {
    await initializeWasm();
  }

  // Try using the WASM implementation to compress the datapoint
  let compressedDataPoint;

  try {
    if (wasmInitialized) {
      // For debugging performance
      const startTime = performance.now();

      // Use WASM implementation - access the functions through the initialized module
      compressedDataPoint = wasm.compress_datapoint(config, dataPoint, timestamp, toJson);

      // Log performance metrics occasionally
      const endTime = performance.now();
      if (Math.random() < 0.06) {
        // Log 1% of calls
        console.log(`WASM compression time: ${endTime - startTime}ms`);

        // Get memory info if available in this browser
        try {
          if (wasm.memory_info) {
            const memInfo = wasm.memory_info();
            if (memInfo && memInfo.totalJSHeapSize) {
              console.log('Memory info:', memInfo);
            }
          }
        } catch (e) {
          // Memory info not available
        }
      }
    } else {
      // Fallback to JS implementation in case WASM is not available
      // We need to dynamically import the fallback to avoid circular dependencies
      const { compressDatapoint } = await import('./CompressedFaceLandmarkerResult');
      compressedDataPoint = compressDatapoint(config, dataPoint, timestamp);
      compressedDataPoint = toJson ? `${JSON.stringify(compressedDataPoint)}\n` : compressedDataPoint;
    }
  } catch (error) {
    console.error('Failed to compress datapoint with WASM, falling back to JS implementation:', error);
    const { compressDatapoint } = await import('./CompressedFaceLandmarkerResult');
    compressedDataPoint = compressDatapoint(config, dataPoint, timestamp);
    compressedDataPoint = toJson ? `${JSON.stringify(compressedDataPoint)}\n` : compressedDataPoint;
  }

  //const compressedReturnValue = toJson ? `${JSON.stringify(compressedDataPoint)}\n` : compressedDataPoint;

  // Send the result back to the main thread with the same timestamp to maintain order
  const response: WorkerResponse = {
    timestamp,
    compressedDataPoint: compressedDataPoint,
  };

  self.postMessage(response);
});
