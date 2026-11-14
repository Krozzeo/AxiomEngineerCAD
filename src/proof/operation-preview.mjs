import {buildProof} from './kernel.mjs';
import {regenerateExtrusions} from '../extrusion/kernel.mjs';
import {executionContent} from '../commands/execution.mjs';
import {check} from '../errors.mjs';

// An operation contributes display-only layers; the original model keeps its
// material and the candidate still supplies the independently verified result.
const producers=new Map([
 ['cad.extrusion.create.v1',extrusion],['cad.extrusion.update.v1',extrusion]
]);
async function extrusion(document,operation,state){
 const result=await regenerateExtrusions(document,{featureId:operation.inputs.featureId,includeToolMesh:true,previewBooleanFeatureId:operation.inputs.featureId});
 return [{id:operation.inputs.featureId,kind:({add:'unite',cut:'subtract',intersect:'intersect',none:'none','new-body':'none'})[state?.effectiveOperation??document.native.graph.features.find(f=>f.id===operation.inputs.featureId).data.operation],mesh:result.toolMesh,position:[0,0,0],quaternion:[0,0,0,1]}];
}
export async function buildOperationPreview({document,sourceDocument,previewOperation,rollbackAt=null}){
 const produce=producers.get(previewOperation.name);
 check(produce,'UnsupportedCapability','This operation has no exact preview producer.');
 const candidate=await buildProof(document,{viewportOnly:true,rollbackAt,previewBooleanFeatureId:previewOperation.inputs.featureId}),base=await buildProof(sourceDocument,{viewportOnly:true,rollbackAt,beforeOperation:previewOperation.name==='cad.extrusion.update.v1'});
 const operationState={...candidate.operationState,featureId:previewOperation.inputs.featureId,inputSignature:JSON.stringify(previewOperation.inputs)};
 return {...candidate,operationState,sourceInputHash:base.inputHash,scene:{...base.scene,previewLayers:await produce(executionContent(document,{rollbackAt}),previewOperation,operationState)}};
}
