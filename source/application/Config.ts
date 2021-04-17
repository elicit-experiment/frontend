/// <reference path="../../TypeScriptDefinitions/bootstrap.d.ts" />
/// <reference path="../../TypeScriptDefinitions/crypto-js.d.ts" />
/// <reference path="../../TypeScriptDefinitions/jquery.d.ts" />
/// <reference path="../../TypeScriptDefinitions/highchartsDraggable.d.ts" />
/// <reference path="../../TypeScriptDefinitions/PortalClient.d.ts" />
/// <reference path="../../TypeScriptDefinitions/require.d.ts" />
/// <reference path="../../TypeScriptDefinitions/routie.d.ts" />
/// <reference path="../../TypeScriptDefinitions/SoundManager.d.ts" />
/// <reference path="../../TypeScriptDefinitions/videojs.d.ts" />
/// <reference path="../../dependencies/sweetalert/typings/sweetalert.d.ts" />
/// <reference path="../../dependencies/sweetalert2/sweetalert2.d.ts" />
/// <reference path="../../dependencies/es6-promise/es6-promise.d.ts" />
/// <reference path="../../TypeScriptDefinitions/taggle.d.ts" />
/// <reference path="../../TypeScriptDefinitions/webgazer.d.ts" />
/// <reference path="../../TypeScriptDefinitions/WebGazerCalibration.d.ts" />

declare module 'PortalClient' {
  export = CHAOS.Portal.Client;
}
declare let CacheBuster: number;
declare module 'text!../../configuration.json' {
  var configuration: string;
  export = configuration;
}

requirejs.config({
  paths: {
    text: '../lib/text/text',
    jquery: '../lib/jQuery/jquery.min',
    routie: '../lib/Routie/routie.min',
    knockout: '../lib/knockout/knockout',
    bootstrap: '../lib/bootstrap/js/bootstrap.min',
    PortalClient: '../lib/PortalClient/PortalClient.min',
    Highcharts: '../lib/Highcharts/highcharts',
    HighchartsMore: '../lib/Highcharts/highcharts-more',
    HighChartsDraggablePoints: '../lib/Highcharts/draggable-points/draggable-points',
    HighChartsCrossingSpecificValue: '../lib/Highcharts/crossing-specific-value/crossing-specific-value',
    'crypto-js': '../lib/crypto-js/md5',
    soundmanager2: '../lib/soundmanager2/script/soundmanager2-nodebug-jsmin',
    Taggle: '../lib/taggle/taggle',
    webgazer: '../lib/webgazer/webgazer',
    swal: '../lib/sweetalert/sweetalert.min',
    sweetalert: '../lib/sweetalert/sweetalert.min',
    sweetalert2: '../lib/sweetalert2/dist/sweetalert2.min',
    'promise-polyfill': '../lib/promise-polyfill/promise.min',
    'whatwg-fetch': '../lib/whatwg-fetch/fetch.umd',
    //		'es6-promise': "../lib/es6-promise/es6-promise.auto",
    'url-polyfill': '../lib/url-polyfill/url-polyfill',
  },
  map: {
    '*': {
      css: '../lib/require-css/css.min',
    },
  },
  shim: {
    routie: {
      exports: 'routie',
    },
    webgazer: {
      exports: 'webgazer',
    },
    bootstrap: {
      deps: ['jquery', 'css!../lib/bootstrap/css/bootstrap.min', 'css!../lib/bootstrap/css/bootstrap-theme.min'],
    },
    Highcharts: {
      exports: 'Highcharts',
      deps: ['jquery'],
    },
    HighchartsMore: {
      deps: ['jquery', 'Highcharts'],
    },
    HighChartsDraggablePoints: {
      deps: ['jquery', 'Highcharts', 'HighchartsMore'],
    },
    HighChartsCrossingSpecificValue: {
      deps: ['jquery', 'Highcharts', 'HighchartsMore'],
    },
    PortalClient: {
      exports: 'CHAOS.Portal.Client',
    },
    'crypto-js': {
      exports: 'CryptoJS',
    },
    Taggle: {
      deps: ['css!../lib/taggle/taggle'],
    },
    sweetalert2: {
      deps: ['css!../lib/sweetalert2/dist/sweetalert2.min.css'],
    },
  },
  deps: ['Main', 'bootstrap', 'css!Style/default', 'KnockoutBindings/KnockoutBindings'],
  waitSeconds: 20,
  urlArgs: 'bust=' + CacheBuster,
});
