import webgazer = require("webgazer");
import webGazerCalibration = require("Components/WebGazer/WebGazerCalibration");

class WebGazer
{
    constructor() {
        webGazerCalibration.init();
    }

    RestartCalibration() {
        webGazerCalibration.Restart(true);
    }
}

export = WebGazer;