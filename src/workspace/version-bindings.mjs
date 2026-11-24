import {randomUUID} from 'node:crypto';
import {relative,dirname} from 'node:path';
import {VersionSeries} from './version-series.mjs';
import {runWorker} from '../lab/jobs.mjs';
import {hash} from '../native/schema.mjs';
import {componentTree} from '../components/hierarchy.mjs';
import {check} from '../errors.mjs';
export const BINDING_PROFILE='E4.M5-version-binding/1';
export const series=doc=>doc.versionSeries??=new VersionSeries(doc);

export class VersionBindings{
 constructor(workspace){this.workspace=workspace;this.candidates=new Map();}
 async source(dependency){return this.workspace.publications.source(dependency);}
 async choice(source,selection='Latest'){
   const index=await series(source).read(),node=selection==='Latest'?index.nodes[0]:series(source).resolve(index,selection);
   const snapshot=selection==='Latest'?{version:await this.workspace.verifiedVersion(source)}:await series(source).snapshot(node.id);
   return {index,node,version:snapshot.version,deleted:selection!=='Latest'&&selection!==node.id};
 }
 async rows(doc){
   const result=[],nodes=[],visit=n=>{nodes.push(n);n.children.forEach(visit);};visit(componentTree(doc.value));
   for(const instance of doc.value.native.graph.instances.filter(i=>i.dependencyId)){
     const d=doc.value.native.graph.dependencies.find(d=>d.id===instance.dependencyId),node=nodes.find(n=>n.instanceId===instance.id&&n.instanceOwnerDocumentId===doc.value.documentId),row={id:instance.id,dependencyId:d.id,name:node?.name??d.snapshot.metadata.name,path:node?.path,policy:d.policy,selection:d.policy==='Latest'?'Latest':d.versionNodeId,versions:[],notice:doc.readOnly?null:d.versionNotice??null,pendingUpdate:doc.readOnly?null:d.pendingVersionUpdate??null,readOnly:!!doc.readOnly,state:'Retained'};
     try{const source=await this.source(d),index=await series(source).read();row.versions=index.nodes.map(n=>({id:n.id,name:n.name,main:n.id===index.mainId}));
       if(!row.selection){const match=index.nodes.find(n=>n.id!==index.mainId&&n.versionId===d.effectiveVersion)??index.nodes.find(n=>n.versionId===d.effectiveVersion);row.selection=match?.id??'Latest';}
       if(d.channel==='project-working')row.selection='Latest';const related=doc.value.native.graph.spatial?.mates.filter(m=>!m.disabled&&m.issue&&[m.a,m.b,...(m.extraA??[]),...(m.extraB??[])].filter(Boolean).some(r=>JSON.stringify(r.occurrencePath)===JSON.stringify(row.path)))??[];row.state=d.pendingVersionUpdate?'Update pending':d.versionNotice?'Version replaced':related.some(m=>m.issue.kind==='MissingReference')?'Reference missing':related.length?'Constraint conflict':'Current';
     }catch(error){row.state='SourceUnavailable';row.message=error.message;}
     if(doc.readOnly)row.state='Historical snapshot';result.push(row);
   }
   return result;
 }
 async candidate(doc,instanceId,selection,{allInstances=false}={}){
   const before=structuredClone(doc.value),instance=before.native.graph.instances.find(i=>i.id===instanceId),dependency=before.native.graph.dependencies.find(d=>d.id===instance?.dependencyId);check(dependency,'LostReference','Choose a component with an external source.');
   const source=await this.source(dependency);check(!source.pending()&&!source.status().busy&&!source.commands.editingSketch,'projectBusy','Finish editing the source part first.');
   const chosen=await this.choice(source,selection),next=structuredClone(before),target=next.native.graph.instances.find(i=>i.id===instanceId),id='dependency-'+randomUUID();
   const bound={...structuredClone(dependency),id,profile:BINDING_PROFILE,channel:'version-series',policy:selection==='Latest'?'Latest':'Pinned',versionNodeId:chosen.node.id,effectiveVersion:chosen.version.id,snapshot:structuredClone(chosen.version.content),locator:relative(dirname(doc.path),source.path).replaceAll('\\','/')};
   delete bound.requestedVersion;delete bound.versionNotice;delete bound.pendingVersionUpdate;if(bound.policy==='Pinned')bound.requestedVersion=bound.effectiveVersion;
   if(chosen.deleted)bound.versionNotice={deletedNodeId:selection,replacementNodeId:chosen.node.id,replacementName:chosen.node.name};
   next.native.graph.dependencies.push(bound);const affected=allInstances?next.native.graph.instances.filter(i=>i.dependencyId===dependency.id):[target];for(const i of affected)i.dependencyId=id;const affectedPaths=[],walk=n=>{if(affected.some(i=>i.id===n.instanceId)&&n.instanceOwnerDocumentId===doc.value.documentId)affectedPaths.push(n.path);n.children.forEach(walk);};walk(componentTree(before));
   next.native.graph.dependencies=next.native.graph.dependencies.filter(d=>next.native.graph.instances.some(i=>i.dependencyId===d.id));
   const {result}=await runWorker('spatial-reconcile',{document:next,options:{affectedPaths}});await runWorker('native-verify',{document:result.document});
   return {before,candidate:result.document,issues:result.issues,doc,source,baseHash:hash(before),sourceHash:hash(source.value),instanceId};
 }
 async update(p){
   const w=this.workspace;await w.assertDocument(p);const doc=w.adapter.doc;
   let c;if(p.candidateId){c=this.candidates.get(p.candidateId);check(c&&c.doc===doc&&hash(doc.value)===c.baseHash&&hash(c.source.value)===c.sourceHash,'RevisionConflict','The component change is stale; select the version again.');}
   else c=await this.candidate(doc,p.instanceId,p.selection,{allInstances:!!p.autoGroup});
   if(c.issues.length&&!p.decision){const candidateId=randomUUID();if(this.candidates.size>=8)this.candidates.delete(this.candidates.keys().next().value);this.candidates.set(candidateId,c);return {requiresDecision:true,candidateId,issues:c.issues};}
   check(!c.issues.length||['disable','retain'].includes(p.decision),'InvalidInput','Choose whether to disable affected relations or retain them for repair.');
   if(p.decision==='disable')for(const m of c.candidate.native.graph.spatial?.mates??[])if(c.issues.some(i=>i.id===m.id))m.disabled=true;
   await w.assertDocument(p);check(hash(doc.value)===c.baseHash&&hash(c.source.value)===c.sourceHash,'RevisionConflict','The assembly or source changed during validation.');
   doc.native.set(c.candidate,doc.value.revision);doc.commands.history.record(c.before,doc.value);if(p.candidateId)this.candidates.delete(p.candidateId);return {...w.view(),issues:c.issues};
 }
 async refresh(doc,visited=new Set()){
   if(doc.readOnly||doc.stagedMotion||doc.pending()||doc.status().busy||doc.commands.editingSketch||visited.has(doc.value.documentId))return [];visited.add(doc.value.documentId);const updates=[],processed=new Set();
   for(const instance of [...doc.value.native.graph.instances.filter(i=>i.dependencyId)]){
     const d=doc.value.native.graph.dependencies.find(d=>d.id===doc.value.native.graph.instances.find(i=>i.id===instance.id)?.dependencyId);if(!d||processed.has(d.id))continue;processed.add(d.id);
     try{
       const source=await this.source(d);await this.refresh(source,visited);const index=await series(source).read();let selection=d.policy==='Latest'||d.channel==='project-working'?'Latest':d.versionNodeId;
       if(!selection){const match=index.nodes.find(n=>n.id!==index.mainId&&n.versionId===d.effectiveVersion)??index.nodes.find(n=>n.versionId===d.effectiveVersion);selection=match?.id;check(selection,'LostReference','The pinned legacy content is unavailable in the source version history.');}
       if(d.pendingVersionUpdate?.sourceHash===hash(source.value))continue;
       const chosen=await this.choice(source,selection);
       if(d.profile===BINDING_PROFILE&&!chosen.deleted&&(selection!=='Latest'||chosen.version.id===d.effectiveVersion))continue;
       const c=await this.candidate(doc,instance.id,selection,{allInstances:true});
       if(c.issues.length){const next=structuredClone(doc.value),retained=next.native.graph.dependencies.find(x=>x.id===d.id);retained.profile=BINDING_PROFILE;retained.versionNodeId??=index.nodes.find(n=>n.versionId===retained.effectiveVersion)?.id??index.mainId;retained.pendingVersionUpdate={selection,sourceHash:hash(source.value),issues:c.issues};doc.native.set(next,doc.value.revision);doc.commands.history.record(c.before,doc.value);updates.push({instanceId:instance.id,state:'NeedsDecision',issues:c.issues});}
       else{doc.native.set(c.candidate,doc.value.revision);doc.commands.history.record(c.before,doc.value);updates.push({instanceId:instance.id,state:'Updated',issues:[]});}
     }catch(error){updates.push({instanceId:instance.id,state:'Pending',message:error.message});}
   }
   return updates;
 }
 async acknowledge(p){await this.workspace.assertDocument(p);const doc=this.workspace.adapter.doc,before=structuredClone(doc.value),next=structuredClone(before),i=next.native.graph.instances.find(i=>i.id===p.instanceId),d=next.native.graph.dependencies.find(d=>d.id===i?.dependencyId);check(d,'LostReference','Choose a component.');delete d.versionNotice;doc.native.set(next,p.expectedDocumentRevision);return this.workspace.view();}
}
