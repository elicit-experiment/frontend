import { jest, describe, test, expect } from '@jest/globals';
import { beforeEach, afterEach } from '@jest/globals';

// Mocking 'PortalClient' with a default export
jest.mock('PortalClient', () => ({
  __esModule: true, // Ensures the module is treated as an ES module
  default: {
    ServiceCallerService: {
      GetDefaultCaller: jest.fn(() => ({
        GetCurrentSession: jest.fn(() => ({
          Guid: 'mock-session-guid', // Mocked GUID
        })),
      })),
    },
  },
}));

import { DatapointAccumulator } from './DatapointAccumulator'; // Adjust the path accordingly

jest.useFakeTimers(); // Mock setTimeout and related timing functions
jest.spyOn(global, 'setTimeout');

describe('DatapointAccumulator', () => {
  let accumulator: DatapointAccumulator;

  beforeEach(() => {
    accumulator = new DatapointAccumulator(5);
    jest.spyOn(accumulator, 'sendDataPoints').mockImplementation(async () => {
      // Mock implementation of sendDataPoints does nothing
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('should correctly debounce and rate-limit datapoints without calling setTimeout or sendDataPoints', () => {
    // Prepare mock data points
    const mockDataPoint1 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      timeStamp: 1000,
    };
    const mockDataPoint2 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      timeStamp: 2000,
    };

    // Push mock data points
    accumulator.accumulateAndDebounce(mockDataPoint1);
    accumulator.accumulateAndDebounce(mockDataPoint2);

    // Check if setTimeout is set up properly
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // Fast-forward the timer to trigger the debouncerCallback
    jest.runAllTimers();

    // Check if sendDataPoints is called
    expect(accumulator.sendDataPoints).toHaveBeenCalledTimes(1);

    // Validate that the correct filtered data points are sent based on DATAPOINTS_PER_SECOND
    expect(accumulator.sendDataPoints).toHaveBeenCalledWith([
      expect.objectContaining({ timeStamp: 1000 }), // MockDataPoint1
      expect.objectContaining({ timeStamp: 2000 }), // MockDataPoint2
    ]);
  });

  test('should reset debouncer after callback and restart if there are remaining data points', () => {
    // Mock data points
    const mockDataPoint = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [], timeStamp: 1000 };

    // Add a single point
    accumulator.accumulateAndDebounce(mockDataPoint);

    // Check if setTimeout was called once
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // Fast-forward the timer
    jest.runAllTimers();

    // Ensure sendDataPoints is called
    expect(accumulator.sendDataPoints).toHaveBeenCalledTimes(1);

    // Debouncer should be reset after callback
    expect(accumulator.debouncer).toBeNull();

    // Add more data points to check rebouncing
    accumulator.accumulateAndDebounce(mockDataPoint);

    // Check if setTimeout starts again
    expect(setTimeout).toHaveBeenCalledTimes(2);
  });

  test('should respect the DATAPOINTS_PER_SECOND limit for filtered data points', () => {
    // Push data points with timestamps that violate rate limits
    const mockDataPoint1 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      timeStamp: 1000,
    };
    const mockDataPoint2 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      timeStamp: 1005,
    }; // Close timestamp — skipped
    const mockDataPoint3 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      timeStamp: 2000,
    }; // Wider gap — included

    accumulator.dataPoints.push(mockDataPoint1, mockDataPoint2, mockDataPoint3);

    // Call debouncerCallback explicitly
    accumulator.debouncerCallback();

    // Ensure sendDataPoints only includes points respecting the interval
    expect(accumulator.sendDataPoints).toHaveBeenCalledWith([
      expect.objectContaining(mockDataPoint1), // Included
      expect.objectContaining(mockDataPoint3), // Included
    ]);
  });
});
