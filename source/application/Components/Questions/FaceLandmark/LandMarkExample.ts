import './LandmarkExample.css';
import { FaceLandmarker, FaceLandmarkerOptions, FaceLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision';
//import FaceLandmark from 'Components/Questions/FaceLandmark/FaceLandmark';

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    frameRate: { min: 10, max: 30 },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

export default (
  FaceLandmarkerClass: typeof FaceLandmarker,
  FilesetResolverClass: typeof FilesetResolver,
  DrawingUtils: any,
  options: FaceLandmarkerOptions,
  dataCallback: (FaceLandmarkerResult) => void,
) => {
  const demosSection = document.getElementById('demos');
  const imageBlendShapes = document.getElementById('image-blend-shapes');
  const videoBlendShapes = document.getElementById('video-blend-shapes');

  let faceLandmarker: FaceLandmarker;
  let runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE';
  let enableWebcamButton: HTMLButtonElement;
  let webcamRunning: boolean = false;
  const videoWidth = 480;

  // Before we can use FaceLandmarker class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment to
  // get everything needed to run.
  async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolverClass.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
    );
    faceLandmarker = await FaceLandmarkerClass.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      runningMode,
      ...options,
    });
    demosSection.classList.remove('invisible');
  }

  createFaceLandmarker().then(() => {
    console.log('createFaceLandmarker');

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
      imageContainer.children[0].addEventListener('click', handleClick);
    });

    // When an image is clicked, let's detect it and display results!
    async function handleClick(event) {
      if (!faceLandmarker) {
        console.log('Wait for faceLandmarker to load before clicking!');
        return;
      }

      if (runningMode === 'VIDEO') {
        runningMode = 'IMAGE';
        await faceLandmarker.setOptions({ runningMode });
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
      const faceLandmarkerResult = faceLandmarker.detect(event.target);
      const canvas = document.createElement('canvas') as HTMLCanvasElement;
      canvas.setAttribute('class', 'canvas');
      canvas.setAttribute('width', event.target.naturalWidth + 'px');
      canvas.setAttribute('height', event.target.naturalHeight + 'px');
      canvas.style.left = '0px';
      canvas.style.top = '0px';
      canvas.style.width = `${event.target.width}px`;
      canvas.style.height = `${event.target.height}px`;

      event.target.parentNode.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const drawingUtils = new DrawingUtils(ctx);
      for (const landmarks of faceLandmarkerResult.faceLandmarks) {
        console.dir(landmarks);
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
          color: '#C0C0C070',
          lineWidth: 1,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#FF3030' });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: '#FF3030' });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#30FF30' });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: '#30FF30' });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#E0E0E0' });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
          color: '#E0E0E0',
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: '#FF3030' });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: '#30FF30' });
      }
      drawBlendShapes(imageBlendShapes, faceLandmarkerResult.faceBlendshapes);
      debugger;
    }

    /********************************************************************
     // Demo 2: Continuously grab image from webcam stream and detect it.
     ********************************************************************/

    const calibrationVideoEl = document.getElementById('webcam') as HTMLVideoElement;
    const canvasElement = document.getElementById('output_canvas') as HTMLCanvasElement;

    const monitorVideoEl = document.createElement('video');
    monitorVideoEl.setAttribute(
      'width',
      String(((CONSTRAINTS.video as MediaTrackConstraints).width as ConstrainULongRange).ideal),
    );
    monitorVideoEl.setAttribute(
      'height',
      String(((CONSTRAINTS.video as MediaTrackConstraints).height as ConstrainULongRange).ideal),
    );
    monitorVideoEl.style.visibility = 'hidden';
    document.body.appendChild(monitorVideoEl);

    // const canvasElement2 = document.getElementById('output_canvas') as HTMLCanvasElement;
    // const drawingContext2 = canvasElement2.getContext('2d');
    const drawingContext = canvasElement.getContext('2d');
    const drawingUtils = new DrawingUtils(drawingContext);

    // Check if webcam access is supported.
    function hasGetUserMedia() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // If webcam supported, add event listener to button for when user
    // wants to activate it.
    if (hasGetUserMedia()) {
      enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
      enableWebcamButton.addEventListener('click', enableCam);
    } else {
      console.warn('getUserMedia() is not supported by your browser');
    }

    // Enable the live webcam view and start detection.
    function enableCam(event) {
      if (!faceLandmarker) {
        console.log('Wait! faceLandmarker not loaded yet.');
        return;
      }

      if (webcamRunning === true) {
        webcamRunning = false;
        videoConfigured = false;
        enableWebcamButton.innerText = 'ENABLE PREDICTIONS';
      } else {
        webcamRunning = true;
        enableWebcamButton.innerText = 'DISABLE PREDICTIONS';
      }

      // Activate the webcam stream.
      navigator.mediaDevices.getUserMedia(CONSTRAINTS).then((stream) => {
        calibrationVideoEl.srcObject = stream;
        monitorVideoEl.srcObject = stream;
        calibrationVideoEl.addEventListener('loadeddata', predictWebcam);
        monitorVideoEl.addEventListener('loadeddata', predictWebcam);
        monitorVideoEl.play();
      });
    }

    // let calibrationVideoTime = -1;
    let monitoringVideoTime = -1;
    let results: FaceLandmarkerResult | undefined = undefined;
    let videoConfigured = false;

    async function predictWebcam() {
      if (!videoConfigured) {
        const radio = calibrationVideoEl.videoHeight / calibrationVideoEl.videoWidth;
        calibrationVideoEl.style.width = videoWidth + 'px';
        calibrationVideoEl.style.height = videoWidth * radio + 'px';
        monitorVideoEl.style.width = videoWidth + 'px';
        monitorVideoEl.style.height = videoWidth * radio + 'px';
        canvasElement.style.width = videoWidth + 'px';
        canvasElement.style.height = videoWidth * radio + 'px';
        canvasElement.width = calibrationVideoEl.videoWidth;
        canvasElement.height = calibrationVideoEl.videoHeight;
        videoConfigured = true;

        // Now let's start detecting the stream.
        if (runningMode === 'IMAGE') {
          runningMode = 'VIDEO';
          await faceLandmarker.setOptions({ runningMode: runningMode });
        }
      }

      results = undefined;

      const startTimeMs = performance.now();
      //console.log(`startTimeMs: ${calibrationVideoTime}ms ${monitorVideoEl.currentTime}`);
      //if (monitorVideoEl.currentTime - monitoringVideoTime > 1.0 / 30) {
      if (monitoringVideoTime !== monitorVideoEl.currentTime) {
        monitoringVideoTime = monitorVideoEl.currentTime;
        results = faceLandmarker.detectForVideo(monitorVideoEl, startTimeMs);
      }
      //if (calibrationVideoEl.currentTime - calibrationVideoTime > 1.0 / 30) {
      // if (monitoringVideoTime !== calibrationVideoEl.currentTime) {
      //   calibrationVideoTime = calibrationVideoEl.currentTime;
      //   results = faceLandmarker.detectForVideo(calibrationVideoEl, startTimeMs);
      // }

      if (results) {
        drawingContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (results?.faceLandmarks) {
          for (const landmarks of results.faceLandmarks) {
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
              color: '#C0C0C070',
              lineWidth: 1,
            });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#FF3030' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: '#FF3030' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#30FF30' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: '#30FF30' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#E0E0E0' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: '#E0E0E0' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: '#FF3030' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: '#30FF30' });
          }
        }
        drawBlendShapes(videoBlendShapes, results.faceBlendshapes);
      }

      if (results) {
        dataCallback(results);
      }

      // Call this function again to keep predicting when the browser is ready.
      //console.dir(webcamRunning);
      if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
      }
    }

    function drawBlendShapes(el: HTMLElement, blendShapes: any[]) {
      if (!blendShapes.length) {
        return;
      }

      let htmlMaker = '';
      blendShapes[0].categories.map((shape) => {
        htmlMaker += `
      <li class="blend-shapes-item">
        <span class="blend-shapes-label">${shape.displayName || shape.categoryName}</span>
        <span class="blend-shapes-value" style="width: calc(${+shape.score * 100}% - 120px)">${(+shape.score).toFixed(
          4,
        )}</span>
      </li>
    `;
      });

      el.innerHTML = htmlMaker;
    }
  });
};
