# lib/detect.ps1 — Platform detection helpers for Windows/PowerShell
# Dot-source this file: . "$PSScriptRoot\lib\detect.ps1"
#Requires -Version 5.1
Set-StrictMode -Version Latest

function Get-AiwgOS {
  if ($IsWindows -or $env:OS -match 'Windows') {
    # Check if running inside WSL2 (unlikely in PS but guard anyway)
    return 'windows-native'
  } elseif ($IsMacOS) {
    return 'macos'
  } elseif ($IsLinux) {
    return 'linux'
  } else {
    return 'unknown'
  }
}

function Get-AiwgArch {
  $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
  switch ($arch) {
    'X64'   { return 'x86_64' }
    'Arm64' { return 'arm64' }
    default { return $arch.ToString().ToLower() }
  }
}

function Test-AiwgCommand {
  param([string]$Command)
  return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-AiwgVersionGte {
  param([string]$Actual, [string]$Minimum)
  $a = [Version]($Actual -replace '^v', '')
  $m = [Version]($Minimum -replace '^v', '')
  return $a -ge $m
}
