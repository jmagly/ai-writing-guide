import * as fs from 'node:fs';
import * as path from 'node:path';
import { createGraphBackend, type GraphBackend, type GraphBackendType } from './graph-backend.js';
import { loadGraphIndexFile } from './index-reader.js';
import { getGraphIndexDir, loadGlobalGraphConfigs, loadUserGraphConfigs, resolveGraphBackendType, type DependencyGraph, type GraphType } from './types.js';

export interface ActiveGraphBackend { backend: GraphBackend; type: GraphBackendType; persistentPath?: string }

export function configuredGraphBackend(cwd: string, graph: GraphType): GraphBackendType {
  loadUserGraphConfigs(cwd); loadGlobalGraphConfigs(); return resolveGraphBackendType(graph);
}

export async function openGraphBackend(cwd: string, graph: GraphType): Promise<ActiveGraphBackend> {
  const type = configuredGraphBackend(cwd, graph);
  const persistentPath = type === 'sqlite' ? path.join(getGraphIndexDir(cwd, graph), 'graph.db') : undefined;
  const legacy = loadGraphIndexFile<DependencyGraph>(cwd, 'dependencies.json', graph);
  if (!legacy && (!persistentPath || !fs.existsSync(persistentPath))) {
    throw new Error(`No artifact index found for graph '${graph}'. Run \`aiwg index build --graph ${graph}\` first.`);
  }
  if (persistentPath) fs.mkdirSync(path.dirname(persistentPath), { recursive: true });
  const backend = await createGraphBackend(type, persistentPath);
  if (legacy && (type !== 'sqlite' || backend.nodeCount() === 0)) backend.deserialize(legacy);
  return { backend, type, persistentPath };
}

export async function closeGraphBackend(active: ActiveGraphBackend | undefined): Promise<void> { await active?.backend.close?.(); }
