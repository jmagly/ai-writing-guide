/**
 * Cross-Framework Operations
 *
 * Enables cross-framework linking and multi-project orchestration for
 * polyglot process management (SDLC + Marketing + Agile coexistence).
 *
 * Features:
 * - Link work items across frameworks
 * - Bidirectional metadata updates
 * - Work graph visualization (Mermaid)
 * - Orphaned link detection
 * - Archive and restore work items
 * - List all work across frameworks
 *
 * @module src/plugin/cross-framework-ops
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Relationship types for cross-framework links
 */
export type RelationshipType =
  | 'promotes'
  | 'promoted-by'
  | 'implements'
  | 'implemented-by'
  | 'blocks'
  | 'blocked-by'
  | 'depends-on'
  | 'required-by'
  | 'relates-to';

/**
 * Work link representing a cross-framework relationship
 */
export interface WorkLink {
  /** Target framework ID */
  framework: string;
  /** Target work item ID */
  id: string;
  /** Target work item type */
  type: string;
  /** Relationship type */
  relationship: RelationshipType;
  /** When link was created */
  linkedDate: string;
}

/**
 * Work item metadata
 */
export interface WorkMetadata {
  /** Framework this work belongs to */
  framework: string;
  /** Work item ID */
  id: string;
  /** Work item type (project, campaign, story, etc.) */
  type: string;
  /** Current status */
  status: 'active' | 'archived' | 'completed';
  /** Phase or stage */
  phase?: string;
  /** Creation date */
  createdAt: string;
  /** Last modified date */
  updatedAt: string;
  /** Cross-framework links */
  linkedWork: WorkLink[];
}

/**
 * Link operation result
 */
export interface LinkResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Source work item */
  source: { framework: string; id: string };
  /** Target work item */
  target: { framework: string; id: string };
  /** Relationship type */
  relationship: RelationshipType;
  /** Error message if failed */
  error?: string;
}

/**
 * Work summary for listing
 */
export interface WorkSummary {
  /** Framework ID */
  framework: string;
  /** Work item ID */
  id: string;
  /** Work item type */
  type: string;
  /** Current status */
  status: string;
  /** Phase or stage */
  phase?: string;
  /** Number of linked work items */
  linkCount: number;
}

/**
 * Orphaned link information
 */
export interface OrphanedLink {
  /** Source work item */
  source: { framework: string; id: string };
  /** Target that no longer exists */
  target: { framework: string; id: string };
  /** Relationship */
  relationship: RelationshipType;
}

/**
 * Get inverse relationship type
 */
export function getInverseRelationship(relationship: RelationshipType): RelationshipType {
  const inverses: Record<RelationshipType, RelationshipType> = {
    'promotes': 'promoted-by',
    'promoted-by': 'promotes',
    'implements': 'implemented-by',
    'implemented-by': 'implements',
    'blocks': 'blocked-by',
    'blocked-by': 'blocks',
    'depends-on': 'required-by',
    'required-by': 'depends-on',
    'relates-to': 'relates-to'
  };
  return inverses[relationship];
}

/**
 * CrossFrameworkOps - Manage cross-framework work linking
 *
 * @example
 * ```typescript
 * const ops = new CrossFrameworkOps('~/.local/share/ai-writing-guide');
 *
 * // Link SDLC project to marketing campaign
 * await ops.linkWork('sdlc-complete', 'plugin-system', 'marketing-flow', 'plugin-launch', 'promotes');
 *
 * // List all links
 * const links = await ops.listLinks('sdlc-complete', 'plugin-system');
 *
 * // Visualize work graph
 * const mermaid = await ops.visualizeWorkGraph();
 * ```
 */
export class CrossFrameworkOps {
  private aiwgRoot: string;
  private registryPath: string;

  constructor(aiwgRoot: string) {
    this.aiwgRoot = aiwgRoot;
    this.registryPath = path.join(aiwgRoot, 'registry.json');
  }

  /**
   * Link two work items across frameworks
   *
   * @param sourceFramework - Source framework ID
   * @param sourceId - Source work item ID
   * @param targetFramework - Target framework ID
   * @param targetId - Target work item ID
   * @param relationship - Relationship type
   * @returns Link result
   */
  async linkWork(
    sourceFramework: string,
    sourceId: string,
    targetFramework: string,
    targetId: string,
    relationship: RelationshipType
  ): Promise<LinkResult> {
    const result: LinkResult = {
      success: false,
      source: { framework: sourceFramework, id: sourceId },
      target: { framework: targetFramework, id: targetId },
      relationship
    };

    try {
      // Validate both frameworks exist
      const sourceExists = await this.frameworkExists(sourceFramework);
      const targetExists = await this.frameworkExists(targetFramework);

      if (!sourceExists) {
        result.error = `Source framework '${sourceFramework}' is not installed`;
        return result;
      }

      if (!targetExists) {
        result.error = `Target framework '${targetFramework}' is not installed`;
        return result;
      }

      // Validate both work items exist
      const sourceMetadata = await this.getWorkMetadata(sourceFramework, sourceId);
      const targetMetadata = await this.getWorkMetadata(targetFramework, targetId);

      if (!sourceMetadata) {
        result.error = `Source work item '${sourceId}' not found in framework '${sourceFramework}'`;
        return result;
      }

      if (!targetMetadata) {
        result.error = `Target work item '${targetId}' not found in framework '${targetFramework}'`;
        return result;
      }

      // Check if link already exists
      const existingLink = sourceMetadata.linkedWork.find(
        l => l.framework === targetFramework && l.id === targetId
      );

      if (existingLink) {
        result.error = `Link already exists between ${sourceFramework}/${sourceId} and ${targetFramework}/${targetId}`;
        return result;
      }

      // Add link to source
      sourceMetadata.linkedWork.push({
        framework: targetFramework,
        id: targetId,
        type: targetMetadata.type,
        relationship,
        linkedDate: new Date().toISOString()
      });
      sourceMetadata.updatedAt = new Date().toISOString();

      // Add inverse link to target
      const inverseRelationship = getInverseRelationship(relationship);
      targetMetadata.linkedWork.push({
        framework: sourceFramework,
        id: sourceId,
        type: sourceMetadata.type,
        relationship: inverseRelationship,
        linkedDate: new Date().toISOString()
      });
      targetMetadata.updatedAt = new Date().toISOString();

      // Save both metadata files
      await this.saveWorkMetadata(sourceFramework, sourceId, sourceMetadata);
      await this.saveWorkMetadata(targetFramework, targetId, targetMetadata);

      result.success = true;
    } catch (error) {
      result.error = `Failed to link work items: ${(error as Error).message}`;
    }

    return result;
  }

  /**
   * Remove link between two work items
   *
   * @param sourceFramework - Source framework ID
   * @param sourceId - Source work item ID
   * @param targetFramework - Target framework ID
   * @param targetId - Target work item ID
   * @returns Link result
   */
  async unlinkWork(
    sourceFramework: string,
    sourceId: string,
    targetFramework: string,
    targetId: string
  ): Promise<LinkResult> {
    const result: LinkResult = {
      success: false,
      source: { framework: sourceFramework, id: sourceId },
      target: { framework: targetFramework, id: targetId },
      relationship: 'relates-to'
    };

    try {
      // Get metadata for both work items
      const sourceMetadata = await this.getWorkMetadata(sourceFramework, sourceId);
      const targetMetadata = await this.getWorkMetadata(targetFramework, targetId);

      if (!sourceMetadata) {
        result.error = `Source work item '${sourceId}' not found`;
        return result;
      }

      // Remove link from source
      const sourceIndex = sourceMetadata.linkedWork.findIndex(
        l => l.framework === targetFramework && l.id === targetId
      );

      if (sourceIndex >= 0) {
        result.relationship = sourceMetadata.linkedWork[sourceIndex].relationship;
        sourceMetadata.linkedWork.splice(sourceIndex, 1);
        sourceMetadata.updatedAt = new Date().toISOString();
        await this.saveWorkMetadata(sourceFramework, sourceId, sourceMetadata);
      }

      // Remove inverse link from target (if target exists)
      if (targetMetadata) {
        const targetIndex = targetMetadata.linkedWork.findIndex(
          l => l.framework === sourceFramework && l.id === sourceId
        );

        if (targetIndex >= 0) {
          targetMetadata.linkedWork.splice(targetIndex, 1);
          targetMetadata.updatedAt = new Date().toISOString();
          await this.saveWorkMetadata(targetFramework, targetId, targetMetadata);
        }
      }

      result.success = true;
    } catch (error) {
      result.error = `Failed to unlink work items: ${(error as Error).message}`;
    }

    return result;
  }

  /**
   * List all links for a work item
   *
   * @param frameworkId - Framework ID
   * @param workId - Work item ID
   * @returns Array of links
   */
  async listLinks(frameworkId: string, workId: string): Promise<WorkLink[]> {
    const metadata = await this.getWorkMetadata(frameworkId, workId);
    return metadata?.linkedWork || [];
  }

  /**
   * List all work items across all frameworks
   *
   * @param frameworkId - Optional framework filter
   * @returns Array of work summaries
   */
  async listAllWork(frameworkId?: string): Promise<WorkSummary[]> {
    const summaries: WorkSummary[] = [];

    try {
      const registry = await this.loadRegistry();
      const frameworks = frameworkId
        ? registry.plugins.filter(p => p.id === frameworkId && p.type === 'framework')
        : registry.plugins.filter(p => p.type === 'framework');

      for (const framework of frameworks) {
        const projects = await this.getFrameworkProjects(framework.id, framework.path);

        for (const project of projects) {
          const metadata = await this.getWorkMetadata(framework.id, project);

          if (metadata) {
            summaries.push({
              framework: framework.id,
              id: project,
              type: metadata.type,
              status: metadata.status,
              phase: metadata.phase,
              linkCount: metadata.linkedWork.length
            });
          }
        }
      }
    } catch {
      // Registry doesn't exist
    }

    return summaries;
  }

  /**
   * Visualize work graph in Mermaid format
   *
   * @param frameworkId - Optional framework filter
   * @returns Mermaid diagram string
   */
  async visualizeWorkGraph(frameworkId?: string): Promise<string> {
    const lines: string[] = ['graph TD'];
    const allWork = await this.listAllWork(frameworkId);
    const processed = new Set<string>();

    for (const work of allWork) {
      const nodeId = `${work.framework}_${work.id}`.replace(/-/g, '_');
      const label = `${work.framework}: ${work.id}<br/>${work.phase || work.status}`;

      // Add node
      if (!processed.has(nodeId)) {
        lines.push(`    ${nodeId}["${label}"]`);
        processed.add(nodeId);
      }

      // Add links
      const links = await this.listLinks(work.framework, work.id);
      for (const link of links) {
        const targetNodeId = `${link.framework}_${link.id}`.replace(/-/g, '_');
        const edgeKey = `${nodeId}-${targetNodeId}`;
        const reverseKey = `${targetNodeId}-${nodeId}`;

        // Only add one direction to avoid duplicate edges
        if (!processed.has(edgeKey) && !processed.has(reverseKey)) {
          lines.push(`    ${nodeId} -->|${link.relationship}| ${targetNodeId}`);
          processed.add(edgeKey);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Detect orphaned links (links to non-existent work items)
   *
   * @returns Array of orphaned links
   */
  async detectOrphanedLinks(): Promise<OrphanedLink[]> {
    const orphaned: OrphanedLink[] = [];
    const allWork = await this.listAllWork();

    for (const work of allWork) {
      const links = await this.listLinks(work.framework, work.id);

      for (const link of links) {
        const targetExists = await this.workExists(link.framework, link.id);

        if (!targetExists) {
          orphaned.push({
            source: { framework: work.framework, id: work.id },
            target: { framework: link.framework, id: link.id },
            relationship: link.relationship
          });
        }
      }
    }

    return orphaned;
  }

  /**
   * Clean up orphaned links
   *
   * @returns Number of links removed
   */
  async cleanOrphanedLinks(): Promise<number> {
    const orphaned = await this.detectOrphanedLinks();
    let cleaned = 0;

    for (const link of orphaned) {
      const metadata = await this.getWorkMetadata(link.source.framework, link.source.id);

      if (metadata) {
        const originalLength = metadata.linkedWork.length;
        metadata.linkedWork = metadata.linkedWork.filter(
          l => !(l.framework === link.target.framework && l.id === link.target.id)
        );

        if (metadata.linkedWork.length < originalLength) {
          metadata.updatedAt = new Date().toISOString();
          await this.saveWorkMetadata(link.source.framework, link.source.id, metadata);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Archive a work item
   *
   * @param frameworkId - Framework ID
   * @param workId - Work item ID
   * @param _reason - Archive reason
   * @returns Whether archive succeeded
   */
  async archiveWork(frameworkId: string, workId: string, _reason: string): Promise<boolean> {
    const metadata = await this.getWorkMetadata(frameworkId, workId);

    if (!metadata) {
      return false;
    }

    metadata.status = 'archived';
    metadata.updatedAt = new Date().toISOString();

    // Move to archive directory
    const framework = await this.getFrameworkInfo(frameworkId);
    if (!framework) {
      return false;
    }

    const sourcePath = path.join(this.aiwgRoot, framework.path, 'projects', workId);
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const archivePath = path.join(this.aiwgRoot, framework.path, 'archive', yearMonth, workId);

    try {
      await fs.mkdir(path.dirname(archivePath), { recursive: true });
      await this.moveDirectory(sourcePath, archivePath);

      // Update metadata in archive location
      await fs.writeFile(
        path.join(archivePath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a framework exists in the registry
   */
  private async frameworkExists(frameworkId: string): Promise<boolean> {
    try {
      const registry = await this.loadRegistry();
      return registry.plugins.some(p => p.id === frameworkId && p.type === 'framework');
    } catch {
      return false;
    }
  }

  /**
   * Check if a work item exists
   */
  private async workExists(frameworkId: string, workId: string): Promise<boolean> {
    const metadata = await this.getWorkMetadata(frameworkId, workId);
    return metadata !== null;
  }

  /**
   * Get work item metadata
   */
  private async getWorkMetadata(frameworkId: string, workId: string): Promise<WorkMetadata | null> {
    const framework = await this.getFrameworkInfo(frameworkId);
    if (!framework) {
      return null;
    }

    const metadataPath = path.join(
      this.aiwgRoot,
      framework.path,
      'projects',
      workId,
      'metadata.json'
    );

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Create default metadata if project exists but no metadata
      const projectPath = path.join(this.aiwgRoot, framework.path, 'projects', workId);
      try {
        await fs.stat(projectPath);
        return {
          framework: frameworkId,
          id: workId,
          type: 'project',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          linkedWork: []
        };
      } catch {
        return null;
      }
    }
  }

  /**
   * Save work item metadata
   */
  private async saveWorkMetadata(frameworkId: string, workId: string, metadata: WorkMetadata): Promise<void> {
    const framework = await this.getFrameworkInfo(frameworkId);
    if (!framework) {
      throw new Error(`Framework '${frameworkId}' not found`);
    }

    const projectPath = path.join(this.aiwgRoot, framework.path, 'projects', workId);
    await fs.mkdir(projectPath, { recursive: true });

    const metadataPath = path.join(projectPath, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Get framework info from registry
   */
  private async getFrameworkInfo(frameworkId: string): Promise<{ id: string; path: string } | null> {
    try {
      const registry = await this.loadRegistry();
      const framework = registry.plugins.find(p => p.id === frameworkId && p.type === 'framework');
      return framework ? { id: framework.id, path: framework.path } : null;
    } catch {
      return null;
    }
  }

  /**
   * Get all projects in a framework
   */
  private async getFrameworkProjects(_frameworkId: string, frameworkPath: string): Promise<string[]> {
    const projectsDir = path.join(this.aiwgRoot, frameworkPath, 'projects');

    try {
      const entries = await fs.readdir(projectsDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Load registry file
   */
  private async loadRegistry(): Promise<{ plugins: Array<{ id: string; type: string; path: string }> }> {
    const content = await fs.readFile(this.registryPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Move directory recursively
   */
  private async moveDirectory(source: string, dest: string): Promise<void> {
    await this.copyDirectory(source, dest);
    await fs.rm(source, { recursive: true, force: true });
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(source: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Create CrossFrameworkOps with default AIWG root
 */
export function createCrossFrameworkOps(): CrossFrameworkOps {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const aiwgRoot = path.join(homeDir, '.local', 'share', 'ai-writing-guide');
  return new CrossFrameworkOps(aiwgRoot);
}
