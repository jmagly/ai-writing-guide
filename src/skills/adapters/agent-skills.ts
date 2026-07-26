/**
 * Managed Agent Skills adapter.
 *
 * Imported sources remain separate from provider deployments. This adapter
 * supports inspection and import only; provider projection is implemented by
 * the deployment layer.
 *
 * @implements #1877
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  AgentSkillImportOptions,
  AgentSkillImportResult,
  AgentSkillImportSource,
  RegistryAdapter,
  SkillDetails,
  SkillResult,
} from '../types.js';
import {
  getImportedAgentSkill,
  importAgentSkill,
  listImportedAgentSkills,
} from '../importer.js';

export class AgentSkillsAdapter implements RegistryAdapter {
  readonly id = 'agentskills';
  readonly name = 'Agent Skills (Managed Imports)';

  constructor(private readonly projectDir?: string) {}

  private resolveProjectDir(): string {
    return this.projectDir ?? process.cwd();
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async list(): Promise<SkillResult[]> {
    return listImportedAgentSkills(this.resolveProjectDir()).map((record) => ({
      name: record.name,
      description: record.description,
      source: this.id,
      installed: true,
    }));
  }

  async search(query: string): Promise<SkillResult[]> {
    const normalized = query.toLowerCase();
    return (await this.list()).filter((skill) => (
      skill.name.toLowerCase().includes(normalized)
      || skill.description.toLowerCase().includes(normalized)
    ));
  }

  async info(name: string): Promise<SkillDetails | undefined> {
    const record = getImportedAgentSkill(this.resolveProjectDir(), name);
    if (!record) return undefined;
    const skillPath = path.join(record.managedLocation, 'SKILL.md');
    const managedDrift = record.diagnostics.some(
      (item) => item.code === 'AS_IMPORT_MANAGED_DRIFT',
    );
    return {
      name: record.name,
      description: record.description,
      source: this.id,
      installed: true,
      path: skillPath,
      content: managedDrift ? undefined : fs.readFileSync(skillPath, 'utf8'),
      imported: record,
    };
  }

  async importSource(
    source: AgentSkillImportSource,
    options: AgentSkillImportOptions,
  ): Promise<AgentSkillImportResult> {
    return importAgentSkill(source, options);
  }
}
