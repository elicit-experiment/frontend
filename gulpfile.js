"use strict";

var gulp = require("gulp");
var del = require("del");
var replace = require("gulp-replace");
var rename = require("gulp-rename");
var filter = require("gulp-filter");
var merge = require("merge-stream");
var plumber = require('gulp-plumber');
var runSequence = require("run-sequence");

var uglify = require("gulp-uglify");

var typescript = require("gulp-typescript");

var stylus = require("gulp-stylus");

var express = require("express");

var minimist = require("minimist");

var config = {
	npmModulePath: "./node_modules/",
	projectPath: "./source/",
	appDirBase: "application",
	mainFile: "Main.ts",
	componentsPath: "/Components",
	distPath: "./dist/",
	dependenciesPath: "lib/",
	externalDependenciesPath: "./dependencies/",
	servePort: 5502,
	typeScript: {
		noImplicitAny: true,
		module: "amd",
		outDir: "app",
		target: "ES5"
	},
	parameters: {
		string: ["portalPath"],
		default: {
			portalPath: "https://dev-api.cosound.dk"
		}
	}
};

var server = CreateServer();

gulp.task("default", ["build"]);

gulp.task("build", function(callback) {
	runSequence("clean", ["compileTypeScript", "compileStylus", "copyDependencies", "copyHTML", "copyImages", "copyConfig"], callback);
});

gulp.task("compileTypeScript", function(){
	return gulp.src(config.projectPath + config.appDirBase + "/**/*.ts")
		.pipe(typescript(config.typeScript))
		.pipe(gulp.dest(config.distPath + config.appDirBase));
});

gulp.task("compileStylus", function()
{
	return gulp.src(config.projectPath + "**/default.styl")
		.pipe(plumber())
		.pipe(stylus({
			compress: true
		}))
		.pipe(gulp.dest(config.distPath));
});

gulp.task("copyDependencies", function()
{
	var external = gulp.src(config.externalDependenciesPath + "**/*.*")
		.pipe(gulp.dest(config.distPath + config.dependenciesPath));

	return external;

	/*var requirejs = gulp.src(config.npmModulePath + "requirejs/require.js")
		.pipe(uglify())
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "requirejs"));

	var requirejsText = gulp.src(config.npmModulePath + "requirejs-text/text.js")
		.pipe(uglify())
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "requirejs"));

	var jquery = gulp.src(config.npmModulePath + "jquery/dist/**")
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "jquery/"));

	var autosize = gulp.src(config.npmModulePath + "autosize/dist/autosize.min.js")
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "autosize"));

	var crossroads = gulp.src(config.npmModulePath + "crossroads/dist/**")
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "crossroads/"));

	var signals = gulp.src(config.npmModulePath + "signals/dist/**")
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "signals/"));

	var knockout = gulp.src(config.npmModulePath + "knockout/build/output/knockout-latest.js")
		.pipe(uglify())
		.pipe(rename("knockout.js"))
		.pipe(gulp.dest(config.distPath + config.dependenciesPath + "knockout/"));


	return merge(external, requirejs, requirejsText, jquery, autosize, crossroads, signals, knockout);*/
});

gulp.task("copyConfig", function () {
	var parameters = minimist(process.argv.slice(3),config.parameters);

	return gulp.src(config.projectPath + "configuration.json")
		.pipe(replace("{PortalPath}", parameters.portalPath))
		.pipe(gulp.dest(config.distPath));
});

gulp.task("copyHTML", function()
{
	var defaultFilter = filter(["**/default.html"], {restore: true});

	return gulp.src(config.projectPath + "**/*.html")
		.pipe(defaultFilter)
		.pipe(replace(/var CacheBuster = (\d+);/g, "var CacheBuster = " + new Date().getTime() + ";"))
		.pipe(defaultFilter.restore)
		.pipe(gulp.dest(config.distPath));
});

gulp.task("copyImages", function()
{
	return gulp.src(config.projectPath + config.appDirBase + "/Images/**")
		.pipe(gulp.dest(config.distPath + config.appDirBase + "/Images"));
});

gulp.task("clean", function (callback)
{
	del([config.distPath + "**"], callback);
});

gulp.task("watch", function()
{
	gulp.watch(config.projectPath + "**/*.ts", ["compileTypeScript"]);
	gulp.watch(config.projectPath + "**/*.styl", ["compileStylus"]);
	gulp.watch(config.projectPath + "**/*.html", ["copyHTML"]);
	gulp.watch(config.projectPath  + config.appDirBase + "/Images/**", ["copyImages"]);
});

gulp.task("serve", function () {
	server.listen(config.servePort);
});

function CreateServer()
{
	var server = express();
	server.use(express.static(config.distPath));
	server.get(/\/((?!\.).)*$/, function(req, res){
		res.sendFile("default.html", { root: config.distPath } );
	});

	return server;
}