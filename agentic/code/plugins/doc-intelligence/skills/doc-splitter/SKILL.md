---
namespace: aiwg
name: doc-splitter
description: Split large documentation (10K+ pages) into focused sub-skills with intelligent routing. Use for massive doc sites like Godot, AWS, or MSDN.
tools: Read, Write, Bash, Glob
platforms: [all]

---

# Documentation Splitter Skill

## Purpose

Single responsibility: Split large documentation sites into multiple focused sub-skills with an optional router skill for intelligent navigation. (BP-4)

## Grounding Checkpoint (Archetype 1 Mitigation)

Before executing, VERIFY:

- [ ] Total page count is known (run estimation first)
- [ ] Documentation categories are identifiable
- [ ] Target skill size determined (default: 5,000 pages per skill)
- [ ] Router strategy selected (category, size, or hybrid)

**DO NOT split without understanding documentation structure.**

## Uncertainty Escalation (Archetype 2 Mitigation)

ASK USER instead of guessing when:

- Category boundaries unclear
- Optimal skill size uncertain for target use case
- Cross-references between sections complicate splitting
- Router vs flat structure decision needed

**NEVER arbitrarily split - seek user guidance on boundaries.**

## Context Scope (Archetype 3 Mitigation)

| Context Type | Included | Excluded |
|--------------|----------|----------|
| RELEVANT | Doc structure, categories, page counts | Actual page content |
| PERIPHERAL | Similar large doc examples | Other documentation |
| DISTRACTOR | Content quality concerns | Individual page issues |

## Size Guidelines

| Documentation Size | Recommendation | Strategy |
|-------------------|----------------|----------|
| < 5,000 pages | One skill | No splitting |
| 5,000 - 10,000 pages | Consider splitting | Category-based |
| 10,000 - 30,000 pages | Recommended | Router + Categories |
| 30,000+ pages | Strongly recommended | Router + Categories |

## Workflow Steps

### Step 1: Estimate Documentation Size (Grounding)

```bash
# Quick estimation with skill-seekers
skill-seekers estimate configs/large-docs.json

# Output:
# 📊 ESTIMATION RESULTS
# ✅ Pages Discovered: 28,450
# 📈 Estimated Total: 32,000
# ⏱️  Time Elapsed: 2.1 minutes
# 💡 Recommended: Split into 6-7 sub-skills
```

### Step 2: Analyze Category Structure

```bash
# Identify natural category boundaries
skill-seekers analyze --config configs/large-docs.json --categories

# Output:
# Categories detected:
# - scripting: 8,200 pages
# - 2d: 5,400 pages
# - 3d: 9,100 pages
# - physics: 4,300 pages
# - networking: 2,800 pages
# - editor: 2,200 pages
```

### Step 3: Choose Split Strategy

| Strategy | Best For | Description |
|----------|----------|-------------|
| `category` | Clear topic divisions | Split by documentation sections |
| `size` | Uniform distribution | Split every N pages |
| `router` | User navigation | Hub skill + specialized sub-skills |
| `hybrid` | Complex docs | Categories + size limits per category |

### Step 4: Execute Split

**Option A: With skill-seekers**

```bash
# Category-based split
skill-seekers split --config configs/godot.json --strategy category

# Router-based split (recommended for large docs)
skill-seekers split --config configs/godot.json --strategy router

# Size-based split
skill-seekers split --config configs/godot.json --strategy size --pages-per-skill 5000
```

**Option B: Manual split configuration**

```json
{
  "name": "godot",
  "max_pages": 40000,
  "split_strategy": "router",
  "split_config": {
    "target_pages_per_skill": 5000,
    "create_router": true,
    "categories": {
      "scripting": {
        "patterns": ["/scripting/", "/gdscript/", "/c_sharp/"],
        "max_pages": 8000
      },
      "2d": {
        "patterns": ["/2d/", "/sprite/", "/tilemap/"],
        "max_pages": 6000
      },
      "3d": {
        "patterns": ["/3d/", "/mesh/", "/spatial/"],
        "max_pages": 10000
      },
      "physics": {
        "patterns": ["/physics/", "/collision/", "/rigidbody/"],
        "max_pages": 5000
      }
    }
  }
}
```

### Step 5: Scrape Sub-Skills

```bash
# Scrape all sub-skills in parallel
for config in configs/godot-*.json; do
  skill-seekers scrape --config $config &
done
wait

# Or sequentially with progress
for config in configs/godot-*.json; do
  echo "Processing: $config"
  skill-seekers scrape --config $config
done
```

### Step 6: Generate Router Skill

```bash
# Auto-generate router from sub-skills
skill-seekers generate-router configs/godot-*.json

# Creates godot-router skill that intelligently routes queries
```

### Step 7: Validate Split Results

```bash
# Check sub-skill sizes
for dir in output/godot-*/; do
  echo "$dir: $(find $dir -name "*.md" | wc -l) files"
done

# Verify router coverage
cat output/godot-router/SKILL.md | grep -A 50 "## Sub-Skills"
```

## Recovery Protocol (Archetype 4 Mitigation)

On error:

1. **PAUSE** - Note which sub-skill failed
2. **DIAGNOSE** - Check error type:
   - `Category overlap` → Refine URL patterns
   - `Uneven split` → Adjust page limits
   - `Orphan pages` → Add catch-all category
   - `Router incomplete` → Regenerate after all sub-skills done
3. **ADAPT** - Modify split configuration
4. **RETRY** - Re-split affected category (max 3 attempts)
5. **ESCALATE** - Present split preview, ask user for boundary adjustments

## Checkpoint Support

State saved to: `.aiwg/working/checkpoints/doc-splitter/`

```
checkpoints/doc-splitter/
├── estimation.json         # Page count results
├── category_analysis.json  # Category breakdown
├── split_plan.json         # Planned split configuration
├── progress/
│   ├── godot-scripting.json
│   ├── godot-2d.json
│   └── ...
└── router_draft.md         # Router skill draft
```

## Output Structure

After splitting large documentation:

```
configs/
├── godot.json              # Original config
├── godot-scripting.json    # Generated sub-config
├── godot-2d.json
├── godot-3d.json
├── godot-physics.json
└── godot-router.json       # Router config

output/
├── godot-scripting/        # Sub-skill
│   ├── SKILL.md
│   └── references/
├── godot-2d/               # Sub-skill
├── godot-3d/               # Sub-skill
├── godot-physics/          # Sub-skill
└── godot-router/           # Router skill
    ├── SKILL.md            # Routing logic
    └── references/
        └── routing-table.md
```

## Router Skill Structure

The generated router skill:

```markdown
# Godot Documentation Router

## Purpose
Route queries to the appropriate specialized Godot sub-skill.

## Sub-Skills

| Topic | Skill | Coverage |
|-------|-------|----------|
| GDScript, C#, scripting patterns | godot-scripting | 8,200 pages |
| 2D graphics, sprites, tilemaps | godot-2d | 5,400 pages |
| 3D graphics, meshes, materials | godot-3d | 9,100 pages |
| Physics, collisions, rigid bodies | godot-physics | 4,300 pages |

## Routing Rules

1. **Scripting questions** → godot-scripting
   - Keywords: script, gdscript, c#, function, variable, class

2. **2D graphics questions** → godot-2d
   - Keywords: sprite, 2d, tilemap, animation2d, canvas

3. **3D graphics questions** → godot-3d
   - Keywords: mesh, 3d, spatial, material, shader, camera3d

4. **Physics questions** → godot-physics
   - Keywords: physics, collision, rigidbody, area, raycast

## Usage

Ask your question naturally. This router will direct you to the appropriate specialized skill.

Example:
- "How do I create a player movement script?" → godot-scripting
- "How do I set up tilemap collisions?" → godot-2d
- "How do I apply materials to a mesh?" → godot-3d
```

## Troubleshooting

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Uneven splits | Category size varies | Use hybrid strategy with max_pages |
| Orphan pages | URL patterns incomplete | Add catch-all or refine patterns |
| Router confusion | Overlapping keywords | Make routing rules more specific |
| Too many skills | Over-segmented | Merge related categories |

## References

- Skill Seekers Large Documentation: https://github.com/jmagly/Skill_Seekers/blob/main/docs/LARGE_DOCUMENTATION.md
- REF-001: Production-Grade Agentic Workflows (BP-4, BP-9 KISS)
- REF-002: LLM Failure Modes (Archetype 3 context filtering, Archetype 4 recovery)
