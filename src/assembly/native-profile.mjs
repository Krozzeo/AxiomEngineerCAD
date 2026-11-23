import {check} from '../errors.mjs';
export const MATE_PROFILE='E4.M2-spatial/1';
const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const id=v=>typeof v==='string'&&v.length>0&&v.length<=128;
export const pathValid=p=>Array.isArray(p)&&p.length>=1&&p.length<=17&&p.every(id);
export function validateSpatial(value){
 if(value===undefined)return;
 check(keys(value,['profile','grounded','mates'])&&value.profile===MATE_PROFILE&&Array.isArray(value.grounded)&&value.grounded.length<=32&&value.grounded.every(pathValid)&&new Set(value.grounded.map(JSON.stringify)).size===value.grounded.length&&Array.isArray(value.mates)&&value.mates.length<=128,'InvalidNativeGraph','Invalid native assembly mate profile.');
 const ids=new Set();for(const m of value.mates){check(keys(m,['id','name','type','a','b','value','relative'])&&id(m.id)&&!ids.has(m.id)&&id(m.name)&&['fixed','coincident','concentric','parallel','perpendicular','distance','angle'].includes(m.type),'InvalidNativeGraph','Invalid or duplicate assembly mate.');ids.add(m.id);if(m.type==='fixed')check(keys(m.relative,['position','quaternion'])&&Array.isArray(m.relative.position)&&m.relative.position.length===3&&m.relative.position.every(Number.isFinite)&&Array.isArray(m.relative.quaternion)&&m.relative.quaternion.length===4&&m.relative.quaternion.every(Number.isFinite)&&Math.abs(Math.hypot(...m.relative.quaternion)-1)<1e-8,'InvalidNativeGraph','A fixed mate requires its native relative frame.');else check(!Object.hasOwn(m,'relative'),'InvalidInput','Only a fixed mate has a retained relative frame.');
  for(const ref of [m.a,m.b])check(keys(ref,['kind','producerId','role','occurrencePath','sourceDocumentId'])&&['datum','face','edge','vertex','instance','sketch'].includes(ref.kind)&&id(ref.producerId)&&id(ref.role)&&pathValid(ref.occurrencePath)&&id(ref.sourceDocumentId),'LostReference','Persisted mates require exact source identities and occurrence paths.');
  if(['distance','angle'].includes(m.type))check(Number.isFinite(m.value)&&m.value>=0&&m.value<=(m.type==='angle'?180:1e6),'InvalidInput','Use a valid nonnegative mate distance or angle.');else check(!Object.hasOwn(m,'value'),'InvalidInput','This mate has no scalar value.');
 }
}

export function mateReference(selection,documentId){check(['ResolvedStable','ResolvedReidentified'].includes(selection.resolution??'ResolvedStable'),'LostReference','Choose a stable native reference.');return {kind:selection.kind,producerId:selection.producerId,role:selection.role,occurrencePath:selection.occurrencePath,sourceDocumentId:selection.sourceDocumentId??documentId};}
