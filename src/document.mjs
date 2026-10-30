import {randomUUID} from 'node:crypto';
import {atomicJson} from 'axiom-platform/files';
import {recipe,KERNEL} from './lab/profile.mjs';
import {assemblyRecipe} from './assembly/profile.mjs';
import {validateNative} from './native/schema.mjs';
import {readState,commitNative} from './native/storage.mjs';

export const FILENAME = 'project.engineer-provisional.json';
export function fail(code, message) { throw Object.assign(new Error(message), {code}); }
export function check(condition, code, message) { if (!condition) fail(code, message); }
export function validateMetadata(metadata) {
  check(metadata && Object.keys(metadata).every(k => ['name', 'notes'].includes(k)) &&
    typeof metadata.name === 'string' && metadata.name.trim().length > 0 && metadata.name.length <= 128 &&
    typeof metadata.notes === 'string' && metadata.notes.length <= 8192,
  'invalidRequest', 'Use a name of 1–128 characters and notes up to 8192 characters.');
}
export function validate(value) {
  if(value?.formatId==='axiom.engineer-document'&&value.formatVersion===1){check(/^engineer-document:\/\/[0-9a-f-]{36}$/.test(value.documentId)&&Number.isSafeInteger(value.revision)&&value.revision>=0,'invalidRequest','Invalid native identity/revision.');validateMetadata(value.metadata);return validateNative(value);}
  check(value?.formatId === 'axiom.engineer-document' && value.formatVersion === 0 && ['E0.M1','E0.M2','E0.M3'].includes(value.provisional),
    'incompatibleVersion', 'This build opens only E0.M1/M2/M3 provisional documents (version 0).');
  check(Object.keys(value).every(k => ['formatId','formatVersion','provisional','documentId','revision','metadata',...(value.provisional!=='E0.M1'?['experiment']:[]),...(value.provisional==='E0.M3'?['assembly']:[])].includes(k)) &&
    /^engineer-document:\/\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.documentId) &&
    Number.isSafeInteger(value.revision) && value.revision >= 0, 'invalidRequest', 'Invalid provisional document envelope.');
  validateMetadata(value.metadata);
  if(value.provisional==='E0.M2'||Object.hasOwn(value,'experiment')){
    check(value.experiment?.profile==='E0.M2-probe-v0'&&value.experiment.kernel===KERNEL&&Object.keys(value.experiment).every(k=>['profile','kernel','spec'].includes(k)),'incompatibleVersion','Unverified experiment/kernel profile. Original source was preserved.');
    recipe(value.experiment.spec);
  }
  if(value.provisional==='E0.M3')assemblyRecipe(value.assembly);
  return value;
}
export function blank(name) {
  return validate({formatId:'axiom.engineer-document', formatVersion:0, provisional:'E0.M1',
    documentId:'engineer-document://' + randomUUID(), revision:0, metadata:{name, notes:''}});
}
export async function readDocument(path) { return (await readState(path)).value; }
export class Document {
  constructor(path, value, {write = atomicJson, authorize = async () => {},diskHash,recovery} = {}) {
    this.diskHash=diskHash;this.recovery=recovery??null;
    this.path = path; this.value = structuredClone(validate(value)); this.saved = structuredClone(value);
    this.write = write; this.authorize = authorize; this.closed = false; this.buffers = new Map();
  }
  expect(revision,{allowRecovery=false}={}) {
    check(allowRecovery||this.recovery?.state!=='RecoveryRequired','RecoveryRequired','Choose a verified checkpoint before editing or saving.');
    check(!this.closed, 'cancelled', 'This document session is closed.');
    check(revision === this.value.revision, 'revisionConflict', 'Document changed. Reload before retrying.');
  }
  pending() { return [...this.buffers.values()].some(b => b.dirty); }
  status() {
    return {projectId:this.value.documentId, name:this.value.metadata.name, revision:this.value.revision,
      savedRevision:this.saved.revision, dirty:JSON.stringify(this.value) !== JSON.stringify(this.saved) || this.pending() || this.recovery?.state==='RecoveryRequired',
      busy:!!this.lab?.running, pendingBuffers:this.pending(),recovery:this.recovery};
  }
  view() { return {document:structuredClone(this.value), status:this.status()}; }
  reportBuffer({clientId, sequence, dirty}) {
    check(!this.closed, 'cancelled', 'This document session is closed.');
    check(typeof clientId === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(clientId) &&
      Number.isSafeInteger(sequence) && sequence >= 0 && typeof dirty === 'boolean', 'invalidRequest', 'Invalid editor buffer report.');
    const old = this.buffers.get(clientId);
    if (old && old.sequence >= sequence) return {status:this.status()};
    check(old || this.buffers.size < 8, 'projectBusy', 'Editor buffer limit reached.');
    this.buffers.set(clientId, {sequence, dirty}); return {status:this.status()};
  }
  edit({metadata, expectedRevision}) {
    this.expect(expectedRevision); validateMetadata(metadata);
    check(this.value.revision < Number.MAX_SAFE_INTEGER, 'invalidRequest', 'Revision limit reached.');
    this.value = {...this.value, revision:this.value.revision + 1, metadata:structuredClone(metadata)};
    return this.view();
  }
  async save(expectedRevision,operationId=randomUUID()) {
    this.expect(expectedRevision);
    check(!this.pending(), 'projectBusy', 'Apply pending fields before saving, or explicitly discard on close.');
    check(!this.lab?.running, 'projectBusy', 'Wait for or cancel the lab task before saving.');
    await this.authorize(this.path);
    const disk = await readDocument(this.path);
    check(JSON.stringify(disk) === JSON.stringify(this.saved), 'revisionConflict', 'Saved document changed externally. Original file was preserved.');
    this.expect(expectedRevision);
    validate(this.value);
    if(this.value.formatVersion===1){const state=await readState(this.path);check(this.diskHash===undefined||state.diskHash===this.diskHash,'revisionConflict','Saved bytes changed externally.');const receipt=await commitNative(this.path,this.saved,this.value,{operationId,expectedDiskHash:state.diskHash});this.diskHash=receipt.diskHash;this.recovery={state:'Committed',operationId,revision:this.value.revision};}
    else await this.write(this.path, this.value);
    this.saved = structuredClone(this.value);
    return {status:this.status()};
  }
}
