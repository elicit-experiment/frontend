import { SharedBufferManager, BufferStatus } from './SharedBufferManager';
import { jest, test, describe, expect } from '@jest/globals';
import { beforeEach, afterEach } from '@jest/globals';

// Mock Atomics if not available in test environment
if (typeof Atomics === 'undefined') {
  (globalThis as any).Atomics = {
    store: jest.fn((array: { [key: number]: any }, index: number, value: any) => {
      array[index] = value;
      return value;
    }),
    load: jest.fn((array: { [key: number]: any }, index: number) => array[index]),
    compareExchange: jest.fn((array: { [key: number]: any }, index: number, expected: any, replace: any) => {
      const current = array[index];
      if (current === expected) {
        array[index] = replace;
      }
      return current;
    }),
  };
}

// Mock SharedArrayBuffer if not available in test environment
if (typeof SharedArrayBuffer === 'undefined') {
  (globalThis as any).SharedArrayBuffer = class MockSharedArrayBuffer {
    constructor(public byteLength: number) {}
  };
}

describe('SharedBufferManager', () => {
  // Store original environment
  const originalSelf = globalThis.self;
  const originalWindow = globalThis.window;
  const originalImportScripts = (globalThis as any).importScripts;

  beforeEach(() => {
    // Reset mock implementations
    if (typeof Atomics !== 'undefined' && typeof Atomics.store === 'function' && (Atomics.store as any).mockClear) {
      (Atomics.store as jest.Mock).mockClear();
      (Atomics.load as jest.Mock).mockClear();
      (Atomics.compareExchange as jest.Mock).mockClear();
    }
  });

  afterEach(() => {
    // Restore original globals
    (globalThis as any).self = originalSelf;
    (globalThis as any).window = originalWindow;
    (globalThis as any).importScripts = originalImportScripts;
  });

  // Helper to set environment for worker
  function mockWorkerEnvironment() {
    (globalThis as any).self = { postMessage: jest.fn() };
    delete (globalThis as any).window;
    (globalThis as any).importScripts = () => {};
  }

  // Helper to set environment for main thread
  function mockMainThreadEnvironment() {
    (globalThis as any).self = { postMessage: jest.fn() };
    (globalThis as any).window = {};
    delete (globalThis as any).importScripts;
  }

  test('isSupported detects SharedArrayBuffer support', () => {
    expect(SharedBufferManager.isSupported()).toBe(true);

    // Test when SharedArrayBuffer throws
    const originalSharedArrayBuffer = globalThis.SharedArrayBuffer;
    (globalThis as any).SharedArrayBuffer = function () {
      throw new Error('Not supported');
    };
    expect(SharedBufferManager.isSupported()).toBe(false);

    // Restore original
    (globalThis as any).SharedArrayBuffer = originalSharedArrayBuffer;
  });

  test('constructor creates buffers in main thread', () => {
    // Setup for main thread
    mockMainThreadEnvironment();

    const manager = new SharedBufferManager();
    const buffers = manager.getBuffers();

    expect(buffers.length).toBeGreaterThan(0);
    expect(buffers[0] instanceof SharedArrayBuffer).toBe(true);
  });

  test('writeToBuffer and readFromBuffer work together', () => {
    // Setup for main thread first to create buffers
    mockMainThreadEnvironment();
    const mainManager = new SharedBufferManager();
    const buffers = mainManager.getBuffers();

    // Now switch to worker environment
    mockWorkerEnvironment();
    const workerManager = new SharedBufferManager(buffers);
    console.log((workerManager as any).inWorker);

    // Find a free buffer in worker
    const bufferIndex = workerManager.findFreeBuffer();
    expect(bufferIndex).toBeGreaterThanOrEqual(0);

    // Write data from worker
    const testData = '{"test":"data","value":123}';
    const writeResult = workerManager.writeToBuffer(bufferIndex, testData);
    expect(writeResult).toBe(true);

    // Switch back to main thread to read
    mockMainThreadEnvironment();
    const readData = mainManager.readFromBuffer(bufferIndex);
    expect(readData).toBe(testData);
  });

  test('findFreeBuffer returns -1 when all buffers are in use', () => {
    // Setup for worker
    mockWorkerEnvironment();

    // Create buffers with all marked as WRITING
    const bufferCount = 3;
    const buffers = [];
    for (let i = 0; i < bufferCount; i++) {
      const buffer = new SharedArrayBuffer(1024);
      const statusView = new Int32Array(buffer, 0, 2);
      statusView[0] = BufferStatus.WRITING; // Mark all as in use
      buffers.push(buffer);
    }

    const workerManager = new SharedBufferManager(buffers);

    // Try to find a free buffer - should fail
    const bufferIndex = workerManager.findFreeBuffer();
    expect(bufferIndex).toBe(-1);
  });

  test('writeToBuffer returns false for invalid buffer index', () => {
    // Setup for worker
    mockWorkerEnvironment();

    const workerManager = new SharedBufferManager([new SharedArrayBuffer(1024)]);

    // Try to write to invalid buffer
    const writeResult = workerManager.writeToBuffer(-1, 'test data');
    expect(writeResult).toBe(false);

    const writeResult2 = workerManager.writeToBuffer(99, 'test data');
    expect(writeResult2).toBe(false);
  });

  // test('writeToBuffer returns false for oversized data', () => {
  //   // Setup for worker
  //   mockWorkerEnvironment();
  //
  //   // Create small buffer to trigger size check
  //   const smallBuffer = new SharedArrayBuffer(32);
  //   const workerManager = new SharedBufferManager([smallBuffer]);
  //
  //   // Try to write too much data
  //   const largeData = 'x'.repeat(100);
  //   test('writeToBuffer throws RangeError for oversized data', () => {});
  // });
});
