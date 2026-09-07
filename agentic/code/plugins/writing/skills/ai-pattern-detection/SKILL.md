---
namespace: aiwg
name: ai-pattern-detection
description: Review editorial phrase patterns and suggest contextual alternatives; legacy name does not imply authorship detection. Use when reviewing or editing content, or when the user mentions authenticity or natural voice.
version: 1.0.0
platforms: [all]

---

# AI Pattern Detection Skill

## Purpose

Review phrase patterns and suggest edits that fit the author’s intent and audience. This skill does not detect authorship or certify naturalness.

These are editorial preferences, not evidence of human or AI authorship. Apply only the requirements chosen by the author or project; other phrase and structure suggestions are advisory. Preserve quotations, code, literal terms, inventories, checklists, questionnaires, intentional punctuation, necessary uncertainty and domain terminology. A flagged phrase can be retained with a reason. Zero highlights and numeric scores are not publication gates. Never invent metrics, experiences, opinions or failures to satisfy a style marker.

## When This Skill Applies

- Generating any prose, documentation, or written content
- Reviewing or editing existing documents
- User mentions "AI detection", "writing quality", "authentic voice"
- User asks to "make it sound more natural" or "less robotic"
- Creating marketing copy, documentation, or communications

## Detection Categories

### Legacy High-Priority Patterns (Review in Context)

These phrases can be uninformative in some contexts; none identifies content as AI-generated:

1. **Corporate Buzzwords**: "seamlessly integrates", "cutting-edge", "revolutionary", "next-generation", "comprehensive solution"
2. **Vague Intensifiers**: "dramatically improves", "significantly enhances", "vastly superior"
3. **Formulaic Transitions**: "Moreover,", "Furthermore,", "Additionally,", "In conclusion,"
4. **Performative Language**: "aims to provide", "strives to achieve", "designed to enhance"
5. **Academic Passive**: "It has been observed that...", "It can be argued that..."

### Structural Patterns (Flag When Overused)

1. **Three-item lists**: "reliable, scalable, and secure"
2. **Em-dash overuse**: Multiple em-dashes in a paragraph
3. **Identical paragraph structure**: Topic → 3 points → conclusion repeated
4. **Balanced hedging**: "While X has challenges, it also offers opportunities"

### Contextual Patterns (Check Frequency)

Review frequency in the document and language; there is no universal acceptable ratio for these words:
- manifest, revolutionary, next-generation
- robust, scalable, comprehensive
- synergy, leverage, utilize

## Replacement Guidelines

| Instead of | Use |
|-----------|-----|
| "plays a crucial role" | "handles" / "manages" / "does" |
| "seamlessly integrates" | "works with" / "connects to" |
| "cutting-edge" | "new" / "recent" / specific tech name |
| "Moreover," | [just start the next sentence] |
| "comprehensive solution" | [specific description of what it does] |
| "dramatically improves" | [specific metric: "reduces latency by 40%"] |
| "robust" | "handles X requests/second" / "99.9% uptime" |

## Editorial Features to Consider

Use these only when relevant and supported by the supplied material:

1. **Specific opinions**: "I prefer X because..." not "X is preferred"
2. **Acknowledged trade-offs**: "This approach sacrifices Y for Z"
3. **Real-world constraints**: "Budget limited us to..."
4. **Uncertainty where appropriate**: "We're not sure yet whether..."
5. **Varied sentence structure**: Mix short and long, different openings
6. **Domain-specific vocabulary**: Use actual technical terms, not generic descriptions

## Application Process

When generating or reviewing content:

1. **Scan** for phrase patterns and explicitly mandated style rules
2. **Count** contextual pattern frequency
3. **Check** structural variety
4. **Suggest** edits grounded in the source; retain intentional phrasing with a reason
5. **Verify** facts, author intent, uncertainty and protected content survive the edit

## Examples

### Before (Generic Wording)
> The platform seamlessly integrates cutting-edge technology to dramatically improve workflow efficiency. Moreover, it plays a crucial role in enabling next-generation solutions. In conclusion, this comprehensive approach transforms how teams collaborate.

### After (Specific Wording; Requires Supporting Facts)
> The platform connects to existing tools through standard APIs. Initial tests show 40% faster task completion. Teams report fewer context switches between applications.

## Script Reference

The Python `scripts/pattern_scanner.py` is a **legacy regex scanner**, not the contextual diagnostic implementation. It:
- Counts pattern frequencies
- Labels matches using legacy severity categories; these are advisory absent a user rule
- Generates replacement suggestions
- Preserves the deprecated numeric `authenticity_score` (0–100) and `grade` for compatibility, with a deprecation notice; neither measures authorship or publication readiness

For contextual programmatic review, use `WritingValidationEngine.diagnose(content, options)` or the exported `diagnoseWriting` API. Results include UTF-16 spans, context, explanations and reasoned exceptions. They carry `publicationGate: false`. The Python scanner does not implement these context or exception fields.

## Integration

This skill works with:
- `/writing-validator` command for explicit validation
- `writing-validator` agent for deep analysis
- Content tasks when this skill is invoked; invocation is not proof of runtime integration

## References

- @$AIWG_ROOT/agentic/code/addons/voice-framework/README.md — Voice framework for target style profiles
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Parsing content requirements accurately
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context for documentation quality
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for writing-related commands
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Research patterns before making writing recommendations
