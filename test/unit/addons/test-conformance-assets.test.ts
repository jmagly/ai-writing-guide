import fs from 'node:fs/promises';
import path from 'node:path';
import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {parse} from 'yaml';
const addon=path.resolve('agentic/code/addons/testing-quality');
const read=async(file:string)=>parse(await fs.readFile(file,'utf8'));
function assertFlowBindings(playbook: any, capabilities: Map<string, any>) {
 const steps = new Map<string, any>();
 for (const step of playbook.spec.steps) {
  if (steps.has(step.id)) throw new Error(`Duplicate step: ${step.id}`);
  const capability = capabilities.get(step.capability);
  if (!capability) throw new Error(`Unknown capability: ${step.capability}`);
  for (const dependency of step.depends_on ?? []) if (!steps.has(dependency)) throw new Error(`Unknown or nonpreceding dependency: ${dependency}`);
  const ancestors = new Set<string>();
  const visit = (id: string) => { if (ancestors.has(id)) return; ancestors.add(id); for (const parent of steps.get(id).depends_on ?? []) visit(parent); };
  for (const dependency of step.depends_on ?? []) visit(dependency);
  for (const input of capability.spec.inputs.filter((item: any) => item.required)) if (!step.inputs?.some((item: any) => item.name === input.name)) throw new Error(`Missing required input: ${step.id}.${input.name}`);
  const names = new Set<string>();
  for (const input of step.inputs ?? []) {
   if (names.has(input.name)) throw new Error(`Duplicate input: ${step.id}.${input.name}`);
   names.add(input.name);
   const definition = capability.spec.inputs.find((item: any) => item.name === input.name);
   if (!definition) throw new Error(`Undeclared input: ${step.id}.${input.name}`);
   const hasFrom = Object.hasOwn(input, 'from');
   if (Number(hasFrom) + Number(Object.hasOwn(input, 'value')) !== 1) throw new Error(`Exactly one input binding required: ${step.id}.${input.name}`);
   if (hasFrom) {
    if (typeof input.from !== 'string' || !/^[^.]+\.[^.]+$/.test(input.from)) throw new Error(`Malformed artifact reference: ${input.from}`);
    const [source, output] = input.from.split('.');
    if (!steps.has(source)) throw new Error(`Unknown or nonpreceding artifact source: ${source}`);
    const outputDefinition = capabilities.get(steps.get(source).capability).spec.outputs.find((item: any) => item.name === output);
    if (!outputDefinition) throw new Error(`Unknown artifact output: ${input.from}`);
    if (!ancestors.has(source)) throw new Error(`Artifact source is not a dependency ancestor: ${input.from}`);
    if (outputDefinition.type !== definition.type) throw new Error(`Artifact type mismatch: ${input.from}`);
   }
  }
  steps.set(step.id, step);
 }
}

describe('deployable conformance assets',()=>{
 it('resolves all manifest components and preserves the original six skills',async()=>{
  const manifest=await read(path.join(addon,'manifest.json'));
  expect(manifest.skills).toEqual(expect.arrayContaining(['tdd-enforce','mutation-test','flaky-detect','flaky-fix','generate-factory','test-sync']));
  for(const section of ['agents','rules','templates','flows','skills'])for(const id of manifest[section]){
   const file=section==='skills'?path.join(section,id,'SKILL.md'):path.join(section,id+(section==='flows'?'.yaml':'.md'));
   expect((await fs.stat(path.join(addon,file))).isFile(),file).toBe(true);
  }
  expect(Object.keys(manifest.cli_commands.subcommands)).toHaveLength(12);
  for(const command of Object.values(manifest.cli_commands.subcommands) as any[])expect((await fs.stat(path.join(addon,manifest.cli_commands.entry,command.file))).isFile()).toBe(true);
 });
 it('validates every flow and capability, DAG dependency and artifact binding',async()=>{
  const schemaRoot='agentic/code/addons/aiwg-utils/workflow/schemas';
  // Canonical workflow schemas use required-only subschemas inside not/anyOf.
  const ajv=new Ajv({strict:true,strictRequired:false,allErrors:true});
  addFormats(ajv);
  const playbook=ajv.compile(await read(path.join(schemaRoot,'workflow-playbook.schema.json')));
  const capability=ajv.compile(await read(path.join(schemaRoot,'workflow-capability.schema.json')));
  const capabilities=new Map<string,any>();
  for(const file of await fs.readdir(path.join(addon,'flows/capabilities'))){
   const c=await read(path.join(addon,'flows/capabilities',file));
   expect(capability(c),JSON.stringify(capability.errors)).toBe(true);
   expect(capabilities.has(c.metadata.name)).toBe(false);capabilities.set(c.metadata.name,c);
   expect((await fs.stat(path.join(addon,'agents',c.spec.agent+'.md'))).isFile()).toBe(true);
  }
  expect(capabilities.size).toBe(10);
  for(const file of (await fs.readdir(path.join(addon,'flows'))).filter(f=>f.endsWith('.yaml'))){
   const p=await read(path.join(addon,'flows',file));expect(playbook(p),JSON.stringify(playbook.errors)).toBe(true);
   assertFlowBindings(p,capabilities);
   const invalid=structuredClone(p);invalid.spec.silentSuccessOnError=true;expect(playbook(invalid)).toBe(false);
  }
 });
 it('rejects disconnected, absent, ambiguous and malformed artifact bindings independently',async()=>{
  const capabilities=new Map<string,any>();
  for(const file of await fs.readdir(path.join(addon,'flows/capabilities'))){const c=await read(path.join(addon,'flows/capabilities',file));capabilities.set(c.metadata.name,c);}
  const original=await read(path.join(addon,'flows/test-conformance-audit.yaml'));
  expect(()=>assertFlowBindings(original,capabilities)).not.toThrow();
  const firstBinding=(p:any)=>p.spec.steps.flatMap((step:any)=>step.inputs??[]).find((input:any)=>input.from);
  const cases: Array<[string,(p:any)=>void,string]>=[
   ['disconnected producers',p=>p.spec.steps.forEach((step:any)=>{delete step.depends_on;}),'Artifact source is not a dependency ancestor'],
   ['absent required binding',p=>{delete firstBinding(p).from;},'Exactly one input binding required'],
   ['ambiguous binding',p=>{firstBinding(p).value='conflicting literal';},'Exactly one input binding required'],
   ['extra reference suffix',p=>{firstBinding(p).from+='.unexpected';},'Malformed artifact reference'],
   ['missing output',p=>{firstBinding(p).from='protocol.nonexistent';},'Unknown artifact output'],
   ['missing producer',p=>{firstBinding(p).from='nonexistent.protocol';},'Unknown or nonpreceding artifact source'],
   ['invalid dependency',p=>{p.spec.steps[1].depends_on=['nonexistent'];},'Unknown or nonpreceding dependency'],
   ['dependency cycle',p=>{p.spec.steps[0].depends_on=[p.spec.steps[1].id];},'Unknown or nonpreceding dependency'],
   ['duplicate step',p=>{p.spec.steps[1].id=p.spec.steps[0].id;},'Duplicate step'],
   ['unknown capability',p=>{p.spec.steps[0].capability='nonexistent';},'Unknown capability'],
   ['missing required input',p=>{p.spec.steps[1].inputs=[];},'Missing required input'],
   ['undeclared input',p=>{p.spec.steps[1].inputs.push({name:'nonexistent',value:'x'});},'Undeclared input'],
   ['duplicate input',p=>{p.spec.steps[1].inputs.push({...p.spec.steps[1].inputs[0]});},'Duplicate input'],
  ];
  for(const [name,mutate,diagnostic] of cases){const changed=structuredClone(original);mutate(changed);expect(()=>assertFlowBindings(changed,capabilities),name).toThrow(diagnostic);}
  const mismatched=structuredClone(capabilities);
  const firstSource=firstBinding(original).from.split('.')[0];
  mismatched.get(original.spec.steps.find((step:any)=>step.id===firstSource).capability).spec.outputs[0].type='number';
  expect(()=>assertFlowBindings(original,mismatched)).toThrow('Artifact type mismatch');
  for(const value of [false,0,'']){const literal=structuredClone(original);const input=firstBinding(literal);delete input.from;input.value=value;expect(()=>assertFlowBindings(literal,capabilities)).not.toThrow();}
 });
});
