#!/usr/bin/env bash
# toolchain-detect.sh — shared language/build-system detection for security-engineering skills
#
# Source from a skill: source "$(dirname "$0")/../../lib/toolchain-detect.sh"
# Or invoke directly:  bash toolchain-detect.sh
#
# Emits one language code per line on stdout. Supported codes:
#   c cpp rust go python node java ruby
set -euo pipefail

detect_languages() {
  local repo_root="${1:-.}"
  local langs=()

  # C — Makefile or *.c files
  if [[ -f "$repo_root/Makefile" || -f "$repo_root/configure.ac" ]] || \
     compgen -G "$repo_root"'/**/*.c' >/dev/null 2>&1; then
    langs+=("c")
  fi

  # C++ — CMakeLists.txt with CXX, meson.build, or *.cpp files
  if [[ -f "$repo_root/CMakeLists.txt" && -n "$(grep -l 'CXX\|cpp\|c++' "$repo_root/CMakeLists.txt" 2>/dev/null)" ]] || \
     [[ -f "$repo_root/meson.build" ]] || \
     compgen -G "$repo_root"'/**/*.cpp' >/dev/null 2>&1 || \
     compgen -G "$repo_root"'/**/*.cc' >/dev/null 2>&1; then
    langs+=("cpp")
  fi

  # Rust
  if [[ -f "$repo_root/Cargo.toml" ]]; then
    langs+=("rust")
  fi

  # Go
  if [[ -f "$repo_root/go.mod" ]]; then
    langs+=("go")
  fi

  # Python
  if [[ -f "$repo_root/pyproject.toml" ]] || \
     [[ -f "$repo_root/setup.py" ]] || \
     compgen -G "$repo_root"'/requirements*.txt' >/dev/null 2>&1; then
    langs+=("python")
  fi

  # Node
  if [[ -f "$repo_root/package.json" ]]; then
    langs+=("node")
  fi

  # Java/JVM — pom.xml, build.gradle, build.gradle.kts
  if [[ -f "$repo_root/pom.xml" ]] || \
     [[ -f "$repo_root/build.gradle" ]] || \
     [[ -f "$repo_root/build.gradle.kts" ]]; then
    langs+=("java")
  fi

  # Ruby
  if [[ -f "$repo_root/Gemfile" ]] || [[ -f "$repo_root/*.gemspec" ]]; then
    langs+=("ruby")
  fi

  printf '%s\n' "${langs[@]}"
}

detect_ci_platform() {
  local repo_root="${1:-.}"

  if [[ -d "$repo_root/.gitea/workflows" ]]; then
    echo "gitea"
  elif [[ -d "$repo_root/.github/workflows" ]]; then
    echo "github"
  elif [[ -f "$repo_root/.gitlab-ci.yml" ]]; then
    echo "gitlab"
  elif [[ -f "$repo_root/azure-pipelines.yml" ]]; then
    echo "azure"
  elif [[ -f "$repo_root/.circleci/config.yml" ]]; then
    echo "circleci"
  else
    echo "unknown"
  fi
}

# If invoked directly (not sourced), run detection and print results
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Languages detected:"
  detect_languages "${1:-.}" | sed 's/^/  /'
  echo
  echo "CI platform: $(detect_ci_platform "${1:-.}")"
fi
