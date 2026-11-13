import {buildProof} from './kernel.mjs';
import {regenerateExtrusions} from '../extrusion/kernel.mjs';
import {check} from '../errors.mjs';

// An operation contributes display-only layers; the original model keeps its
// material and the candidate still supplies the independently verified result.
const producers=new Map([
 ['cad.extrusion.create.v1',extrusion],['cad.extrusion.update.v1',extrusion]
]);
async function extrusion(document,operation){
 const result=await regenerateExtrusions(document,{featureId:operation.inputs.featureId,includeToolMesh:true});
 return [{id:operation.inputs.featureId,kind:({add:'unite',cut:'subtract',intersect:'intersect',none:'none','new-body':'none'})[document.native.graph.features.find(f=>f.id===operation.inputs.featureId).data.operation],mesh:result.toolMesh,position:[0,0,0],quaternion:[0,0,0,1]}];
}
export async function buildOperationPreview({document,sourceDocument,previewOperation,rollbackAt=null}){
 const produce=producers.get(previewOperation.name);
 check(produce,'UnsupportedCapability','This operation has no exact preview producer.');
 const candidate=await buildProof(document,{viewportOnly:true,rollbackAt}),base=await buildProof(sourceDocument,{viewportOnly:true,rollbackAt});
 return {...candidate,sourceInputHash:base.inputHash,scene:{...base.scene,previewLayers:await produce(document,previewOperation)}};
}
