import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';

export async function verifyWorkspaceInstallation(host,productId){
 const call=input=>host.manager.execute({operationId:crypto.randomUUID(),...input});
 let session=await call({action:'create',productId,name:'Prepared independent workspace'});
 const projectId=session.status.projectId,anchor=resolve(host.manager.root,session.path),original=await readFile(anchor);
 const api=async(path,data,scope=null)=>{const url=new URL(session.editorUrl),token=new URLSearchParams(url.hash.slice(1)).get('token'),response=await fetch(url.origin+'/v1/'+path,{method:data?'POST':'GET',headers:{Origin:url.origin,Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{}),...(scope?{'X-Engineer-Document':scope.activeDocumentId,'X-Engineer-Context':scope.contextId}:{})},body:data?JSON.stringify({operationId:crypto.randomUUID(),...data}):undefined});return response;};
 try{
  let workspace=await(await api('workspace')).json();assert.equal(workspace.empty,true);assert.equal(workspace.files.length,0);const anchorId=workspace.activeDocumentId;
  let response=await api('workspace/action',{action:'create',kind:'part',path:'Prepared part.engineer.json',expectedRevision:workspace.revision});assert.equal(response.status,200,await response.clone().text());workspace=await response.json();
  assert.equal(workspace.empty,false);assert.notEqual(workspace.activeDocumentId,anchorId);const part=workspace.files.find(file=>file.id===workspace.active),partPath=join(dirname(anchor),part.path);
  response=await api('edit',{expectedRevision:0,metadata:{name:'Wrong scope',notes:'Must be refused'}});assert.equal(response.status,409);assert.equal((await response.json()).code,'DocumentContextChanged');
  response=await api('document',null,workspace);assert.equal(response.status,200);let document=(await response.json()).document;assert.equal(document.formatVersion,1);assert.equal(document.revision,0);assert.equal(document.metadata.notes,'');
  response=await api('edit',{expectedRevision:0,metadata:{name:'Prepared part',notes:'Independent native part saved from relocated installation'}},workspace);assert.equal(response.status,200,await response.clone().text());
  let status=await call({action:'status',sessionId:session.sessionId});await call({action:'save',sessionId:session.sessionId,expectedRevision:status.status.revision});status=await call({action:'status',sessionId:session.sessionId});await call({action:'close',sessionId:session.sessionId,expectedRevision:status.status.revision,decision:'save'});
  session=await call({action:'open',productId,path:anchor});assert.equal(session.status.projectId,projectId);workspace=await(await api('workspace')).json();assert.equal(workspace.files.length,1);response=await api('document',null,workspace);assert.equal(response.status,200);document=(await response.json()).document;
  assert.equal(document.documentId,workspace.activeDocumentId);assert.equal(document.metadata.notes,'Independent native part saved from relocated installation');assert.deepEqual(JSON.parse(await readFile(partPath,'utf8')),document);assert.deepEqual(await readFile(anchor),original);
  return {passed:true,emptyProject:true,independentNativePart:true,unscopedWriteRefused:true,scopedEditSaveReopen:true,stableProjectIdentity:true,projectAnchorPreserved:true};
 }finally{const status=await call({action:'status',sessionId:session.sessionId});await call({action:'close',sessionId:session.sessionId,expectedRevision:status.status.revision,decision:'discard'});}
}
