
interface XWebGazerCalibration {
	init(): void;
	Restart(): void;
	ready(): boolean;
}

declare module 'Components/WebGazer/WebGazerCalibration' {
	function init(): void;
	function Restart(showInstructions:boolean): void;
	function ready(): boolean;

	function swal(...params: any[]): Promise<boolean>;

	var currentPoint:ko.Observable<any>;
	function HideWebGazerVideo(): void;
}

declare var webGazerCalibration:XWebGazerCalibration;
