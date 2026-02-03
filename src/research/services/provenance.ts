/**
 * Provenance service for W3C PROV tracking
 *
 * @module research/services/provenance
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { ProvenanceRecord, ProvenanceActivity, ProvenanceChain } from './types.js';

/**
 * Configuration for provenance service
 */
export interface ProvenanceConfig {
  /** Provenance records directory */
  recordsDir?: string;
  /** Enable automatic record persistence */
  autoPersist?: boolean;
}

/**
 * Provenance service for W3C PROV-compliant tracking
 */
export class ProvenanceService {
  private recordsDir: string;
  private autoPersist: boolean;
  private records: Map<string, ProvenanceRecord>;

  constructor(config: ProvenanceConfig = {}) {
    this.recordsDir = config.recordsDir || '.aiwg/research/provenance/records';
    this.autoPersist = config.autoPersist !== false;
    this.records = new Map();
  }

  /**
   * Record a provenance activity
   */
  async recordActivity(activity: ProvenanceActivity): Promise<ProvenanceRecord> {
    const recordId = this.generateRecordId();
    const timestamp = new Date().toISOString();

    // Create entity for each output
    const entities = activity.outputs.map((outputId) => ({
      id: outputId,
      type: 'artifact',
      attributes: {},
    }));

    // For simplicity, use first output as primary entity
    const primaryEntity = entities[0] || {
      id: 'unknown',
      type: 'artifact',
      attributes: {},
    };

    const record: ProvenanceRecord = {
      id: recordId,
      timestamp,
      entity: primaryEntity,
      activity: {
        id: this.generateActivityId(activity.type),
        type: activity.type,
        startedAt: timestamp,
        endedAt: timestamp,
        attributes: {
          description: activity.description,
          ...activity.metadata,
        },
      },
      agent: {
        id: activity.agentId,
        type: 'software_agent',
        attributes: {},
      },
      relationships: {
        wasGeneratedBy: this.generateActivityId(activity.type),
        wasDerivedFrom: activity.inputs,
        wasAttributedTo: activity.agentId,
        wasAssociatedWith: activity.agentId,
      },
    };

    // Store in memory
    this.records.set(recordId, record);

    // Persist if enabled
    if (this.autoPersist) {
      await this.persistRecord(record);
    }

    return record;
  }

  /**
   * Query lineage (provenance chain) for an entity
   */
  async queryLineage(entityId: string): Promise<ProvenanceChain> {
    const activities: Array<{
      activity: ProvenanceActivity;
      timestamp: string;
      agent: string;
    }> = [];

    const sources: string[] = [];
    const derived: string[] = [];

    // Search through records
    for (const record of this.records.values()) {
      // Check if this record involves the entity
      if (
        record.entity.id === entityId ||
        record.relationships.wasDerivedFrom?.includes(entityId)
      ) {
        // Reconstruct activity
        const activity: ProvenanceActivity = {
          type: record.activity.type as
            | 'acquisition'
            | 'transformation'
            | 'analysis'
            | 'validation',
          description: String(
            record.activity.attributes.description || ''
          ),
          agentId: record.agent.id,
          inputs: record.relationships.wasDerivedFrom || [],
          outputs: [record.entity.id],
          metadata: record.activity.attributes,
        };

        activities.push({
          activity,
          timestamp: record.timestamp,
          agent: record.agent.id,
        });

        // Track sources and derived
        if (
          record.relationships.wasDerivedFrom &&
          record.relationships.wasDerivedFrom.length === 0
        ) {
          sources.push(record.entity.id);
        }

        if (record.relationships.wasDerivedFrom?.includes(entityId)) {
          derived.push(record.entity.id);
        }
      }
    }

    return {
      entityId,
      activities,
      sources,
      derived,
    };
  }

  /**
   * Validate provenance chain integrity
   */
  async validateChain(chainId: string): Promise<boolean> {
    // Load chain
    const chain = await this.queryLineage(chainId);

    // Check that all activities are connected
    const allInputs = new Set<string>();
    const allOutputs = new Set<string>();

    for (const { activity } of chain.activities) {
      activity.inputs.forEach((input) => allInputs.add(input));
      activity.outputs.forEach((output) => allOutputs.add(output));
    }

    // All inputs (except sources) should be outputs of other activities
    for (const input of allInputs) {
      if (!chain.sources.includes(input) && !allOutputs.has(input)) {
        return false; // Broken chain
      }
    }

    return true;
  }

  /**
   * Export provenance in specified format
   */
  async exportPROV(format: 'json' | 'turtle'): Promise<string> {
    if (format === 'json') {
      return this.exportJSON();
    } else if (format === 'turtle') {
      return this.exportTurtle();
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Export as PROV-JSON
   */
  private exportJSON(): string {
    const provDoc = {
      prefix: {
        prov: 'http://www.w3.org/ns/prov#',
        aiwg: 'urn:aiwg:',
      },
      entity: {} as Record<string, unknown>,
      activity: {} as Record<string, unknown>,
      agent: {} as Record<string, unknown>,
      wasGeneratedBy: {} as Record<string, unknown>,
      wasDerivedFrom: {} as Record<string, unknown>,
      wasAttributedTo: {} as Record<string, unknown>,
      wasAssociatedWith: {} as Record<string, unknown>,
    };

    for (const record of this.records.values()) {
      // Add entity
      provDoc.entity[record.entity.id] = record.entity.attributes;

      // Add activity
      provDoc.activity[record.activity.id] = {
        'prov:startedAtTime': record.activity.startedAt,
        'prov:endedAtTime': record.activity.endedAt,
        ...record.activity.attributes,
      };

      // Add agent
      provDoc.agent[record.agent.id] = record.agent.attributes;

      // Add relationships
      if (record.relationships.wasGeneratedBy) {
        provDoc.wasGeneratedBy[record.entity.id] = {
          'prov:entity': record.entity.id,
          'prov:activity': record.relationships.wasGeneratedBy,
        };
      }

      if (record.relationships.wasDerivedFrom) {
        for (const source of record.relationships.wasDerivedFrom) {
          provDoc.wasDerivedFrom[`${record.entity.id}-${source}`] = {
            'prov:generatedEntity': record.entity.id,
            'prov:usedEntity': source,
          };
        }
      }

      if (record.relationships.wasAttributedTo) {
        provDoc.wasAttributedTo[record.entity.id] = {
          'prov:entity': record.entity.id,
          'prov:agent': record.relationships.wasAttributedTo,
        };
      }

      if (record.relationships.wasAssociatedWith) {
        provDoc.wasAssociatedWith[record.activity.id] = {
          'prov:activity': record.activity.id,
          'prov:agent': record.relationships.wasAssociatedWith,
        };
      }
    }

    return JSON.stringify(provDoc, null, 2);
  }

  /**
   * Export as PROV-Turtle (simplified)
   */
  private exportTurtle(): string {
    const lines: string[] = [
      '@prefix prov: <http://www.w3.org/ns/prov#> .',
      '@prefix aiwg: <urn:aiwg:> .',
      '',
    ];

    for (const record of this.records.values()) {
      // Entity
      lines.push(`aiwg:${record.entity.id} a prov:Entity .`);

      // Activity
      lines.push(`aiwg:${record.activity.id} a prov:Activity ;`);
      lines.push(
        `  prov:startedAtTime "${record.activity.startedAt}"^^xsd:dateTime ;`
      );
      lines.push(
        `  prov:endedAtTime "${record.activity.endedAt}"^^xsd:dateTime .`
      );

      // Agent
      lines.push(`aiwg:${record.agent.id} a prov:Agent .`);

      // Relationships
      if (record.relationships.wasGeneratedBy) {
        lines.push(
          `aiwg:${record.entity.id} prov:wasGeneratedBy aiwg:${record.relationships.wasGeneratedBy} .`
        );
      }

      if (record.relationships.wasDerivedFrom) {
        for (const source of record.relationships.wasDerivedFrom) {
          lines.push(
            `aiwg:${record.entity.id} prov:wasDerivedFrom aiwg:${source} .`
          );
        }
      }

      if (record.relationships.wasAttributedTo) {
        lines.push(
          `aiwg:${record.entity.id} prov:wasAttributedTo aiwg:${record.relationships.wasAttributedTo} .`
        );
      }

      if (record.relationships.wasAssociatedWith) {
        lines.push(
          `aiwg:${record.activity.id} prov:wasAssociatedWith aiwg:${record.relationships.wasAssociatedWith} .`
        );
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Persist record to disk
   */
  private async persistRecord(record: ProvenanceRecord): Promise<void> {
    const filename = `${record.id}.json`;
    const filepath = join(this.recordsDir, filename);

    // Ensure directory exists
    await this.ensureDir(this.recordsDir);

    await fs.writeFile(filepath, JSON.stringify(record, null, 2), 'utf-8');
  }

  /**
   * Generate record ID
   */
  private generateRecordId(): string {
    return `prov-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate activity ID
   */
  private generateActivityId(type: string): string {
    return `activity-${type}-${Date.now()}`;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
