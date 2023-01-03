#!/bin/sh

rm -rf /var/www/frontend/public/*

cp -R dist/* /var/www/frontend/public/

ls -als dist
ls /var/www/frontend/public/

tail -f /dev/null
