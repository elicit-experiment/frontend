import webgazer = require("webgazer");
import Configuration = require("Managers/Configuration");
import DisposableComponent = require("Components/DisposableComponent");
import knockout = require("knockout");

export enum WebGazerState {
    NotStarted,
    Started,
    Calibrating,
    Running
}

class WebGazerManager extends DisposableComponent
{
    constructor() 
    {
        super();
    }

    public currentPoint = knockout.observable({});
    public state = WebGazerState.NotStarted;

    public Ready() : boolean {
        return webgazer ? webgazer.isReady() : false;
    }

    public Init() : Promise<void> {
        const self = this;
        return new Promise<void>((resolve, reject) => {
            //start the webgazer tracker
            webgazer
                .setRegression('ridge') /* currently must set regression and tracker */
                .setTracker('clmtrackr')
                .setGazeListener((data:any, clock:number) => self.ProcessPoint(data, clock))
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
        } catch(e) {
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

    public ProcessPoint(data:any, clock:number) {
        this.currentPoint({
            data: data,             /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
            clock_ms: clock,        /* elapsed time in milliseconds since webgazer.begin() was called */
            timestamp: (new Date())
        })
    }
}

var instance = new WebGazerManager();

export = instance;