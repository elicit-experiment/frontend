import 'promise-polyfill';
import 'whatwg-fetch';
import knockout = require('knockout');
import NameConventionLoader = require('Components/NameConventionLoader');
// TODO: how to import a proper polyfill in this require.js world?
//import urlPolyfill = require('url-polyfill');

knockout.components.loaders.push(new NameConventionLoader());
knockout.applyBindings();
