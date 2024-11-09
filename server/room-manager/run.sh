#!/usr/bin/env bash
if [ -z ${BWS_ACCESS_TOKEN+x} ]; then node src/index.js; else bws run -- node src/index.js; fi
