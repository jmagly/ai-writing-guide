import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error Shipped addon MJS.
import { collectControls, verifyControls } from '../../../agentic/code/addons/testing-quality/lib/controls.mjs';
// @ts-expect-error Shipped addon MJS.
import { collectEvidence } from '../../../agentic/code/addons/testing-quality/lib/collector.mjs';
// @ts-expect-error Shipped addon MJS.
import { createPlan } from '../../../agentic/code/addons/testing-quality/lib/normalization.mjs';
// @ts-expect-error Shipped addon MJS.
import { digest } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';
let root:string;
beforeEach(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),'aiwg-controls-'));});
afterEach(async()=>{await fs.rm(root,{recursive:true,force:true});});
const caseId=JSON.stringify(['default','test/runner.test.mjs','validates value']);
async function fixture({weak=false,crash=false,editTest=false,wrongCommand=false}={}) {
  await fs.mkdir(path.join(root,'src'));await fs.mkdir(path.join(root,'test'));await fs.mkdir(path.join(root,'.aiwg/testing'),{recursive:true});
  await fs.writeFile(path.join(root,'src/value.txt'),'valid');
  const code=`import fs from 'node:fs';\nconst value=fs.readFileSync('src/value.txt','utf8');\n${crash?"if(value!=='valid')throw new Error('setup broke');":''}\nconst passed=${weak?'true':"value==='valid'"};\nconst status=passed?'passed':'failed';\nconsole.log(JSON.stringify({complete:true,mode:'execution',cases:[{file:'test/runner.test.mjs',name:'validates value',status}],files:[{path:'test/runner.test.mjs',status}]}));\nprocess.exitCode=passed?0:1;\n`;
  await fs.writeFile(path.join(root,'test/runner.test.mjs'),code);
  const command={argv:[process.execPath,'test/runner.test.mjs'],timeoutMs:5000};
  const result={format:'canonical'};
  const plan=await createPlan(root,[{path:editTest?'test/runner.test.mjs':'src/value.txt',content:editTest?code+'\n':'invalid'}]);
  await fs.writeFile(path.join(root,'.aiwg/testing/control-plan.json'),JSON.stringify(plan));
  const protocol={apiVersion:'testing.aiwg.io/v1',kind:'TestConformanceProtocol',metadata:{name:'controls'},spec:{platform:'generic',system:'value-validator',source:{include:['src/**'],exclude:[]},tests:{include:['test/**'],exclude:[]},areas:[{id:'unit',include:['test/**']}],lanes:[{id:'default',runner:'custom',include:['test/**'],exclude:[],required:true,command,result,negativeControls:[{id:'wrong-value',description:'wrong production value must fail the test',command:wrongCommand?{argv:[process.execPath,'-e','process.exit(1)'],timeoutMs:5000}:command,result,testIds:[caseId],changePlan:'.aiwg/testing/control-plan.json'}]}],policy:{requireDiscovery:false,requireReview:false,requireNegativeControls:true,allowSkipped:false,coverageThresholds:{},maxFiles:100,maxFileBytes:1048576,maxOutputBytes:1048576},research:{paths:[],allowWeb:false}}};
  const evidence=await collectEvidence(root,protocol);
  return {protocol,evidence};
}
async function multipleTargets(mutated: number[], selected: string[]) {
  const { protocol } = await fixture();
  const names = ['first selected result', 'second selected result', 'unselected decoy'];
  await fs.writeFile(path.join(root, 'src/value.txt'), JSON.stringify([2, 4, 6]));
  await fs.writeFile(path.join(root, 'test/runner.test.mjs'), `import fs from 'node:fs';
const actual = JSON.parse(fs.readFileSync('src/value.txt','utf8'));
const expected = [2,4,6];
const names = ${JSON.stringify(names)};
const cases = names.map((name,index)=>({file:'test/runner.test.mjs',name,status:actual[index]===expected[index]?'passed':'failed'}));
const failed = cases.some(c=>c.status==='failed');
console.log(JSON.stringify({complete:true,mode:'execution',cases,files:[{path:'test/runner.test.mjs',status:failed?'failed':'passed'}]}));
process.exitCode=failed?1:0;
`);
  const plan = await createPlan(root, [{ path: 'src/value.txt', content: JSON.stringify(mutated) }]);
  await fs.writeFile(path.join(root, '.aiwg/testing/control-plan.json'), JSON.stringify(plan));
  protocol.spec.lanes[0].negativeControls[0].testIds = selected.map(name => JSON.stringify(['default','test/runner.test.mjs',name]));
  return { protocol, evidence: await collectEvidence(root, protocol), names };
}
const caseStates = (receipt: any) => receipt.spec.lanes[0].normalized.cases.map((c: any) => ({ id: c.id, status: c.status }));
describe('attributable negative test controls',()=>{
  it.each([
    { label: 'one selected case survives', mutated: [0,4,6], states: ['failed','passed','passed'], status: 'unknown' },
    { label: 'only the non-target decoy fails', mutated: [2,4,0], states: ['passed','passed','failed'], status: 'unknown' },
    { label: 'every selected case fails', mutated: [0,0,6], states: ['failed','failed','passed'], status: 'killed' },
  ])('attributes multiple targets when $label', async ({ mutated, states, status }) => {
    const selected = ['first selected result', 'second selected result'];
    const { protocol, evidence, names } = await multipleTargets(mutated, selected);
    const expected = (statuses: string[]) => names.map((name, index) => ({ id: JSON.stringify(['default','test/runner.test.mjs',name]), status: statuses[index] }));
    expect(caseStates(evidence)).toEqual(expected(['passed','passed','passed']));
    const receipt = await collectControls(root, protocol, { evidence });
    const control = receipt.spec.controls[0];
    expect(control.status).toBe(status);
    expect(receipt.spec.status).toBe(status === 'killed' ? 'passed' : 'unknown');
    expect(caseStates(control.mutationReceipt)).toEqual(expected(states));
    expect(caseStates(control.restoredReceipt)).toEqual(expected(['passed','passed','passed']));
    expect(control.rollbackReceipt.spec.status).toBe('rolled-back');
    expect(receipt.spec.sourceRestored).toBe(true);
    expect(await fs.readFile(path.join(root,'src/value.txt'),'utf8')).toBe('[2,4,6]');
    if (status === 'killed') expect(await verifyControls(root, protocol, receipt)).toEqual([]);
    else expect(control.diagnostics.map((d: any) => d.message)).toContain('Control failure was not attributable to every selected test case');
  });
  it('executes a real source mutation, proves selected case failure, restores and reruns baseline',async()=>{
    const {protocol,evidence}=await fixture();
    const receipt=await collectControls(root,protocol,{evidence});
    expect(receipt.spec.status).toBe('passed');
    expect(receipt.spec.controls[0].status).toBe('killed');
    expect(receipt.spec.controls[0].mutationReceipt.spec.lanes[0].normalized.cases[0].status).toBe('failed');
    expect(receipt.spec.controls[0].restoredReceipt.spec.lanes[0].normalized.cases[0].status).toBe('passed');
    expect(receipt.spec.sourceRestored).toBe(true);
    expect(await fs.readFile(path.join(root,'src/value.txt'),'utf8')).toBe('valid');
    expect(await verifyControls(root,protocol,receipt)).toEqual([]);
    await fs.appendFile(path.join(root,receipt.spec.controls[0].mutationReceipt.spec.lanes[0].report.path),'tamper');
    expect(await verifyControls(root,protocol,receipt)).not.toEqual([]);
  });
  it('reports a surviving weak oracle as failed conformance and still restores source',async()=>{
    const {protocol,evidence}=await fixture({weak:true});
    const receipt=await collectControls(root,protocol,{evidence});
    expect(receipt.spec.status).toBe('failed');expect(receipt.spec.controls[0].status).toBe('survived');
    expect(await verifyControls(root,protocol,receipt)).toEqual([]);
    expect(await fs.readFile(path.join(root,'src/value.txt'),'utf8')).toBe('valid');
  });
  it('treats setup failure as unknown rather than a killed mutation and restores in finally',async()=>{
    const {protocol,evidence}=await fixture({crash:true});
    const receipt=await collectControls(root,protocol,{evidence});
    expect(receipt.spec.status).toBe('unknown');expect(receipt.spec.controls[0].status).toBe('unknown');
    expect(receipt.spec.controls[0].rollbackReceipt.spec.status).toBe('rolled-back');
    expect(await fs.readFile(path.join(root,'src/value.txt'),'utf8')).toBe('valid');
  });
  it('refuses a failure command bypass without applying the source mutation',async()=>{
    const {protocol,evidence}=await fixture({wrongCommand:true});
    const receipt=await collectControls(root,protocol,{evidence});
    expect(receipt.spec.status).toBe('unknown');expect(receipt.spec.controls[0].applyReceipt).toBeUndefined();
    expect(receipt.spec.controls[0].diagnostics[0].message).toContain('exactly match');
    expect(await fs.readFile(path.join(root,'src/value.txt'),'utf8')).toBe('valid');
  });
  it('refuses test/harness edits and stale baseline source before executing controls',async()=>{
    const {protocol,evidence}=await fixture({editTest:true});
    const receipt=await collectControls(root,protocol,{evidence});
    expect(receipt.spec.status).toBe('unknown');expect(receipt.spec.controls[0].applyReceipt).toBeUndefined();
    expect(receipt.spec.controls[0].diagnostics[0].message).toContain('never tests/configuration');
    await fs.writeFile(path.join(root,'src/value.txt'),'new version');
    await expect(collectControls(root,protocol,{evidence})).rejects.toThrow('baseline is invalid');
  });
  it('recomputes outcome instead of trusting a tampered aggregate or control status',async()=>{
    const {protocol,evidence}=await fixture({weak:true});
    const receipt=await collectControls(root,protocol,{evidence});
    receipt.spec.controls[0].status='killed';receipt.spec.status='passed';
    delete receipt.spec.receiptHash;receipt.spec.receiptHash=digest(receipt.spec);
    expect((await verifyControls(root,protocol,receipt)).some((e:any)=>e.code==='CONTROL_UNVERIFIED')).toBe(true);
  });
  it('rejects an absolute-path runner entrypoint even when source globs include it',async()=>{
    const {protocol}=await fixture();
    const driver=await fs.readFile(path.join(root,'test/runner.test.mjs'),'utf8');
    await fs.writeFile(path.join(root,'src/driver.mjs'),driver);
    const definition=protocol.spec.lanes[0];
    definition.command.argv=[process.execPath,path.join(root,'src/driver.mjs')];
    definition.negativeControls[0].command=definition.command;
    const plan=await createPlan(root,[{path:'src/driver.mjs',content:driver+'\n'}]);
    await fs.writeFile(path.join(root,'.aiwg/testing/control-plan.json'),JSON.stringify(plan));
    const evidence=await collectEvidence(root,protocol);
    const receipt=await collectControls(root,protocol,{evidence});
    expect(receipt.spec.status).toBe('unknown');
    expect(receipt.spec.controls[0].diagnostics[0].message).toContain('runner command entrypoint');
    expect(receipt.spec.controls[0].applyReceipt).toBeUndefined();
  });
  it('stops after failed permission restoration even when original content hashes match',async()=>{
    const {protocol}=await fixture();
    // Collect a baseline matching two planned controls before inducing the filesystem failure.
    protocol.spec.lanes[0].negativeControls.push({...protocol.spec.lanes[0].negativeControls[0],id:'second-control'});
    const baseline=await collectEvidence(root,protocol);
    const original=fs.chmod;let injected=false;
    const spy=vi.spyOn(fs,'chmod').mockImplementation(async(file,mode)=>{
      if(String(file)===path.join(root,'src/value.txt') && await fs.readFile(file,'utf8')==='valid' && !injected){injected=true;throw new Error('injected mode restoration failure');}
      return original(file,mode);
    });
    try{
      const receipt=await collectControls(root,protocol,{evidence:baseline});
      expect(receipt.spec.sourceRestored).toBe(false);
      expect(receipt.spec.status).toBe('unknown');
      expect(receipt.spec.controls).toHaveLength(1);
      expect(receipt.spec.controls[0].partialRollbackReceipt.spec.status).toBe('partial');
      expect(await fs.readFile(path.join(root,'src/value.txt'),'utf8')).toBe('valid');
    }finally{spy.mockRestore();}
  });

});
