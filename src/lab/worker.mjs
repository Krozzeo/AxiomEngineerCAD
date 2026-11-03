import {regenerateExtrusions} from '../extrusion/kernel.mjs';
import {geometryExperiment} from './kernel.mjs';
import {solveParametric} from '../sketch/solver.mjs';
import {runSuite} from './suite.mjs';
import {solveSketch,sketchFixture} from './sketch.mjs';
import {check,validate} from '../document.mjs';
import {hash,PROVENANCE} from '../native/schema.mjs';
import {solveAssembly} from '../assembly/solver.mjs';
import {assemblySuite} from '../assembly/suite.mjs';
import {verifyNative} from '../native/verify.mjs';
import {verifyCommand} from '../commands/worker.mjs';
import {buildProof} from '../proof/kernel.mjs';
import {regenerateIntegration} from '../integration/engine.mjs';
import {resolveSceneSelection,baseDatums} from '../workbench/model.mjs';
process.on('message',async message=>{
  try{
    let result;
    if(message.kind==='geometry')result=await geometryExperiment(message.payload.spec,{includeStep:!!message.payload.includeStep});
    else if(message.kind==='suite')result=await runSuite();
    else if(message.kind==='sketch')result=await solveSketch(message.payload.primitives??sketchFixture(message.payload.fixture),{drag:message.payload.drag});
    else if(message.kind==='parametric-sketch')result=await solveParametric(message.payload.data,{drag:message.payload.drag});
    else if(message.kind==='assembly')result=solveAssembly(message.payload.assembly,{drag:message.payload.drag});
    else if(message.kind==='assembly-suite')result=assemblySuite();
    else if(message.kind==='native-verify')result=await verifyNative(message.payload.document);
    else if(message.kind==='command-validate')result=await verifyCommand(message.payload);
    else if(message.kind==='drawing-proof')result=await buildProof(message.payload.document,{versionId:message.payload.versionId,viewportOnly:message.payload.viewportOnly,rollbackAt:message.payload.rollbackAt});
    else if(message.kind==='selection-inspect'){validate(message.payload.document);const proof=message.payload.target.kind==='datum'?{scene:{models:[],occurrences:[],datums:baseDatums(message.payload.document)}}:await buildProof(message.payload.document,{viewportOnly:true,rollbackAt:message.payload.rollbackAt});result={...resolveSceneSelection(proof.scene,message.payload.target),source:{documentId:message.payload.document.documentId,revision:message.payload.document.revision,contentHash:hash(message.payload.document),creator:PROVENANCE.creator},authority:message.payload.target.kind==='datum'?'canonical definition reference frame':'exact supported B-Rep role'};}
    else if(message.kind==='extrusion-geometry'){result=await regenerateExtrusions(message.payload.document,{featureId:message.payload.featureId});check(!message.payload.requireFace||['ResolvedStable','ResolvedReidentified'].includes(result.reference.state),result.reference.state,'The extrusion end cap is not a uniquely surviving exact face.');}
    else if(message.kind==='integrated-geometry')result=(await regenerateIntegration(message.payload.document)).exact;
    else check(false,'UnsupportedCapability','Unknown lab task.');
    const maxRssBytes=process.resourceUsage().maxRSS*1024;
    check(maxRssBytes<=768*1024*1024,'ResourceLimit','Worker peak RSS exceeded the experimental 768 MiB postcondition.');
    const output={requestId:message.requestId,ok:true,result,resources:{peakRssBytes:maxRssBytes,heapUsedBytes:process.memoryUsage().heapUsed,
      policy:message.keepAlive?'Session-scoped isolated process, 192 MiB JS old-space, '+(message.idleMs??30000)+' ms idle expiry, per-job deadline; reported RSS is the process lifetime peak, not an OS hard memory quota.':'Isolated process, 192 MiB JS old-space, finite typed inputs, parent deadline; RSS postcondition is not an OS hard memory quota.'}};
    check(Buffer.byteLength(JSON.stringify(output))<=4*1024*1024,'ResourceLimit','Lab output exceeds 4 MiB.');
    process.send?.(output,()=>{if(!message.keepAlive)process.exit(0);});
  }catch(error){process.send?.({requestId:message.requestId,ok:false,error:{code:error.code??'OperationFailed',message:error.code?error.message:'Kernel/solver failed safely; committed document was preserved.'}},()=>process.exit(1));}
});
process.on('disconnect',()=>process.exit(0));
