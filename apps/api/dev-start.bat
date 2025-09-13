@echo off
REM Development startup script for Windows
REM Sets timezone to UTC and starts the API server

echo Starting RedBut API in development mode...
echo Setting timezone to UTC...

set TZ=UTC
set NODE_ENV=development

echo Timezone: %TZ%
echo Environment: %NODE_ENV%
echo.

echo Starting server...
npm run start:dev
