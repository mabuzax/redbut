#!/bin/bash
# Development startup script for Linux/Mac
# Sets timezone to UTC and starts the API server

echo "Starting RedBut API in development mode..."
echo "Setting timezone to UTC..."

export TZ=UTC
export NODE_ENV=development

echo "Timezone: $TZ"
echo "Environment: $NODE_ENV"
echo

echo "Starting server..."
npm run start:dev
