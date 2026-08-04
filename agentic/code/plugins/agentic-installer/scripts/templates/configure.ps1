# templates/configure.ps1 — Configure installed software
# Platform: windows/native
# Params: InstallDir (required), ConfigDir (default: %APPDATA%\<project>)
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [string]$ConfigDir = ''
)

$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
if (-not $ConfigDir) {
  $ConfigDir = Join-Path $env:APPDATA (Split-Path $InstallDir -Leaf)
}

# --- main ---
Write-Host "Configuring in $ConfigDir..."
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

$DefaultsPath = Join-Path $InstallDir 'config\defaults.conf'
$ConfigPath   = Join-Path $ConfigDir  'config.conf'

if ((Test-Path $DefaultsPath) -and (-not (Test-Path $ConfigPath))) {
  Copy-Item $DefaultsPath $ConfigPath
  Write-Host "  Wrote default config to $ConfigPath"
}

# --- verify ---
if (-not (Test-Path $ConfigDir)) {
  Write-Error "Config directory not created: $ConfigDir"
  exit 1
}
Write-Host "  ✓ $ConfigDir"
