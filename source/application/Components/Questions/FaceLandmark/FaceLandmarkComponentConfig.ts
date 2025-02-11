import { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

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
  MaximumSendRateHz?: number;
};

export interface NormalizedLandmarkComponentConfig extends FaceLandmarkComponentConfig {
  IncludedLandmarkList?: number[];
  IncludedBlendshapeList?: string[];
}

export interface IndexedNormalizedLandmark extends NormalizedLandmark {
  index: number;
}

export function NormalizeConfig(config: FaceLandmarkComponentConfig): NormalizedLandmarkComponentConfig | null {
  const blendshapes = config.IncludeBlendshapes || config.IncludeBlandshapes;
  const Blendshapes = config.Blendshapes || blendshapes != null;
  const Landmarks = config.Landmarks || config.IncludeLandmarks != null;
  const MaximumSendRateHz = config.MaximumSendRateHz || 5;
  return {
    ...config,
    Blendshapes,
    Landmarks,
    IncludedLandmarkList: config.IncludeLandmarks
      ? config.IncludeLandmarks.split(',').map((str: string) => parseInt(str, 10))
      : null,
    // TODO: Deprecate Blandshapes
    IncludedBlendshapeList: blendshapes ? blendshapes.split(',') : null,
    MaximumSendRateHz,
  };
}

export function ValidateConfig(config) {
  if (config.IncludeBlendshapes && config.IncludeLandmarks) {
    console.warn('Cannot include both Blendshapes and Landmarks. Ignoring IncludeBlendshapes');
    delete config.IncludeBlendshapes;
  }
  return true;
}

// Transform the datapoint, within the same media pipe types, according to the configuration.
export function transformDatapoint(
  config: NormalizedLandmarkComponentConfig,
  dataPoint: FaceLandmarkerResult,
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
    delete dataPoint.faceLandmarks;
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

  let faceBlendshapes = null;
  let faceLandmarks = null;

  if (config.Blendshapes) {
    if (config.IncludedBlendshapeList && config.IncludedBlendshapeList.length > 0) {
      const blendShapeToIndex = dataPoint.faceBlendshapes.map((faceBlendShape) =>
        Object.fromEntries(faceBlendShape.categories.map((blendShape, index) => [blendShape.categoryName, index])),
      );

      faceBlendshapes = dataPoint.faceBlendshapes.map((faceBlendshape, faceIndex) => {
        const blendShapeIndices = config.IncludedBlendshapeList.map(
          (blendShape: string) => blendShapeToIndex[faceIndex][blendShape],
        );
        const categories = blendShapeIndices.map((index) => faceBlendshape.categories[index]);

        return {
          ...faceBlendshape,
          categories,
        };
      });
    } else {
      faceBlendshapes = dataPoint.faceBlendshapes;
    }
  }

  if (config.Landmarks) {
    faceLandmarks = [];
    let faceLandmarkFilter = [];

    if (config.IncludedLandmarkList && config.IncludedLandmarkList.length > 0) {
      faceLandmarkFilter = faceLandmarkFilter.concat(config.IncludedLandmarkList);

      for (let faceIndex = 0; faceIndex < dataPoint.faceLandmarks.length; faceIndex++) {
        let fullFaceLandmarkFilter = faceLandmarkFilter;
        if (faceBlendshapes && faceBlendshapes[faceIndex]) {
          fullFaceLandmarkFilter = faceLandmarkFilter.concat(
            faceBlendshapes[faceIndex].categories.map((category) => category.index),
          );
        }

        let faceLandmark: NormalizedLandmark[];
        if (fullFaceLandmarkFilter.length > 0) {
          fullFaceLandmarkFilter = [...new Set(fullFaceLandmarkFilter)].sort((a: number, b: number) => a - b);
          const face = dataPoint.faceLandmarks[faceIndex];
          faceLandmark = fullFaceLandmarkFilter.map((faceLandmarkIndex: number) => ({
            ...face[faceLandmarkIndex],
            index: faceLandmarkIndex,
          }));
        } else {
          faceLandmark = dataPoint.faceLandmarks[faceIndex];
        }

        faceLandmarks.push(faceLandmark);
      }
    } else {
      faceLandmarks = dataPoint.faceLandmarks.map((faceLandmark) => {
        return faceLandmark.map((landmark, faceLandmarkIndex: number) => ({ ...landmark, index: faceLandmarkIndex }));
      });
    }
  }

  const facialTransformationMatrixes = dataPoint.facialTransformationMatrixes;
  return {
    ...(faceLandmarks && { faceLandmarks }),
    ...(faceBlendshapes && { faceBlendshapes }),
    ...(facialTransformationMatrixes && { facialTransformationMatrixes }),
  };
}
