import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from 'axiom-platform/files';
import {check,validate} from '../document.mjs';
import {hash,keys} from './schema.mjs';
export const journalPath=path=>path+'.recovery.json';
export async function readBytes(path,limit=2*1024*1024){const info=await lstat(path);check(info.isFile()&&!info.isSymbolicLink()&&info.nlink===1&&info.size<=limit,'permissionDenied','Choose a bounded ordinary document without links.');const f=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{const now=await f.stat();check(now.ino===info.ino&&now.nlink===1&&now.size<=limit,'revisionConflict','File changed while opening.');const bytes=await f.readFile();check(bytes.length<=limit,'ResourceLimit','File exceeds the declared bound.');return bytes;}finally{await f.close();}}
async function optional(path,limit){try{return await readBytes(path,limit);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function parse(bytes){try{return JSON.parse(bytes.toString('utf8'));}catch{check(false,'invalidRequest','Document contains corrupt or partial JSON.');}}
export async function readJournal(path){const bytes=await optional(journalPath(path),5*1024*1024);if(!bytes)return null;const j=parse(bytes);check(keys(j,['journalVersion','operationId','baseHash','nextHash','base','next'])&&j.journalVersion===1&&typeof j.operationId==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(j.operationId)&&hash(j.base)===j.baseHash&&hash(j.next)===j.nextHash,'IntegrityError','Recovery journal integrity failed. Original files preserved.');validate(j.base);validate(j.next);check(j.base.documentId===j.next.documentId&&j.next.revision>=j.base.revision,'IntegrityError','Recovery identity/revision mismatch.');return j;}
export async function readState(path){const bytes=await optional(path,2*1024*1024),j=await readJournal(path);let value,error;
  if(bytes){try{value=parse(bytes);check([0,1].includes(value.formatVersion),'incompatibleVersion','Unknown document schema. Original source preserved.');check(value.formatVersion!==0||bytes.length<=65536,'permissionDenied','Legacy document exceeds its 64 KiB bound.');validate(value);}catch(e){error=e;}}
  if(error?.code==='incompatibleVersion')throw error;
  if(!value||error){if(!j&&error)throw error;check(j,'invalidRequest','Document is missing/corrupt and has no verified checkpoint.');return {value:structuredClone(j.base),diskHash:bytes?hash(bytes):null,recovery:{state:'RecoveryRequired',reason:error?.code??'MissingPrimary',operationId:j.operationId,choices:['base','next']}};}
  const current=hash(value);let recovery=null;
  if(j){if(current===j.nextHash)recovery={state:'Committed',operationId:j.operationId,revision:value.revision};else if(current===j.baseHash)recovery={state:'RecoveryRequired',reason:'PreparedSaveInterrupted',operationId:j.operationId,choices:['base','next']};else recovery={state:'RecoveryRequired',reason:'PrimaryDivergedFromJournal',operationId:j.operationId,choices:['base','next']};}
  return {value,diskHash:hash(bytes),recovery};
}
async function syncDirectory(path){let f;try{f=await open(dirname(path),'r');await f.sync();}catch(e){if(!['EISDIR','EPERM','EACCES','EINVAL','ENOTSUP'].includes(e.code))throw e;}finally{await f?.close();}}
async function preserve(path,bytes,suffix){const backup=path+'.'+suffix+'-'+hash(bytes).slice(7)+'.backup';let f;try{f=await open(backup,'wx',0o600);await f.writeFile(bytes);await f.sync();}catch(e){if(e.code!=='EEXIST')throw e;check(hash(await readBytes(backup))===hash(bytes),'IntegrityError','Existing backup differs.');}finally{await f?.close();}return backup;}
export async function commitNative(path,base,next,{operationId=randomUUID(),expectedDiskHash,stage=async()=>{}}={}){
  validate(base);validate(next);const bytes=await readBytes(path);check(hash(bytes)===expectedDiskHash,'revisionConflict','Primary bytes changed before save.');
  const previous=await readJournal(path);if(previous)check([previous.baseHash,previous.nextHash].includes(hash(base)),'RecoveryRequired','Reconcile the previous journal before saving.');
  if(base.formatVersion===0&&next.formatVersion===1)await preserve(path,bytes,'legacy');
  const journal={journalVersion:1,operationId,baseHash:hash(base),nextHash:hash(next),base:structuredClone(base),next:structuredClone(next)};
  check(Buffer.byteLength(JSON.stringify(journal,null,2)+'\n')<=5*1024*1024,'ResourceLimit','Recovery journal exceeds 5 MiB.');
  await atomicJson(journalPath(path),journal);await syncDirectory(path);await stage('prepared');
  check(hash(await readBytes(path))===expectedDiskHash,'revisionConflict','Primary changed after journal preparation.');
  await atomicJson(path,next);await syncDirectory(path);await stage('replaced');return {operationId,revision:next.revision,contentHash:hash(next),diskHash:hash(await readBytes(path))};
}
export async function recoverNative(path,{choice,expectedDiskHash,operationId=randomUUID()}){check(['base','next'].includes(choice),'invalidRequest','Choose a verified base or prepared checkpoint.');const bytes=await optional(path,2*1024*1024);check((bytes?hash(bytes):null)===expectedDiskHash,'revisionConflict','Recovery source changed.');const j=await readJournal(path);check(j,'RecoveryRequired','No verified recovery journal.');const value=structuredClone(j[choice]);value.revision=Math.max(j.base.revision,j.next.revision)+1;validate(value);
  const backup=bytes?await preserve(path,bytes,'recovery'):null;
  await atomicJson(journalPath(path),{journalVersion:1,operationId,baseHash:hash(j.base),nextHash:hash(value),base:j.base,next:value});await syncDirectory(path);await atomicJson(path,value);await syncDirectory(path);
  return {value,diskHash:hash(await readBytes(path)),recovery:{state:'Committed',operationId,revision:value.revision},backup:backup?backup.split(/[\\/]/).at(-1):null};
}
