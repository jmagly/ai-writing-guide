/**
 * Flow Document Indexing (#1540)
 *
 * YAML Flow documents (the workflow metalanguage, apiVersion workflow.aiwg.io/v1)
 * are pure YAML, not markdown+frontmatter — the standard frontmatter path left
 * them unclassified and invisible to `aiwg discover`. These tests cover the
 * parseFlowDoc detector and that buildIndex classifies a Flow doc as type
 * 'flow' with discovery metadata (name + capability from spec.description).
 *
 * @source @src/artifacts/index-builder.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseFlowDoc, buildIndex } from '../../../src/artifacts/index-builder.js';
import { INDEX_DIR } from '../../../src/artifacts/types.js';

const CAPABILITY_YAML = `apiVersion: workflow.aiwg.io/v1
kind: WorkflowCapability
metadata:
  name: check-tls-expiry
  labels:
    category: pki
spec:
  description: Check a TLS certificate's expiry date for a given host
  agent: workflow-executor
`;

describe('parseFlowDoc', () => {
  it('detects a workflow.aiwg.io/v1 capability and extracts discovery metadata', () => {
    const r = parseFlowDoc(CAPABILITY_YAML, 'foo/check-tls.yaml');
    expect(r).not.toBeNull();
    expect(r!.name).toBe('check-tls-expiry');
    expect(r!.description).toBe("Check a TLS certificate's expiry date for a given host");
    expect(r!.tags).toContain('pki');
  });

  it('accepts the legacy ops.aiwg.io/v1 alias', () => {
    const doc = CAPABILITY_YAML.replace('workflow.aiwg.io/v1', 'ops.aiwg.io/v1');
    expect(parseFlowDoc(doc, 'x.yaml')).not.toBeNull();
  });

  it('accepts the forward Flows alias flow.aiwg.io/v1 (#1536)', () => {
    const doc = CAPABILITY_YAML.replace('workflow.aiwg.io/v1', 'flow.aiwg.io/v1');
    expect(parseFlowDoc(doc, 'x.yaml')).not.toBeNull();
  });

  it('accepts a domain-extension namespace (sys.workflow.aiwg.io/v1)', () => {
    const doc = CAPABILITY_YAML.replace('workflow.aiwg.io/v1', 'sys.workflow.aiwg.io/v1');
    expect(parseFlowDoc(doc, 'x.yaml')).not.toBeNull();
  });

  it('returns null for a non-flow YAML', () => {
    expect(parseFlowDoc('apiVersion: v1\nkind: Pod\n', 'x.yaml')).toBeNull();
  });

  it('returns null for a .md file even if content looks like a flow', () => {
    expect(parseFlowDoc(CAPABILITY_YAML, 'x.md')).toBeNull();
  });

  it('returns null for unparseable YAML', () => {
    expect(parseFlowDoc(':\n  - [unbalanced', 'x.yaml')).toBeNull();
  });
});

describe('buildIndex classifies Flow documents (#1540)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-flow-index-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('indexes a Flow YAML as type "flow" with discoverable name + capability', async () => {
    const flowDir = path.join(tmpDir, '.aiwg', 'workflow', 'capabilities');
    fs.mkdirSync(flowDir, { recursive: true });
    fs.writeFileSync(path.join(flowDir, 'check-tls.yaml'), CAPABILITY_YAML);

    await buildIndex(tmpDir, { scope: '.aiwg', outputDir: tmpDir, force: true });

    const indexPath = path.join(tmpDir, INDEX_DIR, 'metadata.json');
    expect(fs.existsSync(indexPath), `index at ${indexPath}`).toBe(true);
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    const entry = Object.values(index.entries).find(
      (e: any) => e.path.endsWith('check-tls.yaml')
    ) as any;
    expect(entry, 'flow entry indexed').toBeTruthy();
    expect(entry.type).toBe('flow');
    expect(entry.name).toBe('check-tls-expiry');
    expect(entry.capability).toBe("Check a TLS certificate's expiry date for a given host");
    expect(entry.tags).toContain('pki');
  });
});
