import {describe,it,expect} from 'vitest';
// @ts-ignore Native addon runtime
import {normalizeCoverage} from '../../../agentic/code/addons/testing-quality/lib/coverage.mjs';
const opts={format:'canonical',root:'/project',provider:'fixture',version:'1',inventory:{spec:{files:[{path:'src/a.js',isSource:true},{path:'src/b.js',isSource:true},{path:'test/a.test.js',isSource:false}]}}};
const file=(path:string,covered=1,total=2)=>({path,metrics:{lines:{covered,total},statements:{covered,total},branches:{covered:0,total:1},functions:{covered:1,total:1}}});
describe('scoped coverage counters',()=>{
 it('retains missing files and does not count extras toward source coverage',()=>{
  const value=normalizeCoverage({complete:true,files:[file('src/a.js'),file('vendor/c.js',100,100)]},opts);
  expect(value.complete).toBe(false);expect(value.scope.missingFiles).toEqual(['src/b.js']);expect(value.scope.extraFiles).toEqual(['vendor/c.js']);expect(value.totals.lines).toEqual({covered:1,total:2});
 });
 it('combines counters within one source map and preserves zero branch hits',()=>{
  const value=normalizeCoverage({complete:true,files:[file('src/a.js'),file('/project/src/b.js',2,3)]},opts);
  expect(value.complete).toBe(true);expect(value.totals.lines).toEqual({covered:3,total:5});expect(value.totals.branches).toEqual({covered:0,total:2});
 });
 it.each([{complete:true,files:[file('../outside.js')]},{complete:true,files:[file('src/a.js',3,2)]},{complete:true,files:[file('src/a.js'),file('src/a.js')]},{total:{lines:{pct:100}}},{complete:true,files:[]}])('rejects escaped, impossible, duplicate, percentage-only and empty coverage',raw=>{
  expect(normalizeCoverage(raw,opts).complete).toBe(false);
 });
 it('missing metric counters remain unknown',()=>{
  const raw={complete:true,files:[{path:'src/a.js',metrics:{}},file('src/b.js')]};
  expect(normalizeCoverage(raw,opts).totals.lines).toBeNull();
 });
 it('derives unique lines and separate branch arms from Istanbul maps',()=>{
  const loc=(line=1)=>({start:{line,column:0},end:{line,column:5}});
  const map={'src/a.js':{path:'src/a.js',statementMap:{0:loc(),1:loc(),2:loc(2)},fnMap:{0:{decl:loc(),loc:loc()}},branchMap:{0:{loc:loc(),locations:[loc(),loc()]}},s:{0:0,1:1,2:0},f:{0:1},b:{0:[1,0]}}};
  const value=normalizeCoverage(map,{...opts,format:'istanbul',inventory:{spec:{files:[{path:'src/a.js',isSource:true}]}}});
  expect(value.complete).toBe(true);expect(value.totals.lines).toEqual({covered:1,total:2});expect(value.totals.statements).toEqual({covered:1,total:3});expect(value.totals.branches).toEqual({covered:1,total:2});
  const mismatched=structuredClone(map);mismatched['src/a.js'].path='src/b.js';expect(normalizeCoverage(mismatched,{...opts,format:'istanbul'}).complete).toBe(false);
  const invalidLocation=structuredClone(map);invalidLocation['src/a.js'].fnMap[0].loc.end.column=-1;expect(normalizeCoverage(invalidLocation,{...opts,format:'istanbul'}).complete).toBe(false);
  map['src/a.js'].b[0]=[1];expect(normalizeCoverage(map,{...opts,format:'istanbul'}).complete).toBe(false);
 });
});
