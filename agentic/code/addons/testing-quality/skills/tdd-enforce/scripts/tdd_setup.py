#!/usr/bin/env python3
"""
TDD Enforcement Setup Script

Configures pre-commit hooks and CI coverage gates for test-driven development.

Research Basis:
- Kent Beck (2002): TDD by Example
- Google Testing Blog (2010): 80% coverage minimum
- ISTQB CT-TAS: Test automation strategy
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Literal

# Default thresholds based on Google's research
DEFAULT_LINE_COVERAGE = 80
DEFAULT_BRANCH_COVERAGE = 75
DEFAULT_FUNCTION_COVERAGE = 90


def detect_project_type(project_dir: Path) -> str:
    """Detect project language/framework from project files."""
    if (project_dir / "package.json").exists():
        return "javascript"
    elif (project_dir / "pyproject.toml").exists() or (project_dir / "setup.py").exists():
        return "python"
    elif (project_dir / "pom.xml").exists():
        return "java-maven"
    elif (project_dir / "build.gradle").exists():
        return "java-gradle"
    elif (project_dir / "go.mod").exists():
        return "go"
    elif (project_dir / "Cargo.toml").exists():
        return "rust"
    else:
        return "unknown"


def detect_test_framework(project_dir: Path, project_type: str) -> str:
    """Detect test framework from project configuration."""
    if project_type == "javascript":
        pkg_json = project_dir / "package.json"
        if pkg_json.exists():
            with open(pkg_json) as f:
                pkg = json.load(f)
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                if "vitest" in deps:
                    return "vitest"
                elif "jest" in deps:
                    return "jest"
                elif "mocha" in deps:
                    return "mocha"
    elif project_type == "python":
        if (project_dir / "pytest.ini").exists() or (project_dir / "pyproject.toml").exists():
            return "pytest"
        return "unittest"
    return "unknown"


def generate_husky_precommit(
    test_command: str,
    coverage_threshold: int
) -> str:
    """Generate Husky pre-commit hook content."""
    return f'''#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running TDD enforcement checks..."

# Run tests for staged files
npx lint-staged

# Check overall coverage hasn't decreased
{test_command} --coverage --coverageReporters=json-summary

# Validate coverage threshold
COVERAGE=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct)")
if [ $(echo "$COVERAGE < {coverage_threshold}" | bc -l) -eq 1 ]; then
    echo "ERROR: Coverage $COVERAGE% is below {coverage_threshold}% threshold"
    exit 1
fi

echo "TDD checks passed!"
'''


def generate_precommit_config(coverage_threshold: int) -> str:
    """Generate pre-commit config for Python projects."""
    return f'''# TDD Enforcement Configuration
# Based on: Google 80% coverage standard, Kent Beck TDD methodology

repos:
  - repo: local
    hooks:
      - id: pytest-coverage
        name: pytest with coverage check
        entry: pytest --cov=src --cov-fail-under={coverage_threshold} --cov-report=term-missing
        language: system
        types: [python]
        pass_filenames: false
        stages: [commit]

      - id: test-presence
        name: check test files exist
        entry: python -c "
import sys
from pathlib import Path

changed = sys.argv[1:]
src_files = [f for f in changed if f.startswith('src/') and f.endswith('.py')]
missing = []
for src in src_files:
    test_path = src.replace('src/', 'test/').replace('.py', '_test.py')
    if not Path(test_path).exists():
        missing.append(src)
if missing:
    print('Missing tests for:', missing)
    sys.exit(1)
"
        language: system
        types: [python]
        stages: [commit]
'''


def generate_github_actions_workflow(
    project_type: str,
    test_framework: str,
    line_threshold: int,
    branch_threshold: int
) -> str:
    """Generate GitHub Actions workflow for CI coverage gates."""

    if project_type == "javascript":
        test_cmd = "npm test -- --coverage --coverageReporters=json-summary"
        coverage_check = f'''
      - name: Check coverage thresholds
        run: |
          LINE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          BRANCH=$(jq '.total.branches.pct' coverage/coverage-summary.json)
          echo "Line coverage: $LINE%"
          echo "Branch coverage: $BRANCH%"
          if (( $(echo "$LINE < {line_threshold}" | bc -l) )); then
            echo "::error::Line coverage $LINE% is below {line_threshold}% threshold"
            exit 1
          fi
          if (( $(echo "$BRANCH < {branch_threshold}" | bc -l) )); then
            echo "::error::Branch coverage $BRANCH% is below {branch_threshold}% threshold"
            exit 1
          fi
'''
    else:  # Python
        test_cmd = "pytest --cov=src --cov-report=json"
        coverage_check = f'''
      - name: Check coverage thresholds
        run: |
          LINE=$(python -c "import json; print(json.load(open('coverage.json'))['totals']['percent_covered'])")
          echo "Line coverage: $LINE%"
          if (( $(echo "$LINE < {line_threshold}" | bc -l) )); then
            echo "::error::Line coverage $LINE% is below {line_threshold}% threshold"
            exit 1
          fi
'''

    return f'''# TDD Coverage Gate
# Research basis: Google 80% coverage minimum, ISTQB CT-TAS standards
#
# This workflow enforces test coverage thresholds on every PR.
# Coverage must meet or exceed thresholds for PR to pass.

name: TDD Coverage Gate

on:
  pull_request:
    branches: [main, master, develop]
  push:
    branches: [main, master, develop]

jobs:
  test-coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
        if: ${{ '{project_type}' == 'javascript' }}

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
        if: ${{ '{project_type}' == 'python' }}

      - name: Install dependencies
        run: |
          {"npm ci" if project_type == "javascript" else "pip install -e .[dev]"}

      - name: Run tests with coverage
        run: {test_cmd}
{coverage_check}
      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let coverage;
            try {{
              coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            }} catch {{
              coverage = {{ total: {{ lines: {{ pct: 'N/A' }}, branches: {{ pct: 'N/A' }} }} }};
            }}
            const body = `## Coverage Report

            | Metric | Value | Threshold |
            |--------|-------|-----------|
            | Lines | ${{coverage.total.lines.pct}}% | {line_threshold}% |
            | Branches | ${{coverage.total.branches.pct}}% | {branch_threshold}% |

            *TDD enforcement powered by AIWG testing-quality addon*`;

            github.rest.issues.createComment({{
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            }});
'''


def setup_tdd_enforcement(
    project_dir: Path,
    level: Literal["strict", "standard", "gradual", "audit"] = "standard",
    line_threshold: int = DEFAULT_LINE_COVERAGE,
    branch_threshold: int = DEFAULT_BRANCH_COVERAGE,
    dry_run: bool = False
) -> dict:
    """
    Configure TDD enforcement for a project.

    Args:
        project_dir: Path to project root
        level: Enforcement level (strict, standard, gradual, audit)
        line_threshold: Minimum line coverage percentage
        branch_threshold: Minimum branch coverage percentage
        dry_run: If True, show what would be done without making changes

    Returns:
        Dictionary with setup results
    """
    results = {
        "project_type": None,
        "test_framework": None,
        "files_created": [],
        "files_modified": [],
        "commands_run": [],
        "warnings": [],
        "errors": []
    }

    # Detect project
    project_type = detect_project_type(project_dir)
    test_framework = detect_test_framework(project_dir, project_type)
    results["project_type"] = project_type
    results["test_framework"] = test_framework

    if project_type == "unknown":
        results["errors"].append("Could not detect project type")
        return results

    # Adjust thresholds for gradual adoption
    if level == "gradual":
        line_threshold = max(40, line_threshold - 40)  # Start lower
        results["warnings"].append(
            f"Gradual mode: Starting with {line_threshold}% threshold"
        )
    elif level == "audit":
        results["warnings"].append(
            "Audit mode: Coverage will be reported but not enforced"
        )

    # Setup pre-commit hooks
    if project_type == "javascript":
        # Install Husky
        if not dry_run:
            subprocess.run(["npm", "install", "--save-dev", "husky", "lint-staged"],
                         cwd=project_dir, check=True)
            subprocess.run(["npx", "husky", "init"], cwd=project_dir, check=True)
        results["commands_run"].append("npm install husky lint-staged")
        results["commands_run"].append("npx husky init")

        # Generate pre-commit hook
        husky_dir = project_dir / ".husky"
        precommit_path = husky_dir / "pre-commit"
        test_cmd = "npx vitest run" if test_framework == "vitest" else "npm test"

        if not dry_run:
            husky_dir.mkdir(exist_ok=True)
            precommit_path.write_text(
                generate_husky_precommit(test_cmd, line_threshold)
            )
            precommit_path.chmod(0o755)
        results["files_created"].append(str(precommit_path))

    elif project_type == "python":
        # Install pre-commit
        if not dry_run:
            subprocess.run(["pip", "install", "pre-commit"], check=True)
        results["commands_run"].append("pip install pre-commit")

        # Generate pre-commit config
        config_path = project_dir / ".pre-commit-config.yaml"
        if not dry_run:
            config_path.write_text(generate_precommit_config(line_threshold))
            subprocess.run(["pre-commit", "install"], cwd=project_dir, check=True)
        results["files_created"].append(str(config_path))
        results["commands_run"].append("pre-commit install")

    # Setup CI workflow
    workflows_dir = project_dir / ".github" / "workflows"
    workflow_path = workflows_dir / "tdd-coverage-gate.yml"

    if not dry_run:
        workflows_dir.mkdir(parents=True, exist_ok=True)
        workflow_path.write_text(
            generate_github_actions_workflow(
                project_type, test_framework, line_threshold, branch_threshold
            )
        )
    results["files_created"].append(str(workflow_path))

    return results


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Configure TDD enforcement for project"
    )
    parser.add_argument(
        "--level",
        choices=["strict", "standard", "gradual", "audit"],
        default="standard",
        help="Enforcement level"
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=DEFAULT_LINE_COVERAGE,
        help=f"Line coverage threshold (default: {DEFAULT_LINE_COVERAGE})"
    )
    parser.add_argument(
        "--branch-threshold",
        type=int,
        default=DEFAULT_BRANCH_COVERAGE,
        help=f"Branch coverage threshold (default: {DEFAULT_BRANCH_COVERAGE})"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes"
    )
    parser.add_argument(
        "project_dir",
        nargs="?",
        default=".",
        help="Project directory (default: current)"
    )

    args = parser.parse_args()

    project_dir = Path(args.project_dir).resolve()
    if not project_dir.exists():
        print(f"Error: Directory {project_dir} does not exist")
        sys.exit(1)

    print(f"Setting up TDD enforcement in {project_dir}")
    print(f"Level: {args.level}")
    print(f"Thresholds: {args.threshold}% line, {args.branch_threshold}% branch")
    if args.dry_run:
        print("DRY RUN - no changes will be made")
    print()

    results = setup_tdd_enforcement(
        project_dir,
        level=args.level,
        line_threshold=args.threshold,
        branch_threshold=args.branch_threshold,
        dry_run=args.dry_run
    )

    print(f"Project type: {results['project_type']}")
    print(f"Test framework: {results['test_framework']}")
    print()

    if results["files_created"]:
        print("Files created:")
        for f in results["files_created"]:
            print(f"  + {f}")

    if results["commands_run"]:
        print("\nCommands run:")
        for cmd in results["commands_run"]:
            print(f"  $ {cmd}")

    if results["warnings"]:
        print("\nWarnings:")
        for w in results["warnings"]:
            print(f"  ! {w}")

    if results["errors"]:
        print("\nErrors:")
        for e in results["errors"]:
            print(f"  X {e}")
        sys.exit(1)

    print("\nTDD enforcement configured successfully!")


if __name__ == "__main__":
    main()
