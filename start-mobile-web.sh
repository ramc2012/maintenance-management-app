#!/bin/bash
cd "$(dirname "$0")/deploy/mobile"
exec node node_modules/.bin/expo start --web --port 8084
