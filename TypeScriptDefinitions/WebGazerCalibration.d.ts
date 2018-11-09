
interface XWebGazerCalibration {
	init(): void;
	Restart(): void;
}

declare module 'Components/WebGazer/WebGazerCalibration' {
	function init(): void;
	function Restart(showInstructions:boolean): void;

	var currentPoint:KnockoutObservable<any>;
	function HideWebGazerVideo(): void;
}

declare var webGazerCalibration:XWebGazerCalibration;
