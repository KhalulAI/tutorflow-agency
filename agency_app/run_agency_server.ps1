$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$python = "C:\Users\conta\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if (-not (Test-Path $python)) {
  $python = "python"
}
& $python .\server.py
