import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
// @ts-expect-error Shipped addon MJS used only to bind independently authored review evidence.
import { artifact, digest } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';
const cli = path.resolve('agentic/code/addons/testing-quality/commands/test-conformance.mjs');
let root: string;
beforeEach(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),'aiwg-cli-tools-'));await fs.mkdir(path.join(root,'.aiwg/testing'),{recursive:true});});
afterEach(async()=>{await fs.rm(root,{recursive:true,force:true});});
async function run(...args:string[]):Promise<{status:number;stdout:string;stderr:string;value:any}>{
  return new Promise(resolve=>execFile(process.execPath,[cli,...args,'--root',root],{cwd:root,timeout:30000,maxBuffer:16*1024*1024},(error,stdout,stderr)=>{
    let value;try{value=JSON.parse(stdout);}catch{value=undefined;}
    resolve({status:error ? (typeof error.code==='number'?error.code:1):0,stdout,stderr,value});
  }));
}
const save=(name:string,value:any)=>fs.writeFile(path.join(root,name),JSON.stringify(value,null,2));

describe('test conformance public CLI tool lifecycles',()=>{
  it('develops a custom typed config template, plans without writing, applies/replays and rolls back',async()=>{
    const source={id:'target-config',platform:'generic',description:'Actual target test reporter config',variables:[{name:'system',type:'string',required:true},{name:'directory',type:'path',required:true},{name:'timeout',type:'number',required:false,default:5000}],files:[{path:'{{directory}}/test.config.json',content:'{"system":{{system|json}},"timeout":{{timeout}}}\n'}]};
    await save('.aiwg/testing/template-source.json',source);
    await save('.aiwg/testing/variables.json',{system:'quoted " target',directory:'generated'});
    const developed=await run('templates','--action','develop','--source','.aiwg/testing/template-source.json','--output','.aiwg/testing/template.json');
    expect(developed.status,developed.stderr).toBe(0);expect(developed.value.kind).toBe('TestNormalizationTemplate');
    expect((await run('validate','--input','.aiwg/testing/template.json','--schema','custom-template.v1')).status).toBe(0);
    const deployed=await run('templates','--action','deploy','--source','.aiwg/testing/template.json','--variables','.aiwg/testing/variables.json','--output','.aiwg/testing/template-plan.json');
    expect(deployed.status,deployed.stderr).toBe(0);expect(deployed.value.kind).toBe('TestNormalizationPlan');
    await expect(fs.stat(path.join(root,'generated/test.config.json'))).rejects.toMatchObject({code:'ENOENT'});
    const applied=await run('apply','--plan','.aiwg/testing/template-plan.json','--receipt','.aiwg/testing/template-apply.json');
    expect(applied.status,applied.stderr).toBe(0);
    expect(JSON.parse(await fs.readFile(path.join(root,'generated/test.config.json'),'utf8'))).toEqual({system:'quoted " target',timeout:5000});
    const replay=await run('apply','--plan','.aiwg/testing/template-plan.json','--receipt','.aiwg/testing/template-apply.json');expect(replay.status,replay.stderr).toBe(0);expect(replay.value).toEqual(applied.value);
    const rollback=await run('rollback','--receipt','.aiwg/testing/template-apply.json','--output','.aiwg/testing/template-rollback.json');expect(rollback.status,rollback.stderr).toBe(0);
    expect(rollback.value.spec.status).toBe('rolled-back');await expect(fs.stat(path.join(root,'generated/test.config.json'))).rejects.toMatchObject({code:'ENOENT'});
  },30000);

  it('collects attributable controls, assesses all current receipts and reports actual semantic conformance',async()=>{
    await fs.mkdir(path.join(root,'src'));await fs.mkdir(path.join(root,'tests'));
    await fs.writeFile(path.join(root,'src/add.mjs'),'export const add=(a,b)=>a+b;\n');
    await fs.writeFile(path.join(root,'tests/add.mjs'),`import assert from 'node:assert/strict';
import {add} from '../src/add.mjs';
const discovery=process.argv.includes('--discover');
let status='unknown';
if(!discovery){try{assert.equal(add(2,3),5);status='passed';}catch{status='failed';process.exitCode=1;}}
console.log(JSON.stringify({complete:true,cases:[{file:'tests/add.mjs',name:'adds independent inputs',status}],files:[{path:'tests/add.mjs',status}]}));\n`);
    const command={argv:[process.execPath,'tests/add.mjs'],timeoutMs:5000};const result={format:'canonical'};
    const protocol={apiVersion:'testing.aiwg.io/v1',kind:'TestConformanceProtocol',metadata:{name:'real-cli-check'},spec:{platform:'generic',system:'arithmetic function',source:{include:['src/**'],exclude:[]},tests:{include:['tests/**'],exclude:[]},areas:[{id:'unit',include:['tests/**']}],lanes:[{id:'unit',runner:'custom',include:['tests/**'],exclude:[],command,result,required:true,discovery:{command:{...command,argv:[...command.argv,'--discover']},result},negativeControls:[{id:'replace-addition',description:'subtraction must fail the sum expectation',command,result,testIds:[JSON.stringify(['unit','tests/add.mjs','adds independent inputs'])],changePlan:'.aiwg/testing/control-plan.json'}]}],policy:{requireDiscovery:true,requireReview:true,requireNegativeControls:true,allowSkipped:false,coverageThresholds:{},maxFiles:100,maxFileBytes:1000000,maxOutputBytes:1000000},research:{paths:[],allowWeb:false}}};
    await save('.aiwg/testing/conformance.yaml',protocol);
    await save('.aiwg/testing/changes.json',{purpose:'Deliberately replace addition for an oracle control',edits:[{path:'src/add.mjs',content:'export const add=(a,b)=>a-b;\n'}]});
    expect((await run('plan','--changes','.aiwg/testing/changes.json','--output','.aiwg/testing/control-plan.json')).status).toBe(0);
    const inventory=await run('inventory','--output','.aiwg/testing/inventory.json');expect(inventory.status,inventory.stderr).toBe(0);
    const discovery=await run('collect','--mode','discovery','--output','.aiwg/testing/discovery.json');expect(discovery.status,discovery.stderr).toBe(0);
    const execution=await run('collect','--mode','execution','--output','.aiwg/testing/execution.json');expect(execution.status,execution.stderr).toBe(0);
    const controls=await run('collect','--mode','controls','--evidence','.aiwg/testing/execution.json','--output','.aiwg/testing/controls.json');expect(controls.status,controls.stderr).toBe(0);expect(controls.value.spec.controls[0].status).toBe('killed');
    expect((await run('validate','--input','.aiwg/testing/controls.json','--schema','negative-control-receipt.v1')).status).toBe(0);
    const file=inventory.value.spec.files.find((f:any)=>f.role==='test');
    const review=artifact('TestConformanceReview',{root,protocolHash:digest(protocol),snapshotHash:inventory.value.spec.snapshotHash,reviewer:'cli-integration-reviewer',files:[{path:file.path,hash:file.hash,sut:'Real add function imported from src/add.mjs without doubles.',claim:'Two independent inputs 2 and 3 must produce numeric sum 5.',oracle:'Node strict equality rejects subtraction result -1; actual control evidence retains this failure.',validity:'Assertion executes for the registered case and propagates a nonzero runner result.',isolation:'One fresh Node process owns imported state; no shared temporary fixtures.',determinism:'Fixed independent operands and exact deterministic result; no timers or randomness.',normalization:'Canonical reporter preserves both registered case and terminal status with source filename.',maintainability:'Small public arithmetic interface fixture keeps source and oracle separate.',scope:'Reviewed the complete file and its only case, including discovery and failure reporting.',verdict:'passed',findings:[]}]});
    await save('.aiwg/testing/review.json',review);
    const assessment=await run('assess','--inventory','.aiwg/testing/inventory.json','--evidence','.aiwg/testing/discovery.json','--evidence','.aiwg/testing/execution.json','--evidence','.aiwg/testing/controls.json','--reviews','.aiwg/testing/review.json','--output','.aiwg/testing/assessment.json');
    expect(assessment.status,assessment.stderr+'\n'+assessment.stdout).toBe(0);expect(assessment.value.spec.status).toBe('conformant');
    const report=await run('report','--assessment','.aiwg/testing/assessment.json','--format','markdown','--output','.aiwg/testing/report.md');expect(report.status,report.stderr).toBe(0);expect(report.stdout).toContain('conformant');
    // A real later regression produces nonzero collection and incomplete/stale prior assessment inputs.
    await fs.writeFile(path.join(root,'src/add.mjs'),'export const add=()=>0;\n');
    const failed=await run('collect','--mode','execution','--output','.aiwg/testing/regression.json');expect(failed.status).toBe(2);expect(failed.value.spec.lanes[0].normalized.summary.failed).toBe(1);
  },30000);

  it('rejects unknown commands, missing values, invalid schemas and incomplete control collection',async()=>{
    for(const args of [['unknown-command'],['inventory','--not-a-flag','yes'],['plan','--changes'],['collect','--mode','controls']]){
      const result=await run(...args);expect(result.status).toBe(1);expect(JSON.parse(result.stderr).error).toEqual(expect.any(String));
    }
    await save('.aiwg/testing/invalid.json',{kind:'TestNormalizationPlan'});
    const invalid=await run('validate','--input','.aiwg/testing/invalid.json','--schema','normalization-plan.v1');expect(invalid.status).toBe(1);expect(invalid.stderr).toContain('Invalid normalization-plan');
  },30000);
  it('fails green-report/nonzero-process evidence, rejects failed discovery sampling and uses the actual source sample frame',async()=>{
    await fs.mkdir(path.join(root,'src'));await fs.mkdir(path.join(root,'tests'));
    await fs.writeFile(path.join(root,'src/value.mjs'),'export const value=1;\n');
    await fs.writeFile(path.join(root,'tests/check.mjs'),`console.log(JSON.stringify({complete:true,cases:[{file:'tests/check.mjs',name:'claimed pass',status:'passed'}],files:[{path:'tests/check.mjs',status:'passed'}]}));process.exitCode=1;\n`);
    const command={argv:[process.execPath,'tests/check.mjs'],timeoutMs:5000};const result={format:'canonical'};
    const protocol={apiVersion:'testing.aiwg.io/v1',kind:'TestConformanceProtocol',metadata:{name:'contradictory-reporter'},spec:{platform:'generic',system:'evidence adapter counterexample',source:{include:['src/**'],exclude:[]},tests:{include:['tests/**'],exclude:[]},areas:[{id:'unit',include:['tests/**']}],lanes:[{id:'unit',runner:'custom',include:['tests/**'],exclude:[],command,result,required:true,discovery:{command,result}}],policy:{requireDiscovery:true,requireReview:false,requireNegativeControls:false,allowSkipped:false,coverageThresholds:{},maxFiles:100,maxFileBytes:1000000,maxOutputBytes:1000000},research:{paths:[],allowWeb:false}}};
    await save('.aiwg/testing/conformance.yaml',protocol);
    const inventory=await run('inventory','--output','.aiwg/testing/inventory.json');expect(inventory.status,inventory.stderr).toBe(0);
    const execution=await run('collect','--mode','execution');expect(execution.status).toBe(2);
    expect(execution.value.spec.lanes[0].normalized.summary.passed).toBe(1);
    expect(execution.value.spec.lanes[0].process.exitCode).toBe(1);
    const discovery=await run('collect','--mode','discovery','--output','.aiwg/testing/discovery.json');expect(discovery.status).toBe(2);
    const rejected=await run('sample','--inventory','.aiwg/testing/inventory.json','--unit','registered-case','--evidence','.aiwg/testing/discovery.json','--seed','adversarial');
    expect(rejected.status).toBe(1);expect(rejected.stderr).toContain('Discovery receipt is incomplete');
    const forged=structuredClone(inventory.value);
    const candidate=forged.spec.files.find((f:any)=>f.role==='test');candidate.path='tests/fabricated.mjs';candidate.hash='0'.repeat(64);
    await save('.aiwg/testing/forged-inventory.json',forged);
    const sample=await run('sample','--inventory','.aiwg/testing/forged-inventory.json','--unit','test-file','--seed','adversarial');
    expect(sample.status,sample.stderr).toBe(0);
    expect(sample.value.spec.areas.flatMap((area:any)=>area.records.map((record:any)=>record.path))).toEqual(['tests/check.mjs']);
  },30000);

});
