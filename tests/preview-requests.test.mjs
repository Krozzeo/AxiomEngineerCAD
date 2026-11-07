import test from 'node:test';
import assert from 'node:assert/strict';
import {previewRequests} from '../app/preview-requests.mjs';

test('Cancel waits for all preview acknowledgements before restoring source and refuses new requests while closing',async()=>{
 const requests=previewRequests(),events=[];let first,second;
 const a=requests.run(async()=>{await new Promise(r=>first=r);events.push('first acknowledgement');});
 const b=requests.run(async()=>{await new Promise(r=>second=r);events.push('second acknowledgement');});
 await Promise.resolve();
 const cancel=requests.settle(()=>events.push('cancel server work, restore source'));
 assert.equal(requests.closing,true);await requests.run(()=>events.push('obsolete new preview'));
 second();await b;assert.deepEqual(events,['second acknowledgement']);
 first();await a;await cancel;
 assert.deepEqual(events,['second acknowledgement','first acknowledgement','cancel server work, restore source']);
 assert.equal(requests.closing,false);
 await requests.run(()=>events.push('next operation'));assert.equal(events.at(-1),'next operation');
});

test('failed preview requests cannot strand cancellation; concurrent Cancel uses one server cancellation',async()=>{
 const requests=previewRequests();let reject,cancels=0;
 const build=requests.run(()=>new Promise((_,r)=>reject=r));await Promise.resolve();build.catch(()=>{});
 const a=requests.settle(()=>++cancels),b=requests.settle(()=>++cancels);assert.equal(a,b);
 reject(Error('Preview rejected'));await a;assert.equal(cancels,1);assert.equal(requests.closing,false);
});
