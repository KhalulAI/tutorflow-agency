$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
# Local preview must never inherit the production database or email credentials.
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:POSTMARK_SERVER_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:RAILWAY_ENVIRONMENT -ErrorAction SilentlyContinue
$env:APP_DATA_DIR = Join-Path $PSScriptRoot "personal_data"
$env:HOST = "127.0.0.1"
$env:PORT = "8011"
$env:COOKIE_SECURE = "0"
$env:APP_BASE_URL = "http://127.0.0.1:8011"
$python = "C:\Users\conta\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if (-not (Test-Path $python)) { $python = "python" }
& $python .\personal_server.py
