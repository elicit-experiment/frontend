/// <reference path="../../TypeScriptDefinitions/bootstrap.d.ts" />
/// <reference path="../../TypeScriptDefinitions/crypto-js.d.ts" />
/// <reference path="../../TypeScriptDefinitions/jquery.d.ts" />
/// <reference path="../../TypeScriptDefinitions/highchartsDraggable.d.ts" />
/// <reference path="../../TypeScriptDefinitions/PortalClient.d.ts" />
/// <reference path="../../TypeScriptDefinitions/require.d.ts" />
/// <reference path="../../TypeScriptDefinitions/routie.d.ts" />
/// <reference path="../../TypeScriptDefinitions/SoundManager.d.ts" />
/// <reference path="../../TypeScriptDefinitions/videojs.d.ts" />
/// <reference path="../../TypeScriptDefinitions/taggle.d.ts" />
/// <reference path="../../TypeScriptDefinitions/webgazer.d.ts" />
/// <reference path="../../TypeScriptDefinitions/WebGazerCalibration.d.ts" />
/// <reference path="../../node_modules/sweetalert2/sweetalert2.d.ts" />

declare module 'PortalClient' {
  export = CHAOS.Portal.Client;
}

declare module 'WebGazer' {
  export = webgazer;
}

declare let CacheBuster: number;
declare module 'text!../../configuration.json' {
  var configuration: string;
  export = configuration;
}
