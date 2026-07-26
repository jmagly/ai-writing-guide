/**
 * Agent Skills health diagnostics for managed imports and active projections.
 *
 * @implements #1878
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  listProviderDefinitions,
  resolveProviderPathValue,
} from '../providers/provider-definitions.js';
import {
  AGENT_SKILLS_BASELINE,
  type AgentSkillDiagnostic,
} from './agent-skills.js';
import { listImportedAgentSkills } from './importer.js';
import type { AgentSkillImportResult } from './types.js';
import { validateAgentSkillFile } from './validator.js';

export interface AgentSkillsDoctorSection {
  diagnostics: AgentSkillDiagnostic[];
  output: string;
  hasFailures: boolean;
}

function diagnostic(
  code: string,
  severity: AgentSkillDiagnostic['severity'],
  file: string,
  yamlPath: string,
  message: string,
  remediation: string,
): AgentSkillDiagnostic {
  return {
    code,
    severity,
    file,
    yamlPath,
    message,
    upstreamBaseline: AGENT_SKILLS_BASELINE.revision,
    remediation,
  };
}

function projectionRoot(provider: ReturnType<typeof listProviderDefinitions>[number], projectDir: string): string {
  const namespace = provider.skillNamespace;
  const configured = namespace.pathType === 'home-dir'
    ? `~/${namespace.skillsBaseDir}`
    : namespace.skillsBaseDir;
  return resolveProviderPathValue(configured, projectDir);
}

export function buildAgentSkillsDoctorSection(
  projectDir: string,
): AgentSkillsDoctorSection {
  const diagnostics: AgentSkillDiagnostic[] = [];
  let imported: AgentSkillImportResult[];
  try {
    imported = listImportedAgentSkills(projectDir);
  } catch (error) {
    diagnostics.push(diagnostic(
      'AS_DOCTOR_IMPORT_STORE',
      'error',
      path.join(projectDir, '.aiwg', 'skills', 'imported'),
      '$',
      `managed Agent Skills store is invalid: ${error instanceof Error ? error.message : String(error)}`,
      'Inspect or restore the managed import manifest, then re-import the source.',
    ));
    imported = [];
  }

  for (const skill of imported) {
    diagnostics.push(...skill.diagnostics);
    const sourceFile = path.join(skill.managedLocation, 'SKILL.md');
    if (!fs.existsSync(sourceFile)) {
      diagnostics.push(diagnostic(
        'AS_DOCTOR_SOURCE_MISSING',
        'error',
        sourceFile,
        '$',
        `managed source for "${skill.name}" is missing SKILL.md`,
        'Restore the managed import with an explicit forced import.',
      ));
      continue;
    }
    diagnostics.push(...validateAgentSkillFile(sourceFile, {
      profile: skill.validationProfile,
      directoryName: skill.name,
    }).diagnostics);

    if (skill.trust.activation !== 'active') continue;
    const sourceBytes = fs.readFileSync(sourceFile);
    for (const provider of listProviderDefinitions()
      .sort((left, right) => left.id.localeCompare(right.id))) {
      const deployedFile = path.join(
        projectionRoot(provider, projectDir),
        skill.name,
        'SKILL.md',
      );
      if (!fs.existsSync(deployedFile)) {
        diagnostics.push(diagnostic(
          'AS_DOCTOR_PROVIDER_DEGRADED',
          'warning',
          deployedFile,
          '$',
          `active imported skill "${skill.name}" is not projected to provider "${provider.id}"`,
          `Deploy or repair the ${provider.id} Agent Skills projection.`,
        ));
        continue;
      }
      const deployedStat = fs.lstatSync(deployedFile);
      if (
        deployedStat.isSymbolicLink()
        || !deployedStat.isFile()
        || !fs.readFileSync(deployedFile).equals(sourceBytes)
      ) {
        diagnostics.push(diagnostic(
          'AS_DOCTOR_DEPLOYED_DRIFT',
          'error',
          deployedFile,
          '$',
          `provider "${provider.id}" projection for "${skill.name}" differs from its managed source`,
          `Redeploy "${skill.name}" to ${provider.id} from the managed import.`,
        ));
      }
    }
  }

  const unique = [...new Map(diagnostics.map((item) => [
    [
      item.file,
      item.code,
      item.yamlPath,
      item.message,
    ].join('\0'),
    item,
  ])).values()].sort((left, right) => (
    left.file.localeCompare(right.file)
    || left.code.localeCompare(right.code)
    || left.yamlPath.localeCompare(right.yamlPath)
    || left.message.localeCompare(right.message)
  ));
  const lines = ['\n── Agent Skills conformance ──'];
  if (imported.length === 0 && unique.length === 0) {
    lines.push('  ✓ no managed Agent Skills imports');
  } else if (unique.length === 0) {
    lines.push(`  ✓ ${imported.length} managed import(s) conform and have no detected drift`);
  } else {
    for (const item of unique) {
      const mark = item.severity === 'error' ? '✗' : '⚠';
      lines.push(`  ${mark} ${item.code} ${item.file}: ${item.message}`);
      lines.push(`      Fix: ${item.remediation}`);
    }
  }
  return {
    diagnostics: unique,
    output: lines.join('\n'),
    hasFailures: unique.some((item) => item.severity === 'error'),
  };
}
