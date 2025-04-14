import DisposableComponent from 'Components/DisposableComponent';
import ExperimentManager from 'Managers/Portal/Experiment';
import PortalClient from 'PortalClient';
import { FaceLandmarker, FaceLandmarkerOptions, FaceLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision';
import { DatapointAccumulator } from 'Components/Questions/FaceLandmark/DatapointAccumulator';
import { ProgressKind } from 'Components/Questions/FaceLandmark/FaceLandmarkTypes';
import { FaceLandmarkComponentConfig } from 'Components/Questions/FaceLandmark/FaceLandmarkComponentConfig';
import FaceLandmarkStatsMonitor, {
  template as FaceLandmarkStatsMonitorTemplate,
} from 'Components/Questions/FaceLandmark/FaceLandmarkStatsMonitor';
import * as knockout from 'knockout';

export enum FaceLandmarkerState {
  NotStarted,
  Started,
  Calibrating,
  Running,
  Ended,
}

// Debug Keyword State Machine
// This creates a state machine that triggers an event when "debug" is typed

function debugListener() {
  // The sequence we're looking for
  const targetSequence = 'debug';

  // Current state of our state machine (how many correct characters in sequence so far)
  let currentState = 0;

  // Create and configure a custom event
  const debugTriggeredEvent = new CustomEvent('debugTriggered', {
    bubbles: true,
    detail: { message: 'Debug sequence detected!' },
  });

  // Add the keyboard event listener to the document
  document.addEventListener('keydown', function (event) {
    // Get the pressed key
    const keyPressed = event.key.toLowerCase();

    // Check if the pressed key matches the next expected character in our sequence
    if (keyPressed === targetSequence[currentState]) {
      // Move to the next state
      currentState++;

      // Check if we've completed the sequence
      if (currentState === targetSequence.length) {
        // Fire the custom event
        document.dispatchEvent(debugTriggeredEvent);
        console.log('Debug sequence detected!');

        // Reset the state machine
        currentState = 0;
      }
    } else {
      // If we're already tracking a potential sequence and the user presses 'd'
      // we should start a new potential sequence rather than reset completely
      if (keyPressed === targetSequence[0]) {
        currentState = 1;
      } else {
        // Reset the state if the wrong key is pressed
        currentState = 0;
      }
    }
  });
}

class FaceLandmarkerManager extends DisposableComponent {
  public sessionGuid: string;

  private static _instance: FaceLandmarkerManager;
  private static SUMMARY_INTERVAL = 3000;
  private static AUTO_SEND_INTERVAL = 1300;
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
    skipped: 0,
    skipped_bytes: 0,
    acknowledged: 0,
    acknowledged_bytes: 0,
    acknowledged_compressed_bytes: 0,
  };

  public state = FaceLandmarkerState.NotStarted;
  public webcamRunning = false;

  public videoAspectRatio: number | null = null;
  public webcamFrameRate: number | null = null;
  private landmarkerMonitorViewModel: FaceLandmarkStatsMonitor;
  private debugMode = false;

  private constructor() {
    super();

    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;

    // Example event listener for the debug triggered event
    debugListener();
    document.addEventListener('debugTriggered', this.toggleDebugMode.bind(this));
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
      this.config,
      FaceLandmarkerManager.AUTO_SEND_INTERVAL,
      (kind, count, totalBytes, totalCompressedBytes) => {
        this.landmarkerMonitorViewModel?.incrStat(kind.toLocaleLowerCase(), count);
        if (kind === ProgressKind.QUEUED) {
          this.currentSummaryPeriodCounts.posted += count;
        }
        if (kind === ProgressKind.POSTED) {
          this.currentSummaryPeriodCounts.posted += count;
          this.currentSummaryPeriodCounts.posted_bytes += totalBytes;
        }
        if (kind === ProgressKind.SKIPPED) {
          this.currentSummaryPeriodCounts.skipped += count;
          this.currentSummaryPeriodCounts.skipped_bytes += totalBytes;
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

          this.maybeRenderMonitorComponent();

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

  public queueForSend(dataPoint: FaceLandmarkerResult, timestamp: DOMHighResTimeStamp) {
    this.datapointAccumulator.accumulateAndDebounce(dataPoint, timestamp);
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
    this._summaryTimer = setInterval(this.SendSummary.bind(this), FaceLandmarkerManager.SUMMARY_INTERVAL);

    this.SetState(FaceLandmarkerState.Running);
    // TODO: there is very likely a race condition here between us sending off the final
    // FaceLandmarker data and the user hitting "end experiment" which will trigger a page nav.
    // I think the best solution is to add plumming to CallQueue to check if it's empty, and
    // only un-disable the end experiment button when that's empty.
    ExperimentManager.IsExperimentCompleted.subscribe((/*completed: boolean*/) => {
      this.StopTracking();
    });

    this.SendLifecycleDataPoint(true);
    this.SetState(FaceLandmarkerState.Running);
  }

  public StopTracking() {
    this.SendLifecycleDataPoint(false);
    this.SetState(FaceLandmarkerState.Ended);
    this.clearSummaryTimer();
    this.stopWebcam();
    this.datapointAccumulator.stop();
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

  public SendLifecycleDataPoint(start: boolean) {
    const highResTimeMs = performance.timeOrigin + performance.now();
    const systemTimeMs = Date.now();
    const differenceMs = systemTimeMs - highResTimeMs;

    const config = start
      ? {
          maximum_send_rate_hz: this.config.MaximumSendRateHz,
          auto_send_interval_ms: FaceLandmarkerManager.AUTO_SEND_INTERVAL,
          summary_interval_ms: FaceLandmarkerManager.SUMMARY_INTERVAL,
          video_aspect_ratio: this.videoAspectRatio,
          webcam_frame_rate: this.webcamFrameRate,
          clock_skew_ms: differenceMs,
        }
      : {};
    const dataPoint = {
      kind: 'face_landmark',
      point_type: `face_landmark_lifecycle_${start ? 'start' : 'stop'}`,
      method: '',
      value: JSON.stringify(config),
      datetime: new Date(),
    };

    ExperimentManager.SendSlideDataPoint('face_landmark_summary', dataPoint, (err) => {
      if (!err) {
        console.error('datapoint error');
      }
    });
  }

  public SetState(newState: FaceLandmarkerState) {
    this.state = newState;
  }

  public maybeRenderMonitorComponent() {
    const monitorDiv = document.createElement('div');
    const componentDiv = document.createElement('face-landmark-stats-monitor');
    monitorDiv.id = 'landmarker-monitor';
    document.body.appendChild(monitorDiv);
    monitorDiv.appendChild(componentDiv);

    componentDiv.innerHTML = FaceLandmarkStatsMonitorTemplate;

    this.landmarkerMonitorViewModel = new FaceLandmarkStatsMonitor(['queued', 'skipped', 'posted', 'acknowledged']);

    knockout.applyBindings(this.landmarkerMonitorViewModel, monitorDiv);
  }

  public toggleDebugMode() {
    this.debugMode = !this.debugMode;
    document.querySelector('body').classList.toggle('debug-mode');
  }
}

export default FaceLandmarkerManager;
const getFaceLandmarkerManager = (): FaceLandmarkerManager => FaceLandmarkerManager.getInstance();
export { getFaceLandmarkerManager };
