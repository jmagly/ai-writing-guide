import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  auditWorkspaceContext,
  PROJECT_EXTRACTION_END,
  PROJECT_EXTRACTION_START,
  WORKSPACE_MANAGED_END,
  WORKSPACE_MANAGED_START,
  WORKSPACE_OPERATOR_END,
  WORKSPACE_OPERATOR_START,
} from '../smiths/context-pipeline/index.js';
import { AiwgError, EXIT_CODES } from './errors.js';

export type RegenerateBranch = 'workspace' | 'existing-project' | 'legacy';
export type RegenerateProjectState =
  | 'fresh'
  | 'established-unextracted'
  | 'adopted'
  | 'canonical-unextracted'
  | 'operator-owned-workspace'
  | 'legacy-context';

export interface RegenerateSelection {
  branch: RegenerateBranch;
  state: RegenerateProjectState;
  reason: string;
  evidence: string[];
  explicit: boolean;
}

function markerPair(content: string, start: string, end: string): { present: boolean; valid: boolean } {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  const present = startIndex >= 0 || endIndex >= 0;
  return {
    present,
    valid: !present || (startIndex >= 0 && endIndex > startIndex
      && content.indexOf(start, startIndex + start.length) < 0
      && content.indexOf(end, endIndex + end.length) < 0),
  };
}

function malformedWorkspace(message: string): never {
  throw new AiwgError({
    code: 'ERR_USAGE_REGENERATE_STATE_MALFORMED',
    message,
    hint: 'Repair the managed marker pair or restore WORKSPACE.md from version control, then rerun `aiwg regenerate --dry-run`.',
    exitCode: EXIT_CODES.USAGE,
  });
}

async function readOptional(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function selectRegenerateBranch(cwd: string, args: string[]): Promise<RegenerateSelection> {
  const legacy = args.includes('--legacy') || args.includes('--full-inject');
  const workspace = args.includes('--workspace');
  const existingProject = args.includes('--existing-project');
  if (legacy) return { branch: 'legacy', state: 'legacy-context', reason: 'explicit legacy compatibility branch', evidence: ['--legacy/--full-inject'], explicit: true };
  if (workspace) return { branch: 'workspace', state: 'fresh', reason: 'explicit canonical workspace branch', evidence: ['--workspace'], explicit: true };
  if (existingProject) return { branch: 'existing-project', state: 'established-unextracted', reason: 'explicit existing-project adoption branch', evidence: ['--existing-project'], explicit: true };

  const workspaceContent = await readOptional(path.join(cwd, 'WORKSPACE.md'));
  let workspaceMarkers: {
    managed: { present: boolean; valid: boolean };
    operator: { present: boolean; valid: boolean };
    extraction: { present: boolean; valid: boolean };
  } | null = null;
  if (workspaceContent !== null) {
    workspaceMarkers = {
      managed: markerPair(workspaceContent, WORKSPACE_MANAGED_START, WORKSPACE_MANAGED_END),
      operator: markerPair(workspaceContent, WORKSPACE_OPERATOR_START, WORKSPACE_OPERATOR_END),
      extraction: markerPair(workspaceContent, PROJECT_EXTRACTION_START, PROJECT_EXTRACTION_END),
    };
    const { managed, operator, extraction } = workspaceMarkers;
    if (!managed.valid || !operator.valid || !extraction.valid) {
      malformedWorkspace('WORKSPACE.md contains an incomplete, duplicated, or out-of-order AIWG managed marker pair.');
    }
    if (extraction.present && !managed.present) malformedWorkspace('WORKSPACE.md contains a project-extraction block without the canonical workspace managed graph.');
    if (managed.present !== operator.present) malformedWorkspace('WORKSPACE.md contains only part of the canonical managed/operator structure.');
  }

  const audit = await auditWorkspaceContext(cwd);
  const projectSources = audit.plan.projectSources;
  const operatorSources = audit.sources
    .filter((source) => source.path !== 'WORKSPACE.md' && source.operatorContent.trim().length > 0)
    .map((source) => source.path);

  if (workspaceContent !== null) {
    const { managed, extraction } = workspaceMarkers!;
    if (managed.present && extraction.present) return {
      branch: 'workspace', state: 'adopted', reason: 'canonical workspace already contains an extracted project snapshot', evidence: ['WORKSPACE.md project-extraction marker'], explicit: false,
    };
    if (managed.present && projectSources.length > 0) return {
      branch: 'existing-project', state: 'canonical-unextracted', reason: 'canonical workspace exists but stable project metadata has not been adopted', evidence: projectSources, explicit: false,
    };
    if (managed.present) return {
      branch: 'workspace', state: 'fresh', reason: 'canonical workspace exists and no stable project sources were detected', evidence: ['WORKSPACE.md managed graph'], explicit: false,
    };
    return {
      branch: 'existing-project', state: 'operator-owned-workspace', reason: 'operator-owned WORKSPACE.md requires transactional adoption before canonical refresh', evidence: ['WORKSPACE.md without AIWG managed markers', ...projectSources], explicit: false,
    };
  }

  if (projectSources.length > 0) return {
    branch: 'existing-project', state: 'established-unextracted', reason: 'stable existing-project sources were detected without an extracted workspace snapshot', evidence: projectSources, explicit: false,
  };
  if (audit.legacyCompatible || operatorSources.length > 0) return {
    branch: 'existing-project', state: 'legacy-context', reason: 'operator-authored provider context requires transactional adoption', evidence: operatorSources, explicit: false,
  };
  return { branch: 'workspace', state: 'fresh', reason: 'no prior workspace setup or stable project sources were detected', evidence: [], explicit: false };
}
