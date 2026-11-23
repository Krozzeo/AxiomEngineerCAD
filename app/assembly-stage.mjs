import {editorDocument as document} from './editor-document.mjs';
import {api} from './cad-commands.mjs';
let sequence=0,pending=Promise.resolve(),flushing=null;
export async function stageMotion(input){
 const task=pending.then(async()=>{const doc=(await api('document')).document;
  const result=await api('workspace/action',{...input,action:'motion-stage',documentId:doc.documentId,
   expectedDocumentRevision:doc.revision,sequence,operationId:crypto.randomUUID()});
  sequence=result.sequence;window.engineerMotionStaged=true;
  document.getElementById('wb-hint').textContent='Motion session · changes will be confirmed together.';
  window.dispatchEvent(new CustomEvent('engineer-assembly-motion-staged',{detail:result}));return result;
 });pending=task.catch(()=>{});return task;
}
window.engineerFlushMotion=async()=>{
 if(flushing)return flushing;
 flushing=(async()=>{await pending;if(!window.engineerMotionStaged)return;window.engineerMotionFlushing=true;
  try{const doc=(await api('document')).document,result=await api('workspace/action',{action:'motion-commit',documentId:doc.documentId,
   expectedDocumentRevision:doc.revision,sequence,operationId:crypto.randomUUID()});
   sequence=0;window.engineerMotionStaged=false;
   window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:{...result,assemblyMotion:true}}));
   await window.engineerViewport.build({reuseCurrent:true});await window.engineerComponents.refresh();
   window.dispatchEvent(new CustomEvent('engineer-assembly-motion-flushed'));
   return {beforeRevision:doc.revision,afterRevision:result.document.revision};
  }finally{window.engineerMotionFlushing=false;}
 })();try{return await flushing;}finally{flushing=null;}
};
window.addEventListener('engineer-workspace-activated',()=>{sequence=0;window.engineerMotionStaged=false;});
