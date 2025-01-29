import {
  IndexedNormalizedLandmark,
  NormalizeConfig,
  transformDatapoint,
  ValidateConfig,
} from './FaceLandmarkComponentConfig';
import { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, test, expect } from '@jest/globals';
import * as faceLandmarkerResult from '../../../../test_fixtures/landmarker_result.json';

function createResult(): FaceLandmarkerResult {
  return JSON.parse(JSON.stringify(faceLandmarkerResult)) as FaceLandmarkerResult;
}

describe('NormalizeConfig', () => {
  test('expands face landmark values', () => {
    const config = {
      IncludeLandmarks: '3,4',
    };
    const normalizedConfig = NormalizeConfig(config);
    expect(normalizedConfig.IncludedLandmarkList).toEqual([3, 4]);
  });
});

describe('transformDatapoint', () => {
  test('Does not include Blendshapes if not specified', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: true,
      Blendshapes: false,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceBlendshapes).toBeUndefined();
    expect(result.faceLandmarks).toBeDefined();
    expect(result.faceLandmarks.length).toBe(1);
    expect(result.faceLandmarks[0].length).toBe(createResult().faceLandmarks[0].length);
  });

  test('Does not include Landmarks if not specified', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: false,
      Blendshapes: true,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceBlendshapes).toBeDefined();
    expect(result.faceLandmarks).toBeUndefined();
  });

  test('Includes specified landmarks', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: true,
      Blendshapes: false,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
      IncludeLandmarks: '1,2,5,100,346',
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceLandmarks[0].map((landmark: NormalizedLandmark) => (landmark as any).index)).toEqual([
      1, 2, 5, 100, 346,
    ]);
  });

  test('Includes specified all landmarks', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
      IncludeLandmarks: '',
      IncludeBlendshapes: '',
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceLandmarks[0].map((landmark: NormalizedLandmark) => landmark.x)).toEqual(
      createResult().faceLandmarks[0].map((landmark: NormalizedLandmark) => landmark.x),
    );
    expect(result.faceLandmarks[0].map((landmark: NormalizedLandmark) => landmark.y)).toEqual(
      createResult().faceLandmarks[0].map((landmark: NormalizedLandmark) => landmark.y),
    );
    expect(
      result.faceLandmarks[0].map((landmark: NormalizedLandmark) => (landmark as IndexedNormalizedLandmark).index),
    ).toEqual([...Array(result.faceLandmarks[0].length).keys()]);
  });

  test('Includes all blendshape landmarks if all blendshapes are selected', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
      IncludeLandmarks: '1,2,5,100,346',
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceLandmarks[0].map((landmark: NormalizedLandmark) => (landmark as any).index)).toEqual(
      // Blendshapes use indices 0..51, so the IncludeLandmarks above only adds 100 and 346
      Array.from({ length: 52 }, (_, i) => i).concat([100, 346]),
    );
  });

  test('Includes specified Blendshapes', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
      IncludeBlendshapes: 'eyeLookInRight,eyeLookInLeft',
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceBlendshapes[0].categories.map((landmark) => (landmark as any).categoryName)).toEqual([
      'eyeLookInRight',
      'eyeLookInLeft',
    ]);
    expect(result.faceLandmarks[0].map((landmark: NormalizedLandmark) => (landmark as any).index)).toEqual([13, 14]);
  });

  test('Includes specified Blendshapes and FaceLandmarks', () => {
    const config = NormalizeConfig({
      NumberOfFaces: 2,
      Landmarks: true,
      Blendshapes: true,
      FaceTransformation: true,
      CalibrationDuration: 5,
      StripZCoordinates: true,
      IncludeBlendshapes: 'eyeLookInRight,eyeLookInLeft',
      IncludeLandmarks: '1,2,5,100,346',
    });
    expect(ValidateConfig(config)).toBe(true);
    const result = transformDatapoint(config, createResult());
    expect(result.faceBlendshapes[0].categories.map((landmark) => (landmark as any).categoryName)).toEqual([
      'eyeLookInRight',
      'eyeLookInLeft',
    ]);
    expect(result.faceLandmarks[0].map((landmark: NormalizedLandmark) => (landmark as any).index)).toEqual([
      1, 2, 5, 13, 14, 100, 346,
    ]);
  });
});
