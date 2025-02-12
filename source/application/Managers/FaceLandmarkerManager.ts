import DisposableComponent from 'Components/DisposableComponent';
import ExperimentManager from 'Managers/Portal/Experiment';
import PortalClient from 'PortalClient';
import { FaceLandmarker, FaceLandmarkerOptions, FaceLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision';
import { DatapointAccumulator, ProgressKind } from 'Components/Questions/FaceLandmark/DatapointAccumulator';
import { FaceLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import { compressDatapoint } from 'Components/Questions/FaceLandmark/CompressedFaceLandmarkerResult';

export enum FaceLandmarkerState {
  NotStarted,
  Started,
  Calibrating,
  Running,
  Ended,
}

class FaceLandmarkerManager extends DisposableComponent {
  public sessionGuid: string;

  private static _instance: FaceLandmarkerManager;
  private static SUMMARY_INTERVAL = 3000;
  private static AUTO_SEND_INTERVAL = 1000;
  private _summaryTimer: ReturnType<typeof setInterval> | null = null;

  public config: FaceLandmarkComponentConfig;
  public datapointAccumulator: DatapointAccumulator;
  public faceLandmarker: FaceLandmarker;
  public runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE';

  private currentSummaryPeriodStart: Date | null = null;
  private currentSummaryPeriodCounts = {
    queued: 0,
    posted: 0,
    posted_bytes: 0,
    posted_compressed_bytes: 0,
    acknowledged: 0,
    acknowledged_bytes: 0,
    acknowledged_compressed_bytes: 0,
  };

  public state = FaceLandmarkerState.NotStarted;
  public webcamRunning = false;

  public videoRatio: number | null = null;

  private constructor() {
    super();

    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }

  static get Instance(): FaceLandmarkerManager {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
  }

  public static getInstance(): FaceLandmarkerManager {
    if (!FaceLandmarkerManager._instance) {
      FaceLandmarkerManager._instance = new FaceLandmarkerManager();
    }
    return FaceLandmarkerManager._instance;
  }

  public Init(config: FaceLandmarkComponentConfig): Promise<typeof import('@mediapipe/tasks-vision')> {
    this.config = config;
    this.state = FaceLandmarkerState.NotStarted;

    this.datapointAccumulator = new DatapointAccumulator(
      this.config.MaximumSendRateHz,
      (kind, count, totalBytes, totalCompressedBytes) => {
        if (kind === ProgressKind.POSTED) {
          this.currentSummaryPeriodCounts.posted += count;
          this.currentSummaryPeriodCounts.posted_bytes += totalBytes;
        }
        if (kind === ProgressKind.ACKNOWLEDGED) {
          this.currentSummaryPeriodCounts.acknowledged += count;
          this.currentSummaryPeriodCounts.acknowledged_bytes += totalBytes;
          this.currentSummaryPeriodCounts.acknowledged_compressed_bytes += totalCompressedBytes;
        }
      },
    );

    return new Promise((resolve, reject) => {
      import('@mediapipe/tasks-vision')
        .then(async (visionImport) => {
          await this.createFaceLandmarker(visionImport.FaceLandmarker, visionImport.FilesetResolver, {
            numFaces: this.config.NumberOfFaces || 1,
            outputFacialTransformationMatrixes: this.config.FaceTransformation || false,
            outputFaceBlendshapes: this.config.Blendshapes || true,
          });

          resolve(visionImport);
        })
        .catch((x) => reject(x));
    });
  }

  // Before we can use FaceLandmarker class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment to
  // get everything needed to run.
  async createFaceLandmarker(
    FaceLandmarkerClass: typeof FaceLandmarker,
    FilesetResolverClass: typeof FilesetResolver,
    options: FaceLandmarkerOptions,
  ) {
    const filesetResolver = await FilesetResolverClass.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
    );
    console.log('createFaceLandmarker');
    this.faceLandmarker = await FaceLandmarkerClass.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      runningMode: this.runningMode,
      ...options,
    });
  }

  // TODO: this should be derived from the state, rather than being an independent variable.
  public webcamIsRunning() {
    return this.webcamRunning;
  }
  public startWebcam() {
    this.webcamRunning = true;
  }
  public stopWebcam() {
    this.webcamRunning = false;
  }

  public Start() {}

  public End() {
    this.SetState(FaceLandmarkerState.Running);
    this.clearSummaryTimer();
    this.stopWebcam();
  }

  public queueForSend(dataPoint: FaceLandmarkerResult) {
    const compressedDataPoint = compressDatapoint(this.config, dataPoint);
    if (compressedDataPoint) {
      this.currentSummaryPeriodCounts.queued++;
      this.datapointAccumulator.accumulateAndDebounce(compressedDataPoint as Record<string, unknown>);
    }
  }
  private clearSummaryTimer() {
    if (this._summaryTimer) {
      clearInterval(this._summaryTimer);
      this._summaryTimer = null;
    }
  }

  public StartTracking() {
    console.log('FaceLandmarkerManager: Start Tracking');

    this.clearSummaryTimer();
    this._summaryTimer = setInterval(this.SendSummary.bind(this), FaceLandmarkerManager.AUTO_SEND_INTERVAL);

    this.SetState(FaceLandmarkerState.Running);
    // TODO: there is very likely a race condition here between us sending off the final
    // FaceLandmarker data and the user hitting "end experiment" which will trigger a page nav.
    // I think the best solution is to add plumming to CallQueue to check if it's empty, and
    // only un-disable the end experiment button when that's empty.
    ExperimentManager.IsExperimentCompleted.subscribe((_completed: boolean) => {
      this.End();
    });

    // Moved to Portal
    //window.addEventListener('beforeunload', FaceLandmarkerManager.unloadListener);
  }

  public SendSummary() {
    // console.log('FaceLandmarkerManager: Send Summary');
    const summaryData = {
      start: this.currentSummaryPeriodStart,
      t: Date.now(),
      currentState: this.state,
      ...this.currentSummaryPeriodCounts,
    };
    // console.dir(summaryData);

    const dataPoint = {
      kind: 'face_landmark',
      point_type: 'send_points_summary',
      method: '',
      value: JSON.stringify(summaryData),
      datetime: new Date(),
    };

    ExperimentManager.SendSlideDataPoint('face_landmark_summary', dataPoint, (err) => {
      if (!err) {
        console.error('datapoint error');
      }
    });
    this.currentSummaryPeriodStart = new Date();

    Object.keys(this.currentSummaryPeriodCounts).forEach((key) => {
      this.currentSummaryPeriodCounts[key as keyof typeof this.currentSummaryPeriodCounts] = 0;
    });
  }

  public SetState(newState: FaceLandmarkerState) {
    this.state = newState;
  }
}

export default FaceLandmarkerManager;
const getFaceLandmarkerManager = (): FaceLandmarkerManager => FaceLandmarkerManager.getInstance();
export { getFaceLandmarkerManager };
