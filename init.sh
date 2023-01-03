#!/usr/bin/env bash

npm install
./wait-for-it.sh host.docker.internal:$MYSQL_PORT --timeout=30 --strict -- node ./init-db.js && npm run watch
