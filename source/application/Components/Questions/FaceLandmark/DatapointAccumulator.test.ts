import { jest, xdescribe, test, expect } from '@jest/globals';
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
jest.spyOn(global, 'setInterval');

jest.mock('Components/Questions/FaceLandmark/CompressedFaceLandmarkerResult', () => ({
  __esModule: true,
  compressDatapoint: jest.fn((config, datapoint, t: DOMHighResTimeStamp) => ({
    t,
    compressedData: `mock-compressed-${t}`, // Example mock return value based on input
  })),
}));

xdescribe('DatapointAccumulator', () => {
  let accumulator: DatapointAccumulator;

  beforeEach(() => {
    accumulator = new DatapointAccumulator({ MaximumSendRateHz: 5 }, 5, null);
    jest.spyOn(accumulator, 'sendQueuedDataPoints').mockImplementation(async () => {
      // Mock implementation of sendDataPoints does nothing
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('should correctly discard rate-limited datapoints not queue others', () => {
    const t1 = new Date().getTime() - 180;
    const t2 = t1 + 230;

    accumulator.lastQueuedTimestamp = t1 - 10;

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
    accumulator.accumulateAndDebounce(mockDataPoint1, t1, 0, 0);
    accumulator.accumulateAndDebounce(mockDataPoint2, t2, 0, 0);

    // Check if setTimeout is set up properly
    // expect(setInterval).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    // Validate that the correct filtered data points are sent based on DATAPOINTS_PER_SECOND
    expect(accumulator.queuedDataPoints).toEqual([
      expect.objectContaining({ t: t2 }), // MockDataPoint2
    ]);
    expect(accumulator.pendingTimestamps).toEqual([]);
  });

  test('should correctly discard rate-limited datapoints not queue others - 2', () => {
    const tBase = new Date().getTime() - 1000;

    const mockDataPoints = [0, 198, 200, 202, 202, 203, 400].map((delta) => {
      const t1 = tBase + delta;

      return {
        faceLandmarks: [],
        faceBlendshapes: [],
        facialTransformationMatrixes: [],
        t: t1,
      };
    });

    accumulator.lastQueuedTimestamp = tBase - 1000;

    // Push mock data points
    mockDataPoints.forEach((mockDataPoint) => {
      accumulator.accumulateAndDebounce(mockDataPoint, mockDataPoint.t, 0, 0);
      jest.advanceTimersByTime(1000);
    });

    // Validate that the correct filtered data points are sent based on DATAPOINTS_PER_SECOND
    expect(accumulator.queuedDataPoints).toEqual(
      [0, 2, 6].map(
        (index) => expect.objectContaining({ t: mockDataPoints[index].t }), // MockDataPoint2
      ),
    );
    expect(accumulator.pendingTimestamps).toEqual([]);
  });
});
