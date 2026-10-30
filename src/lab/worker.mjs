import {geometryExperiment} from './kernel.mjs';
import {runSuite} from './suite.mjs';
import {solveSketch,sketchFixture} from './sketch.mjs';
import {check} from '../document.mjs';
import {solveAssembly} from '../assembly/solver.mjs';
import {assemblySuite} from '../assembly/suite.mjs';
import {verifyNative} from '../native/verify.mjs';
import {verifyCommand} from '../commands/worker.mjs';
import {buildProof} from '../proof/kernel.mjs';
process.once('message',async message=>{
  try{
    let result;
    if(message.kind==='geometry')result=await geometryExperiment(message.payload.spec,{includeStep:!!message.payload.includeStep});
    else if(message.kind==='suite')result=await runSuite();
    else if(message.kind==='sketch')result=await solveSketch(message.payload.primitives??sketchFixture(message.payload.fixture),{drag:message.payload.drag});
    else if(message.kind==='assembly')result=solveAssembly(message.payload.assembly,{drag:message.payload.drag});
    else if(message.kind==='assembly-suite')result=assemblySuite();
    else if(message.kind==='native-verify')result=await verifyNative(message.payload.document);
    else if(message.kind==='command-validate')result=await verifyCommand(message.payload);
    else if(message.kind==='drawing-proof')result=await buildProof(message.payload.document);
    else check(false,'UnsupportedCapability','Unknown lab task.');
    const maxRssBytes=process.resourceUsage().maxRSS*1024;
    check(maxRssBytes<=768*1024*1024,'ResourceLimit','Worker peak RSS exceeded the experimental 768 MiB postcondition.');
    const output={ok:true,result,resources:{peakRssBytes:maxRssBytes,heapUsedBytes:process.memoryUsage().heapUsed,
      policy:'Isolated process, 192 MiB JS old-space, finite typed inputs, parent deadline; RSS postcondition is not an OS hard memory quota.'}};
    check(Buffer.byteLength(JSON.stringify(output))<=4*1024*1024,'ResourceLimit','Lab output exceeds 4 MiB.');
    process.send?.(output,()=>process.exit(0));
  }catch(error){process.send?.({ok:false,error:{code:error.code??'OperationFailed',message:error.code?error.message:'Kernel/solver failed safely; committed document was preserved.'}},()=>process.exit(1));}
});
process.on('disconnect',()=>process.exit(0));
