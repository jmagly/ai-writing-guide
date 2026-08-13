/** @issue #2041 */

import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditGeneratedDocs,
  DOCS_DISCOVERABILITY_REPORT_SCHEMA,
  renderDiscoverabilityReport,
} from '../../tools/docs/audit-discoverability.mjs';

const root = path.resolve(import.meta.dirname, '../fixtures/docs-discoverability/site');
const graphPath = path.join(root, 'docs-discoverability.json');
const now = new Date('2026-08-13T00:00:00Z');

describe('generated docs discoverability and drift auditor', () => {
  it('checks every required publication surface from one source graph', async () => {
    const report = await auditGeneratedDocs({ root, graphPath, now });
    expect(report).toMatchObject({
      schema: DOCS_DISCOVERABILITY_REPORT_SCHEMA,
      status: 'fail',
      counts: { fail: 1 },
    });
    const codes = new Set(report.findings.map(finding => finding.code));
    for (const code of [
      'MARKDOWN_EXPORT', 'SITEMAP_ENTRY', 'CANONICAL', 'ROBOTS_CRAWL',
      'NOINDEX_POLICY', 'LLMS_DISCOVERY', 'LLMS_FULL_DISCOVERY', 'STRUCTURED_DATA', 'API_SPEC_LINK',
    ]) expect(codes.has(code), code).toBe(true);
    expect(report.findings).toContainEqual(expect.objectContaining({ code: 'API_SPEC_LINK', url: '/api/', status: 'pass' }));
    expect(report.findings).toContainEqual(expect.objectContaining({ code: 'NOINDEX_POLICY', url: '/private/', status: 'fail' }));
  });

  it('detects each required generated-docs drift fixture', async () => {
    const report = await auditGeneratedDocs({ root, graphPath, now });
    for (const code of ['ORPHAN_PAGE', 'THIN_PAGE', 'NEAR_DUPLICATE', 'STALE_GENERATED_DOC', 'DOORWAY_URL_SET']) {
      expect(report.findings.some(finding => finding.code === code && finding.status === 'warn'), code).toBe(true);
    }
    expect(new Set(report.findings.map(finding => finding.status))).toEqual(new Set(['pass', 'fail', 'warn', 'not-applicable']));
  });

  it('emits a crawl, index, and AI-discoverability matrix by URL class', async () => {
    const report = await auditGeneratedDocs({ root, graphPath, now });
    expect(report.matrix.map(row => row.url_class)).toEqual(['api', 'guide', 'landing', 'private']);
    expect(report.matrix.find(row => row.url_class === 'api')).toEqual({
      url_class: 'api', pages: 1, crawl: 'pass', index: 'pass', ai_discoverability: 'pass',
    });
    expect(report.matrix.find(row => row.url_class === 'private')).toMatchObject({ index: 'fail' });
    expect(renderDiscoverabilityReport(report)).toContain('URL class');
  });

  it('uses CI-friendly exit codes while allowing explicit report-only runs', () => {
    const args = ['tools/docs/audit-discoverability.mjs', '--root', root, '--now', now.toISOString(), '--json'];
    const failed = spawnSync(process.execPath, args, { cwd: path.resolve(import.meta.dirname, '../..'), encoding: 'utf8' });
    expect(failed.status).toBe(1);
    expect(JSON.parse(failed.stdout)).toMatchObject({ schema: DOCS_DISCOVERABILITY_REPORT_SCHEMA, status: 'fail' });
    const output = execFileSync(process.execPath, [...args, '--no-fail'], { cwd: path.resolve(import.meta.dirname, '../..'), encoding: 'utf8' });
    expect(JSON.parse(output)).toMatchObject({ status: 'fail' });
  });
});
