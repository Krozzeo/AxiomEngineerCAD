import {composePlacement} from '../components/hierarchy.mjs';
import {definitionContent} from '../components/context.mjs';
import {componentTree} from '../components/hierarchy.mjs';
import {importNative} from '../native/exchange.mjs';
import {prepareStepImport} from '../step/exchange.mjs';
import {buildProof} from './kernel.mjs';
import {regenerateExtrusions} from '../extrusion/kernel.mjs';
import {executionContent} from '../commands/execution.mjs';
import {check} from '../errors.mjs';

// An operation contributes display-only layers; the original model keeps its
// material and the candidate still supplies the independently verified result.
const producers=new Map([
 ['cad.extrusion.create.v1',extrusion],['cad.extrusion.update.v1',extrusion]
]);
async function extrusion(document,operation,state,rollbackAt){
 const definitionId=document.native.graph.features.find(f=>f.id===operation.inputs.featureId).definitionId,scoped=definitionContent(document,definitionId);const result=await regenerateExtrusions(executionContent(scoped,{rollbackAt}),{featureId:operation.inputs.featureId,includeToolMesh:true,previewBooleanFeatureId:operation.inputs.featureId});
 const placements=[],walk=n=>{if(n.definitionId===definitionId)placements.push(n.placement);n.children.forEach(walk);};walk(componentTree(document));
 if(result.finishingLayers)return placements.flatMap(p=>result.finishingLayers.map((layer,index)=>({id:operation.inputs.featureId+'-'+index,kind:layer.kind,mesh:layer.mesh,quaternion:p.quaternion,position:p.position})));
 return placements.map(p=>({id:operation.inputs.featureId,kind:({add:'unite',cut:'subtract',intersect:'intersect',none:'none','new-body':'none'})[state?.effectiveOperation??document.native.graph.features.find(f=>f.id===operation.inputs.featureId).data.operation],mesh:result.toolMesh,position:p.position,quaternion:p.quaternion}));
}
export async function buildOperationPreview({document,sourceDocument,previewOperation,rollbackAt=null,contextDocument=null}){
 if(previewOperation.name==='cad.document.import.v1'){const value=await importNative(document,previewOperation.inputs.text),candidate=await buildProof(value,{viewportOnly:true});return {...candidate,translation:{format:'native',features:value.native.graph.features.length},operationState:{featureId:previewOperation.inputs.importId,inputSignature:JSON.stringify(previewOperation.inputs)}};}
 if(previewOperation.name==='cad.step.import.v1'){const prepared=await prepareStepImport(document,previewOperation.inputs),candidate=await buildProof(prepared.document,{viewportOnly:true}),base=await buildProof(sourceDocument,{viewportOnly:true}),native=await regenerateExtrusions(prepared.document,{featureId:previewOperation.inputs.featureId,includeToolMesh:true});return {...candidate,translation:prepared.translation,operationState:{featureId:previewOperation.inputs.featureId,inputSignature:JSON.stringify(previewOperation.inputs)},sourceInputHash:base.inputHash,scene:{...base.scene,previewLayers:[{id:previewOperation.inputs.featureId,kind:'none',mesh:native.toolMesh,position:[0,0,0],quaternion:[0,0,0,1]}]}};}
 const produce=producers.get(previewOperation.name);
 check(produce,'UnsupportedCapability','This operation has no exact preview producer.');
 const candidate=await buildProof(document,{contextDocument,viewportOnly:true,rollbackAt,previewBooleanFeatureId:previewOperation.inputs.featureId}),base=await buildProof(sourceDocument,{contextDocument,viewportOnly:true,rollbackAt,beforeOperation:previewOperation.name==='cad.extrusion.update.v1'});
 const operationState={...candidate.operationState,featureId:previewOperation.inputs.featureId,inputSignature:JSON.stringify(previewOperation.inputs)};
 let layers=await produce(document,previewOperation,operationState,rollbackAt);if(contextDocument){const occurrences=[],walk=n=>{if(n.sourceDocumentId===document.documentId&&n.definitionId===document.native.graph.primaryDefinitionId)occurrences.push(n);n.children.forEach(walk);};walk(componentTree(contextDocument));layers=occurrences.flatMap(n=>layers.map(layer=>({...layer,...composePlacement(n.placement,layer)})));}return {...candidate,operationState,sourceInputHash:base.inputHash,scene:{...base.scene,previewLayers:layers}};
}
