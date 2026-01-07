# Summarize Transcript or Meeting

Analyze and summarize a transcript, meeting notes, or discussion thread into a clear, actionable document.

## Usage

```bash
/summarize-transcript <path-to-transcript-or-paste-content> [--style <style-preset>] [--emphasize "<guidance>"] [--avoid "<guidance>"]
```

## Parameters

- `<content>`: Path to transcript file OR paste content directly
- `--style <preset>`: Optional style preset (default: `balanced`)
  - `technical`: Dense technical detail, architecture-focused
  - `executive`: High-level strategic, business-focused
  - `action-items`: Task-oriented, next-steps focused
  - `developer`: Code-centric, implementation details
  - `balanced`: Mix of strategic and technical
- `--emphasize "<text>"`: Positive guidance - what to highlight, tone to adopt
- `--avoid "<text>"`: Negative guidance - what to de-emphasize or exclude

## Examples

### Basic Usage
```bash
/summarize-transcript meeting-notes.txt
```

### With Style Preset
```bash
/summarize-transcript standup-transcript.md --style action-items
```

### With Positive Guidance
```bash
/summarize-transcript design-review.txt --emphasize "Focus on security decisions and data privacy concerns"
```

### With Negative Guidance
```bash
/summarize-transcript brainstorm-session.txt --avoid "Skip bikeshedding about naming, focus on architectural decisions"
```

### Combined Guidance
```bash
/summarize-transcript architecture-meeting.md \
  --style technical \
  --emphasize "Highlight consensus mechanisms and performance trade-offs" \
  --avoid "Skip discussion of tooling choices, minimize meeting logistics"
```

## Output Structure

The command produces a structured summary following this template:

### 1. TL;DR Section
- **Format**: Emoji-prefixed bullet points (3-8 items)
- **Content**: Core decisions, key outcomes, critical info
- **Tone**: Scannable, action-oriented, high signal-to-noise

### 2. Detailed Breakdown
- **Format**: Topic-organized subsections with emoji headers
- **Content**: Organized by theme/domain/workstream
- **Structure**: Each subsection contains:
  - Context/background bullets
  - Decisions made
  - Action items or next steps
  - Open questions or risks

### 3. Optional Sections (if applicable)
- **Action Items**: Explicitly called-out tasks with owners
- **Decisions**: Formalized decision log
- **Open Questions**: Unresolved items requiring follow-up
- **Next Steps**: Immediate priorities

## Style Preset Details

### Technical Style
```yaml
emphasis:
  - Architecture patterns and system design
  - Performance characteristics and trade-offs
  - Implementation details and constraints
  - Security and reliability considerations
tone:
  - Dense technical vocabulary
  - Precise terminology
  - Include metrics and measurements
avoid:
  - Business justifications
  - High-level platitudes
  - Process discussions
```

### Executive Style
```yaml
emphasis:
  - Strategic outcomes and business impact
  - Resource allocation and timeline
  - Risk assessment and mitigation
  - Cross-functional dependencies
tone:
  - Business-focused language
  - ROI and value propositions
  - Clear decision rationale
avoid:
  - Implementation minutiae
  - Technical jargon without context
  - Low-level code discussion
```

### Action Items Style
```yaml
emphasis:
  - Who does what by when
  - Blockers and dependencies
  - Immediate next steps
  - Accountability assignments
tone:
  - Imperative verbs
  - Clear ownership
  - Explicit timelines
avoid:
  - Background discussion
  - Exploratory tangents
  - Historical context
```

### Developer Style
```yaml
emphasis:
  - Code changes and implementation approach
  - API contracts and interfaces
  - Testing strategy and coverage
  - Debugging and troubleshooting
tone:
  - Code-centric language
  - Concrete examples
  - Tool and framework references
avoid:
  - Business strategy
  - Abstract architecture theory
  - Meeting meta-discussion
```

### Balanced Style (Default)
```yaml
emphasis:
  - Mix of strategic and tactical
  - Context + decisions + actions
  - Key takeaways for all audiences
  - Both "why" and "how"
tone:
  - Accessible to multiple roles
  - Balance detail and clarity
  - Preserve important nuance
avoid:
  - Extremes in either direction
  - Redundant information
  - Tangential discussions
```

## Guidance Best Practices

### Effective Positive Guidance (--emphasize)
- "Highlight security concerns and compliance requirements"
- "Focus on performance optimization decisions and benchmarks"
- "Emphasize user experience trade-offs and design rationale"
- "Call out technical debt and refactoring priorities"
- "Preserve specific metrics, timelines, and commitments"

### Effective Negative Guidance (--avoid)
- "Skip meeting logistics and scheduling discussion"
- "Minimize tool bikeshedding, focus on architecture"
- "De-emphasize exploratory tangents without conclusions"
- "Exclude off-topic discussions about [specific topic]"
- "Omit historical context, focus on forward decisions"

## Processing Instructions

When executing this command, follow these steps:

### 1. Content Analysis
- Read the full transcript/meeting notes
- Identify key themes, decisions, and discussion threads
- Extract action items, owners, and timelines
- Flag open questions and unresolved issues

### 2. Apply Style & Guidance
- Use the specified `--style` preset as baseline
- Integrate `--emphasize` guidance to prioritize content
- Apply `--avoid` guidance to filter or de-emphasize
- Resolve conflicts by prioritizing explicit guidance over presets

### 3. Structure Generation
- Create TL;DR section (3-8 bullet points)
- Organize detailed breakdown by logical themes
- Use emoji prefixes for visual scanning:
  - ⏱️ Time/schedule/deadline
  - 🧮 Technical/architecture/design
  - 🛡️ Security/reliability/safety
  - 🔁 Process/workflow/ops
  - 🧵 Structure/organization
  - 🧠 Strategy/planning/vision
  - 🧪 Experiments/testing/validation
  - 🔹 Status/updates/progress
  - 📊 Metrics/data/measurement
  - 🚀 Launch/deployment/release
  - 🔧 Tooling/infrastructure
  - 👥 Team/people/roles
  - 💡 Ideas/proposals/options
  - ⚠️ Risks/blockers/concerns
  - ✅ Decisions/commitments

### 4. Quality Checks
- Ensure TL;DR is genuinely scannable (no walls of text)
- Verify all action items have owners (if mentioned)
- Check that technical terms are consistent
- Remove redundant information
- Preserve critical nuance and context

### 5. Output Formatting
- Use markdown with proper heading hierarchy
- Apply consistent bullet structure
- Include horizontal rules (⸻) between major sections
- Use **bold** for emphasis on key terms
- Use `code blocks` for technical references

## Example Output

Based on the provided dev update posting, here's the structure to emulate:

```markdown
📢 [Meeting Title] — [Date]

TL;DR
• [Emoji] [Key decision/outcome 1]
• [Emoji] [Key decision/outcome 2]
• [Emoji] [Key decision/outcome 3]
• [Emoji] [Next steps/actions]

⸻

[Primary Section Label]

🔹 [Topic Area 1]
• [Context/background]
• [Decision made]
• [Implementation approach]
• [Open questions or next steps]

🔹 [Topic Area 2]
• [Context/background]
• [Decision made]
• [Technical details]
• [Action items]

🔹 [Topic Area 3]
• [Context/background]
• [Strategic direction]
• [Resource implications]
• [Timeline or milestones]

⸻

[Optional: Action Items]
• [@owner] Task description by [date]
• [@owner] Task description by [date]

[Optional: Open Questions]
• Question requiring follow-up?
• Decision pending [person/team]?

[Optional: Next Meeting]
• Date/time
• Agenda items
```

## Notes

- The command is flexible and adapts to various content types:
  - Technical design reviews
  - Sprint planning meetings
  - Architecture discussions
  - Strategy sessions
  - Incident post-mortems
  - Retrospectives
  - Community updates

- Emoji usage is optional but recommended for:
  - Visual scanning and quick navigation
  - Topic categorization
  - Signaling importance or urgency
  - Matching tone (formal vs informal)

- Length guidance:
  - TL;DR: 3-8 bullets, 1-2 sentences each
  - Topic sections: 3-6 bullets per topic
  - Total output: Aim for 40-60% of original length
  - Preserve critical details, cut fluff

- Context preservation:
  - Keep enough context for future readers
  - Link decisions to rationale
  - Preserve dissenting views if significant
  - Note when decisions are tentative vs final

---

**Template Version**: 1.0
**Based On**: Roko Dev Community Update (Oct 7 & 9, 2025)
**Maintained By**: AI Writing Guide Team
