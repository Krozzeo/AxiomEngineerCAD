import {check,validate} from '../document.mjs';
import {qmul,rotate,add} from '../assembly/math.mjs';
const identity=()=>({position:[0,0,0],quaternion:[0,0,0,1]});
export function composePlacement(parent,local){return {position:add(parent.position,rotate(parent.quaternion,local.position)),quaternion:qmul(parent.quaternion,local.quaternion)};}
// A definition owns geometry once. An occurrence owns only its path and placement.
export function componentTree(value){
 validate(value);check(value.formatVersion===1,'IncompatibleVersion','Use a native document for components.');
 const g=value.native.graph,definitions=new Map(g.definitions.map(d=>[d.id,d]));let count=0;
 const walk=(definitionId,path,placement,instanceId=null)=>{check(++count<=257,'ResourceLimit','Expanded component hierarchy exceeds its native profile.');const d=definitions.get(definitionId);return {definitionId,name:d.name,kind:d.kind,path,placement,instanceId,featureIds:g.features.filter(f=>f.definitionId===definitionId).map(f=>f.id),children:g.instances.filter(i=>i.ownerDefinitionId===definitionId).map(i=>{const world=composePlacement(placement,i.transform),next=[...path,i.id];return i.dependencyId?{definitionId:i.definitionId,instanceId:i.id,path:next,placement:world,dependencyId:i.dependencyId,children:[]}:walk(i.definitionId,next,world,i.id);})};};
 return walk(g.primaryDefinitionId,[g.primaryDefinitionId],identity());
}
function draft(value,change){validate(value);check(value.formatVersion===1,'IncompatibleVersion','Use a native document for components.');const next=structuredClone(value);change(next.native.graph);validate(next);return next;}
export function createComponentDefinition(value,{id,name,kind='part'}){return draft(value,g=>{check(['part','assembly'].includes(kind),'InvalidInput','Choose a part or assembly definition.');g.definitions.push({id,name,kind,datumRoles:['origin','axis-z','plane-xy']});});}
export function insertComponentInstance(value,{id,definitionId,ownerDefinitionId,transform=identity()}){return draft(value,g=>g.instances.push({id,definitionId,ownerDefinitionId:ownerDefinitionId??g.primaryDefinitionId,transform:structuredClone(transform)}));}
export function updateComponentInstance(value,{id,ownerDefinitionId,transform}){return draft(value,g=>{const i=g.instances.find(i=>i.id===id);check(i,'LostReference','Choose an existing component instance.');if(ownerDefinitionId!==undefined)i.ownerDefinitionId=ownerDefinitionId;if(transform!==undefined)i.transform=structuredClone(transform);});}
export function removeComponentInstance(value,id){return draft(value,g=>{const i=g.instances.findIndex(i=>i.id===id);check(i>=0,'LostReference','Choose an existing component instance.');g.instances.splice(i,1);});}
export function removeComponentDefinition(value,id){return draft(value,g=>{check(id!==g.primaryDefinitionId,'InvalidInput','The document root definition cannot be removed.');check(g.definitions.some(d=>d.id===id),'LostReference','Choose an existing definition.');check(!g.instances.some(i=>i.definitionId===id&&!i.dependencyId),'LostReference','Remove referencing instances before deleting their definition.');g.definitions=g.definitions.filter(d=>d.id!==id);g.features=g.features.filter(f=>f.definitionId!==id);g.parameters=g.parameters.filter(p=>p.definitionId!==id);g.instances=g.instances.filter(i=>i.ownerDefinitionId!==id);});}
