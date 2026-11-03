// Test-only process: forcefully stopped by parent after a durable boundary.
import {readFile} from 'node:fs/promises';
import {commitNative} from '../src/native/storage.mjs';
import {hash} from '../src/native/schema.mjs';
const [path,point]=process.argv.slice(2),bytes=await readFile(path),base=JSON.parse(bytes),next=structuredClone(base);next.revision++;next.metadata.notes='Durable save without acknowledgement';
await commitNative(path,base,next,{operationId:'crash-operation-0001',expectedDiskHash:hash(bytes),stage:async stage=>{if(stage===point){process.send({stage});await new Promise(()=>setInterval(()=>{},1000));}}});
