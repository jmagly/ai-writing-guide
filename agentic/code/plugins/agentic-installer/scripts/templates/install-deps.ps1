# templates/install-deps.ps1 — Install dependencies on Windows
# Platform: windows/native
# Params: SkipOptional (default: false), PackageManager (default: winget)
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [bool]$SkipOptional = $false,
  [ValidateSet('winget','choco')][string]$PackageManager = 'winget'
)

. "$PSScriptRoot\..\lib\detect.ps1"

# --- prerequisite check ---
if (-not (Test-AiwgCommand $PackageManager)) {
  if ($PackageManager -eq 'winget') {
    Write-Error 'winget not found. Install App Installer from the Microsoft Store.'
  } else {
    Write-Error 'choco not found. Install from https://chocolatey.org'
  }
  exit 1
}

# --- main ---
Write-Host "Installing required packages via $PackageManager..."

if ($PackageManager -eq 'winget') {
  winget install --id Git.Git -e --silent
  winget install --id cURL.cURL -e --silent
  if (-not $SkipOptional) {
    winget install --id jqlang.jq -e --silent
  }
} else {
  choco install git curl -y
  if (-not $SkipOptional) { choco install jq -y }
}

# --- verify ---
if (-not (Test-AiwgCommand 'git')) {
  Write-Error 'git installation verification failed'
  exit 1
}
Write-Host '  ✓ git'
