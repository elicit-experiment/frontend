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

  test('compress uncompress round trip no face transformation', () => {
    const config = NormalizeConfig({
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: false,
      //      StripFacialTransformationMatrix: true, // It would be nice to be able to specify this distinct from FaceTransformations?
      StripZCoordinates: false,
    });
    const original = createResult();
    const compressed = compressDatapoint(config, original);
    const uncompressed = uncompressDatapoint(compressed);
    expect(compressed.m).toBeUndefined();
    delete original.facialTransformationMatrixes;
    expect(uncompressed).toEqual(original);
    console.log(`compressed: ${JSON.stringify(compressed).length}`);
    console.log(`uncompressed: ${JSON.stringify(uncompressed).length}`);
    console.log(`ratio: ${JSON.stringify(compressed).length / JSON.stringify(uncompressed).length}`);
  });

  test('compress uncompress round trip no z index', () => {
    const config = NormalizeConfig({
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: true,
      StripZCoordinates: true,
    });
    const original = createResult();
    const compressed = compressDatapoint(config, original);
    const uncompressed = uncompressDatapoint(compressed);
    delete original.facialTransformationMatrixes;
    expect(
      uncompressed.faceLandmarks[0].reduce((noZs, element) => !(typeof element['z'] === undefined) && noZs, true),
    ).toBeTruthy();
    console.log(`compressed: ${JSON.stringify(compressed).length}`);
    console.log(`uncompressed: ${JSON.stringify(uncompressed).length}`);
    console.log(`ratio: ${JSON.stringify(compressed).length / JSON.stringify(uncompressed).length}`);
  });
});
