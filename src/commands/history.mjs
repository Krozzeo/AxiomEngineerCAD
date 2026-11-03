import {check} from '../errors.mjs';
import {hash} from '../native/schema.mjs';
// Session history owns working content only. Immutable snapshots and causal revision
// always come from the live document, including versions created after an edit.
const working=v=>{const x=structuredClone(v);delete x.revision;if(x.native){delete x.native.versions;delete x.native.publications;}return x;};
const key=v=>hash(working(v));
export class WorkingHistory{
 constructor(){this.undo=[];this.redo=[];this.anchor=null;}
 record(before,after){if(this.anchor&&key(before)!==this.anchor){this.undo=[];this.redo=[];}this.undo.push(working(before));if(this.undo.length>64)this.undo.shift();while(this.undo.length>1&&Buffer.byteLength(JSON.stringify(this.undo))>2*1024*1024)this.undo.shift();this.redo=[];this.anchor=key(after);}
 target(value,action){check(this.anchor===key(value),'RevisionConflict','Working state changed outside this history; reload before using Undo/Redo.');const stack=this[action];check(stack?.length,'InvalidInput',action==='undo'?'Nothing to undo.':'Nothing to redo.');const next=structuredClone(stack.at(-1));next.revision=value.revision;check(next.native||!value.native?.versions.length,'InvalidInput','Cannot revert a native conversion after creating immutable versions.');if(next.native){next.native.versions=structuredClone(value.native?.versions??[]);next.native.publications=structuredClone(value.native?.publications??[]);}return next;}
 commit(before,after,action){const from=this[action],to=this[action==='undo'?'redo':'undo'];from.pop();to.push(working(before));if(to.length>64)to.shift();this.anchor=key(after);}
 state(value){const current=this.anchor===key(value);return {canUndo:current&&this.undo.length>0,canRedo:current&&this.redo.length>0,undoCount:current?this.undo.length:0,redoCount:current?this.redo.length:0};}
}
