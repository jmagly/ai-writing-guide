#!/usr/bin/env python3
"""
AI Pattern Scanner - Detects AI-generated writing patterns in text.

Usage:
    python pattern_scanner.py <input_file>
    python pattern_scanner.py --text "Your text here"

Output:
    JSON report with pattern matches, frequency analysis, and authenticity score.
"""

import re
import json
import sys
from pathlib import Path
from collections import Counter
from typing import NamedTuple

# Critical patterns - immediate AI detection signals
CRITICAL_PATTERNS = [
    # Corporate/Marketing Speak
    r"\bplays?\s+a\s+(vital|crucial|key|essential)\s+role",
    r"\bseamlessly\s+(integrat|connect|work)",
    r"\bcutting[- ]edge",
    r"\bstate[- ]of[- ]the[- ]art",
    r"\b(transformative|revolutionary|groundbreaking)\b",
    r"\bnext[- ]generation\b",
    r"\bcomprehensive\s+(platform|solution|approach)",
    r"\binnovative\s+(methodology|approach|solution)",
    r"\brobust\s+and\s+scalable",
    r"\bbest[- ]in[- ]class",
    r"\bindustry[- ]leading",
    r"\bgame[- ]changing",
    r"\bparadigm\s+shift",
    r"\bsynerg(y|istic)",
    r"\bleverag(e|ing)\b",

    # Vague Intensifiers
    r"\bdramatically\s+(improv|enhanc|reduc|increas)",
    r"\bsignificantly\s+(improv|enhanc|reduc|increas)",
    r"\bsubstantially\s+(improv|enhanc|reduc|increas)",
    r"\bgreatly\s+(improv|enhanc|reduc|increas)",
    r"\bvastly\s+superior",
    r"\bhighly\s+effective",
    r"\bextremely\s+valuable",

    # Academic Phrases
    r"\bit\s+is\s+worth\s+noting\s+that",
    r"\bit\s+is\s+important\s+to\s+note",
    r"\bit\s+should\s+be\s+mentioned",
    r"\bunderscores?\s+the\s+importance",
    r"\bhighlights?\s+the\s+significance",
    r"\bdemonstrates?\s+the\s+value",
    r"\bserves?\s+as\s+a\s+testament",

    # Formulaic Transitions (at sentence start)
    r"(?:^|\. )Moreover,",
    r"(?:^|\. )Furthermore,",
    r"(?:^|\. )Additionally,",
    r"(?:^|\. )In\s+addition,",
    r"(?:^|\. )Consequently,",
    r"(?:^|\. )Nevertheless,",
    r"(?:^|\. )In\s+conclusion,",
    r"(?:^|\. )To\s+summarize,",

    # Performative Language
    r"\baims?\s+to\s+provide",
    r"\bseeks?\s+to\s+deliver",
    r"\bstrives?\s+to\s+achieve",
    r"\bendeavors?\s+to\s+create",
    r"\bdesigned\s+to\s+enhance",
    r"\bpoised\s+to\s+transform",

    # Overused Metaphors
    r"\bat\s+the\s+heart\s+of",
    r"\bforms?\s+the\s+backbone",
    r"\bserves?\s+as\s+the\s+foundation",
    r"\bacts?\s+as\s+a\s+cornerstone",
]

# Contextual patterns - check frequency
CONTEXTUAL_PATTERNS = [
    r"\bmanifest(s|ed|ing|ation)?\b",
    r"\butiliz(e|es|ed|ing|ation)\b",
    r"\bfacilit(ate|ates|ated|ating)\b",
    r"\brobust\b",
    r"\bscalable\b",
    r"\bcomprehensive\b",
    r"\binnovative\b",
    r"\bdynamic\b",
    r"\bvibrant\b",
    r"\bthriving\b",
]

# Structural patterns
STRUCTURAL_PATTERNS = {
    "three_item_list": r"\b\w+,\s+\w+,\s+and\s+\w+\b",
    "em_dash_overuse": r"—",
    "passive_voice": r"\b(is|are|was|were|been|being)\s+\w+ed\b",
    "hedge_words": r"\b(may|might|could|can)\s+(help|serve|facilitate|enhance)\b",
}


class PatternMatch(NamedTuple):
    pattern: str
    match: str
    position: int
    severity: str


def scan_text(text: str) -> dict:
    """Scan text for AI patterns and return analysis report."""

    word_count = len(text.split())
    matches = []

    # Check critical patterns
    for pattern in CRITICAL_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
            matches.append(PatternMatch(
                pattern=pattern,
                match=match.group(),
                position=match.start(),
                severity="critical"
            ))

    # Check contextual patterns with frequency
    contextual_counts = Counter()
    for pattern in CONTEXTUAL_PATTERNS:
        found = re.findall(pattern, text, re.IGNORECASE)
        if found:
            contextual_counts[pattern] = len(found)
            # Flag if frequency too high (> 1 per 500 words)
            if len(found) / max(word_count, 1) > 0.002:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    matches.append(PatternMatch(
                        pattern=pattern,
                        match=match.group(),
                        position=match.start(),
                        severity="warning"
                    ))

    # Check structural patterns
    structural_issues = {}
    for name, pattern in STRUCTURAL_PATTERNS.items():
        found = re.findall(pattern, text, re.IGNORECASE)
        count = len(found)
        if count > 0:
            structural_issues[name] = count
            # Flag if overused
            threshold = 3 if name == "em_dash_overuse" else 5
            if count > threshold:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    matches.append(PatternMatch(
                        pattern=name,
                        match=match.group() if len(match.group()) < 50 else match.group()[:50] + "...",
                        position=match.start(),
                        severity="info"
                    ))

    # Calculate authenticity score
    critical_count = sum(1 for m in matches if m.severity == "critical")
    warning_count = sum(1 for m in matches if m.severity == "warning")
    info_count = sum(1 for m in matches if m.severity == "info")

    # Base score of 100, deduct for issues
    score = 100
    score -= critical_count * 10  # -10 per critical
    score -= warning_count * 3   # -3 per warning
    score -= info_count * 1      # -1 per info
    score = max(0, min(100, score))

    return {
        "word_count": word_count,
        "authenticity_score": score,
        "summary": {
            "critical": critical_count,
            "warning": warning_count,
            "info": info_count,
            "total": len(matches)
        },
        "matches": [
            {
                "text": m.match,
                "severity": m.severity,
                "position": m.position
            }
            for m in sorted(matches, key=lambda x: x.position)
        ],
        "contextual_frequencies": dict(contextual_counts),
        "structural_issues": structural_issues,
        "grade": _score_to_grade(score)
    }


def _score_to_grade(score: int) -> str:
    """Convert numeric score to letter grade."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"


def main():
    """CLI entry point."""
    if len(sys.argv) < 2 or sys.argv[1] in ('--help', '-h'):
        print(__doc__)
        print("Options:")
        print("  <file>           Path to file to scan")
        print("  --text 'text'    Inline text to scan")
        print("  --help, -h       Show this help message")
        sys.exit(0)

    if sys.argv[1] == "--text":
        text = " ".join(sys.argv[2:])
    else:
        path = Path(sys.argv[1])
        if not path.exists():
            print(f"Error: File not found: {path}")
            sys.exit(1)
        text = path.read_text()

    result = scan_text(text)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
