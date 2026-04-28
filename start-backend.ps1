param(
    [string]$HostAddr = "127.0.0.1",
    [int]$Port = 8001
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$venvActivate = Join-Path $root ".venv\Scripts\Activate.ps1"
$backendDir = Join-Path $root "backend"

if (-not (Test-Path $venvActivate)) {
    throw "Virtual environment not found at $venvActivate"
}

Set-Location $backendDir
& $venvActivate

Write-Host "Starting backend on http://$HostAddr`:$Port" -ForegroundColor Cyan
uvicorn main:app --reload --host $HostAddr --port $Port
