import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { getFaceLandmarkerManager } from 'Managers/FaceLandmarkerManager';

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    frameRate: { min: 10, max: 30 },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

// TODO: more of this should be moved to FaceLandmarkManager
export class FaceLandmarkCalibrationPage {
  public videoWidth = 480;

  // let calibrationVideoTime = -1;
  public monitoringVideoTime = -1;
  public results: FaceLandmarkerResult | undefined = undefined;
  public videoConfigured = false;

  public calibrationVideoEl: HTMLVideoElement;
  public canvasElement: HTMLCanvasElement;
  public monitorVideoEl: HTMLVideoElement;
  public enableWebcamButton: HTMLButtonElement;

  private predictWebcamBoundFunction: (timestamp: DOMHighResTimeStamp) => void;

  private predictionLoopCallbackId: number | null = null;

  public dataCallback: (
    result: FaceLandmarkerResult,
    timestamp: DOMHighResTimeStamp,
    analyzeDuration: DOMHighResTimeStamp,
    frameSkew: DOMHighResTimeStamp,
  ) => void;

  constructor(webcamId: string = 'webcam', outputCanvasId: string = 'output_canvas', monitorVideoId: string = 'video') {
    this.calibrationVideoEl = document.getElementById(webcamId) as HTMLVideoElement;
    this.canvasElement = document.getElementById(outputCanvasId) as HTMLCanvasElement;
    this.monitorVideoEl = document.createElement(monitorVideoId) as HTMLVideoElement;

    this.predictWebcamBoundFunction = this.predictWebcam.bind(this);
  }

  // Enable the live webcam view and start detection.
  enableCam(_event) {
    if (!getFaceLandmarkerManager().faceLandmarker) {
      console.log('Wait! faceLandmarker not loaded yet.');
      return;
    }

    if (getFaceLandmarkerManager().webcamIsRunning()) {
      getFaceLandmarkerManager().stopWebcam();
      this.videoConfigured = false;
      // this.enableWebcamButton.innerText = 'ENABLE PREDICTIONS';
    } else {
      getFaceLandmarkerManager().startWebcam();
      // this.enableWebcamButton.innerText = 'DISABLE PREDICTIONS';
    }

    // Activate the webcam stream.
    $('.initialCalibrationVideoFeed').addClass('enabled');
    navigator.mediaDevices
      .getUserMedia(CONSTRAINTS)
      .then(async (stream) => {
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const frameRate = settings.frameRate;

        try {
          if (this.calibrationVideoEl) {
            const ratio = await this.configureCalibrationVideoElement(stream);
            getFaceLandmarkerManager().videoAspectRatio = ratio;
            getFaceLandmarkerManager().webcamFrameRate = frameRate;
            console.log(`navigator.mediaDevices.getUserMedia: ratio:${ratio} framerate:${frameRate}`);
          }
          await this.configureMonitorVideoElement(stream);
          this.ShowCalibrationPoint();

          getFaceLandmarkerManager().StartTracking();

          // kick off the prediction loop
          await this.predictWebcam();
        } catch (e) {
          console.log('navigator.mediaDevices.getUserMedia error: ', e.message, e.name);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  private configureCalibrationVideoElement(stream: MediaStream): Promise<number | null> {
    this.calibrationVideoEl.srcObject = stream;
    return new Promise<number | null>((resolve, reject) => {
      this.calibrationVideoEl.addEventListener(
        'loadeddata',
        () => {
          let ratio = 1.0;

          if (this.calibrationVideoEl) {
            ratio = this.calibrationVideoEl.videoHeight / this.calibrationVideoEl.videoWidth;
            this.calibrationVideoEl.style.width = this.videoWidth + 'px';
            this.calibrationVideoEl.style.height = this.videoWidth * ratio + 'px';
            (this.calibrationVideoEl.parentNode as HTMLDivElement).style.width = this.videoWidth + 'px';
            (this.calibrationVideoEl.parentNode as HTMLDivElement).style.height = this.videoWidth * ratio + 'px';

            if (this.canvasElement) {
              this.canvasElement.style.width = this.videoWidth + 'px';
              this.canvasElement.style.height = this.videoWidth * ratio + 'px';
              this.canvasElement.width = this.calibrationVideoEl.videoWidth;
              this.canvasElement.height = this.calibrationVideoEl.videoHeight;
            }
            resolve(ratio);
          } else {
            reject(null);
          }
        },
        { once: true },
      );
    });
  }

  private configureMonitorVideoElement(stream: MediaStream) {
    this.monitorVideoEl.srcObject = stream;
    const loadedVideoDataPromise = new Promise((resolve, reject) => {
      this.monitorVideoEl.addEventListener('loadeddata', async () => {
        if (!getFaceLandmarkerManager().videoAspectRatio) {
          return reject("Can't get video ratio");
        }

        this.monitorVideoEl.style.width = this.videoWidth + 'px';
        this.monitorVideoEl.style.height = this.videoWidth * getFaceLandmarkerManager().videoAspectRatio + 'px';

        this.videoConfigured = true;

        console.log('video configured');

        // Now let's start detecting the stream.
        if (getFaceLandmarkerManager().runningMode === 'IMAGE') {
          getFaceLandmarkerManager().runningMode = 'VIDEO';
          await getFaceLandmarkerManager().faceLandmarker.setOptions({
            runningMode: getFaceLandmarkerManager().runningMode,
          });
        }

        resolve(this.videoConfigured);
      });
    });

    this.monitorVideoEl.play();

    return loadedVideoDataPromise;
  }

  async predictWebcam(timestamp: DOMHighResTimeStamp = 0, metadata?: { mediaTime: number }) {
    if (!this.videoConfigured) {
      throw new Error('No video configured!');
    }

    let results = undefined;

    const startTimeMs = performance.now();
    const currentVideoTime = metadata?.mediaTime || this.monitorVideoEl.currentTime;

    if (this.monitoringVideoTime !== currentVideoTime) {
      this.monitoringVideoTime = currentVideoTime;
      results = getFaceLandmarkerManager().faceLandmarker.detectForVideo(this.monitorVideoEl, startTimeMs);
    }

    if (results) {
      const landmarkerAnalyzeDuration = performance.now() - startTimeMs;
      // console.log('landmarkerAnalyzeDuration %o %o', timestamp, landmarkerAnalyzeDuration);
      this.dataCallback(results, timestamp, landmarkerAnalyzeDuration, startTimeMs - timestamp);
    }

    this.ensurePredictionLoop();
  }

  public ensurePredictionLoop() {
    if (this.predictionLoopCallbackId) return;

    // Call this function again to keep predicting when the browser is ready.
    if (getFaceLandmarkerManager().webcamIsRunning()) {
      if ('requestVideoFrameCallback' in this.monitorVideoEl) {
        this.predictionLoopCallbackId = this.monitorVideoEl.requestVideoFrameCallback(
          (timestamp: DOMHighResTimeStamp) => {
            this.predictionLoopCallbackId = null;
            this.predictWebcamBoundFunction(timestamp);
          },
        );
      } else {
        this.predictionLoopCallbackId = window.requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
          this.predictionLoopCallbackId = null;
          this.predictWebcamBoundFunction(timestamp);
        });
      }
    }
  }

  public async runCalibration(
    DrawingUtils,
    dataCallback: (result: FaceLandmarkerResult, timestamp: DOMHighResTimeStamp) => void,
  ) {
    this.dataCallback = dataCallback;

    /********************************************************************
     // Demo 2: Continuously grab image from webcam stream and detect it.
     ********************************************************************/

    this.monitorVideoEl.setAttribute(
      'width',
      String(((CONSTRAINTS.video as MediaTrackConstraints).width as ConstrainULongRange).ideal),
    );
    this.monitorVideoEl.setAttribute(
      'height',
      String(((CONSTRAINTS.video as MediaTrackConstraints).height as ConstrainULongRange).ideal),
    );
    this.monitorVideoEl.style.visibility = 'hidden';
    this.monitorVideoEl.style.position = 'absolute';
    this.monitorVideoEl.style.zIndex = '-1';
    this.monitorVideoEl.style.top = '0';
    this.monitorVideoEl.style.left = '0';

    document.body.appendChild(this.monitorVideoEl);

    // Check if webcam access is supported.
    function hasGetUserMedia() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // If webcam supported, add event listener to button for when user
    // wants to activate it.
    if (hasGetUserMedia()) {
      this.enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
      this.enableWebcamButton.addEventListener('click', this.enableCam.bind(this));
    } else {
      console.warn('getUserMedia() is not supported by your browser');
    }
  }

  public async startPrediction(
    DrawingUtils,
    dataCallback: (result: FaceLandmarkerResult, timestamp: DOMHighResTimeStamp) => void,
  ) {
    this.dataCallback = dataCallback;

    this.monitorVideoEl.setAttribute(
      'width',
      String(((CONSTRAINTS.video as MediaTrackConstraints).width as ConstrainULongRange).ideal),
    );
    this.monitorVideoEl.setAttribute(
      'height',
      String(((CONSTRAINTS.video as MediaTrackConstraints).height as ConstrainULongRange).ideal),
    );
    this.monitorVideoEl.style.visibility = 'hidden';
    this.monitorVideoEl.style.position = 'absolute';
    this.monitorVideoEl.style.zIndex = '-1';
    this.monitorVideoEl.style.top = '0';
    this.monitorVideoEl.style.left = '0';

    document.body.appendChild(this.monitorVideoEl);
  }

  // Check if webcam access is supported.
  public hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private ShowCalibrationPoint() {
    $('.Calibration').show();
    $('#Pt5').hide(); // initially hides the middle button
  }
}

export default (
  DrawingUtils: any,
  dataCallback: (result: FaceLandmarkerResult, timestamp: DOMHighResTimeStamp) => void,
) => {
  console.log('FaceLandmarkCalibrationPage init');
  const faceLandmarkCalibrationPage: FaceLandmarkCalibrationPage = new FaceLandmarkCalibrationPage();

  faceLandmarkCalibrationPage.runCalibration(DrawingUtils, dataCallback);
};
