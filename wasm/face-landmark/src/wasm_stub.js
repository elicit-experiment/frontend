// This is a stub file to help with WASM module loading
// It ensures that the wasm module is imported correctly
import * as wasm from './face_landmark.js';

// Export the default initializer function
export default wasm.default;

// Re-export the wasm functions
export const compress_datapoint = wasm.compress_datapoint;
export const get_performance_now = wasm.get_performance_now;
export const memory_info = wasm.memory_info;
export const add_timestamp = wasm.add_timestamp;
