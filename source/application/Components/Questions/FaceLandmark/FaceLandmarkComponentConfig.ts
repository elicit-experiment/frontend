import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export type FaceLandmarkComponentConfig = {
  NumberOfFaces?: number;
  CalibrationDuration?: number;
  Landmarks?: boolean;
  Blendshapes?: boolean;
  FaceTransformation?: boolean;
  StripZCoordinates?: boolean;
  IncludeBlandshapes?: string; // TODO: Deprecate Blandshapes
  IncludeBlendshapes?: string;
  IncludeLandmarks?: string;
};

type NormalizedLandmarkComponentConfig = {
  includeLandmarks: number[];
};

export function NormalizeConfig(config: FaceLandmarkComponentConfig): NormalizedLandmarkComponentConfig | null {
  if (config.IncludeLandmarks) {
    return {
      includeLandmarks: config.IncludeLandmarks.split(',').map((str: string) => parseInt(str, 10)),
    };
  }

  return null;
}
export function ValidateConfig(config) {
  if (config.IncludeBlendshapes && config.IncludeLandmarks) {
    console.warn('Cannot include both Blendshapes and Landmarks. Ignoring IncludeBlendshapes');
    delete config.IncludeBlendshapes;
  }
}

export function transformDatapoint(
  config: FaceLandmarkComponentConfig,
  dataPoint: FaceLandmarkerResult,
  includeLandmarks: number[] | undefined,
): FaceLandmarkerResult {
  if (config.FaceTransformation && !dataPoint.hasOwnProperty('facialTransformationMatrixes')) {
    return null;
  }
  if (!config.FaceTransformation && dataPoint.hasOwnProperty('facialTransformationMatrixes')) {
    delete dataPoint.facialTransformationMatrixes;
  }
  if (!(dataPoint.hasOwnProperty('faceBlendshapes') && dataPoint.faceBlendshapes)) {
    return null;
  }
  if (!config.Blendshapes && dataPoint.hasOwnProperty('faceBlendshapes')) {
    delete dataPoint.faceBlendshapes;
  }
  if (!(dataPoint.hasOwnProperty('faceLandmarks') && dataPoint.faceLandmarks)) {
    return null;
  }
  if (!config.Landmarks && dataPoint.hasOwnProperty('faceLandmarks')) {
    delete dataPoint.faceBlendshapes;
  }

  if (dataPoint.faceLandmarks) {
    if (config.StripZCoordinates) {
      dataPoint.faceLandmarks.forEach((face) => face.forEach((landmarks) => delete landmarks.z));
    }
    dataPoint.faceLandmarks.forEach((face) => face.forEach((landmarks) => delete landmarks.visibility));
  }

  if (dataPoint.faceBlendshapes) {
    dataPoint.faceBlendshapes.forEach((blendShape) =>
      blendShape.categories.forEach((category) => delete category.displayName),
    );
  }

  if (config.IncludeBlandshapes || config.IncludeBlendshapes) {
    const blendShapeToIndex = dataPoint.faceBlendshapes.map((faceBlendShape) =>
      Object.fromEntries(faceBlendShape.categories.map((blendShape, index) => [blendShape.categoryName, index])),
    );

    let indexRemapIndex = 0;
    let faceLandmarks = [];
    // TODO: Deprecate Blandshapes
    const includeBlendshapes = (config.IncludeBlendshapes || config.IncludeBlandshapes).split(',');
    dataPoint.faceBlendshapes = dataPoint.faceBlendshapes.map((faceBlendshape, faceIndex) => {
      const blendShapeIndices = includeBlendshapes.map((blendShape) => blendShapeToIndex[faceIndex][blendShape]);
      const categories = blendShapeIndices.map((index) => faceBlendshape.categories[index]);

      Object.fromEntries(
        categories.map((blendShape) => {
          const oldIndex = blendShape.index;
          faceLandmarks = faceLandmarks.concat(dataPoint.faceLandmarks[faceIndex][oldIndex]);
          blendShape.index = indexRemapIndex;
          return [oldIndex, indexRemapIndex++];
        }),
      );
      return {
        ...faceBlendshape,
        categories,
      };
    });

    dataPoint.faceLandmarks = faceLandmarks;
  }

  if (config.IncludeLandmarks) {
    let faceLandmarks = dataPoint.faceLandmarks.map((face) =>
      includeLandmarks.map((faceLandmarkIndex: number) => ({
        ...face[faceLandmarkIndex],
        index: faceLandmarkIndex,
      })),
    );
    dataPoint.faceLandmarks = faceLandmarks;
  }

  return dataPoint;
}
