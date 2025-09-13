# PowerShell script for starting the API with timezone set to UTC
Write-Host "Starting RedBut API in development mode..." -ForegroundColor Green
Write-Host "Setting timezone to UTC..." -ForegroundColor Yellow

$env:TZ = "UTC"
$env:NODE_ENV = "development"

Write-Host "Timezone: $($env:TZ)" -ForegroundColor Cyan
Write-Host "Environment: $($env:NODE_ENV)" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting server..." -ForegroundColor Green
npm run start:dev
