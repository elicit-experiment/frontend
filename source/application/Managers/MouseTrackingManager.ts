import DisposableComponent from 'Components/DisposableComponent';
import ExperimentManager from 'Managers/Portal/Experiment';
import PortalClient from 'PortalClient';
import { postTimeSeriesAsJson, postTimeSeriesAsFile } from 'Utility/TimeSeries';

interface IMouseTrackingRow {
  x: number;
  y: number;
  timeStamp: number;
}

type MouseTrackingRow = Required<IMouseTrackingRow>;

type ChaosDataPoint = {
  kind: string;
  point_type: string;
  method: string;
  value: string;
  datetime: Date;
};

type MouseTrackingSummaryValuePayload = {
  numPoints: number;
  spanInMs: number;
  startTime: number;
  endTime: number;
  status: string;
};

class MouseTrackingManager extends DisposableComponent {
  private constructor() {
    super();

    const serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    this.sessionGuid = serviceCaller.GetCurrentSession().Guid;
  }
  private static _instance: MouseTrackingManager;

  static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
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
    return MouseTrackingManager.unloadListener;
  }

  public pointIndex = 0;
  public points: Array<MouseTrackingRow> = new Array<MouseTrackingRow>(MouseTrackingManager.POINT_BUFFER_SIZE);
  public sessionGuid: string;

  public _autoSendTimer: number = null;

  // must match order in v6/time_series_controller.rb
  static MOUSEMOVEMENT_HEADERS = ['x', 'y', 'timeStamp'];

  static MOUSE_SERIES_TYPE = 'mouse';

  private clearAutoSendTimer() {
    if (this._autoSendTimer) {
      clearInterval(this._autoSendTimer);
      this._autoSendTimer = null;
    }
  }

  public StartTracking() {
    console.log('MouseTrackingManager: Start Tracking');
    this.clearAutoSendTimer();

    setInterval(this.SendAllPoints.bind(this), MouseTrackingManager.AUTO_SEND_INTERVAL);

    ExperimentManager.IsExperimentCompleted.subscribe((/*completed: boolean*/) => {});

    const config = {
      window_width: window.innerWidth,
      window_height: window.innerHeight,
    };

    const dataPoint: ChaosDataPoint = {
      kind: MouseTrackingManager.MOUSE_SERIES_TYPE,
      point_type: 'mouse_tracking_lifecycle_start',
      method: '',
      value: JSON.stringify(config),
      datetime: new Date(),
    };

    this.postDataPoint(dataPoint, 'mouse_lifecycle_start', 'success');
  }

  public StopTracking() {
    const dataPoint: ChaosDataPoint = {
      kind: MouseTrackingManager.MOUSE_SERIES_TYPE,
      point_type: 'mouse_tracking_lifecycle_stop',
      method: '',
      value: '',
      datetime: new Date(),
    };

    this.postDataPoint(dataPoint, 'mouse_lifecycle_stop', 'success');

    this.clearAutoSendTimer();
    console.log(`Sending final ${this.pointIndex} points`);
    if (this.pointIndex > 0) {
      this.SendAllPoints();
    }
  }

  public ProcessPoint(point: MouseTrackingRow) {
    const nextPointIndex = (1 + this.pointIndex) % MouseTrackingManager.POINT_BUFFER_SIZE;

    this.points[this.pointIndex] = point;

    if (nextPointIndex === 0) {
      this.SendAllPoints();
    }

    this.pointIndex = nextPointIndex;
  }

  private SendAllPoints(): void {
    if (this.pointIndex === 0) return;

    const pointsToSend = this.points.slice(0, this.pointIndex);
    this.pointIndex = 0;
    this.points = new Array<MouseTrackingRow>(MouseTrackingManager.POINT_BUFFER_SIZE);
    this.SendPoints(pointsToSend).then((callCount) => {
      console.log(`MouseTrackingManager: Point upload success after ${callCount}`);
    });
  }

  private SendPoints(pointsToSend: Array<MouseTrackingRow>): Promise<number> {
    this.ensureSessionAuthorization();

    const batchTimeStamp = new Date().getTime();

    let startTime = batchTimeStamp,
      endTime = batchTimeStamp;
    if (pointsToSend.length > 0) {
      startTime = pointsToSend[0]['timeStamp'];
      endTime = pointsToSend[pointsToSend.length - 1]['timeStamp'];
    }
    const span = endTime - startTime;

    const batchMessage = `${MouseTrackingManager.MOUSE_SERIES_TYPE} ${pointsToSend.length} points spanning ${span}ms starting at ${startTime}`;

    const summaryValuePayload: MouseTrackingSummaryValuePayload = {
      numPoints: pointsToSend.length,
      spanInMs: span,
      startTime: startTime,
      endTime: endTime,
      status: 'success',
    };

    const summaryDataPoint: ChaosDataPoint = {
      kind: MouseTrackingManager.MOUSE_SERIES_TYPE,
      point_type: 'send_points_summary',
      method: '',
      value: JSON.stringify(summaryValuePayload),
      datetime: new Date(),
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
        this.postMouseTsv(pointsToSend)
          .then(() => {
            console.log(`upload ${batchTimeStamp} ${batchMessage} success`);
            this.postTrackingSummary(summaryDataPoint);
            resolve(true);
          })
          .catch((err) => {
            console.error(`upload ${batchTimeStamp} ${batchMessage} upload failed due to ${err}`);
            this.postTrackingSummary(summaryDataPoint, err.toString());
            reject(/* fatal: */ false);
          });
      });

    return ExperimentManager.CallOnQueue('mousemovement', queueCaller);
  }

  private ensureSessionAuthorization() {
    function getCookie(key: string) {
      const keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
      return keyValue ? keyValue[2] : null;
    }

    if (!this.sessionGuid) {
      this.sessionGuid = getCookie('session_guid');
    }
  }

  private postTrackingSummary(dataPoint: ChaosDataPoint, status = null) {
    this.postDataPoint(dataPoint, 'mouse_summary', status);
  }

  private postDataPoint(dataPoint: ChaosDataPoint, seriesType: string, status: string = null) {
    if (status) {
      dataPoint.method = status;
    }
    ExperimentManager.SendSlideDataPoint(seriesType, dataPoint, (err) => {
      if (!err) {
        console.error('datapoint error');
      }
    });
  }

  postMouseJSON(pointsToSend: Array<MouseTrackingRow>, seriesType = MouseTrackingManager.MOUSE_SERIES_TYPE) {
    return new Promise((resolve, reject) => {
      const body = { sessionGUID: this.sessionGuid, points: pointsToSend };

      postTimeSeriesAsJson(body, seriesType)
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    });
  }

  postMouseTsv(pointsToSend: Array<MouseTrackingRow>) {
    return new Promise((resolve, reject) => {
      let tsv = MouseTrackingManager.MOUSEMOVEMENT_HEADERS.join('\t') + '\n';

      // TODO: ideally we would generate a separate stream of points to send, already in the CSV format.
      // There wasn't enough time to do it in the Feb 2019 timeframe, but since the post-as-file is so much
      // faster it makes sense to transition away from the "points" datastructure to one that mirrors the rows.
      for (const point of pointsToSend) {
        const pointToRow = (header: string) =>
          Object.prototype.toString.call(point[header]) === '[object Date]' ? point[header].toJSON() : point[header];
        tsv += MouseTrackingManager.MOUSEMOVEMENT_HEADERS.map(pointToRow).join('\t') + '\n';
      }
      postTimeSeriesAsFile(tsv, MouseTrackingManager.MOUSE_SERIES_TYPE, this.sessionGuid)
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    });
  }
}

export default MouseTrackingManager;
