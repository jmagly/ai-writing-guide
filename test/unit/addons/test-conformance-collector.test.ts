import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-ignore Native addon runtime
import { collectEvidence, verifyReceipt, runCommand } from '../../../agentic/code/addons/testing-quality/lib/collector.mjs';
// @ts-ignore Native addon runtime
import { digest } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';
let root: string, protocol: any;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'test-conformance-collector-'));
  await fs.mkdir(path.join(root, 'src')); await fs.mkdir(path.join(root, 'test'));
  await fs.writeFile(path.join(root, 'src/add.mjs'), 'export const add = (a,b) => a+b;');
  await fs.writeFile(path.join(root, 'test/runner.mjs'), `
import {writeFileSync} from 'node:fs';
import {add} from '../src/add.mjs';
const discovery=process.argv[2]==='--discover';
const status=discovery?'unknown':add(2,3)===5?'passed':'failed';
const report={complete:true,mode:discovery?'discovery':'execution',cases:[{file:'test/runner.mjs',name:'sum adds',status}],files:[{path:'test/runner.mjs',status}]};
if(discovery)console.log(JSON.stringify(report));
else writeFileSync('.aiwg/raw/'+process.argv[2]+'.json',JSON.stringify(report));
process.exitCode=status==='failed'?1:0;
`);
  protocol = {
    apiVersion: 'testing.aiwg.io/v1', kind: 'TestConformanceProtocol', metadata: { name: 'collector-fixture' },
    spec: { platform: 'generic', system: 'sum', source: { include: ['src/*.mjs'], exclude: [] }, tests: { include: ['test/*.mjs'], exclude: [] },
      areas: [{ id: 'unit', include: ['test/*.mjs'] }],
      lanes: [{ id: 'unit', runner: 'custom', required: true, include: ['test/*.mjs'], exclude: [],
        command: { argv: [process.execPath, 'test/runner.mjs', '{runId}'], timeoutMs: 5000 }, result: { format: 'canonical', path: '.aiwg/raw/{runId}.json' },
        discovery: { command: { argv: [process.execPath, 'test/runner.mjs', '--discover'], timeoutMs: 5000 }, result: { format: 'canonical' } },
        versionCommand: [process.execPath, '--version'] }],
      policy: { maxFiles: 100, maxFileBytes: 10000, maxOutputBytes: 10000, requireDiscovery: true, requireReview: true, requireNegativeControls: true, allowSkipped: false, coverageThresholds: {} }, research: { paths: [], allowWeb: false } },
  };
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

describe('source-bound test evidence collection', () => {
  it('executes the real target, preserves report and verifies fresh receipt', async () => {
    const receipt = await collectEvidence(root, protocol);
    expect(receipt.spec.lanes[0].normalized.summary).toEqual({ total: 1, passed: 1, failed: 0, skipped: 0 });
    expect(receipt.spec.lanes[0].process.exitCode).toBe(0);
    expect(receipt.spec.lanes[0].version.stdout.trim()).toBe(process.version);
    expect(await verifyReceipt(root, protocol, receipt)).toEqual([]);
    expect(JSON.parse(await fs.readFile(path.join(root, receipt.spec.lanes[0].report.path), 'utf8')).cases[0].status).toBe('passed');
  });
  it('retains real assertion failure rather than changing it into harness success', async () => {
    await fs.writeFile(path.join(root, 'src/add.mjs'), 'export const add = () => 0;');
    const receipt = await collectEvidence(root, protocol);
    expect(receipt.spec.lanes[0].process.exitCode).toBe(1);
    expect(receipt.spec.lanes[0].normalized.summary.failed).toBe(1);
    expect(receipt.spec.lanes[0].normalized.complete).toBe(true);
  });
  it('detects changed sources and raw reports after capture', async () => {
    const receipt = await collectEvidence(root, protocol);
    await fs.writeFile(path.join(root, 'src/add.mjs'), 'export const add=()=>99;');
    expect(await verifyReceipt(root, protocol, receipt)).toContainEqual(expect.objectContaining({ code: 'STALE_RECEIPT' }));
    await fs.writeFile(path.join(root, receipt.spec.lanes[0].report.path), '{}');
    expect(await verifyReceipt(root, protocol, receipt)).toContainEqual(expect.objectContaining({ code: 'REPORT_TAMPERED' }));
  });
  it('reparses raw reports so recomputing a modified receipt hash does not bless forged normalized counts', async () => {
    const receipt = await collectEvidence(root, protocol);
    receipt.spec.lanes[0].normalized.summary.passed=999;
    const {receiptHash,...spec}=receipt.spec; receipt.spec.receiptHash=digest(spec);
    expect(await verifyReceipt(root, protocol, receipt)).toContainEqual(expect.objectContaining({ code: 'NORMALIZATION_MISMATCH' }));
  });
  it('keeps discovery as unknown case outcomes and identifies an unconfigured discovery lane', async () => {
    const receipt=await collectEvidence(root, protocol, {mode:'discovery'});
    expect(receipt.spec.lanes[0].normalized.cases[0].status).toBe('unknown');
    expect(receipt.spec.lanes[0].normalized.summary.passed).toBe(0);
    delete protocol.spec.lanes[0].discovery;
    const missing=await collectEvidence(root, protocol, {mode:'discovery'});
    expect(missing.spec.lanes[0].normalized.complete).toBe(false);
    expect(missing.spec.lanes[0].normalized.errors[0].code).toBe('DISCOVERY_UNCONFIGURED');
  });
  it('refuses to reuse a pre-existing report as fresh evidence', async () => {
    await fs.writeFile(path.join(root,'old.json'),'{}');
    protocol.spec.lanes[0].result.path='old.json';
    await expect(collectEvidence(root,protocol)).rejects.toThrow('existing result');
    expect(await fs.readFile(path.join(root,'old.json'),'utf8')).toBe('{}');
  });
  it('marks source writes during the run as unstable evidence', async () => {
    const code=await fs.readFile(path.join(root,'test/runner.mjs'),'utf8');
    await fs.writeFile(path.join(root,'test/runner.mjs'), code+"\nwriteFileSync('src/add.mjs','export const add=()=>5;');\n");
    const receipt=await collectEvidence(root,protocol);
    expect(receipt.spec.sourceStable).toBe(false);
    expect(receipt.spec.diagnostics[0].code).toBe('SOURCE_CHANGED_DURING_RUN');
  });
});

describe('bounded argv execution',()=>{
  it('passes shell metacharacters literally',async()=>{
    const arg='$(touch OWNED); literal';
    const result=await runCommand({argv:[process.execPath,'-e','console.log(process.argv[1])',arg],timeoutMs:5000},{root});
    expect(result.stdout.trim()).toBe(arg);
    await expect(fs.access(path.join(root,'OWNED'))).rejects.toThrow();
  });
  it('records timeout and output overflow independently of test outcomes',async()=>{
    const timed=await runCommand({argv:[process.execPath,'-e','setInterval(()=>{},1000)'],timeoutMs:150},{root});
    expect(timed.reason).toBe('timeout'); expect(timed.exitCode).not.toBe(0);
    const large=await runCommand({argv:[process.execPath,'-e',"process.stdout.write('x'.repeat(20000))"],timeoutMs:5000},{root,maxOutputBytes:1024});
    expect(large.reason).toBe('output-limit'); expect(Buffer.byteLength(large.stdout)).toBeLessThanOrEqual(1024);
  });
  it('preserves command-not-found as a tool failure',async()=>{
    const result=await runCommand({argv:['aiwg-no-such-test-runner-938541'],timeoutMs:2000},{root});
    expect(result.reason).toBe('spawn-error'); expect(result.error).toContain('ENOENT');
  });
});
