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
 return [{id:operation.inputs.featureId,kind:'addition',mesh:result.toolMesh,position:[0,0,0],quaternion:[0,0,0,1]}];
}
export async function buildOperationPreview({document,sourceDocument,previewOperation}){
 const produce=producers.get(previewOperation.name);
 check(produce,'UnsupportedCapability','This operation has no exact preview producer.');
 const candidate=await buildProof(document,{viewportOnly:true}),base=await buildProof(sourceDocument,{viewportOnly:true});
 return {...candidate,scene:{...base.scene,previewLayers:await produce(document,previewOperation)}};
}
