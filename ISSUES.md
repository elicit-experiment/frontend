# Chokidar 2 & fsevents 1

Chokidar is used by `gulp` through `gulp-glob`. It is old and deprecated and won't work with node 14.x (and maybe not even 12.x). [This](https://github.com/gulpjs/glob-watcher/issues/55) github issue outlines the problem: gulp can't upgrade because of resource limitations.

So we need to either wait for them to do it or move off of gulp entirely for the build system.

