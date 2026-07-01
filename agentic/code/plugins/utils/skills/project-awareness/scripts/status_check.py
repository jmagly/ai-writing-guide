#!/usr/bin/env python3
"""
AIWG Project Status Checker

Scans .aiwg/ directory for project status information.

Usage:
    python status_check.py [project-dir]

Output:
    JSON report with phase, iteration, completion, blockers, and next steps.
"""

import json
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Optional

def find_aiwg_dir(start_path: Path) -> Optional[Path]:
    """Find .aiwg directory in project."""
    aiwg_path = start_path / ".aiwg"
    if aiwg_path.exists():
        return aiwg_path
    return None

def read_frontmatter(file_path: Path) -> dict:
    """Extract YAML frontmatter from markdown file."""
    if not file_path.exists():
        return {}

    content = file_path.read_text()
    if not content.startswith("---"):
        return {}

    try:
        end = content.index("---", 3)
        frontmatter = content[3:end].strip()
        # Simple YAML parsing for key: value pairs
        result = {}
        for line in frontmatter.split("\n"):
            if ":" in line:
                key, value = line.split(":", 1)
                result[key.strip()] = value.strip()
        return result
    except ValueError:
        return {}

def extract_phase_status(aiwg_dir: Path) -> dict:
    """Extract current phase status."""
    phase_file = aiwg_dir / "planning" / "phase-status.md"
    if not phase_file.exists():
        # Try to infer from directory structure
        phases = ["inception", "elaboration", "construction", "transition"]
        for phase in phases:
            gate_file = aiwg_dir / "gates" / f"{phase}-gate.md"
            if gate_file.exists():
                content = gate_file.read_text().lower()
                if "passed" in content or "approved" in content:
                    continue
                return {"phase": phase, "status": "in_progress"}
        return {"phase": "unknown", "status": "unknown"}

    content = phase_file.read_text()
    frontmatter = read_frontmatter(phase_file)

    return {
        "phase": frontmatter.get("phase", "unknown"),
        "iteration": frontmatter.get("iteration", "1"),
        "status": frontmatter.get("status", "in_progress"),
        "started": frontmatter.get("started", "unknown"),
        "target": frontmatter.get("target", "unknown")
    }

def count_artifacts(aiwg_dir: Path) -> dict:
    """Count artifacts in each category."""
    categories = {
        "requirements": aiwg_dir / "requirements",
        "architecture": aiwg_dir / "architecture",
        "testing": aiwg_dir / "testing",
        "security": aiwg_dir / "security",
        "deployment": aiwg_dir / "deployment"
    }

    counts = {}
    for name, path in categories.items():
        if path.exists():
            md_files = list(path.glob("*.md"))
            counts[name] = len(md_files)
        else:
            counts[name] = 0

    return counts

def find_blockers(aiwg_dir: Path) -> list:
    """Find active blockers from risk register."""
    risk_file = aiwg_dir / "risks" / "risk-register.md"
    if not risk_file.exists():
        return []

    content = risk_file.read_text()
    blockers = []

    # Look for lines with "blocker" or high severity
    for line in content.split("\n"):
        line_lower = line.lower()
        if "blocker" in line_lower or "critical" in line_lower or "high" in line_lower:
            if "|" in line:  # Table row
                parts = [p.strip() for p in line.split("|") if p.strip()]
                if len(parts) >= 2:
                    blockers.append({
                        "id": parts[0] if parts[0].startswith("R") else "R-?",
                        "description": parts[1] if len(parts) > 1 else line,
                        "severity": "high"
                    })

    return blockers[:5]  # Top 5 blockers

def estimate_completion(aiwg_dir: Path) -> dict:
    """Estimate completion percentages by category."""
    # This is a simplified estimation based on artifact presence
    artifacts = count_artifacts(aiwg_dir)

    # Expected artifact counts per phase (rough estimates)
    expected = {
        "requirements": 5,
        "architecture": 4,
        "testing": 3,
        "security": 2,
        "deployment": 2
    }

    completion = {}
    for category, count in artifacts.items():
        exp = expected.get(category, 3)
        pct = min(100, int((count / exp) * 100))
        completion[category] = pct

    # Overall completion
    if completion:
        completion["overall"] = sum(completion.values()) // len(completion)
    else:
        completion["overall"] = 0

    return completion

def get_next_steps(phase_status: dict, blockers: list) -> list:
    """Suggest next steps based on current state."""
    phase = phase_status.get("phase", "unknown").lower()
    steps = []

    if blockers:
        steps.append(f"Address {len(blockers)} active blocker(s)")

    phase_next = {
        "inception": [
            "Complete business case validation",
            "Finalize risk assessment",
            "Prepare for Elaboration gate"
        ],
        "elaboration": [
            "Complete architecture baseline",
            "Create master test plan",
            "Validate technical feasibility"
        ],
        "construction": [
            "Continue feature implementation",
            "Run integration tests",
            "Address code review feedback"
        ],
        "transition": [
            "Prepare deployment runbooks",
            "Complete UAT",
            "Plan hypercare period"
        ]
    }

    steps.extend(phase_next.get(phase, ["Check /project-status for details"]))

    return steps[:5]

def check_status(project_dir: str = ".") -> dict:
    """Main status check function."""
    project_path = Path(project_dir).resolve()
    aiwg_dir = find_aiwg_dir(project_path)

    if not aiwg_dir:
        return {
            "error": "No .aiwg directory found",
            "suggestion": "Run /intake-wizard to initialize AIWG for this project"
        }

    phase_status = extract_phase_status(aiwg_dir)
    artifacts = count_artifacts(aiwg_dir)
    blockers = find_blockers(aiwg_dir)
    completion = estimate_completion(aiwg_dir)
    next_steps = get_next_steps(phase_status, blockers)

    return {
        "timestamp": datetime.now().isoformat(),
        "project_dir": str(project_path),
        "phase": phase_status,
        "artifacts": artifacts,
        "completion": completion,
        "blockers": blockers,
        "blocker_count": len(blockers),
        "next_steps": next_steps
    }

def main():
    """CLI entry point."""
    project_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    result = check_status(project_dir)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
