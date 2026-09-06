import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluationHash, parseEvaluationManifest, preregisterEvaluation, createBlindEvaluationPackets, summarizeEvaluationRatings, bootstrapAuthorMeans, reportMetricDisagreement, evaluationDesignReadiness, summarizeEvaluationByStratum, EVALUATION_CONDITIONS, type EvaluationManifest, type EvaluationPreregistration, type EvaluationStimulus, type EvaluationRating } from '../../../src/writing/voice-evaluation.js';
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/writing/evaluation-leakage.v1.json', import.meta.url), 'utf8'));
const hash = evaluationHash('synthetic frozen artifact');
function setup() {
  const manifest: EvaluationManifest = {
    schemaVersion: 1, id: 'synthetic', developmentAuthorIds: ['developer'], finalAuthorIds: ['author-a', 'author-b'],
    documents: fixture.documents.map((d: {text:string}) => ({...d, sha256:evaluationHash(d.text)})),
    duplicatePolicy: {metric:'normalized-word-trigram-jaccard-v1',threshold:0.8,justification:'Synthetic leakage policy; not empirically calibrated.'},
    controls: [{kind:'same-author-different-topic',leftDocumentId:'a-enroll',rightDocumentId:'a-test'},{kind:'different-author-same-topic',leftDocumentId:'a-test',rightDocumentId:'b-test'}],
    models: ['extract','family-a','family-b','judge'].map(id => ({id,family:id,provider:'synthetic',snapshot:`fixture-v1-${id}`,decoding:{temperature:0},promptSha256:hash})),
    extractionModelIds:['extract'], humanJudges:[{id:'reader',role:'reader'}], judges:[{id:'judge-1',modelId:'judge',role:'reader',independentCalibrationSha256:hash,selfPreferenceAuditSha256:hash}],
    voluntaryStrata:[{authorId:'author-a',suppliedByAuthor:true,language:'English',proficiency:'self-described'}],
  };
  const preregistration: EvaluationPreregistration = {schemaVersion:1,id:'registration',manifestSha256:evaluationHash(JSON.stringify(parseEvaluationManifest(manifest))),pilot:{artifactSha256:hash,completedAt:'2026-09-01T12:00:00Z',authorIds:['developer'],findings:'Synthetic placeholder, no human pilot.'},registeredAt:'2026-09-02T12:00:00Z',finalDataNotAccessed:true,plannedAuthors:2,sampleSizeJustification:'Synthetic test only, not a power analysis.',thresholds:[{dimension:'factual-fidelity',value:1,direction:'at-least',justification:'Synthetic assertion only.'}],primaryOutcomes:['factual-fidelity'],analysisPlan:'Author clustered paired contrasts.',selectorPoliciesSha256:hash,budget:{limit:1000,tokenizerId:'synthetic',tokenizerVersion:'1'}};
  const stimuli: EvaluationStimulus[] = manifest.documents.filter(d=>d.split==='heldout').flatMap(d=> ['family-a','family-b'].flatMap(modelId=>EVALUATION_CONDITIONS.map(c=>({id:`${d.id}-${modelId}-${c.id}`,taskId:d.id,authorId:d.authorId,heldoutDocumentId:d.id,text:`Synthetic output ${d.id} ${modelId} ${c.id}`,sha256:evaluationHash(`Synthetic output ${d.id} ${modelId} ${c.id}`),budgetUsed:500,tokenizerId:'synthetic',tokenizerVersion:'1',conditionId:c.id as EvaluationStimulus['conditionId'],workflow:c.exemplars?'notes-plus-exemplars-plus-author-edits' as const:'notes-plus-author-edits' as const,modelId,genre:'article',lengthBand:'short',editingStrength:'light'}))));
  for (const d of manifest.documents.filter(d=>d.split==='heldout')) {
    const base = stimuli.find(s=>s.heldoutDocumentId===d.id)!;
    stimuli.push({...base,id:`${d.id}-unassisted`,conditionId:'r0v0e0',workflow:'unassisted',modelId:null});
    stimuli.push({...base,id:`${d.id}-minimal`,conditionId:'r0v0e0',workflow:'minimal-editing'});
  }
  return {manifest,preregistration,stimuli};
}
const bootstrap = {seed:'fixture',iterations:500,confidence:0.95};
describe('voice evaluation design, synthetic only',()=>{
  it('validates controls, author partitions, integrity and voluntary-only strata',()=>{
    const {manifest}=setup(); expect(parseEvaluationManifest(manifest).documents).toHaveLength(5);
    const overlap=structuredClone(manifest); overlap.developmentAuthorIds.push('author-a'); expect(()=>parseEvaluationManifest(overlap)).toThrow('overlap');
    const wrong=structuredClone(manifest); wrong.documents[0].split='heldout'; expect(()=>parseEvaluationManifest(wrong)).toThrow('partition');
    const control=structuredClone(manifest); control.controls[0].rightDocumentId='b-test'; expect(()=>parseEvaluationManifest(control)).toThrow('relationship');
    expect(()=>parseEvaluationManifest({...manifest,inferredDemographics:[]})).toThrow();
    expect(()=>parseEvaluationManifest({...manifest,voluntaryStrata:[{authorId:'author-a',suppliedByAuthor:false}]})).toThrow();
  });
  it('rejects cross-split normalized and near copies before selector fitting',()=>{
    for(const leak of fixture.leakageCases){const {manifest}=setup(); manifest.documents[0].text=leak.replacement;manifest.documents[0].sha256=evaluationHash(leak.replacement);expect(()=>parseEvaluationManifest(manifest)).toThrow('near-duplicate');}
    const {manifest}=setup();manifest.documents[0].text+=' changed';expect(()=>parseEvaluationManifest(manifest)).toThrow('integrity');
  });
  it('rejects circular judges including a different snapshot in the extraction family',()=>{
    const {manifest}=setup();manifest.models.find(m=>m.id==='judge')!.family='extract';expect(()=>parseEvaluationManifest(manifest)).toThrow('independent');
  });
  it('binds caller-justified preregistration after pilot and before declared final access',()=>{
    const {manifest,preregistration:p}=setup();expect(preregisterEvaluation(manifest,p)).toEqual(p);
    expect(()=>preregisterEvaluation(manifest,{...p,registeredAt:p.pilot.completedAt})).toThrow('after pilot');
    expect(()=>preregisterEvaluation(manifest,{...p,finalDataNotAccessed:false})).toThrow();
    expect(()=>preregisterEvaluation(manifest,{...p,pilot:{...p.pilot,authorIds:['author-a']}})).toThrow('development');
    expect(()=>preregisterEvaluation(manifest,{...p,sampleSizeJustification:''})).toThrow();
    expect(()=>preregisterEvaluation(manifest,{...p,manifestSha256:evaluationHash('other')})).toThrow('bind');
  });
  it('creates deterministic blind packets with private labels separate and balanced positions by role',()=>{
    const {stimuli}=setup();const block=stimuli.slice(0,3);const judges=(['author','reader'] as const).flatMap(role=>Array.from({length:6},(_,i)=>({id:`${role}-${i}`,role})));
    const a=createBlindEvaluationPackets(block,judges,'seed');expect(a).toEqual(createBlindEvaluationPackets(block,[...judges].reverse(),'seed'));
    for(const packet of a.packets){expect(JSON.stringify(packet)).not.toContain('modelId');expect(JSON.stringify(packet)).not.toContain('conditionId');expect(JSON.stringify(packet)).not.toContain('judgeId');}
    for(const role of ['author','reader'])for(const s of block)for(let position=0;position<3;position++)expect(a.privateKeyMap.filter(p=>p.role===role&&p.items[position].stimulus.id===s.id)).toHaveLength(2);
    expect(createBlindEvaluationPackets(block,judges,'other').privateKeyMap).not.toEqual(a.privateKeyMap);
    expect(()=>createBlindEvaluationPackets([block[0],block[0]],judges,'seed')).toThrow('unique');
    expect(()=>createBlindEvaluationPackets([block[0],stimuli.find(s=>s.authorId==='author-b')!],judges,'seed')).toThrow('one author');
  });
  it('keeps missing, ties and author/reader ratings separate and rejects duplicate observations',()=>{
    const ratings:EvaluationRating[]=[{stimulusId:'s1',authorId:'a',judgeId:'j1',role:'author',dimension:'author-authenticity',value:null,missingReason:'declined',tie:false},{stimulusId:'s1',authorId:'a',judgeId:'j2',role:'reader',dimension:'author-authenticity',value:3,tie:true}];
    const summary=summarizeEvaluationRatings(ratings);expect(summary.find(s=>s.role==='author'&&s.dimension==='author-authenticity')).toMatchObject({missing:1,mean:null,ties:0});expect(summary.find(s=>s.role==='reader'&&s.dimension==='author-authenticity')).toMatchObject({missing:0,mean:3,ties:1});
    expect(()=>summarizeEvaluationRatings([{...ratings[0],missingReason:undefined}])).toThrow('reason');
    expect(()=>summarizeEvaluationRatings([ratings[1],ratings[1]])).toThrow('Duplicate');
  });
  it('bootstraps authors, not independent texts, and represents insufficient data',()=>{
    const rows=[...Array.from({length:100},()=>({authorId:'a',value:0})),{authorId:'b',value:10},{authorId:'missing',value:null}];
    const result=bootstrapAuthorMeans(rows,bootstrap);expect(result).toMatchObject({estimate:5,authors:2,excludedAuthors:1});expect(result).toEqual(bootstrapAuthorMeans([...rows].reverse(),bootstrap));
    expect(bootstrapAuthorMeans([{authorId:'a',value:1}],bootstrap).interval).toBeNull();expect(bootstrapAuthorMeans([],bootstrap).estimate).toBeNull();
  });
  it('reports disagreement, missing pairs and ties against an independent calibration record',()=>{
    const result=reportMetricDisagreement([{itemId:'a',human:'pass',metric:'fail'},{itemId:'b',human:'tie',metric:'tie'},{itemId:'c',human:null,metric:'pass'}],{humanReferenceSha256:hash,independentOfFinalData:true,decisionRule:'Synthetic categorical fixture'});expect(result).toMatchObject({paired:2,missing:1,ties:1,disagreements:['a'],disagreementRate:0.5,authorshipCertification:false});
  });
  it('requires two families, every eight-condition task block, workflow baselines and frozen budgets',()=>{
    const {manifest,preregistration,stimuli}=setup();expect(evaluationDesignReadiness(manifest,preregistration,stimuli)).toMatchObject({designComplete:true,humanEvaluation:'not-established'});
    expect(evaluationDesignReadiness(manifest,preregistration,stimuli.filter(s=>s.modelId!=='family-b')).gaps).toContain('at-least-two-model-families');
    expect(evaluationDesignReadiness(manifest,preregistration,stimuli.slice(1)).gaps).toContain('condition:a-test:family-a:r0v0e0');
    expect(()=>evaluationDesignReadiness(manifest,preregistration,[{...stimuli[0],budgetUsed:1001}])).toThrow('budget');
    expect(()=>evaluationDesignReadiness(manifest,preregistration,[{...stimuli[0],heldoutDocumentId:'a-enroll'}])).toThrow('heldout');
  });
  it('reports sparse voluntary strata without inventing language/proficiency or intervals',()=>{
    const {manifest,stimuli}=setup();const s=stimuli.find(v=>v.authorId==='author-b')!;
    const result=summarizeEvaluationByStratum(manifest,stimuli,[{stimulusId:s.id,authorId:s.authorId,judgeId:'reader',role:'reader',dimension:'between-author-diversity',value:2,tie:false}],bootstrap);
    expect(result.find(v=>v.axis==='language')).toMatchObject({value:'not-supplied',authors:1,interval:null});
  });
  it('rejects identical provider/snapshot extraction and judge identities despite different family labels',()=>{
    const {manifest}=setup();manifest.models.find(m=>m.id==='judge')!.snapshot=manifest.models.find(m=>m.id==='extract')!.snapshot;
    expect(()=>parseEvaluationManifest(manifest)).toThrow('independent');
  });
  it('binds subgroup stimuli to author, heldout document, hash and workflow',()=>{
    const {manifest,stimuli}=setup();
    for(const changed of [{authorId:'forged'},{heldoutDocumentId:'missing'},{heldoutDocumentId:'a-enroll'},{sha256:hash},{workflow:'unassisted' as const}]) {
      expect(()=>summarizeEvaluationByStratum(manifest,[{...stimuli[0],...changed}],[],bootstrap)).toThrow();
    }
  });
  it('counts absent declared assignments and rejects unknown or role-mismatched judges',()=>{
    const {manifest,stimuli}=setup();const stimulus=stimuli[0];
    const assignment={stimulusId:stimulus.id,judgeId:'reader',role:'reader' as const,dimension:'factual-fidelity' as const};
    const context={manifest,stimuli,assignments:[assignment]};
    expect(summarizeEvaluationRatings([],context).find(r=>r.role==='reader'&&r.dimension==='factual-fidelity')).toMatchObject({missing:1,observed:0,missingnessCompleteness:'declared-assignments'});
    expect(summarizeEvaluationRatings([])[0].missingnessCompleteness).toBe('unknown');
    const rating={...assignment,authorId:stimulus.authorId,value:1,tie:false};
    expect(()=>summarizeEvaluationRatings([{...rating,judgeId:'unknown'}],context)).toThrow('judge');
    expect(()=>summarizeEvaluationRatings([{...rating,role:'author'}],context)).toThrow('judge');
    expect(()=>summarizeEvaluationRatings([rating],{...context,assignments:[]})).toThrow('Unassigned');
    expect(summarizeEvaluationByStratum(manifest,stimuli,[],{...bootstrap,assignments:[assignment]}).find(r=>r.axis==='genre')).toMatchObject({missing:1,authors:0,missingnessCompleteness:'declared-assignments'});
  });

  it('cannot count a model judge as author self-report or pool model and human reader outcomes',()=>{
    const {manifest,stimuli}=setup();
    expect(()=>parseEvaluationManifest({...manifest,humanJudges:[],judges:manifest.judges.map(j=>({...j,role:'author'}))})).toThrow();
    const base={stimulusId:stimuli[0].id,authorId:stimuli[0].authorId,role:'reader' as const,dimension:'reader-suitability' as const,value:5,tie:false};
    const human={...base,judgeId:'reader'};const bot={...base,judgeId:'judge-1'};
    expect(()=>summarizeEvaluationRatings([human,bot],{manifest,stimuli})).toThrow('separate aggregation');
    expect(()=>summarizeEvaluationByStratum(manifest,stimuli,[human,bot],bootstrap)).toThrow('separate aggregation');
    expect(()=>summarizeEvaluationRatings([],{manifest,stimuli,assignments:[human,bot].map(({stimulusId,judgeId,role,dimension})=>({stimulusId,judgeId,role,dimension}))})).toThrow('separate aggregation');
    expect(summarizeEvaluationRatings([bot],{manifest,stimuli}).find(r=>r.role==='reader')).toMatchObject({judgeKind:'model'});
    expect(summarizeEvaluationRatings([human],{manifest,stimuli}).find(r=>r.role==='reader')).toMatchObject({judgeKind:'human'});
    const authorManifest={...manifest,humanJudges:[...manifest.humanJudges,{id:'author-a-self',role:'author' as const,authorId:'author-a'}]};
    const other=stimuli.find(s=>s.authorId==='author-b')!;
    expect(()=>summarizeEvaluationRatings([{...base,stimulusId:other.id,authorId:other.authorId,judgeId:'author-a-self',role:'author'}],{manifest:authorManifest,stimuli})).toThrow('incompatible');
  });

});
