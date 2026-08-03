# templates/clone.ps1 — Clone repository to InstallDir
# Platform: windows/native
# Params: RepoUrl (required), InstallDir (required), Branch (default: main)
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory=$true)][string]$RepoUrl,
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [string]$Branch = 'main'
)

. "$PSScriptRoot\..\lib\detect.ps1"

# --- prerequisite check ---
if (-not (Test-AiwgCommand 'git')) {
  Write-Error 'git not found. Install Git for Windows and retry.'
  exit 1
}

# --- main ---
$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)

if (Test-Path (Join-Path $InstallDir '.git')) {
  Write-Host "Repository already cloned at $InstallDir. Pulling latest..."
  git -C $InstallDir fetch origin
  git -C $InstallDir checkout $Branch
  git -C $InstallDir pull --ff-only
} else {
  Write-Host "Cloning $RepoUrl -> $InstallDir (branch: $Branch)..."
  git clone --branch $Branch --depth 1 $RepoUrl $InstallDir
}

# --- verify ---
if (-not (Test-Path (Join-Path $InstallDir '.git'))) {
  Write-Error "Clone verification failed: $InstallDir\.git not found"
  exit 1
}
Write-Host "  ✓ $InstallDir"
