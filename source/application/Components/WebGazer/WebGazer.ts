import webgazer = require("webgazer");
import webGazerCalibration = require("Components/WebGazer/WebGazerCalibration");

class WebGazer
{
    constructor() {
        console.log('ctor');
        //console.dir(webgazer);
        //webgazer.begin();
        webGazerCalibration.init();
        console.dir(webGazerCalibration)
    }

    RestartCalibration() {
        webGazerCalibration.Restart();
    }
}

export = WebGazer;