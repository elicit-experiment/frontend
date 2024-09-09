import { FaceLandmarker, FaceLandmarkerOptions, FaceLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision';

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    frameRate: { min: 10, max: 30 },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

class FaceLandmarkCalibrationPage {
  public faceLandmarker: FaceLandmarker;
  public runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE';
  public videoWidth = 480;

  public webcamRunning = false;
  // let calibrationVideoTime = -1;
  public monitoringVideoTime = -1;
  public results: FaceLandmarkerResult | undefined = undefined;
  public videoConfigured = false;

  public calibrationVideoEl: HTMLVideoElement;
  public canvasElement: HTMLCanvasElement;
  public monitorVideoEl: HTMLVideoElement;
  public enableWebcamButton: HTMLButtonElement;

  public dataCallback: (FaceLandmarkerResult) => void;

  constructor() {
    this.calibrationVideoEl = document.getElementById('webcam') as HTMLVideoElement;
    this.canvasElement = document.getElementById('output_canvas') as HTMLCanvasElement;
    this.monitorVideoEl = document.createElement('video');
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

  // When an image is clicked, let's detect it and display results!
  async handleClick(event) {
    if (!this.faceLandmarker) {
      console.log('Wait for faceLandmarker to load before clicking!');
      return;
    }

    if (this.runningMode === 'VIDEO') {
      this.runningMode = 'IMAGE';
      await this.faceLandmarker.setOptions({ runningMode: this.runningMode });
    }
    // Remove all landmarks drawed before
    const allCanvas = event.target.parentNode.getElementsByClassName('canvas');
    for (let i = allCanvas.length - 1; i >= 0; i--) {
      const n = allCanvas[i];
      n.parentNode.removeChild(n);
    }

    // We can call faceLandmarker.detect as many times as we like with
    // different image data each time. This returns a promise
    // which we wait to complete and then call a function to
    // print out the results of the prediction.
    const _faceLandmarkerResult = this.faceLandmarker.detect(event.target);
    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    canvas.setAttribute('class', 'canvas');
    canvas.setAttribute('width', event.target.naturalWidth + 'px');
    canvas.setAttribute('height', event.target.naturalHeight + 'px');
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.style.width = `${event.target.width}px`;
    canvas.style.height = `${event.target.height}px`;

    event.target.parentNode.appendChild(canvas);
  }

  // Enable the live webcam view and start detection.
  enableCam(_event) {
    if (!this.faceLandmarker) {
      console.log('Wait! faceLandmarker not loaded yet.');
      return;
    }

    if (this.webcamRunning === true) {
      this.webcamRunning = false;
      this.videoConfigured = false;
      // this.enableWebcamButton.innerText = 'ENABLE PREDICTIONS';
    } else {
      this.webcamRunning = true;
      // this.enableWebcamButton.innerText = 'DISABLE PREDICTIONS';
    }

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(CONSTRAINTS).then((stream) => {
      if (this.calibrationVideoEl) {
        this.calibrationVideoEl.srcObject = stream;
        this.calibrationVideoEl.addEventListener('loadeddata', this.predictWebcam.bind(this));
      }
      this.monitorVideoEl.srcObject = stream;
      this.monitorVideoEl.addEventListener('loadeddata', this.predictWebcam.bind(this));
      this.monitorVideoEl.play();

      this.ShowCalibrationPoint();
    });
  }

  async predictWebcam() {
    if (!this.videoConfigured) {
      let ratio = 1.0;

      if (this.calibrationVideoEl) {
        ratio = this.calibrationVideoEl.videoHeight / this.calibrationVideoEl.videoWidth;
        this.calibrationVideoEl.style.width = this.videoWidth + 'px';
        this.calibrationVideoEl.style.height = this.videoWidth * ratio + 'px';

        if (this.canvasElement) {
          this.canvasElement.style.width = this.videoWidth + 'px';
          this.canvasElement.style.height = this.videoWidth * ratio + 'px';
          this.canvasElement.width = this.calibrationVideoEl.videoWidth;
          this.canvasElement.height = this.calibrationVideoEl.videoHeight;
        }
      }
      this.monitorVideoEl.style.width = this.videoWidth + 'px';
      this.monitorVideoEl.style.height = this.videoWidth * ratio + 'px';

      this.videoConfigured = true;

      // Now let's start detecting the stream.
      if (this.runningMode === 'IMAGE') {
        this.runningMode = 'VIDEO';
        await this.faceLandmarker.setOptions({ runningMode: this.runningMode });
      }
    }

    let results = undefined;

    const startTimeMs = performance.now();
    //console.log(`startTimeMs: ${calibrationVideoTime}ms ${monitorVideoEl.currentTime}`);
    //if (monitorVideoEl.currentTime - monitoringVideoTime > 1.0 / 30) {
    if (this.monitoringVideoTime !== this.monitorVideoEl.currentTime) {
      this.monitoringVideoTime = this.monitorVideoEl.currentTime;
      results = this.faceLandmarker.detectForVideo(this.monitorVideoEl, startTimeMs);
    }
    //if (calibrationVideoEl.currentTime - calibrationVideoTime > 1.0 / 30) {
    // if (monitoringVideoTime !== calibrationVideoEl.currentTime) {
    //   calibrationVideoTime = calibrationVideoEl.currentTime;
    //   results = faceLandmarker.detectForVideo(calibrationVideoEl, startTimeMs);
    // }

    if (results) {
      this.dataCallback(results);
    }

    // Call this function again to keep predicting when the browser is ready.
    //console.dir(webcamRunning);
    if (this.webcamRunning === true) {
      window.requestAnimationFrame(this.predictWebcam.bind(this));
    }
  }

  public async runCalibration(dataCallback: (FaceLandmarkerResult) => void) {
    this.dataCallback = dataCallback;

    /********************************************************************
     // Demo 1: Grab a bunch of images from the page and detection them
     // upon click.
     ********************************************************************/

    // In this demo, we have put all our clickable images in divs with the
    // CSS class 'detectionOnClick'. Lets get all the elements that have
    // this class.
    const imageContainers = document.getElementsByClassName('detectOnClick');

    // Now let's go through all of these and add a click event listener.
    Array.from(imageContainers).forEach((imageContainer) => {
      // Add event listener to the child element which is the img element.
      imageContainer.children[0].addEventListener('click', this.handleClick.bind(this));
    });

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
    document.body.appendChild(this.monitorVideoEl);

    // const canvasElement2 = document.getElementById('output_canvas') as HTMLCanvasElement;
    // const drawingContext2 = canvasElement2.getContext('2d');
    // const drawingContext = this.canvasElement.getContext('2d');
    //const drawingUtils = new DrawingUtils(drawingContext);

    // Check if webcam access is supported.
    function hasGetUserMedia() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // If webcam supported, add event listener to button for when user
    // wants to activate it.
    if (hasGetUserMedia()) {
      // this.enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
      // this.enableWebcamButton.addEventListener('click', this.enableCam);

      setTimeout((event) => this.enableCam(event), 0.3);
    } else {
      console.warn('getUserMedia() is not supported by your browser');
    }
  }

  private ShowCalibrationPoint() {
    $('.Calibration').show();
    $('#Pt5').hide(); // initially hides the middle button
  }
}

export default async (
  FaceLandmarkerClass: typeof FaceLandmarker,
  FilesetResolverClass: typeof FilesetResolver,
  DrawingUtils: any,
  options: FaceLandmarkerOptions,
  dataCallback: (FaceLandmarkerResult) => void,
) => {
  const faceLandmarkCalibrationPage: FaceLandmarkCalibrationPage = new FaceLandmarkCalibrationPage();

  return await faceLandmarkCalibrationPage
    .createFaceLandmarker(FaceLandmarkerClass, FilesetResolverClass, options)
    .then(() => faceLandmarkCalibrationPage.runCalibration(dataCallback));
};
