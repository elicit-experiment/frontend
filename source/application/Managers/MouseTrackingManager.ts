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

    ExperimentManager.IsExperimentCompleted.subscribe((completed: boolean) => {});
  }

  public StopTracking() {
    this.clearAutoSendTimer();
    console.log(`Sending final ${this.pointIndex} points`);
    if (this.pointIndex > 0) {
      this.SendAllPoints();
    }
  }

  public ProcessPoint(point: MouseTrackingRow, clock_ms: number) {
    const nextPointIndex = (1 + this.pointIndex) % MouseTrackingManager.POINT_BUFFER_SIZE;

    // const timeStamp = new Date();

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
    function getCookie(key: string) {
      const keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
      return keyValue ? keyValue[2] : null;
    }

    if (!this.sessionGuid) {
      this.sessionGuid = getCookie('session_guid');
    }

    const seriesType = 'mouse';
    const seriesSummaryType = 'mouse_summary';

    const postMouseTsv = () =>
      new Promise((resolve, reject) => {
        let tsv = MouseTrackingManager.MOUSEMOVEMENT_HEADERS.join('\t') + '\n';

        // TODO: ideally we would generate a separate stream of points to send, already in the CSV format.
        // There wasn't enough time to do it in the Feb 2019 timeframe, but since the post-as-file is so much
        // faster it makes sense to transition away from the "points" datastructure to one that mirrors the rows.
        for (const point of pointsToSend) {
          const pointToRow = (header: string) =>
            // @ts-ignore TS7053
            Object.prototype.toString.call(point[header]) === '[object Date]' ? point[header].toJSON() : point[header];
          tsv += MouseTrackingManager.MOUSEMOVEMENT_HEADERS.map(pointToRow).join('\t') + '\n';
        }
        postTimeSeriesAsFile(tsv, seriesType, this.sessionGuid)
          .then((json) => resolve(json))
          .catch((err) => reject(err));
      });

    const postMouseJSON = () =>
      new Promise((resolve, reject) => {
        const body = { sessionGUID: this.sessionGuid, points: pointsToSend };

        postTimeSeriesAsJson(body, seriesType)
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

    const batchMessage = `${seriesType} ${pointsToSend.length} points spanning ${span}ms starting at ${startTime}`;

    const dataPoint = {
      kind: seriesType,
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
        postMouseTsv()
          .then(() => {
            console.log(`upload ${batchTimeStamp} ${batchMessage} success`);
            dataPoint.value = JSON.stringify(dataPointValue);
            ExperimentManager.SendSlideDataPoint(seriesSummaryType, dataPoint, (err) => {
              if (!err) {
                console.error('datapoint error');
              }
            });
            resolve(true);
          })
          .catch((err) => {
            console.error(`upload ${batchTimeStamp} ${batchMessage} upload failed due to ${err}`);
            dataPointValue.status = err.toString();
            dataPoint.value = JSON.stringify(dataPointValue);
            ExperimentManager.SendSlideDataPoint(seriesSummaryType, dataPoint, (err) => {
              if (!err) {
                console.error('datapoint error');
              }
            });
            reject(/* fatal: */ false);
          });
      });

    return ExperimentManager.CallOnQueue('mousemovement', queueCaller);
  }
}

export default MouseTrackingManager;
