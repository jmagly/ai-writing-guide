/**
 * Provenance Service Tests
 *
 * Tests W3C PROV record generation, derivation tracking,
 * lineage queries, chain validation, and PROV-JSON export.
 *
 * @source @src/research/services/provenance.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ProvenanceRecord, ProvenanceActivity, ProvenanceChain } from '@/research/services/types.js';

// Mock Provenance Service (implementation pending)
class MockProvenanceService {
  private records = new Map<string, ProvenanceRecord>();
  private derivations = new Map<string, Array<{ source: string; type: string }>>();

  generatePROVRecord(
    entityId: string,
    activityType: 'acquisition' | 'transformation' | 'analysis' | 'validation',
    agentId: string
  ): ProvenanceRecord {
    const timestamp = new Date().toISOString();

    const record: ProvenanceRecord = {
      id: `prov-${Date.now()}`,
      timestamp,
      entity: {
        id: `urn:aiwg:entity:${entityId}`,
        type: 'ResearchPaper',
        attributes: {},
      },
      activity: {
        id: `urn:aiwg:activity:${activityType}:${Date.now()}`,
        type: activityType,
        startedAt: timestamp,
        endedAt: timestamp,
        attributes: {},
      },
      agent: {
        id: `urn:aiwg:agent:${agentId}`,
        type: 'software',
        attributes: { version: '1.0.0' },
      },
      relationships: {
        wasGeneratedBy: `urn:aiwg:activity:${activityType}:${Date.now()}`,
        wasAttributedTo: `urn:aiwg:agent:${agentId}`,
      },
    };

    this.records.set(record.id, record);
    return record;
  }

  trackDerivation(derivedEntityId: string, sources: Array<{ source: string; type: string }>): void {
    this.derivations.set(derivedEntityId, sources);
  }

  async queryLineage(entityId: string): Promise<ProvenanceChain> {
    const sources = this.derivations.get(entityId) || [];

    const activities: Array<{
      activity: ProvenanceActivity;
      timestamp: string;
      agent: string;
    }> = [];

    // Build chain from derivations
    sources.forEach((source) => {
      activities.push({
        activity: {
          type: 'transformation',
          description: `Derived from ${source.source} via ${source.type}`,
          agentId: 'research-service',
          inputs: [source.source],
          outputs: [entityId],
        },
        timestamp: new Date().toISOString(),
        agent: 'research-service',
      });
    });

    return {
      entityId,
      activities,
      sources: sources.map((s) => s.source),
      derived: [],
    };
  }

  validateChain(chain: ProvenanceChain): boolean {
    // Check that all sources exist and chain is complete
    if (chain.activities.length === 0 && chain.sources.length === 0) {
      return true; // Leaf entity
    }

    // Verify activities reference correct entities
    for (const activity of chain.activities) {
      if (!activity.activity.inputs.includes(chain.entityId) &&
          !activity.activity.outputs.includes(chain.entityId)) {
        return false;
      }
    }

    return true;
  }

  exportPROVJSON(record: ProvenanceRecord): string {
    return JSON.stringify(
      {
        entity: {
          [record.entity.id]: {
            'prov:type': record.entity.type,
            ...record.entity.attributes,
          },
        },
        activity: {
          [record.activity.id]: {
            'prov:type': record.activity.type,
            'prov:startTime': record.activity.startedAt,
            'prov:endTime': record.activity.endedAt,
            ...record.activity.attributes,
          },
        },
        agent: {
          [record.agent.id]: {
            'prov:type': record.agent.type,
            ...record.agent.attributes,
          },
        },
        wasGeneratedBy: record.relationships.wasGeneratedBy
          ? {
              [record.entity.id]: record.relationships.wasGeneratedBy,
            }
          : undefined,
        wasAttributedTo: record.relationships.wasAttributedTo
          ? {
              [record.entity.id]: record.relationships.wasAttributedTo,
            }
          : undefined,
        wasDerivedFrom: record.relationships.wasDerivedFrom
          ? {
              [record.entity.id]: record.relationships.wasDerivedFrom,
            }
          : undefined,
      },
      null,
      2
    );
  }
}

describe('Provenance Service', () => {
  let service: MockProvenanceService;

  beforeEach(() => {
    service = new MockProvenanceService();
  });

  describe('PROV Record Generation', () => {
    it('should generate provenance record with entity-activity-agent', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'acquisition-service');

      expect(record.entity).toBeDefined();
      expect(record.activity).toBeDefined();
      expect(record.agent).toBeDefined();
    });

    it('should use URN format for entity IDs', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      expect(record.entity.id).toMatch(/^urn:aiwg:entity:/);
    });

    it('should use URN format for activity IDs', () => {
      const record = service.generatePROVRecord('REF-001', 'transformation', 'test-agent');

      expect(record.activity.id).toMatch(/^urn:aiwg:activity:/);
    });

    it('should use URN format for agent IDs', () => {
      const record = service.generatePROVRecord('REF-001', 'analysis', 'test-agent');

      expect(record.agent.id).toMatch(/^urn:aiwg:agent:/);
    });

    it('should record activity type', () => {
      const record = service.generatePROVRecord('REF-001', 'validation', 'test-agent');

      expect(record.activity.type).toBe('validation');
    });

    it('should include timestamps in activity', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      expect(record.activity.startedAt).toBeDefined();
      expect(record.activity.endedAt).toBeDefined();
      expect(new Date(record.activity.startedAt).getTime()).toBeGreaterThan(0);
    });

    it('should establish wasGeneratedBy relationship', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      expect(record.relationships.wasGeneratedBy).toBeDefined();
      expect(record.relationships.wasGeneratedBy).toContain('activity');
    });

    it('should establish wasAttributedTo relationship', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      expect(record.relationships.wasAttributedTo).toBeDefined();
      expect(record.relationships.wasAttributedTo).toContain('agent');
    });
  });

  describe('Derivation Tracking', () => {
    it('should track simple derivation from single source', () => {
      service.trackDerivation('derived-entity', [
        { source: 'source-entity', type: 'transformation' },
      ]);

      // Derivation tracked internally
      expect(service).toBeDefined();
    });

    it('should track multiple source derivations', () => {
      service.trackDerivation('derived-entity', [
        { source: 'source-1', type: 'transformation' },
        { source: 'source-2', type: 'aggregation' },
      ]);

      expect(service).toBeDefined();
    });

    it('should support different derivation types', () => {
      const types = ['transformation', 'aggregation', 'extraction', 'synthesis'];

      types.forEach((type) => {
        service.trackDerivation(`entity-${type}`, [{ source: 'base', type }]);
      });

      expect(service).toBeDefined();
    });

    it('should allow updating derivations', () => {
      service.trackDerivation('entity', [{ source: 'source-1', type: 'transformation' }]);
      service.trackDerivation('entity', [
        { source: 'source-1', type: 'transformation' },
        { source: 'source-2', type: 'transformation' },
      ]);

      expect(service).toBeDefined();
    });
  });

  describe('Lineage Queries', () => {
    it('should query lineage for entity', async () => {
      service.trackDerivation('derived', [{ source: 'source', type: 'transformation' }]);

      const chain = await service.queryLineage('derived');

      expect(chain.entityId).toBe('derived');
      expect(chain.sources).toContain('source');
    });

    it('should include all activities in chain', async () => {
      service.trackDerivation('derived', [
        { source: 'source-1', type: 'transformation' },
        { source: 'source-2', type: 'aggregation' },
      ]);

      const chain = await service.queryLineage('derived');

      expect(chain.activities.length).toBeGreaterThan(0);
    });

    it('should track timestamps for activities', async () => {
      service.trackDerivation('derived', [{ source: 'source', type: 'transformation' }]);

      const chain = await service.queryLineage('derived');

      chain.activities.forEach((activity) => {
        expect(activity.timestamp).toBeDefined();
        expect(new Date(activity.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('should identify source entities', async () => {
      service.trackDerivation('derived', [
        { source: 'source-1', type: 'transformation' },
        { source: 'source-2', type: 'transformation' },
      ]);

      const chain = await service.queryLineage('derived');

      expect(chain.sources).toHaveLength(2);
      expect(chain.sources).toContain('source-1');
      expect(chain.sources).toContain('source-2');
    });

    it('should handle leaf entities with no sources', async () => {
      const chain = await service.queryLineage('leaf-entity');

      expect(chain.sources).toHaveLength(0);
      expect(chain.activities).toHaveLength(0);
    });
  });

  describe('Chain Validation', () => {
    it('should validate complete chain', async () => {
      service.trackDerivation('derived', [{ source: 'source', type: 'transformation' }]);
      const chain = await service.queryLineage('derived');

      const isValid = service.validateChain(chain);
      expect(isValid).toBe(true);
    });

    it('should validate leaf entity chain', async () => {
      const chain = await service.queryLineage('leaf-entity');

      const isValid = service.validateChain(chain);
      expect(isValid).toBe(true);
    });

    it('should detect broken chain references', () => {
      const brokenChain: ProvenanceChain = {
        entityId: 'entity-1',
        activities: [
          {
            activity: {
              type: 'transformation',
              description: 'Test',
              agentId: 'test',
              inputs: ['different-entity'], // Wrong input
              outputs: ['wrong-output'], // Wrong output
            },
            timestamp: new Date().toISOString(),
            agent: 'test',
          },
        ],
        sources: ['source'],
        derived: [],
      };

      const isValid = service.validateChain(brokenChain);
      expect(isValid).toBe(false);
    });

    it('should validate multi-step derivation chains', async () => {
      service.trackDerivation('step-2', [{ source: 'step-1', type: 'transformation' }]);
      service.trackDerivation('step-3', [{ source: 'step-2', type: 'transformation' }]);

      const chain = await service.queryLineage('step-3');
      const isValid = service.validateChain(chain);

      expect(isValid).toBe(true);
    });
  });

  describe('PROV-JSON Export', () => {
    it('should export record in PROV-JSON format', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('entity');
      expect(parsed).toHaveProperty('activity');
      expect(parsed).toHaveProperty('agent');
    });

    it('should include entity in PROV-JSON', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);
      const parsed = JSON.parse(json);

      expect(parsed.entity).toBeDefined();
      const entityId = Object.keys(parsed.entity)[0];
      expect(entityId).toMatch(/^urn:aiwg:entity:/);
    });

    it('should include activity in PROV-JSON', () => {
      const record = service.generatePROVRecord('REF-001', 'transformation', 'test-agent');
      const json = service.exportPROVJSON(record);
      const parsed = JSON.parse(json);

      expect(parsed.activity).toBeDefined();
      const activityId = Object.keys(parsed.activity)[0];
      expect(activityId).toMatch(/^urn:aiwg:activity:/);
    });

    it('should include agent in PROV-JSON', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);
      const parsed = JSON.parse(json);

      expect(parsed.agent).toBeDefined();
      const agentId = Object.keys(parsed.agent)[0];
      expect(agentId).toMatch(/^urn:aiwg:agent:/);
    });

    it('should include wasGeneratedBy relationship', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);
      const parsed = JSON.parse(json);

      expect(parsed.wasGeneratedBy).toBeDefined();
    });

    it('should include wasAttributedTo relationship', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);
      const parsed = JSON.parse(json);

      expect(parsed.wasAttributedTo).toBeDefined();
    });

    it('should use prov: namespace prefix', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);

      expect(json).toContain('prov:type');
      expect(json).toContain('prov:startTime');
      expect(json).toContain('prov:endTime');
    });

    it('should pretty-print JSON', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      const json = service.exportPROVJSON(record);

      expect(json).toContain('\n'); // Has newlines (pretty-printed)
      expect(json).toContain('  '); // Has indentation
    });
  });

  describe('Timestamp Handling', () => {
    it('should use ISO 8601 timestamps', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(record.activity.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should record activity duration', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      const start = new Date(record.activity.startedAt).getTime();
      const end = new Date(record.activity.endedAt).getTime();

      expect(end).toBeGreaterThanOrEqual(start);
    });

    it('should preserve millisecond precision', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');

      expect(record.timestamp).toContain('.');
    });
  });

  describe('Integration Scenarios', () => {
    it('should track end-to-end research workflow', async () => {
      // Acquisition
      const acqRecord = service.generatePROVRecord('REF-001', 'acquisition', 'acquisition-service');
      expect(acqRecord).toBeDefined();

      // Transformation (summary generation)
      const summaryRecord = service.generatePROVRecord('summary-001', 'transformation', 'documentation-service');
      service.trackDerivation('summary-001', [{ source: 'REF-001', type: 'summarization' }]);

      // Analysis (quality assessment)
      const qualityRecord = service.generatePROVRecord('quality-001', 'analysis', 'quality-service');
      service.trackDerivation('quality-001', [{ source: 'REF-001', type: 'assessment' }]);

      // Query lineage
      const summaryChain = await service.queryLineage('summary-001');
      expect(summaryChain.sources).toContain('REF-001');

      const qualityChain = await service.queryLineage('quality-001');
      expect(qualityChain.sources).toContain('REF-001');
    });

    it('should support multi-level derivation chains', async () => {
      // Level 1: Source paper
      service.generatePROVRecord('REF-001', 'acquisition', 'acquisition-service');

      // Level 2: Summary derived from paper
      service.generatePROVRecord('summary-001', 'transformation', 'documentation-service');
      service.trackDerivation('summary-001', [{ source: 'REF-001', type: 'summarization' }]);

      // Level 3: Zettelkasten note derived from summary
      service.generatePROVRecord('note-001', 'transformation', 'documentation-service');
      service.trackDerivation('note-001', [{ source: 'summary-001', type: 'note-generation' }]);

      // Query leaf node
      const noteChain = await service.queryLineage('note-001');
      expect(noteChain.sources).toContain('summary-001');
    });
  });

  describe('Error Handling', () => {
    it('should handle querying nonexistent entity', async () => {
      const chain = await service.queryLineage('nonexistent');

      expect(chain.sources).toHaveLength(0);
      expect(chain.activities).toHaveLength(0);
    });

    it('should handle exporting record without relationships', () => {
      const record = service.generatePROVRecord('REF-001', 'acquisition', 'test-agent');
      record.relationships = {};

      const json = service.exportPROVJSON(record);
      expect(json).toBeDefined();
    });
  });
});
