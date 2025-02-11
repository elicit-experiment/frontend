import { NormalizeConfig } from './FaceLandmarkComponentConfig';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { describe, test, expect } from '@jest/globals';
import * as faceLandmarkerResult from '../../../../test_fixtures/landmarker_result.json';
import { compressDatapoint, uncompressDatapoint } from './CompressedFaceLandmarkerResult';

function createResult(): FaceLandmarkerResult {
  return JSON.parse(JSON.stringify(faceLandmarkerResult)) as FaceLandmarkerResult;
}

describe('compressDatapoint', () => {
  test('compressDatapoint uncompressDatapoint round trip', () => {
    const config = NormalizeConfig({
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: true,
      StripZCoordinates: false,
    });
    const original = createResult();
    const compressed = compressDatapoint(config, original);
    const uncompressed = uncompressDatapoint(compressed);
    expect(uncompressed).toEqual(original);
    console.log(`compressed: ${JSON.stringify(compressed).length}`);
    console.log(`uncompressed: ${JSON.stringify(uncompressed).length}`);
    console.log(`ratio: ${JSON.stringify(compressed).length / JSON.stringify(uncompressed).length}`);
  });
});
