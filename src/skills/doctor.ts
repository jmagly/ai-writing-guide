/**
 * Agent Skills health diagnostics for managed imports and active projections.
 *
 * @implements #1878
 */

import fs from 'node:fs';
import path from 'node:path';
import { listProviderDefinitions } from '../providers/provider-definitions.js';
import {
  AGENT_SKILLS_BASELINE,
  type AgentSkillDiagnostic,
} from './agent-skills.js';
import { inspectImportedAgentSkillProjection } from './deployer.js';
import { listImportedAgentSkills } from './importer.js';
import type { AgentSkillImportResult } from './types.js';
import { validateAgentSkillFile } from './validator.js';

export interface AgentSkillsDoctorSection {
  diagnostics: AgentSkillDiagnostic[];
  output: string;
  hasFailures: boolean;
}

export interface AgentSkillsDoctorOptions {
  homeDir?: string;
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

export function buildAgentSkillsDoctorSection(
  projectDir: string,
  options: AgentSkillsDoctorOptions = {},
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
    for (const provider of listProviderDefinitions()
      .sort((left, right) => left.id.localeCompare(right.id))) {
      let inspection;
      try {
        inspection = inspectImportedAgentSkillProjection(skill.name, {
          projectDir,
          homeDir: options.homeDir,
          target: provider.id,
          dryRun: true,
        });
      } catch (error) {
        diagnostics.push(diagnostic(
          'AS_DOCTOR_PROJECTION_PLAN',
          'error',
          sourceFile,
          '$',
          `provider "${provider.id}" projection for "${skill.name}" cannot be planned: ${
            error instanceof Error ? error.message : String(error)
          }`,
          `Repair the managed import, then redeploy "${skill.name}" to ${provider.id}.`,
        ));
        continue;
      }

      if (!inspection.supported) {
        diagnostics.push(diagnostic(
          'AS_DOCTOR_PROVIDER_UNSUPPORTED',
          'warning',
          inspection.path,
          '$',
          `provider "${provider.id}" cannot project active imported skill "${skill.name}": ${inspection.reasons.join('; ')}`,
          `Use a supported provider surface or retain "${skill.name}" in the managed import store.`,
        ));
      } else if (!inspection.exists) {
        diagnostics.push(diagnostic(
          'AS_DOCTOR_PROVIDER_DEGRADED',
          'warning',
          inspection.path,
          '$',
          `active imported skill "${skill.name}" is not projected to provider "${provider.id}"`,
          `Deploy or repair the ${provider.id} Agent Skills projection.`,
        ));
      } else if (!inspection.managed || !inspection.matches) {
        diagnostics.push(diagnostic(
          'AS_DOCTOR_DEPLOYED_DRIFT',
          'error',
          inspection.path,
          '$',
          `provider "${provider.id}" projection for "${skill.name}" differs from its expected strict managed projection`,
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
