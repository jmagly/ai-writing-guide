import fs from 'node:fs/promises';
import path from 'node:path';
import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {parse} from 'yaml';
const addon=path.resolve('agentic/code/addons/testing-quality');
const read=async(file:string)=>parse(await fs.readFile(file,'utf8'));
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
   const steps=new Map<string,any>();
   for(const step of p.spec.steps){
    expect(steps.has(step.id)).toBe(false);
    const c=capabilities.get(step.capability);expect(c,step.capability).toBeDefined();
    for(const dependency of step.depends_on??[])expect(steps.has(dependency),dependency).toBe(true);
    for(const input of c.spec.inputs?.filter((i:any)=>i.required)??[])expect(step.inputs?.some((i:any)=>i.name===input.name),`${file}:${step.id}:${input.name}`).toBe(true);
    for(const input of step.inputs??[]){
     expect(c.spec.inputs.some((i:any)=>i.name===input.name)).toBe(true);
     if(input.from){const [source,output]=input.from.split('.');expect(steps.has(source),input.from).toBe(true);expect(capabilities.get(steps.get(source).capability).spec.outputs.some((o:any)=>o.name===output),input.from).toBe(true);}
    }
    steps.set(step.id,step);
   }
   const invalid=structuredClone(p);invalid.spec.silentSuccessOnError=true;expect(playbook(invalid)).toBe(false);
  }
 });
});
