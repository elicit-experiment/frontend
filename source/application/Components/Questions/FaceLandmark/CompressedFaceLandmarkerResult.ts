import { Classifications, FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { NormalizedLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { quantize, unquantize } from 'Components/Questions/FaceLandmark/Quantize';

export declare type CompressedNormalizedLandmark = {
  p: number[];
  z: boolean; // has a z coordinate
  v?: boolean[];
};

export declare interface CompressedClassifications {
  s: number[];
  i: number[];
  c: number[];
}

// cat source/test_fixtures/landmarker_result.json | jq '.faceBlendshapes[0].categories[].categoryName'
const BLENDSHAPE_CATEGORY_NAMES = [
  '_neutral',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
];
const BLENDSHAPE_CATEGORY_INDICES = BLENDSHAPE_CATEGORY_NAMES.reduce((acc, val, index) => {
  acc[val] = index;
  return acc;
}, {} as Record<string, number>);

export declare interface CompressedFaceLandmarkerResult {
  /** Detected face landmarks in normalized image coordinates. */
  l?: CompressedNormalizedLandmark[];
  /** Optional face blendshapes results. */
  b?: CompressedClassifications[];
  /** Optional facial transformation matrix. */
  m?: number[][]; // one matrix per face, row major form
  t: number; // Timestamp for video frame
  dt?: number; // Difference between video frame time and system time
}

export function compressDatapoint(
  config: NormalizedLandmarkComponentConfig,
  dataPoint: FaceLandmarkerResult,
  timestamp: DOMHighResTimeStamp,
): CompressedFaceLandmarkerResult | null {
  if (config.FaceTransformation && !dataPoint.hasOwnProperty('facialTransformationMatrixes')) {
    return null;
  }

  let resultMatrix: number[][] | null = null;
  if (config.FaceTransformation && dataPoint.hasOwnProperty('facialTransformationMatrixes')) {
    resultMatrix = dataPoint.facialTransformationMatrixes.map((m) => m.data.flat());
  }

  let resultLandmarks: CompressedNormalizedLandmark[] | null = null;

  if (!(dataPoint.hasOwnProperty('faceLandmarks') && dataPoint.faceLandmarks)) {
    return null;
  }
  if (config.Landmarks && dataPoint.hasOwnProperty('faceLandmarks')) {
    resultLandmarks = dataPoint.faceLandmarks.map((landmarks): CompressedNormalizedLandmark => {
      // TODO: Use indexed access and typed arrays for optimization
      const points: number[] = [];
      for (const val of landmarks) {
        points.push(quantize(val.x), quantize(val.y));
        if (!config.StripZCoordinates) {
          points.push(quantize(val.z));
        }
      }
      return {
        z: !config.StripZCoordinates,
        p: points,
      };
    });
  }

  let resultBlendshapes: CompressedClassifications[] | null = null;

  if (!(dataPoint.hasOwnProperty('faceBlendshapes') && dataPoint.faceBlendshapes)) {
    return null;
  }
  if (config.Blendshapes && dataPoint.hasOwnProperty('faceBlendshapes')) {
    resultBlendshapes = dataPoint.faceBlendshapes.map(
      (classifications): CompressedClassifications => ({
        s: classifications.categories.map((category) => quantize(category.score)),
        i: classifications.categories.map((category) => category.index),
        c: classifications.categories.map((category) => BLENDSHAPE_CATEGORY_INDICES[category.categoryName]),
      }),
    );
  }

  const t = performance.timeOrigin + timestamp;
  const dt = Date.now() - t;

  const result: CompressedFaceLandmarkerResult = { t, dt };
  if (resultLandmarks) {
    result.l = resultLandmarks;
  }
  if (resultBlendshapes) {
    result.b = resultBlendshapes;
  }
  if (resultMatrix) {
    result.m = resultMatrix;
  }
  return result;
}

export function uncompressDatapoint(compressed: CompressedFaceLandmarkerResult): FaceLandmarkerResult | null {
  const facialTransformationMatrixes = compressed.m?.map((compressedMatrix) => {
    const size = Math.sqrt(compressedMatrix.length);
    return {
      rows: size,
      columns: size,
      data: compressedMatrix,
    };
  });

  const faceLandmarks = compressed.l.map((compressed: CompressedNormalizedLandmark) => {
    const landmarks: NormalizedLandmark[] = [];
    const hasZ = compressed.z;
    const pointSize = hasZ ? 3 : 2;
    for (let i = 0; i < compressed.p.length / pointSize; i++) {
      const landmark: NormalizedLandmark = {
        x: unquantize(compressed.p[i * pointSize]),
        y: unquantize(compressed.p[i * pointSize + 1]),
        z: null,
        visibility: 0,
      };
      if (hasZ) {
        landmark.z = unquantize(compressed.p[i * pointSize + 2]);
      }

      landmarks.push(landmark);
    }

    return landmarks;
  });

  const faceBlendshapes = compressed.b.map((classification) => {
    const blendshape: Classifications = {
      categories: [],
      headIndex: -1,
      headName: '',
    };

    blendshape.categories = [];
    for (let i = 0; i < classification.c.length; i++) {
      blendshape.categories.push({
        score: unquantize(classification.s[i]),
        index: classification.i[i],
        categoryName: BLENDSHAPE_CATEGORY_NAMES[classification.c[i]],
        displayName: '',
      });
    }

    return blendshape;
  });

  return {
    facialTransformationMatrixes,
    faceLandmarks,
    faceBlendshapes,
  };
}
