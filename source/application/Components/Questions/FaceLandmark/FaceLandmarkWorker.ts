import { NormalizedLandmarkComponentConfig } from './FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { SharedBufferManager, BufferReference } from './SharedBufferManager';

// Import the WASM module - use dynamic import to handle different possible paths
// This is more resilient to wasm-pack output structure changes
let wasmInit: any;

// Define message types for communication between main thread and worker
export type WorkerRequest =
  | {
      type: 'compress';
      timestamp: DOMHighResTimeStamp;
      config: NormalizedLandmarkComponentConfig;
      dataPoint: FaceLandmarkerResult;
      toJson: boolean;
    }
  | {
      type: 'init';
      buffers: SharedArrayBuffer[];
    };

export type WorkerResponse =
  | {
      type: 'buffer';
      bufferRef: BufferReference;
    }
  | {
      type: 'fallback';
      timestamp: DOMHighResTimeStamp;
      compressedDataPoint: string;
    };

// Initialize WASM
let wasm: any;
let wasmInitialized = false;
let sharedBufferManager: SharedBufferManager | null = null;
let useSharedBuffers = false;

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

// Check if shared buffer is supported
try {
  useSharedBuffers = SharedBufferManager.isSupported();
  console.log(`SharedArrayBuffer support: ${useSharedBuffers ? 'enabled' : 'disabled'}`);
} catch (e) {
  console.warn('SharedArrayBuffer not supported:', e);
  useSharedBuffers = false;
}

// Handle messages from the main thread
self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  // Check for initialization message with shared buffers
  if ('type' in event.data && event.data.type === 'init') {
    console.log('Received shared buffer initialization message');
    if (useSharedBuffers && event.data.buffers) {
      try {
        sharedBufferManager = new SharedBufferManager(event.data.buffers);
        console.log('SharedBufferManager initialized in worker with', event.data.buffers.length, 'buffers');
      } catch (e) {
        console.error('Failed to initialize SharedBufferManager:', e);
        useSharedBuffers = false;
      }
    }
    return;
  }

  if ('type' in event.data && event.data.type === 'compress') {
    // Regular data processing message
    const { toJson, timestamp, config, dataPoint } = event.data;

    // Make sure WASM is initialized
    if (!wasmInitialized) {
      await initializeWasm();
    }

    // Try using the WASM implementation to compress the datapoint
    let compressedDataPoint;
    const startTime = performance.now();

    try {
      if (wasmInitialized) {
        // Use WASM implementation - access the functions through the initialized module
        compressedDataPoint = wasm.compress_datapoint(config, dataPoint, timestamp, toJson);

        // Log performance metrics occasionally
        const compressionTime = performance.now() - startTime;
        if (Math.random() < 0.05) {
          console.log(`WASM compression time: ${compressionTime.toFixed(2)}ms`);

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

    // Try to use shared buffers if available
    if (useSharedBuffers && sharedBufferManager && typeof compressedDataPoint === 'string') {
      const bufferIndex = sharedBufferManager.findFreeBuffer();

      if (bufferIndex >= 0) {
        // We found a free buffer, try to write to it
        const success = sharedBufferManager.writeToBuffer(bufferIndex, compressedDataPoint);

        if (success) {
          // Send buffer reference instead of data
          const bufferRef: BufferReference = {
            type: 'bufferReference',
            index: bufferIndex,
            timestamp,
            dataLength: compressedDataPoint.length,
          };

          // Post the buffer reference
          self.postMessage({
            type: 'buffer',
            bufferRef,
          });

          // Record metrics
          const totalTime = performance.now() - startTime;
          if (Math.random() < 0.05) {
            console.log(
              `SharedBuffer write successful: ${totalTime.toFixed(2)}ms, buffer #${bufferIndex}, ${
                compressedDataPoint.length
              } bytes`,
            );
          }

          return; // Done with shared buffer path
        }
      }

      // If we're here, shared buffer approach failed, fall back to regular postMessage
      if (Math.random() < 0.05) {
        console.warn('No free shared buffers available, falling back to standard messaging');
      }
    }

    // Fallback path - send the data directly
    self.postMessage({
      type: 'fallback',
      timestamp,
      compressedDataPoint,
    });
  }
});
