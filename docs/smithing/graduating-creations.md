# Graduating Smith Creations

When a Smith-created tool proves valuable, you may want to make it permanent - part of an addon, extension, or framework that others can use. This guide covers when and how to graduate Smith creations from project-local assets to permanent AIWG components.

## When to Graduate

**Keep it project-local** when:
- It's specific to your project's needs
- It references project-specific paths, APIs, or configurations
- You're still iterating on the design
- It's a one-off utility

**Graduate to permanent** when:
- You're copying it between projects
- Others ask for the same capability
- It solves a general problem (not project-specific)
- The design has stabilized through use

## Graduation Paths

| Smith Creation | Graduates To | Location |
|----------------|--------------|----------|
| ToolSmith script | Addon utility | `agentic/code/addons/<name>/tools/` |
| MCPSmith server | MCP tool in AIWG server | `src/mcp/tools/` |
| AgentSmith agent | Framework agent | `agentic/code/frameworks/<framework>/agents/` |
| SkillSmith skill | Framework skill | `agentic/code/frameworks/<framework>/skills/` |
| CommandSmith command | Framework command | `agentic/code/frameworks/<framework>/commands/` |

## Step-by-Step: Graduating a ToolSmith Script

### 1. Identify the Candidate

```bash
# Your project-local tool
.aiwg/smiths/toolsmith/scripts/find-security-issues.sh
.aiwg/smiths/toolsmith/tools/find-security-issues.yaml
```

### 2. Generalize the Implementation

Remove project-specific assumptions:

```bash
# Before: hardcoded paths
grep -r "password" /home/user/myproject/src/

# After: parameterized
grep -r "$PATTERN" "${TARGET_DIR:-./src/}"
```

### 3. Create an Addon

```bash
aiwg scaffold-addon security-tools --description "Security scanning utilities"
```

### 4. Move the Tool

```bash
# Copy to addon
cp .aiwg/smiths/toolsmith/scripts/find-security-issues.sh \
   agentic/code/addons/security-tools/tools/

# Update the addon manifest
```

### 5. Add to Addon Manifest

```yaml
# agentic/code/addons/security-tools/addon.json
{
  "name": "security-tools",
  "version": "1.0.0",
  "tools": [
    {
      "name": "find-security-issues",
      "path": "tools/find-security-issues.sh",
      "description": "Scan for common security issues"
    }
  ]
}
```

## Step-by-Step: Graduating an MCPSmith Server

### 1. Identify Value

Your MCP server is used across multiple projects or solves a general problem.

### 2. Extract and Generalize

```bash
# From project-local
.aiwg/smiths/mcpsmith/implementations/github-analyzer/

# Review for hardcoded values
grep -r "hardcoded\|specific\|my-" .aiwg/smiths/mcpsmith/implementations/github-analyzer/
```

### 3. Option A: Add to AIWG MCP Server

For tools that should be available to all AIWG users:

```javascript
// src/mcp/tools/github-analyzer.mjs
export const githubAnalyzerTool = {
  name: 'analyze-github-repo',
  description: 'Analyze a GitHub repository',
  inputSchema: { /* ... */ },
  handler: async (args) => { /* ... */ }
};
```

Register in `src/mcp/server.mjs`.

### 3. Option B: Create Standalone MCP Package

For specialized tools that shouldn't be in the core:

```bash
# Create new package
mkdir -p packages/mcp-github-analyzer
cp -r .aiwg/smiths/mcpsmith/implementations/github-analyzer/* packages/mcp-github-analyzer/

# Publish separately
cd packages/mcp-github-analyzer
npm publish
```

## Step-by-Step: Graduating Agentic Smiths

### AgentSmith → Framework Agent

1. **Copy the definition**:
   ```bash
   cp .claude/agents/accessibility-reviewer.md \
      agentic/code/frameworks/sdlc-complete/agents/
   ```

2. **Add metadata** for deployment:
   ```yaml
   ---
   name: accessibility-reviewer
   description: Reviews code for WCAG accessibility issues
   model: sonnet
   tools: Read, Glob, Grep
   category: analysis
   ---
   ```

3. **Update framework manifest** to include the new agent.

4. **Test deployment**:
   ```bash
   aiwg use sdlc --dry-run
   ```

### SkillSmith → Framework Skill

1. **Move skill directory**:
   ```bash
   cp -r .claude/skills/json-yaml-converter/ \
      agentic/code/frameworks/sdlc-complete/skills/
   ```

2. **Verify SKILL.md format** matches framework conventions.

3. **Add to framework's skills manifest**.

### CommandSmith → Framework Command

1. **Copy command**:
   ```bash
   cp .claude/commands/lint-fix.md \
      agentic/code/frameworks/sdlc-complete/commands/
   ```

2. **Ensure frontmatter** includes required fields:
   ```yaml
   ---
   description: Run linter with auto-fix
   category: development
   argument-hint: "<target> [--fix]"
   allowed-tools: Bash, Read, Write
   ---
   ```

3. **Test with deployment**:
   ```bash
   aiwg use sdlc --deploy-commands --dry-run
   ```

## Choosing the Right Home

### Addon (Standalone Utility)

Best for:
- General-purpose tools not tied to a specific workflow
- Utilities that work with any framework
- Small, focused capabilities

```bash
aiwg scaffold-addon <name>
```

### Extension (Framework Enhancement)

Best for:
- Capabilities that extend a specific framework
- Domain-specific additions (GDPR for SDLC, FTC for Marketing)
- 5-20 agents/commands that form a cohesive set

```bash
aiwg scaffold-extension <name> --for sdlc-complete
```

### Framework Contribution

Best for:
- Core capabilities everyone should have
- Bug fixes or improvements to existing agents
- New commands that fit the framework's mission

Submit a PR to the main repository.

## Testing Graduated Creations

Before graduating, ensure your creation works outside your project:

```bash
# Create a fresh test project
mkdir /tmp/test-graduation
cd /tmp/test-graduation
aiwg -new .

# Deploy your addon/extension
aiwg use sdlc  # or your custom addon

# Test the graduated component
# (run the tool, invoke the agent, use the command)
```

## Documentation Requirements

Graduated creations need:

1. **README** explaining purpose and usage
2. **Examples** showing common use cases
3. **Test cases** (if applicable)
4. **Changelog entry** noting the addition

## Summary

| Stage | Location | Scope | Effort |
|-------|----------|-------|--------|
| Project-local | `.aiwg/smiths/` or `.claude/` | Your project only | Automatic (Smith creates) |
| Addon | `agentic/code/addons/<name>/` | Anyone who installs | Low (scaffold + copy) |
| Extension | `agentic/code/addons/<name>/` | Framework users who opt-in | Medium (design for reuse) |
| Framework | `agentic/code/frameworks/<name>/` | All framework users | Higher (PR + review) |

The path from "I needed this tool" to "everyone can use this tool" is straightforward. Start with Smiths, prove the value, then graduate when it makes sense.

## References

- [Addon Creation Guide](../development/addon-creation-guide.md)
- [Extension Creation Guide](../development/extension-creation-guide.md)
- [DevKit Overview](../development/devkit-overview.md)
- [Contributing Guide](../contributing/contributor-quickstart.md)
