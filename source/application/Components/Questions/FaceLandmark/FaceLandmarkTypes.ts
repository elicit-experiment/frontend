import { Classifications, NormalizedLandmark } from '@mediapipe/tasks-vision';

// Copied from vision.d.ts since it's not exported.
export declare interface Matrix {
  /** The number of rows. */
  rows: number;
  /** The number of columns. */
  columns: number;
  /** The values as a flattened one-dimensional array. */
  data: number[];
}

export type ElicitNormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
  index?: number;
};

export type ElicitLandmark = NormalizedLandmark | ElicitNormalizedLandmark;
export type AccumulatableBaseRecord = Record<string, unknown>;
export type AccumulatableRecord = AccumulatableBaseRecord & {
  t: number;
};

export enum ProgressKind {
  QUEUED = 'QUEUED',
  POSTED = 'POSTED',
  SKIPPED = 'SKIPPED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export type ProgressCallback = (
  kind: ProgressKind,
  count: number,
  totalBytes: number,
  totalCompressedBytes: number,
) => void;

export declare interface ElicitFaceLandmarkerResult {
  /** Detected face landmarks in normalized image coordinates. */
  faceLandmarks: ElicitLandmark[][];
  /** Optional face blendshapes results. */
  faceBlendshapes: Classifications[];
  /** Optional facial transformation matrix. */
  facialTransformationMatrixes: Matrix[];
  t?: number;
}
