import {randomUUID} from 'node:crypto';
import {runWorker} from './jobs.mjs';
import {recipe,KERNEL} from './profile.mjs';
import {check} from '../document.mjs';
export class LabSession {
  constructor(document){this.document=document;this.job=null;this.preview=null;this.sketch=null;this.suite=null;this.closed=false;}
  get running(){return this.job?.state==='running';}
  view(){const {controller,promise,...job}=this.job??{};return {job:this.job?job:null,preview:this.preview,sketch:this.sketch,suite:this.suite};}
  start({kind='geometry',spec,fixture,drag,primitives,expectedRevision}){
    this.document.expect(expectedRevision);check(!this.closed,'Cancelled','Lab session is closed.');
    check(!this.running,'projectBusy','Cancel or wait for the current lab task.');
    check(['geometry','suite','sketch'].includes(kind),'UnsupportedCapability','Unknown lab task.');
    const payload=kind==='geometry'?{spec:recipe(spec)}:kind==='sketch'?{fixture,drag,primitives}:{};
    const job={id:randomUUID(),state:'running',kind,baseRevision:expectedRevision,controller:new AbortController(),startedAt:new Date().toISOString()};
    const work=runWorker(kind,payload,{signal:job.controller.signal,timeoutMs:20000});
    this.job=job;
    job.promise=work.then(({result,resources})=>{
      if(this.closed||this.job!==job||job.state!=='running')return;
      if(this.document.value.revision!==expectedRevision){job.state='stale';job.error={code:'RevisionConflict',message:'Document changed while computing. Rerun the experiment.'};return;}
      job.state='completed';job.resources=resources;job.finishedAt=new Date().toISOString();
      if(kind==='geometry')this.preview={jobId:job.id,baseRevision:expectedRevision,...result};
      else if(kind==='sketch')this.sketch=result;
      else this.suite=result;
    },error=>{
      if(this.job!==job)return;job.state=error.code==='Cancelled'?'cancelled':'failed';job.error={code:error.code??'OperationFailed',message:error.message};job.finishedAt=new Date().toISOString();
    });
    return this.view();
  }
  cancel(){if(this.running)this.job.controller.abort();return this.view();}
  apply({expectedRevision,jobId}){
    this.document.expect(expectedRevision);check(!this.running,'projectBusy','Wait for the worker before applying.');
    check(this.preview?.jobId===jobId&&this.preview.baseRevision===expectedRevision,'revisionConflict','Preview is missing or stale. Rebuild it first.');
    check(this.preview.validity.solids>0,'InvalidGeometry','An empty or invalid solid cannot be kept.');
    this.document.value={...this.document.value,provisional:'E0.M2',revision:this.document.value.revision+1,
      experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe(this.preview.spec)}};
    return this.document.view();
  }
  async close(){this.closed=true;if(this.running)this.job.controller.abort();await this.job?.promise;}
}
