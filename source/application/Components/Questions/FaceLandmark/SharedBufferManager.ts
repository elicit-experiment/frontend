/**
 * SharedBufferManager manages a ring of SharedArrayBuffers for efficient data transfer
 * between the main thread and web workers without excessive garbage creation.
 */

// Constants for buffer management
const BUFFER_SIZE = 8 * 1024; // 8KB per buffer
const BUFFER_COUNT = 8 * 30; // Number of buffers in the ring
const HEADER_SIZE = 8; // First 4 bytes for data length, next 4 for buffer status

// Status flags for buffers
export enum BufferStatus {
  FREE = 0, // Buffer is available for writing
  WRITING = 1, // Worker is writing to the buffer
  READY = 2, // Buffer has data ready to be read
  READING = 3, // Main thread is reading from the buffer
}

/**
 * Interface for buffer metadata passed via postMessage
 */
export interface BufferReference {
  type: 'bufferReference';
  index: number; // Index of the buffer in the ring
  timestamp: number; // Original timestamp of the data
  dataLength: number; // Length of the data in the buffer
}

export class SharedBufferManager {
  private buffers: SharedArrayBuffer[];
  private views: Uint8Array[];
  private statusViews: Int32Array[];
  private readonly inWorker: boolean;

  /**
   * Create a new SharedBufferManager
   * @param existingBuffers Pass existing buffers when initializing in worker
   */
  constructor(existingBuffers?: SharedArrayBuffer[]) {
    // Check if running in a worker context
    this.inWorker =
      typeof self !== 'undefined' && typeof window === 'undefined' && typeof globalThis.importScripts === 'function';

    if (existingBuffers) {
      // Worker-side initialization with existing buffers
      this.buffers = existingBuffers;
      this.views = this.buffers.map((buffer) => new Uint8Array(buffer));
      this.statusViews = this.buffers.map((buffer) => new Int32Array(buffer, 0, 2));
    } else {
      // Main-thread initialization - create new buffers
      this.buffers = [];
      this.views = [];
      this.statusViews = [];

      for (let i = 0; i < BUFFER_COUNT; i++) {
        try {
          const buffer = new SharedArrayBuffer(BUFFER_SIZE);
          this.buffers.push(buffer);
          this.views.push(new Uint8Array(buffer));
          this.statusViews.push(new Int32Array(buffer, 0, 2));

          // Initialize buffer status to FREE
          this.statusViews[i][0] = BufferStatus.FREE;
          // Initialize data length to 0
          this.statusViews[i][1] = 0;
        } catch (e) {
          console.error('SharedArrayBuffer creation failed. Cross-origin isolation may not be enabled:', e);
          throw new Error('SharedArrayBuffer creation failed. Ensure Cross-Origin-Isolation is enabled.');
        }
      }
    }
  }

  /**
   * Get the shared buffers to pass to a worker
   */
  public getBuffers(): SharedArrayBuffer[] {
    return [...this.buffers];
  }

  /**
   * Find a free buffer for writing
   * @returns Index of a free buffer or -1 if none available
   */
  public findFreeBuffer(): number {
    if (this.inWorker) {
      for (let i = 0; i < this.buffers.length; i++) {
        // Use atomic operations to safely check and update status
        if (
          Atomics.compareExchange(this.statusViews[i], 0, BufferStatus.FREE, BufferStatus.WRITING) === BufferStatus.FREE
        ) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Write data to a buffer
   * @param bufferIndex Index of the buffer to write to
   * @param data String data to write
   * @returns true if successful, false otherwise
   */
  public writeToBuffer(bufferIndex: number, data: string): boolean {
    if (!this.inWorker || bufferIndex < 0 || bufferIndex >= this.buffers.length) {
      return false;
    }

    const view = this.views[bufferIndex];
    const statusView = this.statusViews[bufferIndex];

    // Encode the string to UTF-8
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);

    // Check if data fits in buffer (leaving room for header)
    if (encoded.length > BUFFER_SIZE - HEADER_SIZE) {
      console.warn(`Data too large for buffer: ${encoded.length} bytes`);
      // Reset buffer status to FREE
      Atomics.store(statusView, 0, BufferStatus.FREE);
      return false;
    }

    // Write data length to header
    Atomics.store(statusView, 1, encoded.length);

    // Copy data to buffer after header
    view.set(encoded, HEADER_SIZE);

    // Mark buffer as ready for reading
    Atomics.store(statusView, 0, BufferStatus.READY);

    return true;
  }

  /**
   * Read data from a buffer
   * @param bufferIndex Index of the buffer to read
   * @returns The string data or null if buffer not ready
   */
  public readFromBuffer(bufferIndex: number): string | null {
    if (this.inWorker || bufferIndex < 0 || bufferIndex >= this.buffers.length) {
      return null;
    }

    const statusView = this.statusViews[bufferIndex];

    // Attempt to mark buffer as being read
    if (Atomics.compareExchange(statusView, 0, BufferStatus.READY, BufferStatus.READING) !== BufferStatus.READY) {
      return null; // Buffer not ready for reading
    }

    try {
      // Get data length from header
      const dataLength = Atomics.load(statusView, 1);
      if (dataLength <= 0 || dataLength > BUFFER_SIZE - HEADER_SIZE) {
        return null; // Invalid data length
      }

      // Create a view into the shared buffer
      const sharedView = new Uint8Array(this.buffers[bufferIndex], HEADER_SIZE, dataLength);

      // Create a regular (non-shared) ArrayBuffer and copy the data
      // This is necessary because TextDecoder cannot work directly with SharedArrayBuffer views
      const regularBuffer = new ArrayBuffer(dataLength);
      const regularView = new Uint8Array(regularBuffer);
      regularView.set(sharedView);

      // Decode the data from the regular buffer
      const decoder = new TextDecoder();
      return decoder.decode(regularView);
    } finally {
      // Reset buffer to FREE state
      Atomics.store(statusView, 0, BufferStatus.FREE);
    }
  }

  /**
   * Check if SharedArrayBuffer is supported in this environment
   */
  public static isSupported(): boolean {
    try {
      // Check if SharedArrayBuffer exists
      if (typeof SharedArrayBuffer === 'undefined') {
        return false;
      }

      // Try to create a small buffer to verify it works
      new SharedArrayBuffer(1);
      return true;
    } catch (e) {
      return false;
    }
  }
}
