import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {check} from '../errors.mjs';
// One process per document, shared by mutually exclusive command/proof jobs.
// No shape/proof cache: every job still performs its actual requested verification.
export class WorkbenchWorker{
 constructor({idleMs=30000}={}){check(Number.isSafeInteger(idleMs)&&idleMs>=50&&idleMs<=30000,'InvalidInput','Worker idle expiry must be between 50 ms and 30 seconds.');this.idleMs=idleMs;this.child=null;this.active=null;this.idle=null;this.closed=false;}
 run(kind,payload,{signal,timeoutMs=20000}={}){
  check(['command-validate','drawing-proof','parametric-sketch'].includes(kind),'UnsupportedCapability','Unsupported warm workbench job.');check(!this.closed,'Cancelled','Workbench worker is closed.');check(!this.active,'ResourceLimit','Workbench computation is already running.');check(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=60000,'InvalidInput','Worker deadline must be within one minute.');clearTimeout(this.idle);
  if(this.child&&!this.child.connected){this.child.kill();this.child=null;}if(!this.child){const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!/token|secret|api_key|credential/i.test(name)));this.child=fork(fileURLToPath(new URL('./worker.mjs',import.meta.url)),[],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true,env,execArgv:['--max-old-space-size=192']});const child=this.child;child.on('error',()=>{if(this.child===child)this.child=null;});child.on('exit',()=>{if(this.child===child)this.child=null;});}
  const child=this.child,id=randomUUID();child.ref();child.channel?.ref();
  return new Promise((resolve,reject)=>{let settled=false;const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);child.removeListener('message',message);child.removeListener('exit',exit);child.removeListener('error',error);this.active=null;};
   const finish=(failure,result)=>{if(settled)return;settled=true;cleanup();if(failure){if(this.child===child)this.child=null;child.kill();reject(failure);}else {child.unref();child.channel?.unref();this.idle=setTimeout(()=>{if(this.child===child&&!this.active){this.child=null;child.kill();}},this.idleMs);this.idle.unref();resolve(result);}};
   const abort=()=>finish(Object.assign(Error('Workbench computation cancelled; no committed change.'),{code:'Cancelled'})),exit=()=>finish(Object.assign(Error('Workbench worker exited without a confirmed result.'),{code:'ResultUnknown'})),error=()=>finish(Object.assign(Error('Workbench worker could not execute.'),{code:'OperationFailed'}));
   const message=m=>{if(m.requestId!==id)return;if(!m.ok)return finish(Object.assign(Error(m.error?.message??'Workbench validation failed.'),{code:m.error?.code??'OperationFailed'}));finish(null,{result:m.result,resources:m.resources});};
   const timer=setTimeout(()=>finish(Object.assign(Error('Workbench worker exceeded its deadline and was stopped.'),{code:'ResourceLimit'})),timeoutMs);this.active=abort;child.on('message',message);child.once('exit',exit);child.once('error',error);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();else child.send({kind,payload,keepAlive:true,idleMs:this.idleMs,requestId:id},err=>{if(err)error();});
  });
 }
 close(){this.closed=true;clearTimeout(this.idle);this.active?.();this.child?.kill();this.child=null;}
}
