# Feature Design: Generic Plugin Status Command

**Feature ID**: FID-008 (future)
**Feature Name**: Universal Plugin Status and Health Monitoring
**Created**: 2025-10-19
**Status**: DESIGN DOCUMENTED (not yet prioritized)
**Depends On**: FID-007 (Framework-Scoped Workspace Management)

---

## Intent

Create a **generic plugin status command** that works for ALL pluggable components in the AIWG ecosystem, not just frameworks. This future-proofs the system for add-ons, extensions, and any other pluggable options we add later.

---

## User Experience

### Command Syntax

```bash
# Show all installed plugins
aiwg -status

# Filter by type
aiwg -status --type frameworks
aiwg -status --type add-ons
aiwg -status --type extensions

# Check specific plugin
aiwg -status sdlc-complete

# Show verbose details (projects, health, versions)
aiwg -status --verbose
```

### Example Output

```
AI Writing Guide - Plugin Status
================================================================================

FRAMEWORKS (2 installed)
┌────────────────┬─────────┬──────────────┬──────────┬─────────────────┐
│ ID             │ Version │ Installed    │ Projects │ Health          │
├────────────────┼─────────┼──────────────┼──────────┼─────────────────┤
│ sdlc-complete  │ 1.0.0   │ 2025-10-18   │ 2        │ ✓ HEALTHY       │
│ marketing-flow │ 1.0.0   │ 2025-10-19   │ 1        │ ✓ HEALTHY       │
└────────────────┴─────────┴──────────────┴──────────┴─────────────────┘

ADD-ONS (1 installed)
┌─────────────────┬─────────┬──────────────┬────────────┬─────────────────┐
│ ID              │ Version │ Installed    │ Framework  │ Health          │
├─────────────────┼─────────┼──────────────┼────────────┼─────────────────┤
│ gdpr-compliance │ 1.0.0   │ 2025-10-18   │ sdlc-comp. │ ✓ HEALTHY       │
└─────────────────┴─────────┴──────────────┴────────────┴─────────────────┘

EXTENSIONS (0 installed)
No custom extensions installed.

WORKSPACE
  Base Path:     .aiwg/
  Legacy Mode:   No (framework-scoped workspace active)
  Total Plugins: 3
  Disk Usage:    125 MB
```

---

## Plugin Types

### 1. Frameworks
**Description**: Complete SDLC/process frameworks with agents, commands, templates

**Examples**:
- `sdlc-complete` - Full software development lifecycle
- `marketing-flow` - Marketing campaign management
- `legal-review` - Legal compliance and contract review
- `agile-lite` - Lightweight agile project management

**Registry Fields**:
- `type: "framework"`
- `repo-path: "frameworks/{framework-id}/repo/"`
- `projects: [...]` - List of active projects
- `health: "healthy" | "warning" | "error"`

### 2. Add-ons
**Description**: Extend existing frameworks with domain-specific capabilities (compliance, industry standards)

**Examples**:
- `gdpr-compliance` - GDPR compliance templates and validation
- `soc2-compliance` - SOC2 audit framework integration
- `hipaa-compliance` - Healthcare compliance (extends SDLC)
- `pci-dss` - Payment card industry standards

**Registry Fields**:
- `type: "add-on"`
- `parent-framework: "sdlc-complete"` - Framework this extends
- `repo-path: "add-ons/{add-on-id}/"`
- `health: "healthy" | "warning" | "error"`

### 3. Extensions
**Description**: Custom user-created plugins (commands, agents, templates) that extend frameworks

**Examples**:
- `custom-security-gates` - User-defined security validation
- `company-templates` - Organization-specific templates
- `integration-hooks` - Custom integrations (Jira, Slack, etc.)

**Registry Fields**:
- `type: "extension"`
- `extends: "sdlc-complete"` - Framework this extends
- `repo-path: "extensions/{extension-id}/"`
- `health: "healthy" | "warning" | "error"`

---

## Unified Plugin Registry Schema

**Location**: `.aiwg/frameworks/registry.json` (rename from framework-only)

```json
{
  "version": "1.0",
  "plugins": [
    {
      "id": "sdlc-complete",
      "type": "framework",
      "name": "SDLC Complete Framework",
      "version": "1.0.0",
      "install-date": "2025-10-18T12:00:00Z",
      "repo-path": "frameworks/sdlc-complete/repo/",
      "projects": ["aiwg-framework", "plugin-system"],
      "health": "healthy",
      "health-checked": "2025-10-19T10:00:00Z"
    },
    {
      "id": "gdpr-compliance",
      "type": "add-on",
      "name": "GDPR Compliance Add-on",
      "version": "1.0.0",
      "install-date": "2025-10-18T14:00:00Z",
      "parent-framework": "sdlc-complete",
      "repo-path": "add-ons/gdpr-compliance/",
      "health": "healthy",
      "health-checked": "2025-10-19T10:00:00Z"
    },
    {
      "id": "custom-security-gates",
      "type": "extension",
      "name": "Custom Security Gates Extension",
      "version": "1.0.0",
      "install-date": "2025-10-19T10:00:00Z",
      "extends": "sdlc-complete",
      "repo-path": "extensions/custom-security-gates/",
      "health": "healthy",
      "health-checked": "2025-10-19T10:00:00Z"
    }
  ]
}
```

---

## Health Check System

### Health Status Levels

| Status | Icon | Description | Action Required |
|--------|------|-------------|-----------------|
| **HEALTHY** | ✓ | All checks passed | None |
| **WARNING** | ⚠️ | Non-critical issues | Review recommended |
| **ERROR** | ❌ | Critical issues | Fix required |

### Health Check Logic

**HEALTHY**: All of:
- ✅ Manifest file exists and parses correctly
- ✅ Required directories present (repo/, projects/ for frameworks)
- ✅ Version compatible with parent framework (for add-ons)
- ✅ No missing required files
- ✅ File integrity validated (checksums if available)
- ✅ Dependencies satisfied (add-ons require parent framework)

**WARNING**: Any of:
- ⚠️ Missing optional files
- ⚠️ Outdated version (newer version available)
- ⚠️ Unused plugin (no active projects for framework)
- ⚠️ Large disk usage (>500MB)

**ERROR**: Any of:
- ❌ Missing manifest file
- ❌ Missing required directories
- ❌ Corrupted manifest (JSON parse error)
- ❌ Incompatible version with parent framework
- ❌ Missing parent framework (for add-ons)
- ❌ Circular dependencies

### Health Checks Performed

1. **Manifest Integrity**
   - File exists: `.aiwg/frameworks/{id}/manifest.json` or `.aiwg/add-ons/{id}/manifest.json`
   - Valid JSON structure
   - Required fields present (id, version, type)

2. **Directory Structure**
   - Framework: `repo/`, `projects/` exist
   - Add-on: `repo/` exists
   - Extension: `repo/` exists

3. **Version Compatibility**
   - Add-on version compatible with parent framework
   - Semantic versioning compliance (major.minor.patch)

4. **File Integrity**
   - Checksum validation if manifest includes checksums
   - No missing required files

5. **Dependency Validation**
   - Add-ons: Parent framework exists and is healthy
   - Extensions: Extended framework exists
   - No circular dependencies

---

## Implementation Components

### 1. PluginRegistry (Update from FrameworkRegistry)

**File**: `tools/workspace/plugin-registry.mjs` (rename from `registry-manager.mjs`)

**Changes**:
- Rename class: `FrameworkRegistry` → `PluginRegistry`
- Add `type` field support (framework | add-on | extension)
- Add `parent-framework` / `extends` field support
- Add `health` and `health-checked` fields
- Add query methods: `getByType()`, `getHealthy()`, `getErrors()`

**Backward Compatibility**:
- Old `frameworks` array maps to `plugins` with `type: "framework"`
- Automatic migration on first load

### 2. HealthChecker (New Component)

**File**: `tools/workspace/health-checker.mjs`

**Responsibilities**:
- Check plugin health (manifest, directories, versions)
- Return health status (healthy | warning | error)
- Generate health report with details
- Cache health checks (5-minute TTL)

**API**:
```javascript
class HealthChecker {
  async checkPlugin(pluginId);
  async checkAll();
  async repairPlugin(pluginId);  // Attempt auto-repair
  getHealthReport(pluginId);     // Detailed report
}
```

### 3. CLI Status Command (New)

**File**: `tools/cli/status-command.mjs`

**Usage**:
```bash
aiwg -status [options]
  --type <frameworks|add-ons|extensions>  Filter by type
  --verbose                                Show detailed info
  <plugin-id>                              Check specific plugin
```

**Output**:
- Table format (frameworks, add-ons, extensions)
- Health status icons (✓ ⚠️ ❌)
- Workspace summary (base path, legacy mode, disk usage)

---

## Use Cases

### UC-1: Check All Plugins
```bash
aiwg -status
# Shows all frameworks, add-ons, extensions with health status
```

### UC-2: Check Frameworks Only
```bash
aiwg -status --type frameworks
# Shows only installed frameworks
```

### UC-3: Check Specific Plugin
```bash
aiwg -status sdlc-complete
# Detailed status for sdlc-complete framework
```

### UC-4: Verbose Mode
```bash
aiwg -status --verbose
# Shows full details: projects, file counts, disk usage, health report
```

### UC-5: Identify Unhealthy Plugins
```bash
aiwg -status | grep ERROR
# Filter for plugins with errors
```

---

## Future Enhancements

### Phase 1 (FID-008): Basic Status
- Unified registry (frameworks + add-ons + extensions)
- Health check system (healthy | warning | error)
- CLI status command (`aiwg -status`)

### Phase 2 (Future): Auto-Repair
- Automatic repair for common issues
- Missing directory recreation
- Manifest validation and correction
- Dependency resolution

### Phase 3 (Future): Marketplace Integration
- Check for updates (`aiwg -status --check-updates`)
- Security advisories
- Plugin ratings and reviews
- Compatibility matrix

### Phase 4 (Future): Monitoring
- Health history tracking
- Alerting for critical issues
- Performance metrics (disk usage trends)
- Anomaly detection

---

## Dependencies

**Requires**:
- FID-007 (Framework-Scoped Workspace Management) - COMPLETE ✅
- FrameworkRegistry → PluginRegistry refactor
- HealthChecker component
- CLI integration

**Blocks**:
- FID-009+ (Future features requiring plugin status)

---

## Acceptance Criteria

**AC-1**: Show status for all plugin types (frameworks, add-ons, extensions)
**AC-2**: Health check identifies healthy, warning, error states
**AC-3**: Filter by type (`--type frameworks`)
**AC-4**: Check specific plugin (aiwg -status sdlc-complete)
**AC-5**: Verbose mode shows detailed info
**AC-6**: Workspace summary (base path, legacy mode, disk usage)
**AC-7**: Backward compatible with existing framework-only registry

---

## Estimated Effort

| Task | Effort | Description |
|------|--------|-------------|
| **PluginRegistry Refactor** | 1h | Rename, add type field, migration logic |
| **HealthChecker Component** | 1h | Health check logic, manifest validation |
| **CLI Status Command** | 1h | Table output, filtering, verbose mode |
| **Testing** | (on-demand) | Manual testing of health checks |
| **Documentation** | 30min | README updates, usage guide |
| **TOTAL** | **3.5h** | **Week 4 or later** |

---

## Notes

- Design captures user intent for generic plugin system
- Avoids framework-only naming (`framework-status` → `status`)
- Extensible for future plugin types (integrations, themes, etc.)
- Health check system provides operational visibility
- Unified registry simplifies management

---

**Status**: Design documented, implementation TBD (Week 4 or later)
**Created**: 2025-10-19
**Author**: Core Orchestrator (Claude Code)
