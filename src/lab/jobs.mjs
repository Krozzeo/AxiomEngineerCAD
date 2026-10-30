import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {check} from '../document.mjs';
import {recipe} from './profile.mjs';
import {validateSketch} from './sketch.mjs';
import {assemblyRecipe} from '../assembly/profile.mjs';
export function runWorker(kind,payload={}, {signal,timeoutMs=20000}={}) {
  check(['geometry','suite','sketch','assembly','assembly-suite'].includes(kind),'UnsupportedCapability','Unknown lab task.');
  if(kind==='assembly')assemblyRecipe(payload.assembly);
  if(kind==='geometry')recipe(payload.spec);
  if(kind==='sketch'&&payload.primitives)validateSketch(payload.primitives);
  check(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=60000,'InvalidInput','Worker deadline must be within one minute.');
  return new Promise((resolve,reject)=>{
    const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!/token|secret|api_key|credential/i.test(name)));
    const child=fork(fileURLToPath(new URL('./worker.mjs',import.meta.url)),[],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true,env,
      execArgv:['--max-old-space-size=192']});
    let result,error,settled=false;
    const abort=()=>{error=Object.assign(Error('Lab worker cancelled; no committed change.'),{code:'Cancelled'});child.kill();};
    const timer=setTimeout(()=>{error=Object.assign(Error('Lab worker exceeded its deadline and was stopped.'),{code:'ResourceLimit'});child.kill();},timeoutMs);
    child.once('error',e=>{error=Object.assign(Error('Lab worker could not start.'),{code:'OperationFailed',cause:e});finish();});
    function finish(){if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      if(error)reject(error);else if(result?.ok)resolve({result:result.result,resources:result.resources});else reject(Object.assign(Error(result?.error?.message??'Lab worker exited without a confirmed result.'),{code:result?.error?.code??'ResultUnknown'}));}
    child.on('message',message=>{result=message;});child.once('exit',finish);
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();else child.send({kind,payload},e=>{if(e){error=Object.assign(Error('Cannot dispatch lab task.'),{code:'OperationFailed'});child.kill();}});
  });
}
