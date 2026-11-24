import {check,validate} from '../document.mjs';
import {qmul,rotate,add} from '../assembly/math.mjs';
const identity=()=>({position:[0,0,0],quaternion:[0,0,0,1]});
export function composePlacement(parent,local){return {position:add(parent.position,rotate(parent.quaternion,local.position)),quaternion:qmul(parent.quaternion,local.quaternion)};}
// A definition owns geometry once. An occurrence owns only its path and placement.
export function componentTree(value){
 validate(value);check(value.formatVersion===1,'IncompatibleVersion','Use a native document for components.');
 let count=0;
 const walk=(graph,documentId,definitionId,path,placement,instanceId=null,snapshot=null,dependencyId=null,instanceOwnerDocumentId=null)=>{
  check(++count<=257,'ResourceLimit','Expanded component hierarchy exceeds its native profile.');
  const definition=graph.definitions.find(d=>d.id===definitionId);
  check(definition,'LostReference','Component definition is missing from its effective snapshot.');
  return {definitionId,sourceDocumentId:documentId,...(snapshot?{sourceSnapshot:snapshot}:{}),...(dependencyId?{dependencyId}:{}),name:definitionId===graph.primaryDefinitionId?(snapshot?.metadata.name??(documentId===value.documentId?value.metadata.name:definition.name)):definition.name,kind:definition.kind,path,placement,instanceId,instanceOwnerDocumentId,
   featureIds:graph.features.filter(f=>f.definitionId===definitionId).map(f=>f.id),
   children:graph.instances.filter(i=>i.ownerDefinitionId===definitionId).map(i=>{
    const world=composePlacement(placement,i.transform),next=[...path,i.id];
    if(i.dependencyId){const dependency=graph.dependencies.find(d=>d.id===i.dependencyId);check(dependency,'LostReference','Component dependency is missing.');return walk(dependency.snapshot.graph,dependency.documentId,i.definitionId,next,world,i.id,dependency.snapshot,i.dependencyId,documentId);}
    return walk(graph,documentId,i.definitionId,next,world,i.id,snapshot,dependencyId,documentId);
   })};
 };
 return walk(value.native.graph,value.documentId,value.native.graph.primaryDefinitionId,[value.native.graph.primaryDefinitionId],identity());
}
function draft(value,change){validate(value);check(value.formatVersion===1,'IncompatibleVersion','Use a native document for components.');const next=structuredClone(value);change(next.native.graph);validate(next);return next;}
export function createComponentDefinition(value,{id,name,kind='part'}){return draft(value,g=>{check(['part','assembly'].includes(kind),'InvalidInput','Choose a part or assembly definition.');g.definitions.push({id,name,kind,datumRoles:['origin','axis-z','plane-xy']});});}
export function insertComponentInstance(value,{id,definitionId,ownerDefinitionId,transform=identity()}){return draft(value,g=>g.instances.push({id,definitionId,ownerDefinitionId:ownerDefinitionId??g.primaryDefinitionId,transform:structuredClone(transform)}));}
export function updateComponentInstance(value,{id,ownerDefinitionId,transform}){return draft(value,g=>{const i=g.instances.find(i=>i.id===id);check(i,'LostReference','Choose an existing component instance.');if(ownerDefinitionId!==undefined)i.ownerDefinitionId=ownerDefinitionId;if(transform!==undefined)i.transform=structuredClone(transform);});}
export function removeComponentInstance(value,id){return draft(value,g=>{const i=g.instances.findIndex(i=>i.id===id);check(i>=0,'LostReference','Choose an existing component instance.');g.instances.splice(i,1);});}
export function removeComponentDefinition(value,id){return draft(value,g=>{check(id!==g.primaryDefinitionId,'InvalidInput','The document root definition cannot be removed.');check(g.definitions.some(d=>d.id===id),'LostReference','Choose an existing definition.');check(!g.instances.some(i=>i.definitionId===id&&!i.dependencyId),'LostReference','Remove referencing instances before deleting their definition.');g.definitions=g.definitions.filter(d=>d.id!==id);g.features=g.features.filter(f=>f.definitionId!==id);g.parameters=g.parameters.filter(p=>p.definitionId!==id);g.instances=g.instances.filter(i=>i.ownerDefinitionId!==id);});}
