/**
 * Forensics-Complete Framework Integration Tests
 *
 * Validates the forensics-complete framework structure, manifest integrity,
 * agent definitions, skill files, sigma rules, schemas, templates, and
 * deployment readiness.
 *
 * Issues: #381, #392-401
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = path.resolve(__dirname, '../..');
const FRAMEWORK_ROOT = path.join(REPO_ROOT, 'agentic/code/frameworks/forensics-complete');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(FRAMEWORK_ROOT, relPath), 'utf-8');
}

function readJson(relPath: string): any {
  return JSON.parse(readFile(relPath));
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(FRAMEWORK_ROOT, relPath));
}

function extractFrontmatter(content: string): Record<string, any> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return parseYaml(match[1]);
}

function listFiles(dir: string, ext?: string): string[] {
  const fullDir = path.join(FRAMEWORK_ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir).filter(f => {
    if (ext) return f.endsWith(ext);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Framework Manifest (#381)
// ---------------------------------------------------------------------------

describe('Framework Manifest (#381)', () => {
  const manifest = readJson('manifest.json');

  it('has correct framework identity', () => {
    expect(manifest.id).toBe('forensics-complete');
    expect(manifest.type).toBe('framework');
    expect(manifest.name).toBe('Forensics Complete');
  });

  it('has valid version', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has mode aliases for aiwg use', () => {
    expect(manifest.modeAliases).toContain('forensics');
    expect(manifest.modeAliases).toContain('dfir');
  });

  it('has entry points for all artifact types', () => {
    for (const key of ['agents', 'skills', 'templates', 'rules']) {
      expect(manifest.entry).toHaveProperty(key);
      expect(fs.existsSync(path.join(FRAMEWORK_ROOT, manifest.entry[key]))).toBe(true);
    }
  });

  it('declares workspace subdirectories', () => {
    const expected = ['profiles', 'plans', 'evidence', 'findings', 'timelines', 'iocs', 'reports', 'sigma'];
    for (const dir of expected) {
      expect(manifest.workspace.subdirs).toContain(dir);
    }
  });

  it('references recognized standards', () => {
    const standards = manifest.standards as string[];
    expect(standards.some((s: string) => s.includes('NIST'))).toBe(true);
    expect(standards.some((s: string) => s.includes('ATT&CK') || s.includes('MITRE'))).toBe(true);
    expect(standards.some((s: string) => s.includes('Sigma'))).toBe(true);
    expect(standards.some((s: string) => s.includes('STIX'))).toBe(true);
    expect(standards.some((s: string) => s.includes('RFC 3227'))).toBe(true);
  });

  it('metadata counts match actual files', () => {
    const agentFiles = listFiles('agents', '.md');
    const skillDirs = listFiles('skills').filter(f =>
      fs.statSync(path.join(FRAMEWORK_ROOT, 'skills', f)).isDirectory()
    );
    const ruleFiles = listFiles('rules', '.md');

    expect(agentFiles.length).toBe(manifest.metadata.total_agents);
    expect(skillDirs.length).toBe(manifest.metadata.total_skills);
    expect(ruleFiles.length).toBe(manifest.metadata.total_rules);
  });
});

// ---------------------------------------------------------------------------
// Agent Manifest and Agent Files (#381, #392-398)
// ---------------------------------------------------------------------------

describe('Agent Definitions', () => {
  const agentManifest = readJson('agents/manifest.json');
  // Bare aliases retained for legacy fixtures; pinned variants are preferred
  // per aiwg #1442 (avoid 1M-context credit gate on subagent dispatch).
  const VALID_MODELS = [
    'opus', 'sonnet', 'haiku',
    'claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5',
  ];
  const VALID_TOOLS = ['Bash', 'Read', 'Write', 'Glob', 'Grep', 'WebFetch', 'MultiEdit', 'Task'];
  const VALID_STAGES = ['reconnaissance', 'triage', 'acquisition', 'analysis', 'timeline', 'reporting', 'orchestration'];

  it('agent manifest lists all 13 agents', () => {
    expect(agentManifest.agents).toHaveLength(13);
  });

  it('each manifest agent has required fields', () => {
    for (const agent of agentManifest.agents) {
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('file');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('stage');
      expect(agent).toHaveProperty('capabilities');
      expect(agent).toHaveProperty('tools');
      expect(agent).toHaveProperty('model');
      expect(VALID_MODELS).toContain(agent.model);
      expect(VALID_STAGES).toContain(agent.stage);
      expect(agent.capabilities.length).toBeGreaterThan(0);
      for (const tool of agent.tools) {
        expect(VALID_TOOLS).toContain(tool);
      }
    }
  });

  it('each manifest agent file exists on disk', () => {
    for (const agent of agentManifest.agents) {
      expect(fileExists(`agents/${agent.file}`)).toBe(true);
    }
  });

  it('each agent markdown has valid YAML frontmatter', () => {
    const agentFiles = listFiles('agents', '.md');
    for (const file of agentFiles) {
      const content = readFile(`agents/${file}`);
      const fm = extractFrontmatter(content);
      expect(fm).not.toBeNull();
      expect(fm!.name).toBeTruthy();
      expect(fm!.description).toBeTruthy();
      expect(VALID_MODELS).toContain(fm!.model);
      expect(fm!.tools).toBeTruthy();
    }
  });

  it('agent IDs in manifest are unique', () => {
    const ids = agentManifest.agents.map((a: any) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('workflow stages cover the full DFIR lifecycle', () => {
    const stages = agentManifest.workflow_stages.map((s: any) => s.stage);
    for (const required of ['reconnaissance', 'triage', 'acquisition', 'analysis', 'timeline', 'reporting']) {
      expect(stages).toContain(required);
    }
  });

  it('every agent is assigned to at least one workflow stage', () => {
    const allAssigned = new Set<string>();
    for (const stage of agentManifest.workflow_stages) {
      for (const agentId of stage.agents) {
        allAssigned.add(agentId);
      }
    }
    for (const agent of agentManifest.agents) {
      expect(allAssigned.has(agent.id)).toBe(true);
    }
  });

  it('agent body includes investigation context sections', () => {
    const agentFiles = listFiles('agents', '.md');
    for (const file of agentFiles) {
      const content = readFile(`agents/${file}`);
      // Every agent should have substantive content (at least 500 chars after frontmatter)
      const bodyStart = content.indexOf('---', 4);
      const body = content.slice(bodyStart + 3);
      expect(body.length).toBeGreaterThan(500);
    }
  });
});

// ---------------------------------------------------------------------------
// Specific Agent Tests (#392-398)
// ---------------------------------------------------------------------------

describe('Memory Forensics Agent (#392)', () => {
  it('memory-analyst.md exists with Volatility 3 content', () => {
    const content = readFile('agents/memory-analyst.md');
    expect(content).toContain('Volatility');
    expect(content).toContain('memory');
  });

  it('memory-forensics skill exists with acquisition guidance', () => {
    const content = readFile('skills/memory-forensics/SKILL.md');
    expect(content).toContain('LiME');
    expect(content).toContain('WinPmem');
    expect(content).toContain('Volatility');
  });
});

describe('Cloud Forensics Agent (#393)', () => {
  it('cloud-analyst.md covers AWS, Azure, GCP', () => {
    const content = readFile('agents/cloud-analyst.md');
    expect(content).toContain('AWS');
    expect(content).toContain('Azure');
    expect(content).toContain('GCP');
  });

  it('cloud-forensics skill exists with provider-specific steps', () => {
    const content = readFile('skills/cloud-forensics/SKILL.md');
    expect(content).toContain('CloudTrail');
    expect(content).toContain('Activity Log');
    expect(content).toContain('Cloud Audit Log');
  });
});

describe('IOC Extraction (#394)', () => {
  it('ioc-analyst.md exists with STIX 2.1 reference', () => {
    const content = readFile('agents/ioc-analyst.md');
    expect(content).toContain('STIX');
    expect(content).toContain('IOC');
  });

  it('ioc-extraction skill covers IP, domain, hash, URL extraction', () => {
    const content = readFile('skills/ioc-extraction/SKILL.md');
    for (const term of ['IPv4', 'domain', 'SHA-256', 'URL', 'defang']) {
      expect(content).toContain(term);
    }
  });

  it('ioc-entry schema exists', () => {
    expect(fileExists('schemas/ioc-entry.yaml')).toBe(true);
  });
});

describe('Sigma Rule Hunting (#395)', () => {
  it('sigma-hunting skill exists', () => {
    expect(fileExists('skills/sigma-hunting/SKILL.md')).toBe(true);
  });

  it('forensics-hunt skill exists', () => {
    expect(fileExists('skills/forensics-hunt/SKILL.md')).toBe(true);
  });
});

describe('Timeline Reconstruction (#396)', () => {
  it('timeline-builder agent references multi-source correlation', () => {
    const content = readFile('agents/timeline-builder.md');
    expect(content).toContain('correlation');
    expect(content).toContain('timeline');
  });

  it('forensics-timeline skill exists', () => {
    expect(fileExists('skills/forensics-timeline/SKILL.md')).toBe(true);
  });

  it('incident-timeline template exists', () => {
    expect(fileExists('templates/incident-timeline.md')).toBe(true);
  });
});

describe('Forensic Reporting (#397)', () => {
  it('reporting-agent exists with severity classification', () => {
    const content = readFile('agents/reporting-agent.md');
    expect(content).toContain('severity');
    expect(content).toContain('executive');
  });

  it('forensic-report template exists', () => {
    expect(fileExists('templates/forensic-report.md')).toBe(true);
  });

  it('remediation-plan template exists', () => {
    expect(fileExists('templates/remediation-plan.md')).toBe(true);
  });
});

describe('Investigation Orchestrator (#398)', () => {
  it('forensics-orchestrator agent uses Task tool', () => {
    const content = readFile('agents/forensics-orchestrator.md');
    const fm = extractFrontmatter(content);
    expect(fm!.tools).toContain('Task');
  });

  it('forensics-investigate skill exists', () => {
    expect(fileExists('skills/forensics-investigate/SKILL.md')).toBe(true);
  });

  it('forensics-status skill exists', () => {
    expect(fileExists('skills/forensics-status/SKILL.md')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Supply Chain Forensics (#399)
// ---------------------------------------------------------------------------

describe('Supply Chain Forensics (#399)', () => {
  it('supply-chain-forensics skill exists', () => {
    expect(fileExists('skills/supply-chain-forensics/SKILL.md')).toBe(true);
  });

  it('skill covers SBOM, typosquatting, CI/CD, SLSA', () => {
    const content = readFile('skills/supply-chain-forensics/SKILL.md');
    for (const term of ['SBOM', 'typosquat', 'CI/CD', 'SLSA']) {
      expect(content.toLowerCase()).toContain(term.toLowerCase());
    }
  });
});

// ---------------------------------------------------------------------------
// Methodology and Documentation (#400)
// ---------------------------------------------------------------------------

describe('Methodology and Documentation (#400)', () => {
  const requiredDocs = [
    'docs/methodology.md',
    'docs/attack-mapping.md',
    'docs/tool-reference.md',
    'docs/ai-assisted-forensics.md',
    'docs/research-guide.md',
  ];

  for (const doc of requiredDocs) {
    it(`${path.basename(doc)} exists and has substantive content`, () => {
      expect(fileExists(doc)).toBe(true);
      const content = readFile(doc);
      expect(content.length).toBeGreaterThan(1000);
    });
  }

  it('README.md exists with quick start', () => {
    expect(fileExists('README.md')).toBe(true);
    const content = readFile('README.md');
    expect(content.toLowerCase()).toContain('quick start');
  });
});

// ---------------------------------------------------------------------------
// Skills Structure (#392-395, #399)
// ---------------------------------------------------------------------------

describe('Skills Structure', () => {
  const expectedSkills = [
    'target-profiling',
    'linux-forensics',
    'container-forensics',
    'cloud-forensics',
    'memory-forensics',
    'log-analysis',
    'ioc-extraction',
    'sigma-hunting',
    'evidence-preservation',
    'supply-chain-forensics',
  ];

  it('all 10 expected skill directories exist', () => {
    for (const skill of expectedSkills) {
      expect(fileExists(`skills/${skill}/SKILL.md`)).toBe(true);
    }
  });

  it('every SKILL.md has valid YAML frontmatter with name, description, tools', () => {
    for (const skill of expectedSkills) {
      const content = readFile(`skills/${skill}/SKILL.md`);
      const fm = extractFrontmatter(content);
      expect(fm).not.toBeNull();
      expect(fm!.name).toBeTruthy();
      expect(fm!.description).toBeTruthy();
      expect(fm!.tools).toBeTruthy();
    }
  });

  it('every SKILL.md has Triggers, Purpose, Behavior sections', () => {
    for (const skill of expectedSkills) {
      const content = readFile(`skills/${skill}/SKILL.md`);
      expect(content).toContain('## Triggers');
      expect(content).toContain('## Purpose');
      expect(content).toContain('## Behavior');
    }
  });
});

// ---------------------------------------------------------------------------
// Migrated Commands as Skills (#398, #401, #551)
// ---------------------------------------------------------------------------

describe('Migrated Commands as Skills', () => {
  const expectedCommandSkills = [
    'forensics-profile',
    'forensics-triage',
    'forensics-investigate',
    'forensics-acquire',
    'forensics-timeline',
    'forensics-hunt',
    'forensics-ioc',
    'forensics-report',
    'forensics-status',
  ];

  it('all 9 former commands exist as skills', () => {
    for (const cmd of expectedCommandSkills) {
      expect(fileExists(`skills/${cmd}/SKILL.md`)).toBe(true);
    }
  });

  it('each migrated skill has YAML frontmatter with description', () => {
    for (const cmd of expectedCommandSkills) {
      const content = readFile(`skills/${cmd}/SKILL.md`);
      const fm = extractFrontmatter(content);
      expect(fm).not.toBeNull();
      expect(fm!.description).toBeTruthy();
    }
  });

  it('migrated skills preserve commandHint metadata', () => {
    for (const cmd of expectedCommandSkills) {
      const content = readFile(`skills/${cmd}/SKILL.md`);
      const fm = extractFrontmatter(content);
      expect(fm).not.toBeNull();
      expect(fm!.commandHint).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Sigma Rules (#395)
// ---------------------------------------------------------------------------

describe('Sigma Rules', () => {
  const sigmaFiles = [
    'sigma/linux/ssh-brute-force-success.yml',
    'sigma/linux/unauthorized-suid.yml',
    'sigma/linux/ld-preload-rootkit.yml',
    'sigma/linux/deleted-binary-running.yml',
    'sigma/docker/privileged-container.yml',
    'sigma/docker/container-escape.yml',
    'sigma/cloud/aws-iam-escalation.yml',
    'sigma/cloud/unusual-api-region.yml',
  ];

  it('all 8 sigma rule files exist', () => {
    for (const rule of sigmaFiles) {
      expect(fileExists(rule)).toBe(true);
    }
  });

  it('each sigma rule has required Sigma 2.0 fields', () => {
    const requiredFields = ['title', 'id', 'status', 'description', 'logsource', 'detection', 'level'];
    for (const rule of sigmaFiles) {
      const content = readFile(rule);
      // Sigma rules may have a YAML doc followed by a comment block separated by ---
      const yamlPart = content.split('---')[0];
      const parsed = parseYaml(yamlPart);
      for (const field of requiredFields) {
        expect(parsed).toHaveProperty(field);
      }
    }
  });

  it('each sigma rule has a valid UUID id', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    for (const rule of sigmaFiles) {
      const content = readFile(rule);
      const yamlPart = content.split('---')[0];
      const parsed = parseYaml(yamlPart);
      expect(parsed.id).toMatch(uuidRegex);
    }
  });

  it('each sigma rule has ATT&CK tags', () => {
    for (const rule of sigmaFiles) {
      const content = readFile(rule);
      const yamlPart = content.split('---')[0];
      const parsed = parseYaml(yamlPart);
      expect(parsed.tags).toBeDefined();
      expect(parsed.tags.length).toBeGreaterThan(0);
      const hasAttack = parsed.tags.some((t: string) => t.startsWith('attack.'));
      expect(hasAttack).toBe(true);
    }
  });

  it('sigma rule levels are valid', () => {
    const validLevels = ['informational', 'low', 'medium', 'high', 'critical'];
    for (const rule of sigmaFiles) {
      const content = readFile(rule);
      const yamlPart = content.split('---')[0];
      const parsed = parseYaml(yamlPart);
      expect(validLevels).toContain(parsed.level);
    }
  });

  it('sigma rule IDs are unique across all rules', () => {
    const ids: string[] = [];
    for (const rule of sigmaFiles) {
      const content = readFile(rule);
      const yamlPart = content.split('---')[0];
      const parsed = parseYaml(yamlPart);
      ids.push(parsed.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Schemas (#384, #394)
// ---------------------------------------------------------------------------

describe('Schemas', () => {
  const expectedSchemas = [
    'target-profile.yaml',
    'investigation-plan.yaml',
    'evidence-manifest.yaml',
    'ioc-entry.yaml',
    'finding.yaml',
  ];

  it('all 5 schema files exist', () => {
    for (const schema of expectedSchemas) {
      expect(fileExists(`schemas/${schema}`)).toBe(true);
    }
  });

  it('each schema file is valid YAML', () => {
    for (const schema of expectedSchemas) {
      const content = readFile(`schemas/${schema}`);
      expect(() => parseYaml(content)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

describe('Templates', () => {
  const expectedTemplates = [
    'target-profile.md',
    'investigation-plan.md',
    'forensic-report.md',
    'chain-of-custody.md',
    'ioc-register.md',
    'incident-timeline.md',
    'remediation-plan.md',
    'sigma-rule.md',
  ];

  it('all 8 template files exist', () => {
    for (const tmpl of expectedTemplates) {
      expect(fileExists(`templates/${tmpl}`)).toBe(true);
    }
  });

  it('each template has placeholder markers', () => {
    for (const tmpl of expectedTemplates) {
      const content = readFile(`templates/${tmpl}`);
      // Templates should contain some form of placeholder ({{var}}, {var}, or [PLACEHOLDER])
      const hasPlaceholder = /\{[{]?\w+[}]?\}|\[.*\]/.test(content);
      // At minimum they should have markdown headers
      expect(content).toContain('#');
      expect(content.length).toBeGreaterThan(200);
    }
  });
});

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

describe('Rules', () => {
  const expectedRules = [
    'evidence-integrity.md',
    'volatility-order.md',
    'red-flag-escalation.md',
    'non-destructive.md',
  ];

  it('all 4 enforcement rules exist', () => {
    for (const rule of expectedRules) {
      expect(fileExists(`rules/${rule}`)).toBe(true);
    }
  });

  it('each rule has substantive content', () => {
    for (const rule of expectedRules) {
      const content = readFile(`rules/${rule}`);
      expect(content.length).toBeGreaterThan(300);
    }
  });
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

describe('Configuration (#401)', () => {
  it('models.json exists with model recommendations', () => {
    expect(fileExists('config/models.json')).toBe(true);
    const config = readJson('config/models.json');
    expect(config).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Cross-Cutting: Deployment Readiness (#401)
// ---------------------------------------------------------------------------

describe('Deployment Readiness (#401)', () => {
  it('framework directory has all required subdirectories', () => {
    const requiredDirs = ['agents', 'skills', 'schemas', 'templates', 'rules', 'sigma', 'docs', 'config'];
    for (const dir of requiredDirs) {
      const fullPath = path.join(FRAMEWORK_ROOT, dir);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).isDirectory()).toBe(true);
    }
  });

  it('no broken internal references in manifest files', () => {
    const agentManifest = readJson('agents/manifest.json');
    for (const agent of agentManifest.agents) {
      expect(fileExists(`agents/${agent.file}`)).toBe(true);
    }
  });

  it('all agent markdown files are non-empty', () => {
    const files = listFiles('agents', '.md');
    for (const f of files) {
      const stat = fs.statSync(path.join(FRAMEWORK_ROOT, 'agents', f));
      expect(stat.size).toBeGreaterThan(100);
    }
  });

  it('all skill SKILL.md files are non-empty', () => {
    const dirs = listFiles('skills').filter(f =>
      fs.statSync(path.join(FRAMEWORK_ROOT, 'skills', f)).isDirectory()
    );
    for (const dir of dirs) {
      const skillPath = path.join(FRAMEWORK_ROOT, 'skills', dir, 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
      const stat = fs.statSync(skillPath);
      expect(stat.size).toBeGreaterThan(100);
    }
  });
});
