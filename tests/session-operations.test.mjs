import test from 'node:test';
import assert from 'node:assert/strict';
import {EngineerAdapter} from '../platform/adapter.mjs';

test('adapter continues beyond former session quotas while retaining replay identity',async()=>{
 const adapter=new EngineerAdapter();let calls=0;adapter.handle=async()=>({executed:++calls});
 for(let i=0;i<600;i++)await adapter.execute('ui.layout.save',{operationId:'layout-'+String(i).padStart(6,'0'),value:i});
 assert.equal(calls,600);assert.deepEqual(await adapter.execute('ui.layout.save',{operationId:'layout-000000',value:0}),{executed:1});assert.equal(calls,600);
 await assert.rejects(()=>adapter.execute('ui.layout.save',{operationId:'layout-000000',value:99}),{code:'invalidRequest'});
});
