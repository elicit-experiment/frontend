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

    public currentPoint = knockout.observable({});
    public state = WebGazerState.NotStarted;
    public pointIndex: number = 0;
    public points: Array<any> = new Array<any>(WebGazerManager.POINT_BUFFER_SIZE);
    public sessionGuid: string;

    public VIDEO_ELEMENTS = ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox', 'webgazerGazeDot'];

    // must match order in v6/time_series_controller.rb
    static WEBGAZER_HEADERS = ['event', 'x', 'y', 'clock_ms', 'timeStamp',
        'left_image_x', 'left_image_y',
        'left_width', 'left_height',
        'right_image_x', 'right_image_y',
        'right_width', 'right_height']


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

        return new Promise<void>((resolve) => {
            self.Start().then(setupVideoCanvas).then(resolve);
        });
    }

    public Start() {
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
        try {
            console.log("Webgazer finit")
            if (this.state === WebGazerState.Running) {
                console.log(`Sending final ${this.pointIndex} points`);
                if (this.pointIndex > 0) {
                    this.SendPoints(this.points.slice(0, this.pointIndex));
                }
            }
            this.SetState(WebGazerState.Ended)
            webgazer.end();
        } catch (e) {
            console.error(e);
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
        this.End();

        // TODO: this is too aggressive; we should just kill the webgazer localstoarage
        window.localStorage.clear();

        this.Start().then(() => {});
    }

    public StartTracking() {
        this.SetState(WebGazerState.Running);
        ExperimentManager.IsExperimentCompleted.subscribe((completed: boolean) => {
            this.End();
        })
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
        const pointsToSend = this.points;
        this.points = new Array<any>(WebGazerManager.POINT_BUFFER_SIZE);
        this.SendPoints(pointsToSend);
    }

    private SendPoints(pointsToSend: Array<any>): void {
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

            // TODO: iideally we would generate a separate stream of points to send, already in the CSV format.
            // There wasn't enough time to do it in the Feb 2019 timeframe, but since the post-as-file is so much 
            // faster it makes sense to transition away from the "points" datastructure to one that mirrows the rows.
            for (let point of pointsToSend) {
                const pointToRow = (header: any) => ((Object.prototype.toString.call(point[header]) === '[object Date]') ? point[header].toJSON() : point[header]);
                tsv += WebGazerManager.WEBGAZER_HEADERS.map(pointToRow).join("\t") + "\n";
            }
            formData.append('series_type', 'webgazer');
            formData.append('file', new Blob([tsv]), 'file');
            formData.append('sessionGUID', this.sessionGuid);

            fetch(url.href, {
                method: 'POST',
                mode: "cors", // no-cors, cors, *same-origin
                headers: {
                    'Accept': 'application/json',
                },
                body: formData
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
                body: JSON.stringify({ sessionGUID: this.sessionGuid, points: pointsToSend })
            }).then((rawResponse) => rawResponse.json())
                .then((json) => resolve(json))
                .catch((err) => reject(err));
        })

        // Test both:
/*
        postWebgazerJSON()
            .then(() => postWebgazerTsv())
            .then(() => console.log('Success'))
            .catch((err) => console.error(err));
            */
           postWebgazerTsv()
           .then(() => console.log('Success'))
           .catch((err) => console.error(err));

    }
}

var instance = new WebGazerManager();

export = instance;
