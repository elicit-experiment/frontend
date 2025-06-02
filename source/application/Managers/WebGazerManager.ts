import webgazer from 'webgazer';
import DisposableComponent from 'Components/DisposableComponent';
import ExperimentManager from 'Managers/Portal/Experiment';
import * as knockout from 'knockout';
import PortalClient from 'PortalClient';
import { postTimeSeriesAsJson, postTimeSeriesAsFile } from 'Utility/TimeSeries';

enum WebGazerState {
  NotStarted,
  Started,
  Calibrating,
  Running,
  Ended,
}

class WebGazerManager extends DisposableComponent {
  private constructor() {
    super();

    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }

  private static _instance: WebGazerManager;

  static get Instance(): WebGazerManager {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
  }

  public static getInstance(): WebGazerManager {
    if (!WebGazerManager._instance) {
      WebGazerManager._instance = new WebGazerManager();
    }
    return WebGazerManager._instance;
  }

  static POINT_BUFFER_SIZE = 1000;
  static AUTO_SEND_INTERVAL = 3000;
  public static unloadListener = (event: any) => {
    // Cancel the event as stated by the standard.
    event.preventDefault();
    event.returnValue = 'You must complete the experiment without refreshing or going back to get credit!';
    //			const confirmed = window.confirm(event.returnValue);
    //			return confirmed;
    // Chrome requires returnValue to be set.
    return event.returnValue;
  };
  public getUnloadListener(): (event: any) => void {
    return WebGazerManager.unloadListener;
  }

  public currentPoint = knockout.observable({});
  public state = WebGazerState.NotStarted;
  public pointIndex = 0;
  public points: Array<any> = new Array<any>(WebGazerManager.POINT_BUFFER_SIZE);
  public sessionGuid: string;

  public _autoSendTimer: number = null;

  public webgazer: typeof webgazer;

  public VIDEO_ELEMENTS = [
    'webgazerVideoFeed',
    'webgazerVideoCanvas',
    'webgazerFaceOverlay',
    'webgazerFaceFeedbackBox',
    'webgazerGazeDot',
  ];

  // must match order in v6/time_series_controller.rb
  static WEBGAZER_HEADERS = [
    'event',
    'x',
    'y',
    'clock_ms',
    'timeStamp',
    'left_image_x',
    'left_image_y',
    'left_width',
    'left_height',
    'right_image_x',
    'right_image_y',
    'right_width',
    'right_height',
  ];

  public Ready(): boolean {
    return this.webgazer ? this.webgazer.isReady() : false;
  }

  public Init(): Promise<void> {
    this.webgazer = webgazer;
    window.webgazer = webgazer;

    // Set up the webgazer video feedback.
    const setupVideoCanvas = function () {
      // Set up the main canvas. The main canvas is used to calibrate the webgazer.
      const canvas = <HTMLCanvasElement>document.getElementById('plotting_canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
      }
      console.log('Canvas setup');
    };

    const testPointsUpload = () =>
      new Promise<void>((resolve, reject) => {
        const testPoint = {
          x: 0,
          y: 0,
          clock_ms: 0,
          timeStamp: new Date(),
          left_image_x: 0,
          left_image_y: 0,
          left_width: 0,
          left_height: 0,
          right_image_x: 0,
          right_image_y: 0,
          right_width: 0,
          right_height: 0,
        };

        this.SendPoints([testPoint])
          .then((callCount) => {
            console.log(`SendPoints: resolve after ${callCount}`);
            resolve();
          })
          .catch((x) => reject(x));
      });

    return new Promise<void>((resolve, reject) => {
      this.Start()
        .then(setupVideoCanvas)
        .then(testPointsUpload)
        .then(() => resolve())
        .catch((x) => reject(x));
    });
  }

  public Start() {
    delete localStorage.webgazerGlobalData;

    return new Promise<void>((resolve) => {
      //start the webgazer tracker
      console.time('Start Webgazer');

      webgazer
        .setRegression('ridge') /* currently must set regression and tracker */
        .setTracker('TFFacemesh')
        .setGazeListener((data: any, clock: number) => this.ProcessPoint(data, clock))
        .begin();

      const checkIfReady = () => {
        if (webgazer.isReady()) {
          this.state = WebGazerState.Started;
          console.timeEnd('Start Webgazer');
          resolve();
        } else {
          setTimeout(checkIfReady, 100);
        }
      };

      setTimeout(checkIfReady, 100);
    });
  }

  public End() {
    //        window.removeEventListener('beforeunload', WebGazerManager.unloadListener);

    try {
      console.timeStamp('WebGazerManager: Webgazer finit');
      webgazer.showPredictionPoints(false);

      [
        'webgazerVideoFeed',
        'webgazerVideoCanvas',
        'webgazerFaceOverlay',
        'webgazerFaceFeedbackBox',
        'webgazerGazeDot',
      ].forEach((s) => $('#' + s).remove());

      this.clearAutoSendTimer();
      if (this.state === WebGazerState.Running) {
        console.log(`Sending final ${this.pointIndex} points`);
        if (this.pointIndex > 0) {
          this.SendAllPoints();
        }
      }
      this.SetState(WebGazerState.Ended);
      webgazer.end();
    } catch (e) {
      console.error(e);
    }
  }

  private clearAutoSendTimer() {
    if (this._autoSendTimer) {
      clearInterval(this._autoSendTimer);
      this._autoSendTimer = null;
    }
  }

  public HideCalibrationElements() {
    this.VIDEO_ELEMENTS.map((id: string) => document.getElementById(id))
      .filter((el: HTMLElement | undefined) => !!el)
      .forEach((el: HTMLElement) => (el.style.display = 'none'));
  }

  public StartCalibration() {
    this.SetState(WebGazerState.Calibrating);
  }

  public RestartCalibration() {
    console.timeStamp('WebGazerManager: Restart Calibration');
    this.End();

    this.ClearCalibration();

    return this.Start();
  }

  public ClearCalibration() {
    console.timeStamp('WebGazerManager: Clear Calibration');
    // compare with:
    // webgazer.clearData();
    window.localStorage.setItem('webgazerGlobalData', undefined);
    const regs = webgazer.getRegression();
    for (const reg in regs) {
      regs[reg].setData([]); // This is in the webgazer code but actually wont work
    }
    if (regs && regs[0]) {
      regs[0] = new webgazer.reg.RidgeWeightedReg();
    }
  }

  public StartTracking() {
    console.log('WebGazerManager: Start Tracking');
    this.clearAutoSendTimer();

    setInterval(this.SendAllPoints.bind(this), WebGazerManager.AUTO_SEND_INTERVAL);

    this.SetState(WebGazerState.Running);
    // TODO: there is very likely a race condition here between us sending off the final
    // webgazer data and the user hitting "end experiment" which will trigger a page nav.
    // I think the best solution is to add plubbing to CallQueue to check if it's empty, and
    // only un-disable the end experiment button when that's empty.
    ExperimentManager.IsExperimentCompleted.subscribe((completed: boolean) => {
      this.End();
    });

    // Moved to Portal
    //window.addEventListener('beforeunload', WebGazerManager.unloadListener);
  }

  public SetState(newState: WebGazerState) {
    if (newState === WebGazerState.Calibrating) {
      webgazer.showPredictionPoints(true); /* shows a square every 100 milliseconds where current prediction is */
    } else if (newState === WebGazerState.Running) {
      webgazer.showPredictionPoints(false);
    }
    this.state = newState;
  }

  public ProcessPoint(data: any, clock_ms: number) {
    if (this.state == WebGazerState.Running) {
      const nextPointIndex = (1 + this.pointIndex) % WebGazerManager.POINT_BUFFER_SIZE;

      let dataPoint;
      const timeStamp = new Date();

      if (data && data.eyeFeatures) {
        const eyeFeatures = data.eyeFeatures;
        dataPoint = {
          x: data.x,
          y: data.y,
          clock_ms: clock_ms,
          timeStamp,
          left_image_x: eyeFeatures.left.imagex,
          left_image_y: eyeFeatures.left.imagey,
          left_width: eyeFeatures.left.width,
          left_height: eyeFeatures.left.height,
          right_image_x: eyeFeatures.right.imagex,
          right_image_y: eyeFeatures.right.imagey,
          right_width: eyeFeatures.right.width,
          right_height: eyeFeatures.right.height,
        };
      } else {
        dataPoint = {
          clock_ms: clock_ms,
          timeStamp,
        };
      }

      this.points[this.pointIndex] = dataPoint;

      if (nextPointIndex === 0) {
        this.SendAllPoints();
      }

      this.pointIndex = nextPointIndex;
    }
    this.currentPoint({
      data: data /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */,
      clock_ms: clock_ms /* elapsed time in milliseconds since webgazer.begin() was called */,
      timestamp: new Date(),
    });
  }

  private SendAllPoints(): void {
    const pointsToSend = this.points.slice(0, this.pointIndex);
    this.pointIndex = 0;
    this.points = new Array<any>(WebGazerManager.POINT_BUFFER_SIZE);
    this.SendPoints(pointsToSend).then((callCount) => {
      console.log(`WebGazerManager: Point upload success after ${callCount}`);
    });
  }

  private SendPoints(pointsToSend: Array<any>): Promise<number> {
    function getCookie(key: string) {
      const keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
      return keyValue ? keyValue[2] : null;
    }

    if (!this.sessionGuid) {
      this.sessionGuid = getCookie('session_guid');
    }

    const postWebgazerTsv = () =>
      new Promise((resolve, reject) => {
        let tsv = WebGazerManager.WEBGAZER_HEADERS.join('\t') + '\n';

        // TODO: ideally we would generate a separate stream of points to send, already in the CSV format.
        // There wasn't enough time to do it in the Feb 2019 timeframe, but since the post-as-file is so much
        // faster it makes sense to transition away from the "points" datastructure to one that mirrors the rows.
        for (const point of pointsToSend) {
          const pointToRow = (header: any) =>
            Object.prototype.toString.call(point[header]) === '[object Date]' ? point[header].toJSON() : point[header];
          tsv += WebGazerManager.WEBGAZER_HEADERS.map(pointToRow).join('\t') + '\n';
        }

        postTimeSeriesAsFile(tsv, 'webgazer', this.sessionGuid)
          .then((json) => resolve(json))
          .catch((err) => reject(err));
      });

    const postWebgazerJSON = () =>
      new Promise((resolve, reject) => {
        postTimeSeriesAsJson({ sessionGUID: this.sessionGuid, points: pointsToSend }, 'webgazer')
          .then((json) => resolve(json))
          .catch((err) => reject(err));
      });

    const batchTimeStamp = new Date().getTime();

    let startTime = batchTimeStamp,
      endTime = batchTimeStamp;
    if (pointsToSend.length > 0) {
      startTime = pointsToSend[0]['timeStamp'];
      endTime = pointsToSend[pointsToSend.length - 1]['timeStamp'];
    }
    const span = endTime - startTime;

    const batchMessage = `${pointsToSend.length} points spanning ${span}ms starting at ${startTime}`;

    const dataPoint = {
      kind: 'webgazer',
      point_type: 'send_points_summary',
      method: '',
      value: '',
      datetime: new Date(),
    };
    const dataPointValue = {
      numPoints: pointsToSend.length,
      spanInMs: span,
      startTime: startTime,
      endTime: endTime,
      status: 'success',
    };

    const queueCaller = () =>
      new Promise((resolve, reject) => {
        // Test both:
        /*
                    postWebgazerJSON()
                        .then(() => postWebgazerTsv())
                        .then(() => console.log('Success'))
                        .catch((err) => console.error(err));
                        */

        /*
            if (Math.random() > 0.5) {
                console.warn(`faking error in points upload for ${batchTimeStamp}...`);
                reject(true);
                return;
            }
            */
        postWebgazerTsv()
          .then(() => {
            console.log(`upload ${batchTimeStamp} ${batchMessage} success`);
            dataPoint.value = JSON.stringify(dataPointValue);
            ExperimentManager.SendSlideDataPoint('webgazer', dataPoint, () => {});
            resolve(true);
          })
          .catch((err) => {
            console.error(`upload ${batchTimeStamp} ${batchMessage} upload failed`);
            dataPointValue.status = err.toString();
            dataPoint.value = JSON.stringify(dataPointValue);
            ExperimentManager.SendSlideDataPoint('webgazer', dataPoint, () => {
              console.log('dp fail');
            });
            reject(/* fatal: */ false);
          });
      });

    return ExperimentManager.CallOnQueue('webgazer', queueCaller);
  }
}

export default WebGazerManager;
const getInstance = (): WebGazerManager => WebGazerManager.getInstance();
export { getInstance };
