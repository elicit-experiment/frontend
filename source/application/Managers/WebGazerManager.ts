import webgazer = require("webgazer");
import Configuration = require("Managers/Configuration");
import DisposableComponent = require("Components/DisposableComponent");
import knockout = require("knockout");

enum WebGazerState {
    NotStarted,
    Started,
    Calibrating,
    Running
}

class WebGazerManager extends DisposableComponent {
    constructor() {
        super();
    }

    public currentPoint = knockout.observable({});
    public state = WebGazerState.NotStarted;
    public pointIndex: number = 0;
    public points: Array<any> = [];
    public sessionGuid: string;

    public Ready(): boolean {
        return webgazer ? webgazer.isReady() : false;
    }

    public Init(): Promise<void> {
        const self = this;
        return new Promise<void>((resolve) => {
            //start the webgazer tracker
            webgazer
                .setRegression('ridge') /* currently must set regression and tracker */
                .setTracker('clmtrackr')
                .setGazeListener((data: any, clock: number) => self.ProcessPoint(data, clock))
                .begin();

            // Set up the webgazer video feedback.
            var setup = function () {
                // Set up the main canvas. The main canvas is used to calibrate the webgazer.
                var canvas = <HTMLCanvasElement>document.getElementById("plotting_canvas");
                if (canvas) {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    canvas.style.position = 'fixed';
                }
            };

            function checkIfReady() {
                if (webgazer.isReady()) {
                    setup();
                    self.state = WebGazerState.Started;
                    /*
                    setInterval( ()=> self.SendPoints([{
                        x: 1,
                        y: 2,
                        clock_ms: 90,
                        timeStamp: new Date(),
                        left_image_x: 1,
                        left_image_y: 2,
                        left_width: 3,
                        left_height: 4,
                        right_image_x: 5,
                        right_image_y: 6,
                        right_width: 7,
                        right_height: 8,
                    }]), 5000); */
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
            webgazer.end();
        } catch (e) {
            console.error(e);
        }
    }

    public StartCalibration() {
        this.SetState(WebGazerState.Calibrating);
    }

    public StartTracking() {
        this.SetState(WebGazerState.Running);
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
            this.pointIndex = (++this.pointIndex) % 1000;
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

            this.points.push(dataPoint);

            if (this.pointIndex === 0) {
                const pointsToSend = this.points;
                this.points = new Array<any>();
                this.SendPoints(pointsToSend);
            }

        }
        this.currentPoint({
            data: data,             /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
            clock_ms: clock_ms,        /* elapsed time in milliseconds since webgazer.begin() was called */
            timestamp: (new Date())
        })
    }

    private SendPoints(pointsToSend: Array<any>) {
        function getCookie(key:string) {
            const keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
            return keyValue ? keyValue[2] : null;
        }

        if (!this.sessionGuid) {
            this.sessionGuid = getCookie('session_guid');
        }

        const url = new URL('/v6/time_series/webgazer', Configuration.PortalPath);
        console.log(url.href);
        fetch(url.href, {
            method: 'POST',
            //credentials: 'include', // include the sessionGUID cookie
            mode: "cors", // no-cors, cors, *same-origin
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({sessionGUID: this.sessionGuid, points: pointsToSend})
        }).then((rawResponse) => rawResponse.json())
            .then((json) => console.dir(json))
            .catch((err) => console.error(err));
    }
}

var instance = new WebGazerManager();

export = instance;