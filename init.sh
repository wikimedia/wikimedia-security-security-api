#!/usr/bin/env bash

./wait-for-it.sh db:3306 --strict -- node ./init-db.js
npm run watch
