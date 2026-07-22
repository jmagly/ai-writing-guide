/**
 * Knowledge Base — load and search domain knowledge for grounding agents
 *
 * @module agents/grounding/knowledge-base
 * @issue #184
 */

import { promises as fs } from 'fs';
import path from 'path';
import { projectAiwgPath } from '../../config/project-artifacts.js';
import type { KnowledgeBase, KnowledgeEntry, KnowledgeFragment, VerificationResult } from './types.js';

// ============================================================================
// KnowledgeStore
// ============================================================================

export class KnowledgeStore {
  private bases: Map<string, KnowledgeBase>;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.bases = new Map();
  }

  /**
   * Load knowledge bases from .aiwg/knowledge/
   */
  async load(): Promise<void> {
    const knowledgeDir = projectAiwgPath(this.projectPath, 'knowledge');

    try {
      const domains = await fs.readdir(knowledgeDir);

      for (const domain of domains) {
        const domainPath = path.join(knowledgeDir, domain);
        const stat = await fs.stat(domainPath);
        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(domainPath);
        const entries: KnowledgeEntry[] = [];

        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const content = await fs.readFile(path.join(domainPath, file), 'utf-8');
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.entries)) {
              entries.push(...parsed.entries);
            } else if (parsed.id) {
              entries.push(parsed);
            }
          } catch {
            // Skip malformed files
          }
        }

        if (entries.length > 0) {
          this.bases.set(domain, {
            domain,
            version: '1.0.0',
            entries,
          });
        }
      }
    } catch {
      // Knowledge directory doesn't exist yet
    }
  }

  /**
   * Add a knowledge base from a JSON file
   */
  async addFromFile(domain: string, filePath: string): Promise<number> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const entries: KnowledgeEntry[] = Array.isArray(parsed.entries)
      ? parsed.entries
      : Array.isArray(parsed) ? parsed : [parsed];

    const existing = this.bases.get(domain) || { domain, version: '1.0.0', entries: [] };
    existing.entries.push(...entries);
    this.bases.set(domain, existing);

    // Persist
    const domainDir = projectAiwgPath(this.projectPath, 'knowledge', domain);
    await fs.mkdir(domainDir, { recursive: true });
    const outFile = path.join(domainDir, path.basename(filePath));
    await fs.copyFile(filePath, outFile);

    return entries.length;
  }

  /**
   * Search knowledge across all domains or a specific domain
   */
  search(query: string, options?: { domain?: string; limit?: number }): KnowledgeFragment[] {
    const limit = options?.limit ?? 5;
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const results: KnowledgeFragment[] = [];

    const domains = options?.domain
      ? [this.bases.get(options.domain)].filter(Boolean) as KnowledgeBase[]
      : Array.from(this.bases.values());

    for (const base of domains) {
      for (const entry of base.entries) {
        const score = calculateRelevance(entry, queryTerms);
        if (score > 0) {
          results.push({
            content: entry.content,
            source: `${base.domain}/${entry.source || entry.id}`,
            relevance_score: score,
            metadata: { topic: entry.topic, id: entry.id },
          });
        }
      }
    }

    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  /**
   * Verify a claim against domain knowledge
   */
  verifyClaim(claim: string, domain?: string): VerificationResult {
    const fragments = this.search(claim, { domain, limit: 3 });

    if (fragments.length === 0) {
      return {
        claim,
        verified: false,
        confidence: 0,
        sources: [],
        correction: 'No relevant knowledge found in knowledge base',
      };
    }

    // Simple verification: check if top fragments support or contradict
    const topFragment = fragments[0];
    const confidence = Math.min(topFragment.relevance_score, 1.0);

    return {
      claim,
      verified: confidence > 0.3,
      confidence,
      sources: fragments.map((f) => f.source),
    };
  }

  listDomains(): string[] {
    return Array.from(this.bases.keys());
  }

  getDomainStats(): Array<{ domain: string; entries: number }> {
    return Array.from(this.bases.entries()).map(([domain, base]) => ({
      domain,
      entries: base.entries.length,
    }));
  }
}

// ============================================================================
// Helpers
// ============================================================================

function calculateRelevance(entry: KnowledgeEntry, queryTerms: string[]): number {
  const searchable = [
    entry.topic,
    entry.content,
    ...(entry.keywords || []),
  ].join(' ').toLowerCase();

  let matches = 0;
  for (const term of queryTerms) {
    if (searchable.includes(term)) {
      matches++;
    }
  }

  return queryTerms.length > 0 ? matches / queryTerms.length : 0;
}
