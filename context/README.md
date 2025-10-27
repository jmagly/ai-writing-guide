# Context Files - Usage Instructions

## Critical: Selective Inclusion

**DO NOT include all these files in every AI context.** Each file serves a specific purpose and should only be included
when needed.

## File Purposes and When to Use

### quick-reference.md

**When to use**: Quick validation checks, light editing **When NOT to use**: First drafts, formal documents **Load
priority**: Low - only for spot checks

### executive-voice.md

**When to use**: C-level communications, board presentations, strategic documents **When NOT to use**: Technical
documentation, casual blog posts **Load priority**: Only for executive-targeted content

### academic-voice.md

**When to use**: Research papers, whitepapers, technical reports **When NOT to use**: User documentation, marketing
content **Load priority**: Only for scholarly content

### cypherpunk-voice.md

**When to use**: Protocol documentation with subcultural voice, blockchain/crypto technical communications, tech manifestos, infrastructure storytelling **When NOT to use**: Traditional business communications, formal documentation **Load priority**: Only for technical mythology content

### technical-depth.md

**When to use**: Architecture documents, technical specifications, engineering blogs **When NOT to use**: User guides,
executive summaries **Load priority**: When technical authority needed

## Context Combinations

### Minimal Setup (Start Here)

Just the main `CLAUDE.md` file - often sufficient

### Technical Documentation

- `CLAUDE.md`
- `technical-depth.md`
- `sophistication-guide.md` (from core/)

### Executive Communications

- `CLAUDE.md`
- `executive-voice.md`
- `sophistication-guide.md` (from core/)

### Academic Writing

- `CLAUDE.md`
- `academic-voice.md`
- Note: Many "banned patterns" are acceptable in academic context

### Cypherpunk/Technical Mythology

- `CLAUDE.md`
- `cypherpunk-voice.md`
- Note: Technical precision wrapped in cultural narrative

### Problem Solving

Only add these when you see specific issues:

- Seeing "seamlessly"? Add `banned-patterns.md`
- Too casual? Add `sophistication-guide.md`
- Too formal? Add relevant examples
- Lost voice? Add appropriate voice guide

## Progressive Loading Strategy

1. **Start**: Just `CLAUDE.md`
2. **If problems emerge**: Add specific validator
3. **If voice wrong**: Add appropriate voice guide
4. **If struggling**: Add examples (sparingly)
5. **Last resort**: Multiple documents

## Remember

- More context ≠ better output
- Wrong context = wrong voice
- Start minimal, add as needed
- Match context to audience and purpose
