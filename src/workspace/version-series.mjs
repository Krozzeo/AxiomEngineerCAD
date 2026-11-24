import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from 'axiom-platform/files';
import {check,validate} from '../document.mjs';
import {hash} from '../native/schema.mjs';
import {readJson} from './paths.mjs';

export const initialMainId=documentId=>{const h=hash({documentId,role:'initial-main-version'}).slice(7,39);return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');};

// Logical version identity remains stable while Main is edited. Content objects
// are immutable and retain the former Main at each save-point or promotion.
export class VersionSeries {
  constructor(doc){this.doc=doc;this.archive=doc.versionHistory;this.file=join(this.archive.root,'series.json');}
  validate(index){
    check(index?.format==='axiom.engineer-version-series/1'&&index.documentId===this.doc.value.documentId&&Number.isSafeInteger(index.revision)&&index.revision>=0&&Array.isArray(index.nodes)&&index.nodes.length>0&&index.nodes.length<=4096&&Array.isArray(index.removed)&&index.removed.length<=8192,'IncompatibleVersion','Invalid version series; original history is preserved.');
    const ids=new Set();for(const n of index.nodes){check(typeof n.id==='string'&&!ids.has(n.id)&&typeof n.name==='string'&&n.name.length>0&&n.name.length<=128&&typeof n.description==='string'&&n.description.length<=4096&&/^sha256:[a-f0-9]{64}$/.test(n.versionId),'IntegrityError','Invalid version entry.');ids.add(n.id);}
    check(index.nodes[0].id===index.mainId,'IntegrityError','Main must be the first version.');
    for(const n of index.removed)check(typeof n.id==='string'&&typeof n.replacementId==='string'&&n.id!==n.replacementId&&!ids.has(n.id),'IntegrityError','Invalid deleted-version replacement.');
    return index;
  }
  async read(){
    await this.archive.storage();let index;
    try{index=this.validate(await readJson(this.file,2*1024*1024));}
    catch(error){
      if(error.code!=='ENOENT')throw error;
      const legacy=await this.archive.read(),version=await this.archive.archive(this.doc.value);
      const main={id:initialMainId(this.doc.value.documentId),name:'Version '+(legacy.nodes.length+1),description:'',createdAt:new Date().toISOString(),versionId:version.id};
      index={format:'axiom.engineer-version-series/1',documentId:this.doc.value.documentId,revision:0,nextSequence:legacy.nodes.length+2,mainId:main.id,nodes:[main,...[...legacy.nodes].reverse().map(n=>({id:n.id,name:n.summary,description:'',createdAt:n.createdAt,versionId:n.versionId}))],removed:[]};
      this.validate(index);await atomicJson(this.file,index);
    }
    if(index.pending){
      const disk=await readJson(this.doc.path,2*1024*1024),current=hash(disk);
      if(current===index.pending.afterHash){index=this.validate(index.pending.next);await atomicJson(this.file,index);}
      else if(current===index.pending.beforeHash){delete index.pending;await atomicJson(this.file,index);}
      else check(false,'RecoveryRequired','Resolve the interrupted version change before continuing.');
    }
    return index;
  }
  ready(p,index){this.archive.ready(p.expectedRevision);if(p.expectedHistoryRevision!==undefined)check(index.revision===p.expectedHistoryRevision,'RevisionConflict','Versions changed; refresh the list.');}
  async checkpoint(index){const v=await this.archive.archive(this.doc.value),next=structuredClone(index);next.nodes.find(n=>n.id===next.mainId).versionId=v.id;return next;}
  async write(old,next,candidate=null){
    check(hash(await this.read())===hash(old),'RevisionConflict','Versions changed during the operation.');next.revision=old.revision+1;this.validate(next);
    if(!candidate){await atomicJson(this.file,next);return next;}
    validate(candidate);const before=structuredClone(this.doc.value);
    const pending={...old,pending:{beforeHash:hash(this.doc.saved),afterHash:hash(candidate),next}};
    await atomicJson(this.file,pending);
    try{this.doc.value=structuredClone(candidate);await this.doc.save(candidate.revision);await atomicJson(this.file,next);if(hash(before)!==hash(candidate))this.doc.commands.history.record(before,candidate);}
    catch(error){const disk=await readJson(this.doc.path,2*1024*1024);if(hash(disk)===pending.pending.beforeHash){this.doc.value=before;await atomicJson(this.file,old);}throw error;}
    return next;
  }
  resolve(index,id){const seen=new Set();while(!index.nodes.some(n=>n.id===id)){check(!seen.has(id),'IntegrityError','Deleted-version replacement cycle.');seen.add(id);const tombstone=index.removed.find(n=>n.id===id);check(tombstone,'LostReference','This version is not available in the source.');id=tombstone.replacementId;}return index.nodes.find(n=>n.id===id);}
  async snapshot(nodeId){
    const index=await this.read(),node=index.nodes.find(n=>n.id===nodeId);check(node,'LostReference','Choose an existing version.');
    if(nodeId===index.mainId){const version=await this.archive.archive(this.doc.value);return {node:{...node,versionId:version.id},version,document:structuredClone(this.doc.value)};}
    // Reuse the strict immutable object validation without changing legacy nodes.
    const legacy=Object.create(this.archive);legacy.read=async()=>({nodes:[{...node,summary:node.name}]});
    const checked=await legacy.snapshot(nodeId);return {...checked,node:{...node,summary:node.name}};
  }
  async create(p){
    const old=await this.read();this.ready(p,old);const next=await this.checkpoint(old),former=next.nodes[0];
    const node={id:randomUUID(),name:String(p.name??'Version '+(old.nextSequence??old.nodes.length+1)).trim(),description:String(p.description??''),createdAt:new Date().toISOString(),versionId:former.versionId};
    next.nextSequence=(old.nextSequence??old.nodes.length+1)+1;next.nodes.sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));next.nodes.unshift(node);next.mainId=node.id;await this.write(old,next,structuredClone(this.doc.value));return {history:next,node};
  }
  async promote(p){
    const old=await this.read();this.ready(p,old);check(p.nodeId!==old.mainId,'InvalidInput','This version is already Main.');
    const selected=await this.snapshot(p.nodeId),next=await this.checkpoint(old),node=next.nodes.find(n=>n.id===p.nodeId);
    next.nodes=next.nodes.filter(n=>n.id!==node.id).sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));next.nodes.unshift(node);next.mainId=node.id;
    await this.write(old,next,this.archive.restoreValue(selected.document));return {history:next,node};
  }
  async edit(p){const old=await this.read();this.ready(p,old);const next=structuredClone(old),node=next.nodes.find(n=>n.id===p.nodeId);check(node,'LostReference','Choose a version.');if(p.name!==undefined)node.name=String(p.name).trim();if(p.description!==undefined)node.description=String(p.description);await this.write(old,next);return {history:next,node};}
  async remove(p){
    const old=await this.read();this.ready(p,old);check(old.nodes.length>1,'LastVersion','The only version cannot be deleted.');const position=old.nodes.findIndex(n=>n.id===p.nodeId);check(position>=0,'LostReference','Choose a version.');
    const next=await this.checkpoint(old),replacement=next.nodes[position?position-1:1];next.nodes.splice(position,1);next.removed.push({id:p.nodeId,replacementId:replacement.id});
    let candidate=null;if(p.nodeId===old.mainId){next.mainId=replacement.id;const snap=await this.snapshot(replacement.id);candidate=this.archive.restoreValue(snap.document);}
    await this.write(old,next,candidate);return {history:next,replacementId:replacement.id};
  }
}
