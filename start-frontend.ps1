param(
    [int]$Port = 3000,
    [string]$ApiBaseUrl = "http://127.0.0.1:8001"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$venvActivate = Join-Path $root ".venv\Scripts\Activate.ps1"
$frontendDir = Join-Path $root "frontend"

if (-not (Test-Path $venvActivate)) {
    throw "Virtual environment not found at $venvActivate"
}

Set-Location $frontendDir
& $venvActivate

$env:NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl

Write-Host "Starting frontend on http://127.0.0.1:$Port with API $ApiBaseUrl" -ForegroundColor Cyan
npm run dev -- -p $Port
