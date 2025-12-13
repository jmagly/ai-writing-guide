# AIWG Documentation Site Refactoring Plan

## Executive Summary

Transform the AIWG `/docs` directory from a Jekyll-based GitHub Pages setup into a Pagenary-powered documentation site. This enables branded, searchable, exportable documentation with zero runtime dependencies while establishing AIWG as a first-class Pagenary tenant.

**Current State**: 40 markdown files, 11,357 lines, Jekyll theme, scattered structure
**Target State**: Audience-segmented Pagenary site with marketing-grade landing, developer guides, and contributor docs

---

## Part 1: Gap Analysis

### What AIWG Docs Have Now

| Aspect | Current State |
|--------|---------------|
| **Build System** | Jekyll (minimal theme) via GitHub Pages |
| **Frontmatter** | Minimal (`layout: default`, `title:`) |
| **Navigation** | None (relies on manual links) |
| **Search** | None |
| **Branding** | Basic `_config.yml` with title/description |
| **Structure** | 11 directories, inconsistent depth |
| **Content Types** | All markdown, no HTML/JS dynamic content |
| **Internal Links** | Mix of relative paths and GitHub URLs |
| **External Links** | Manual `target="_blank"` where remembered |

### What Pagenary Requires

| Aspect | Requirement |
|--------|-------------|
| **Build System** | `npm run build:tenants aiwg-docs` |
| **Configuration** | `config.json` (branding), `manifest.json` (navigation) |
| **Content Location** | `content/` directory with `.md`, `.html`, `.js` files |
| **Navigation** | Manifest-driven with sections/subsections |
| **Assets** | `.public/` directory for images, icons |
| **Overrides** | `overrides/` for custom CSS |

### Migration Gaps

1. **No `config.json`** - Need to create branding configuration
2. **No `manifest.json`** - Need navigation structure
3. **Wrong directory structure** - Files not in `content/`
4. **Jekyll frontmatter** - Must remove or adapt
5. **GitHub-absolute links** - Need conversion to internal `#section-id` links
6. **No welcome page** - Index.md is content-only, needs rich landing
7. **Missing audience segmentation** - Docs are developer-focused only
8. **No assets** - No `.public/` directory, no favicon, no logo

---

## Part 2: Information Architecture

### Proposed Site Structure

```
aiwg-docs/                          # Pagenary tenant directory
├── config.json                     # Branding + welcome page config
├── manifest.json                   # Root navigation
├── content/
│   ├── welcome.html                # Marketing-grade landing page
│   ├── getting-started/
│   │   ├── _manifest.json
│   │   ├── installation.md         # Install CLI
│   │   ├── first-project.md        # aiwg demo / aiwg use
│   │   └── platform-setup.md       # Platform integration overview
│   ├── frameworks/
│   │   ├── _manifest.json
│   │   ├── sdlc/
│   │   │   ├── _manifest.json
│   │   │   ├── overview.md
│   │   │   ├── quickstart.md
│   │   │   ├── agents.md
│   │   │   ├── commands.md
│   │   │   ├── templates.md
│   │   │   └── orchestration.md
│   │   ├── marketing/
│   │   │   ├── _manifest.json
│   │   │   ├── overview.md
│   │   │   ├── quickstart.md
│   │   │   ├── agents.md
│   │   │   └── workflow.md
│   │   └── writing/
│   │       ├── _manifest.json
│   │       ├── overview.md
│   │       ├── voice-profiles.md
│   │       └── skills.md
│   ├── platforms/
│   │   ├── _manifest.json
│   │   ├── claude-code.md
│   │   ├── factory-ai.md
│   │   ├── warp-terminal.md
│   │   └── cross-platform.md
│   ├── development/
│   │   ├── _manifest.json
│   │   ├── overview.md
│   │   ├── commands.md             # Slash command dev guide
│   │   ├── agents.md               # Agent design guide
│   │   ├── addons.md
│   │   ├── extensions.md
│   │   └── frameworks.md
│   ├── reference/
│   │   ├── _manifest.json
│   │   ├── cli.md                  # Full CLI reference
│   │   ├── agent-design.md         # 10 Golden Rules
│   │   ├── orchestrator.md
│   │   └── model-config.md
│   ├── research/
│   │   ├── _manifest.json
│   │   ├── overview.md             # Research index
│   │   ├── production-workflows.md # REF-001
│   │   ├── failure-modes.md        # REF-002
│   │   └── mcp-spec.md             # REF-003
│   ├── contributing/
│   │   ├── _manifest.json
│   │   ├── quickstart.md
│   │   ├── maintainer-guide.md
│   │   └── quality-standards.md
│   ├── troubleshooting/
│   │   ├── _manifest.json
│   │   ├── setup.md
│   │   ├── deployment.md
│   │   ├── paths.md
│   │   └── platforms.md
│   └── releases/
│       ├── _manifest.json
│       └── v0.9.1.md
├── .public/
│   ├── favicon.svg                 # AIWG favicon
│   ├── logo.svg                    # AIWG logo
│   ├── logo-dark.svg               # Dark mode variant
│   └── social/
│       ├── og-image.png            # Open Graph image
│       ├── discord.svg
│       └── github.svg
└── overrides/
    └── styles.css                  # Custom AIWG styles (optional)
```

### Navigation Hierarchy

```
AIWG Documentation
├── Home (welcome landing)
├── Getting Started
│   ├── Installation
│   ├── First Project
│   └── Platform Setup
├── Frameworks
│   ├── SDLC Complete
│   │   ├── Overview
│   │   ├── Quick Start
│   │   ├── Agents
│   │   ├── Commands
│   │   ├── Templates
│   │   └── Orchestration
│   ├── Marketing Kit
│   │   ├── Overview
│   │   ├── Quick Start
│   │   ├── Agents
│   │   └── Workflow
│   └── Writing Quality
│       ├── Overview
│       ├── Voice Profiles
│       └── Skills
├── Platforms
│   ├── Claude Code
│   ├── Factory AI
│   ├── Warp Terminal
│   └── Cross-Platform Config
├── Development
│   ├── Overview
│   ├── Commands
│   ├── Agents
│   ├── Addons
│   ├── Extensions
│   └── Frameworks
├── Reference
│   ├── CLI Reference
│   ├── Agent Design (10 Rules)
│   ├── Orchestrator Guide
│   └── Model Configuration
├── Research
│   ├── Overview
│   ├── Production Workflows
│   ├── Failure Modes
│   └── MCP Specification
├── Contributing
│   ├── Quick Start
│   ├── Maintainer Guide
│   └── Quality Standards
├── Troubleshooting
│   ├── Setup Issues
│   ├── Deployment
│   ├── Paths
│   └── Platforms
├── Releases
│   └── v0.9.1
└── [External Links]
    ├── GitHub →
    ├── Discord →
    └── npm →
```

---

## Part 3: Content Migration Map

### File Mapping (Current → Target)

| Current Location | Target Location | Action |
|------------------|-----------------|--------|
| `index.md` | `welcome.html` | **Rewrite** as rich HTML landing |
| `quickstart.md` | `getting-started/first-project.md` | Migrate + enhance |
| `quickstart-sdlc.md` | `frameworks/sdlc/quickstart.md` | Migrate |
| `quickstart-mmk.md` | `frameworks/marketing/quickstart.md` | Migrate |
| `CLI_USAGE.md` | `reference/cli.md` | Migrate |
| `AGENT-DESIGN.md` | `reference/agent-design.md` | Migrate |
| `production-grade-guide.md` | `frameworks/sdlc/overview.md` | Merge content |
| `reference/ORCHESTRATOR_GUIDE.md` | `reference/orchestrator.md` | Migrate |
| `configuration/model-configuration.md` | `reference/model-config.md` | Migrate |
| `commands/README.md` | `development/commands.md` | Merge with DEVELOPMENT_GUIDE |
| `commands/DEVELOPMENT_GUIDE.md` | `development/commands.md` | Merge |
| `commands/subagents-*.md` | `development/agents.md` | Merge |
| `development/devkit-overview.md` | `development/overview.md` | Migrate |
| `development/addon-creation-guide.md` | `development/addons.md` | Migrate |
| `development/extension-creation-guide.md` | `development/extensions.md` | Migrate |
| `development/framework-creation-guide.md` | `development/frameworks.md` | Migrate |
| `development/walkthrough-create-addon.md` | `development/addons.md` | Merge |
| `integrations/claude-code-quickstart.md` | `platforms/claude-code.md` | Migrate |
| `integrations/factory-quickstart.md` | `platforms/factory-ai.md` | Migrate |
| `integrations/warp-terminal-quickstart.md` | `platforms/warp-terminal.md` | Migrate |
| `integrations/warp-terminal.md` | `platforms/warp-terminal.md` | Merge |
| `integrations/cross-platform-config.md` | `platforms/cross-platform.md` | Migrate |
| `references/README.md` | `research/overview.md` | Migrate |
| `references/REF-001-*.md` | `research/production-workflows.md` | Migrate |
| `references/REF-002-*.md` | `research/failure-modes.md` | Migrate |
| `references/REF-003-*.md` | `research/mcp-spec.md` | Migrate |
| `contributing/contributor-quickstart.md` | `contributing/quickstart.md` | Migrate |
| `contributing/maintainer-review-guide.md` | `contributing/maintainer-guide.md` | Migrate |
| `troubleshooting/index.md` | `troubleshooting/setup.md` | Merge |
| `troubleshooting/setup-issues.md` | `troubleshooting/setup.md` | Merge |
| `troubleshooting/deployment-issues.md` | `troubleshooting/deployment.md` | Migrate |
| `troubleshooting/path-issues.md` | `troubleshooting/paths.md` | Migrate |
| `troubleshooting/platform-issues.md` | `troubleshooting/platforms.md` | Migrate |
| `releases/v0.9.1-announcement.md` | `releases/v0.9.1.md` | Migrate |
| `commands/examples/*` | *Archive or inline* | Evaluate |

### Content Actions by Type

**Rewrite (1 file)**
- `welcome.html` - Marketing-grade landing page with pillars, CTA, social proof

**Merge (7 consolidations)**
- Commands docs → single `development/commands.md`
- Subagent docs → single `development/agents.md`
- Addon + walkthrough → single `development/addons.md`
- Warp docs → single `platforms/warp-terminal.md`
- Troubleshooting index + setup → single `troubleshooting/setup.md`

**Migrate (25+ files)**
- Remove Jekyll frontmatter
- Convert GitHub absolute links to `#section-id` internal links
- Add section anchors for deep linking
- Ensure consistent heading hierarchy

**New Content (5+ files)**
- `frameworks/sdlc/agents.md` - Agent catalog with descriptions
- `frameworks/sdlc/templates.md` - Template reference
- `frameworks/marketing/agents.md` - Agent catalog
- `frameworks/writing/overview.md` - Voice framework intro
- `contributing/quality-standards.md` - Extracted from contributor guide

---

## Part 4: Landing Page Design

### Welcome Page Specification (`config.json`)

```json
{
  "title": "AIWG Documentation",
  "description": "AI-powered workflow guide for SDLC, marketing, and content teams",
  "brandMark": "AIWG",
  "brandSub": "Docs",
  "tagline": "Modular AI workflows for every team",
  "copyright": "AIWG Project",
  "accentColor": "#6366F1",
  "surfaceColor": "#F8FAFC",
  "welcome": {
    "eyebrow": "AI Writing Guide",
    "headline": "Build with 93 AI Agents. Ship Faster.",
    "lead": "Deploy production-ready AI workflows for software development, marketing campaigns, and content creation in minutes.",
    "pillars": [
      "58 SDLC agents manage requirements to deployment",
      "37 marketing agents run campaigns like an agency",
      "Voice framework controls tone across all outputs"
    ],
    "checklist": [
      "Install globally: npm i -g aiwg",
      "Deploy to any project: aiwg use sdlc",
      "Work naturally: just describe what you need"
    ],
    "quickLinks": [
      { "label": "Get Started", "href": "#/getting-started/installation" },
      { "label": "SDLC Framework", "href": "#/frameworks/sdlc/overview" },
      { "label": "View on GitHub", "href": "https://github.com/jmagly/ai-writing-guide" }
    ],
    "quote": "Stop writing prompts. Start shipping software."
  },
  "export": {
    "logo": "embed",
    "logoPath": "favicon.svg",
    "showTagline": true,
    "showDate": true
  }
}
```

### Rich Welcome Page (`content/welcome.html`)

```html
<section class="section doc">
  <header>
    <p class="eyebrow">AI Writing Guide</p>
    <h1>Build with 93 AI Agents. Ship Faster.</h1>
    <p class="lead">Deploy production-ready AI workflows for software development, marketing campaigns, and content creation in minutes.</p>
  </header>

  <div class="doc-grid">
    <article>
      <h2>What You Get</h2>
      <div class="layer-stack">
        <div class="layer">
          <div class="layer-title">SDLC Complete</div>
          <div class="layer-desc">58 agents • 48 commands • 156 templates</div>
        </div>
        <div class="layer">
          <div class="layer-title">Marketing Kit</div>
          <div class="layer-desc">37 agents • 23 commands • 88 templates</div>
        </div>
        <div class="layer">
          <div class="layer-title">Voice Framework</div>
          <div class="layer-desc">4 profiles • 5 skills • Custom voices</div>
        </div>
      </div>
    </article>

    <article>
      <h2>Platform Support</h2>
      <table class="spec-table">
        <thead>
          <tr><th>Platform</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Claude Code</td><td>✅ Multi-agent</td></tr>
          <tr><td>Factory AI</td><td>✅ Native droids</td></tr>
          <tr><td>Warp Terminal</td><td>✅ Terminal-native</td></tr>
          <tr><td>Cursor / Windsurf</td><td>🟡 Experimental</td></tr>
        </tbody>
      </table>
    </article>
  </div>

  <div class="content-box">
    <div class="box-title">Quick Start</div>
    <pre><code class="language-bash"># Install globally
npm install -g aiwg

# Deploy to your project
cd your-project
aiwg use sdlc

# Start working
claude .
# "transition to elaboration"
# "run security review"
# "where are we?"</code></pre>
  </div>

  <div class="doc-grid">
    <a href="#/getting-started/installation" class="card">
      <h3>Installation</h3>
      <p>Get AIWG running in 60 seconds</p>
    </a>
    <a href="#/frameworks/sdlc/overview" class="card">
      <h3>SDLC Framework</h3>
      <p>Manage projects like an enterprise</p>
    </a>
    <a href="#/frameworks/marketing/overview" class="card">
      <h3>Marketing Kit</h3>
      <p>Run campaigns like an agency</p>
    </a>
    <a href="https://github.com/jmagly/ai-writing-guide" class="external-cta">
      View on GitHub →
    </a>
  </div>
</section>
```

---

## Part 5: Pagenary Enhancements for AIWG

### Required Enhancements (Must-Have)

1. **Version Badge Component**
   - Display npm version dynamically in docs
   - Pagenary could support a simple `{{npm:package-name}}` token or JS module

2. **Code Copy Button**
   - One-click copy for code blocks
   - Standard docs feature, increases usability

3. **Multi-Tenant URL Routing**
   - AIWG docs should be accessible at `docs.aiwg.dev` or similar
   - Requires domain configuration in `tenants.json`

### Nice-to-Have Enhancements

4. **Versioned Documentation**
   - Support for `/v0.9/`, `/v1.0/` prefixes
   - Could be multiple tenants (`aiwg-docs-v09`, `aiwg-docs-v10`) or git ref support

5. **Edit on GitHub Link**
   - "Edit this page" link in each content page
   - Could be config option: `"editBaseUrl": "https://github.com/jmagly/ai-writing-guide/edit/main/docs/"`

6. **Breadcrumb Navigation**
   - Show current location: `AIWG > Frameworks > SDLC > Agents`
   - Improves navigation for deep content

7. **Dark Mode Toggle**
   - Respect system preference + manual toggle
   - Already supported via CSS vars, needs UI toggle

8. **API Reference Auto-Generation**
   - Parse `registry.json` or agent files to generate reference pages
   - Could be a build plugin for Pagenary

### Marketing Enhancements

9. **Hero Section Variants**
   - Current welcome config is good, but could support:
   - Video background
   - Animated statistics counters
   - Testimonial carousel

10. **SEO Enhancements**
    - JSON-LD structured data
    - Open Graph meta tags (already partially supported)
    - Sitemap.xml generation

---

## Part 6: Implementation Phases

### Phase 1: Foundation (Week 1)

**Tasks:**
1. Create tenant directory structure at `/home/manitcor/integro/dbbuilder/tenants/aiwg-docs/`
2. Create `config.json` with branding
3. Create root `manifest.json` with navigation skeleton
4. Create `content/` directory structure
5. Add `.public/` assets (favicon, logo)
6. Register tenant in `tenants.json`
7. Verify build: `npm run build:tenants aiwg-docs`

**Deliverable:** Empty but navigable site structure

### Phase 2: Core Content Migration (Week 2)

**Tasks:**
1. Migrate Getting Started docs (3 files)
2. Migrate Platform docs (4 files)
3. Migrate Troubleshooting docs (4 files)
4. Migrate Reference docs (4 files)
5. Fix internal links (GitHub → `#section-id`)
6. Remove Jekyll frontmatter
7. Add section `_manifest.json` files

**Deliverable:** Navigable docs with core content

### Phase 3: Framework Documentation (Week 3)

**Tasks:**
1. Create SDLC section (6 files)
   - Consolidate from quickstart-sdlc, production-grade-guide
   - Add agent catalog, command reference, template index
2. Create Marketing section (4 files)
   - Consolidate from quickstart-mmk
   - Add agent catalog, workflow guide
3. Create Writing section (3 files)
   - Voice profiles, skills, overview

**Deliverable:** Complete framework documentation

### Phase 4: Development & Contributing (Week 4)

**Tasks:**
1. Consolidate command docs (3 → 1)
2. Consolidate agent docs (3 → 1)
3. Migrate addon/extension/framework guides
4. Migrate contributing docs
5. Extract quality standards to separate page

**Deliverable:** Complete developer documentation

### Phase 5: Polish & Launch (Week 5)

**Tasks:**
1. Create rich `welcome.html` landing page
2. Add research section docs
3. Add releases section
4. Create custom `overrides/styles.css` if needed
5. SEO optimization (meta tags, descriptions)
6. Test all internal links
7. Test export functionality
8. Configure custom domain
9. Deploy to production

**Deliverable:** Production-ready documentation site

---

## Part 7: Tenant Registration

Add to `/home/manitcor/integro/dbbuilder/apps/publisher/tenants.json`:

```json
{
  "aiwg-docs": {
    "enabled": true,
    "source": {
      "type": "local",
      "path": "/home/manitcor/.local/share/ai-writing-guide/docs-site"
    },
    "target": {
      "type": "local",
      "path": "./dist/aiwg-docs"
    },
    "domains": ["docs.aiwg.dev", "aiwg-docs.local"],
    "strictLinks": true
  }
}
```

Alternative: Git source for CI/CD builds:

```json
{
  "aiwg-docs": {
    "source": {
      "type": "git",
      "url": "https://github.com/jmagly/ai-writing-guide.git",
      "ref": "main",
      "path": "docs-site/"
    }
  }
}
```

---

## Part 8: Metrics & Success Criteria

### Migration Metrics

| Metric | Target |
|--------|--------|
| Files migrated | 40 → 35 (consolidation) |
| Broken links | 0 |
| Build warnings | 0 |
| Search index coverage | 100% |
| Mobile responsiveness | Pass |

### User Experience Metrics

| Metric | Target |
|--------|--------|
| Time to first content | < 2s |
| Search latency | < 200ms |
| Export success rate | 100% |
| Navigation depth | Max 3 clicks to any page |

### Content Quality Metrics

| Metric | Target |
|--------|--------|
| Pages with summaries | 100% |
| Pages with code examples | > 80% |
| Diagrams per framework section | ≥ 1 |
| External links with indicators | 100% |

---

## Part 9: Risk Mitigation

### Risk 1: Link Breakage
- **Mitigation:** Create redirect map from old paths to new
- **Fallback:** Keep Jekyll site running at `/docs/` temporarily

### Risk 2: SEO Impact
- **Mitigation:** Proper redirects, maintain URL structure where possible
- **Fallback:** Submit updated sitemap to search engines

### Risk 3: Content Loss
- **Mitigation:** Git versioning, incremental migration
- **Fallback:** Easy rollback via git

### Risk 4: Build Complexity
- **Mitigation:** CI/CD for automated builds
- **Fallback:** Manual builds on release branches

---

## Appendix A: File Inventory

Current docs/ files (40 total):

```
docs/
├── index.md                                    [Rewrite]
├── quickstart.md                               [Migrate]
├── quickstart-sdlc.md                          [Migrate]
├── quickstart-mmk.md                           [Migrate]
├── CLI_USAGE.md                                [Migrate]
├── AGENT-DESIGN.md                             [Migrate]
├── production-grade-guide.md                   [Merge]
├── _config.yml                                 [Delete]
├── commands/
│   ├── README.md                               [Merge]
│   ├── DEVELOPMENT_GUIDE.md                    [Merge]
│   ├── subagents-README.md                     [Merge]
│   ├── subagents-and-commands-guide.md         [Merge]
│   └── examples/                               [Archive]
├── configuration/
│   └── model-configuration.md                  [Migrate]
├── contributing/
│   ├── contributor-quickstart.md               [Migrate]
│   └── maintainer-review-guide.md              [Migrate]
├── development/
│   ├── devkit-overview.md                      [Migrate]
│   ├── addon-creation-guide.md                 [Migrate+Merge]
│   ├── extension-creation-guide.md             [Migrate]
│   ├── framework-creation-guide.md             [Migrate]
│   └── walkthrough-create-addon.md             [Merge]
├── integrations/
│   ├── claude-code-quickstart.md               [Migrate]
│   ├── factory-quickstart.md                   [Migrate]
│   ├── warp-terminal-quickstart.md             [Migrate]
│   ├── warp-terminal.md                        [Merge]
│   └── cross-platform-config.md                [Migrate]
├── reference/
│   └── ORCHESTRATOR_GUIDE.md                   [Migrate]
├── references/
│   ├── README.md                               [Migrate]
│   ├── REF-001-production-grade-agentic-workflows.md   [Migrate]
│   ├── REF-002-llm-failure-modes-agentic.md           [Migrate]
│   └── REF-003-mcp-specification-2025.md              [Migrate]
├── releases/
│   └── v0.9.1-announcement.md                  [Migrate]
└── troubleshooting/
    ├── index.md                                [Merge]
    ├── setup-issues.md                         [Merge]
    ├── deployment-issues.md                    [Migrate]
    ├── path-issues.md                          [Migrate]
    └── platform-issues.md                      [Migrate]
```

---

## Appendix B: Command Reference

```bash
# Development workflow
cd /home/manitcor/integro/dbbuilder/apps/publisher

# Build AIWG docs
npm run build:tenants aiwg-docs

# Serve locally
npm run serve
# Visit http://localhost:5173/aiwg-docs/

# Local domain testing
# Add to /etc/hosts: 127.0.0.1 aiwg-docs.local
npm run caddy:up
# Visit http://aiwg-docs.local

# Content validation
npm run lint:content
npm run check:seo
```

---

## Next Steps

1. **Review this plan** - Confirm structure, priorities, timeline
2. **Create tenant skeleton** - Phase 1 foundation
3. **Begin migration** - Start with Getting Started section
4. **Iterate** - Review each section before moving to next
5. **Launch** - Configure domain, deploy to production

---

*Plan created: 2025-12-12*
*Target completion: 5 weeks from start*
