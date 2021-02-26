"use strict";

var gulp = require("gulp");
gulp.task("build", gulp.series((cb) => {console.log('build'); cb(); }));
