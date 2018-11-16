import webgazer = require("webgazer");
import Configuration = require("Managers/Configuration");
import DisposableComponent = require("Components/DisposableComponent");
import knockout = require("knockout");

class WebGazerManager extends DisposableComponent
{
    constructor() 
    {
        super();
    }

    public currentPoint = knockout.observable({});


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
                .setGazeListener(function (data:any, clock:number) {
                    self.currentPoint({
                        data: data,             /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
                        clock_ms: clock,        /* elapsed time in milliseconds since webgazer.begin() was called */
                        timestamp: (new Date())
                    })
                })
                .begin()
                .showPredictionPoints(true); /* shows a square every 100 milliseconds where current prediction is */

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
                    resolve();
                } else {
                    setTimeout(checkIfReady, 100);
                }
            }

            setTimeout(checkIfReady, 100);
        });
    }
}

var instance = new WebGazerManager();

export = instance;