/// <reference path="../../TypeScriptDefinitions/bootstrap.d.ts" />
/// <reference path="../../TypeScriptDefinitions/crypto-js.d.ts" />
/// <reference path="../../TypeScriptDefinitions/highcharts.d.ts" />
/// <reference path="../../TypeScriptDefinitions/HighChartsCrossingSpecificValue.d.ts" />
/// <reference path="../../TypeScriptDefinitions/highchartsDraggable.d.ts" />
/// <reference path="../../TypeScriptDefinitions/jquery.d.ts" />
/// <reference path="../../TypeScriptDefinitions/knockout.d.ts" />
/// <reference path="../../TypeScriptDefinitions/PortalClient.d.ts" />
/// <reference path="../../TypeScriptDefinitions/require.d.ts" />
/// <reference path="../../TypeScriptDefinitions/routie.d.ts" />
/// <reference path="../../TypeScriptDefinitions/videojs.d.ts" />

declare module "Portal" { }
declare var CacheBuster: number;
declare module "text!../configuration.json" { var configuration: string; export = configuration; }

requirejs.config({
	paths: {
		text: "../Lib/text/text",
		jquery: "../Lib/jQuery/jquery.min",
		routie: "../Lib/Routie/routie.min",
		knockout: "../Lib/knockout/knockout",
		bootstrap: "../Lib/bootstrap/js/bootstrap.min",
		Portal: "../Lib/PortalClient/PortalClient.min",
		Highcharts: "../Lib/Highcharts/highcharts",
		HighchartsMore: "../Lib/Highcharts/highcharts-more",
		HighChartsDraggablePoints: "../Lib/Highcharts/draggable-points/draggable-points",
		HighChartsCrossingSpecificValue: "../Lib/Highcharts/crossing-specific-value/crossing-specific-value",
		"crypto-js": "../Lib/crypto-js/md5",
	},
	map: {
		"*": {
			css: "../Lib/require-css/css.min"
		}
	},
	shim: {
		routie: {
			exports: "routie"
		},
		bootstrap: {
			deps: [
				"jquery",
				"css!../Lib/bootstrap/css/bootstrap.min",
				"css!../Lib/bootstrap/css/bootstrap-theme.min"
			]
		},
		Highcharts: {
			exports: "Highcharts",
			deps: ["jquery"]
		},
		HighchartsMore: {
			deps: ["jquery", "Highcharts"]
		},
		HighChartsDraggablePoints: {
			deps: ["jquery", "Highcharts", "HighchartsMore"]
		},
		HighChartsCrossingSpecificValue: {
			deps: ["jquery", "Highcharts", "HighchartsMore"]
		},
		Portal: {
			exports: "CHAOS.Portal.Client"
		},
		"crypto-js": {
			exports: "CryptoJS"
		}
	},
	waitSeconds: 20,
	urlArgs: "bust=" + CacheBuster
});



require(["Components/NameConventionLoader", "knockout", "bootstrap", "Portal", "css!Style/Default", "KnockoutBindings/KnockoutBindings"], (nameConventionLoader:any, knockout: any) =>
{
	knockout.components.loaders.push(new nameConventionLoader("Cockpit"));

	knockout.applyBindings();
});