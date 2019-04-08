import webgazer = require("webgazer");
import Configuration = require("Managers/Configuration");
import DisposableComponent = require("Components/DisposableComponent");
import ExperimentManager = require("Managers/Portal/Experiment");
import knockout = require("knockout");
import EndOfExperiment = require("../Components/Questions/EndOfExperiment/EndOfExperiment");

enum WebGazerState {
    NotStarted,
    Started,
    Calibrating,
    Running,
    Ended
}

class WebGazerManager extends DisposableComponent {
    constructor() {
        super();
    }

    static POINT_BUFFER_SIZE: number = 1000;
    static AUTO_SEND_INTERVAL: number = 3000;
    public static unloadListener = (event: any) => {
        // Cancel the event as stated by the standard.
        event.preventDefault();
        event.returnValue = "You must complete the experiment without refreshing or going back to get credit!";
        //			const confirmed = window.confirm(event.returnValue);
        //			return confirmed;
        // Chrome requires returnValue to be set.
        return event.returnValue;
    }
    public getUnloadListener() : (event:any) => void { return WebGazerManager.unloadListener; };

    public currentPoint = knockout.observable({});
    public state = WebGazerState.NotStarted;
    public pointIndex: number = 0;
    public points: Array<any> = new Array<any>(WebGazerManager.POINT_BUFFER_SIZE);
    public sessionGuid: string;

    public _autoSendTimer: number = null;

    public VIDEO_ELEMENTS = ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox', 'webgazerGazeDot'];

    // must match order in v6/time_series_controller.rb
    static WEBGAZER_HEADERS = ['event', 'x', 'y', 'clock_ms', 'timeStamp',
        'left_image_x', 'left_image_y',
        'left_width', 'left_height',
        'right_image_x', 'right_image_y',
        'right_width', 'right_height'];


    public Ready(): boolean {
        return webgazer ? webgazer.isReady() : false;
    }

    public Init(): Promise<void> {
        const self = this;

        // Set up the webgazer video feedback.
        var setupVideoCanvas = function () {
            // Set up the main canvas. The main canvas is used to calibrate the webgazer.
            var canvas = <HTMLCanvasElement>document.getElementById("plotting_canvas");
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                canvas.style.position = 'fixed';
            }
        };

        const testPointsUpload = () => new Promise<void>((resolve, reject) => {
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
                    console.log(`resolve after ${callCount}`);
                    resolve();
                })
                .catch((x) => reject(x));
        });

        return new Promise<void>((resolve, reject) => {
            self.Start()
                .then(setupVideoCanvas)
                .then(testPointsUpload)
                .then(() => resolve())
                .catch((x) => reject(x));
        });
    }

    public Start() {
        const self = this;
        delete localStorage.webgazerGlobalData;

        return new Promise<void>((resolve) => {
            //start the webgazer tracker
            webgazer
                .setRegression('ridge') /* currently must set regression and tracker */
                .setTracker('clmtrackr')
                .setGazeListener((data: any, clock: number) => self.ProcessPoint(data, clock))
                .begin();

            function checkIfReady() {
                if (webgazer.isReady()) {
                    self.state = WebGazerState.Started;
                    resolve();
                } else {
                    setTimeout(checkIfReady, 100);
                }
            }

            setTimeout(checkIfReady, 100);
        });
    }


    public End() {
//        window.removeEventListener('beforeunload', WebGazerManager.unloadListener);

        try {
            console.log("WebGazerManager: Webgazer finit");
            this.clearAutoSendTimer();
            if (this.state === WebGazerState.Running) {
                console.log(`Sending final ${this.pointIndex} points`);
                if (this.pointIndex > 0) {
                    this.SendAllPoints();
                }
            }
            this.SetState(WebGazerState.Ended)
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
        this.VIDEO_ELEMENTS
            .map((id: string) => document.getElementById(id))
            .filter((el: HTMLElement | undefined) => !!el)
            .forEach((el: HTMLElement) => el.style.display = 'none');
    }

    public StartCalibration() {
        this.SetState(WebGazerState.Calibrating);
    }

    public ClearCalibration() {
        //this.End();

        delete localStorage.webgazerGlobalData;

        //this.Start().then(() => {});
    }

    public StartTracking() {
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

            var dataPoint;
            const timeStamp = (new Date());

            if (data && data.eyeFeatures) {
                var eyeFeatures = data.eyeFeatures;
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
                }
            } else {
                dataPoint = {
                    clock_ms: clock_ms,
                    timeStamp,
                }
            }

            this.points[this.pointIndex] = dataPoint;

            if (nextPointIndex === 0) {
                this.SendAllPoints();
            }

            this.pointIndex = nextPointIndex;
        }
        this.currentPoint({
            data: data,             /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
            clock_ms: clock_ms,        /* elapsed time in milliseconds since webgazer.begin() was called */
            timestamp: (new Date())
        })
    }

    private SendAllPoints(): void {
        const pointsToSend = this.points.slice(0, this.pointIndex);
        this.pointIndex = 0;
        this.points = new Array<any>(WebGazerManager.POINT_BUFFER_SIZE);
        this.SendPoints(pointsToSend).then((callCount)=>{console.log(`Point upload success after ${callCount}`)});
    }

    private SendPoints(pointsToSend: Array<any>): Promise<number> {
        function getCookie(key: string) {
            const keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
            return keyValue ? keyValue[2] : null;
        }

        if (!this.sessionGuid) {
            this.sessionGuid = getCookie('session_guid');
        }

        const postWebgazerTsv = () => new Promise((resolve, reject) => {
            const url = new URL('/v6/time_series/webgazer/file', Configuration.PortalPath);
            console.log(`Sending calibration points by file to ${url.href}`);
            const formData = new FormData();
            let tsv = WebGazerManager.WEBGAZER_HEADERS.join("\t") + "\n";

            // TODO: ideally we would generate a separate stream of points to send, already in the CSV format.
            // There wasn't enough time to do it in the Feb 2019 timeframe, but since the post-as-file is so much
            // faster it makes sense to transition away from the "points" datastructure to one that mirrors the rows.
            for (let point of pointsToSend) {
                const pointToRow = (header: any) => ((Object.prototype.toString.call(point[header]) === '[object Date]') ? point[header].toJSON() : point[header]);
                tsv += WebGazerManager.WEBGAZER_HEADERS.map(pointToRow).join("\t") + "\n";
            }
            formData.append('series_type', 'webgazer');
            formData.append('file', new Blob([tsv]), 'file');
            formData.append('sessionGUID', this.sessionGuid);

            fetch(url.href, {
                method: 'POST',
                mode: 'cors', // no-cors, cors, *same-origin
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include',
                body: formData
            }).then(rawResponse => {
                if (rawResponse.ok) {
                    return rawResponse;
                } else {
                    throw Error(`Request rejected with status ${rawResponse.status}`);
                }
            }).then((rawResponse) => rawResponse.json())
                .then((json) => resolve(json))
                .catch((err) => reject(err));
        })

        const postWebgazerJSON = () => new Promise((resolve, reject) => {
            const url = new URL('/v6/time_series/webgazer', Configuration.PortalPath);
            console.log(`Sending calibration points to ${url.href}`);
            fetch(url.href, {
                method: 'POST',
                //credentials: 'include', // include the sessionGUID cookie
                mode: "cors", // no-cors, cors, *same-origin
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ sessionGUID: this.sessionGuid, points: pointsToSend })
            }).then(rawResponse => {
                if (rawResponse.ok) {
                    return rawResponse;
                } else {
                    throw Error(`Request rejected with status ${rawResponse.status}`);
                }
            }).then((rawResponse) => rawResponse.json())
                .then((json) => resolve(json))
                .catch((err) => reject(err));
        })

        const batchTimeStamp = (new Date()).getTime();

        let startTime = batchTimeStamp, endTime = batchTimeStamp;
        if (pointsToSend.length > 0) {
            startTime = pointsToSend[0]['timeStamp'];
            endTime = pointsToSend[pointsToSend.length - 1]['timeStamp'];
        }
        const span = endTime - startTime

        const batchMessage = `${pointsToSend.length} points spanning ${span}ms starting at ${startTime}`;

        const dataPoint = {
            kind: 'webgazer',
            point_type: 'send_points_summary',
            method: '',
            value: '',
            datetime: new Date()
        }
        const dataPointValue = {
            numPoints: pointsToSend.length,
            spanInMs: span,
            startTime: startTime,
            endTime: endTime,
            status: 'success'
        }

        const queueCaller = () => new Promise((resolve, reject) => {
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
                    ExperimentManager.SendSlideDataPoint('webgazer', dataPoint, () => { console.log('dp success'); })
                    resolve()
                })
                .catch((err) => {
                    console.error(`upload ${batchTimeStamp} ${batchMessage} upload failed`);
                    dataPointValue.status = err.toString();
                    dataPoint.value = JSON.stringify(dataPointValue);
                    ExperimentManager.SendSlideDataPoint('webgazer', dataPoint, () => { console.log('dp fail'); })
                    reject(/* fatal: */false)
                });

        });

        return ExperimentManager.CallOnQueue('webgazer', queueCaller)
    }
}

var instance = new WebGazerManager();

export = instance;
