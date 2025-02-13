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
    accumulator = new DatapointAccumulator(5, 5, null);
    jest.spyOn(accumulator, 'sendDataPoints').mockImplementation(async () => {
      // Mock implementation of sendDataPoints does nothing
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('should correctly discard rate-limited datapoints not queue others', () => {
    const t1 = new Date().getTime() - 1000;
    const t2 = new Date().getTime() + 10;

    // Prepare mock data points
    const mockDataPoint1 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      t: t1,
    };
    const mockDataPoint2 = {
      faceLandmarks: [],
      faceBlendshapes: [],
      facialTransformationMatrixes: [],
      t: t2,
    };

    // Push mock data points
    accumulator.accumulateAndDebounce(mockDataPoint1);
    accumulator.accumulateAndDebounce(mockDataPoint2);

    // Check if setTimeout is set up properly
    expect(setTimeout).toHaveBeenCalledTimes(0);

    // Validate that the correct filtered data points are sent based on DATAPOINTS_PER_SECOND
    expect(accumulator.queuedDataPoints).toEqual([
      expect.objectContaining({ t: t2 }), // MockDataPoint2
    ]);
    expect(accumulator.candidateDataPoints).toEqual([]);
  });

  test('should correctly discard rate-limited datapoints not queue others - 2', () => {
    const tBase = new Date().getTime() - 1000;

    const mockDataPoints = [0, 199, 200, 201, 202, 203, 400].map((delta) => {
      const t1 = tBase + delta;

      return {
        faceLandmarks: [],
        faceBlendshapes: [],
        facialTransformationMatrixes: [],
        t: t1,
      };
    });

    accumulator.lastSendTimestamp = tBase - 1000;

    // Push mock data points
    mockDataPoints.forEach((mockDataPoint) => {
      accumulator.accumulateAndDebounce(mockDataPoint);
    });

    // Validate that the correct filtered data points are sent based on DATAPOINTS_PER_SECOND
    expect(accumulator.queuedDataPoints).toEqual(
      [0, 2, 6].map(
        (index) => expect.objectContaining({ t: mockDataPoints[index].t }), // MockDataPoint2
      ),
    );
    expect(accumulator.candidateDataPoints).toEqual([]);
  });
});
