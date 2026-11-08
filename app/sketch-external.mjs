import {externalGeometry} from '/external-geometry.mjs';
import {referenceAnchors} from '/reference-anchors.mjs';

const fields=['kind','definitionId','producerId','role','occurrencePath'];
const identity=target=>JSON.stringify(fields.map(k=>target[k]));
const projectedRole=(entity,role)=>entity.type==='point'?'point':entity.type==='line'&&role==='center'?'entity':role??'entity';
export function sketchExternalReferences({getState,getScene,onCandidate}){
 let owner=null;const pending=new Map();
 function sync(){const state=getState();if(owner!==state?.id){pending.clear();owner=state?.id;}if(state)for(const [key,item]of pending)if(item.revision!==state.revision||state.items.some(e=>e.id===item.entity.id))pending.delete(key);return state;}
 function resolve(target,componentRole){
  const state=sync();if(!state)return null;
  const clean=Object.fromEntries(fields.map(k=>[k,target[k]])),key=identity(clean);
  const existing=state.items.find(e=>e.referenceOnly&&identity(e.external)===key);
  if(existing)return {kind:'component',entityId:existing.id,role:projectedRole(existing,componentRole)};
  let item=pending.get(key);
  if(!item){
   const geometry=externalGeometry(getScene(),clean,state.frame);
   // A parallel plane is not a point reference. Its center projection is an
   // explicit projection tool, never inferred from selecting the whole plane.
   if(geometry.type==='point'&&(clean.kind==='face'||clean.kind==='datum'&&['xy','xz','yz'].includes(clean.role)))return null;
   const entity={id:'reference-'+crypto.randomUUID(),...geometry,external:clean,referenceOnly:true};
   entity.name=geometry.name.replace(/^External /,clean.kind==='datum'?'':'Model ').replace(/ projection$/,'');
   item={entity,revision:state.revision};pending.set(key,item);onCandidate(entity);
  }
  return {kind:'component',entityId:item.entity.id,role:projectedRole(item.entity,componentRole)};
 }
 return {
  resolve,
  merge(items){sync();return [...items,...[...pending.values()].map(p=>p.entity).filter(e=>!items.some(x=>x.id===e.id))];},
  anchors(){const state=sync();return state?[...pending.values()].flatMap(p=>referenceAnchors(state.id,p.entity,(...parts)=>'preview-'+p.entity.id+'-'+parts.at(-1))):[];},
  inputs(inputs,context){
   const state=getState(),refs=[...(inputs.constraint?.refs??[]),...(inputs.constraints??[]).flatMap(c=>c.refs),...(inputs.snaps??[]).map(s=>s.to),...(inputs.snapTarget?[inputs.snapTarget]:[]),...(inputs.axisId?[{entityId:inputs.axisId}]:[]),...(inputs.reference?[inputs.reference]:[])],ids=new Set(refs.map(r=>r.entityId)),entities=[];
   for(const item of pending.values())if(ids.has(item.entity.id)&&!state.items.some(e=>e.id===item.entity.id)){
    if(item.revision!==context.expectedDocumentRevision)throw Error('Source changed. Select the model reference again.');
    entities.push(structuredClone(item.entity));
   }
   return entities.length?{...inputs,externalEntities:entities}:inputs;
  },
  clear(){pending.clear();owner=null;}
 };
}
