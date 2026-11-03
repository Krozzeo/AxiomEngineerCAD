import {hasIntegration} from '../integration/profile.mjs';
import {randomUUID} from 'node:crypto';
import {runWorker} from './jobs.mjs';
import {recipe,KERNEL} from './profile.mjs';
import {check} from '../document.mjs';
import {assemblyRecipe} from '../assembly/profile.mjs';
import {syncBindings} from '../native/schema.mjs';
export class LabSession {
  constructor(document){this.document=document;this.job=null;this.preview=null;this.sketch=null;this.suite=null;this.closed=false;}
  get running(){return this.job?.state==='running';}
  view(){const {controller,promise,...job}=this.job??{};return structuredClone({job:this.job?job:null,preview:this.preview,sketch:this.sketch,suite:this.suite,assembly:this.assembly??null,assemblyResult:this.assemblyResult??null,assemblySuite:this.assemblySuite??null,nativeVerification:this.nativeVerification??null});}
  start({kind='geometry',spec,fixture,drag,primitives,assembly,candidateId,expectedRevision}){
    this.document.expect(expectedRevision);check(!this.document.proof?.running,'projectBusy','Finish the drawing/viewport worker first.');check(!this.closed,'Cancelled','Lab session is closed.');
    check(!this.document.commands?.running,'projectBusy','Finish or cancel the semantic tool job first.');
    check(!this.running,'projectBusy','Cancel or wait for the current lab task.');
    check(['geometry','suite','sketch','assembly','assembly-suite','native-verify'].includes(kind),'UnsupportedCapability','Unknown lab task.');
    const payload=kind==='geometry'?{spec:recipe(spec)}:kind==='sketch'?{fixture,drag,primitives}:kind==='assembly'?{assembly:assemblyRecipe(assembly),drag}:kind==='native-verify'?{document:structuredClone(this.document.native.verificationDocument(candidateId))}:{};
    const job={id:randomUUID(),state:'running',kind,baseRevision:expectedRevision,controller:new AbortController(),startedAt:new Date().toISOString()};
    const work=runWorker(kind,payload,{signal:job.controller.signal,timeoutMs:20000});
    this.job=job;
    job.promise=work.then(({result,resources})=>{
      if(this.closed||this.job!==job||job.state!=='running')return;
      if(this.document.value.revision!==expectedRevision){job.state='stale';job.error={code:'RevisionConflict',message:'Document changed while computing. Rerun the experiment.'};return;}
      job.state='completed';job.resources=resources;job.finishedAt=new Date().toISOString();
      if(kind==='geometry')this.preview={jobId:job.id,baseRevision:expectedRevision,...result};
      else if(kind==='sketch')this.sketch=result;
      else if(kind==='assembly'){this.assemblyResult={jobId:job.id,baseRevision:expectedRevision,...result};if(result.applicable)this.assembly=this.assemblyResult;}
      else if(kind==='assembly-suite')this.assemblySuite=result;
      else if(kind==='native-verify')this.nativeVerification={jobId:job.id,baseRevision:expectedRevision,result};
      else this.suite=result;
    },error=>{
      if(this.job!==job)return;job.state=error.code==='Cancelled'?'cancelled':'failed';job.error={code:error.code??'OperationFailed',message:error.message};job.finishedAt=new Date().toISOString();
    });
    return this.view();
  }
  cancel(){if(this.running)this.job.controller.abort();return this.view();}
  apply({expectedRevision,jobId,kind='geometry'}){
    this.document.expect(expectedRevision);check(!hasIntegration(this.document.value),'UnsupportedCapability','Integrated studies use their persisted driving chain; legacy Keep cannot replace it.');check(!this.document.proof?.running,'projectBusy','Finish the drawing/viewport worker first.');check(!this.running,'projectBusy','Wait for the worker before applying.');
    check(!this.document.commands?.running,'projectBusy','Finish or cancel the semantic tool job first.');
    check(['geometry','assembly'].includes(kind),'UnsupportedCapability','Unknown apply kind.');
    if(kind==='assembly'){
      const r=this.assembly;
      check(r?.jobId===jobId&&r.baseRevision===expectedRevision,'revisionConflict','Assembly preview is missing or stale. Solve it again.');
      check(r.applicable&&r.solvedRecipe,'InvalidGeometry','Only a validated feasible assembly can be kept.');
      this.document.value=syncBindings({...this.document.value,...(this.document.value.formatVersion===0?{provisional:'E0.M3'}:{}),revision:this.document.value.revision+1,assembly:assemblyRecipe(r.solvedRecipe)});
      return this.document.view();
    }
    check(this.preview?.jobId===jobId&&this.preview.baseRevision===expectedRevision,'revisionConflict','Preview is missing or stale. Rebuild it first.');
    check(this.preview.validity.solids>0,'InvalidGeometry','An empty or invalid solid cannot be kept.');
    this.document.value=syncBindings({...this.document.value,...(this.document.value.formatVersion===0?{provisional:this.document.value.assembly?'E0.M3':'E0.M2'}:{}),revision:this.document.value.revision+1,
      experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe(this.preview.spec)}});
    return this.document.view();
  }
  async close(){this.closed=true;if(this.running)this.job.controller.abort();await this.job?.promise;}
}
