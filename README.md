# Cockpit Experiments
Web interface for the Cockpit experiments

## Requirements
* Node (<https://nodejs.org/en/download/>)
* NPM (run `npm install npm -g`)
* Gulp (run `npm install --global gulp-cli`)

## Installation
Run `npm update` to get everything that is needed.
After that run `gulp` to build the whole project, the output will end up in the `/dist` folder.

## Tasks

Run gulp tasks for the following (eg. `gulp serve`).

* `default` - Build the whole project to `/dist` folder
* `watch` - Watch for file changes and build when detected (to `/dist` folder)
* `serve` - Setup local webserver hosting the build project at <http://localhost:5504>
* `compileTypeScript` - Build and copy over only the TypeScript files
* `compileStylus` - Build and copy over only the styles
* `copyHTML` - Only copy over the html files