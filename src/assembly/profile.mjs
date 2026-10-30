import {check} from '../document.mjs';
import {norm} from './math.mjs';
export const SPATIAL='Engineer-rigid-LM/0.0.1';
export const PROFILE='E0.M3-datums-v0';
export const NUMERIC={lengthMm:1e-6,angleRad:1e-7,rankThreshold:1e-6,differenceStep:1e-6,maxIterations:100};
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(x);
const vector=(v,n,bound)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=bound);
const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
export function assemblyRecipe(input){
  check(keys(input,['profile','unit','bodies','mates'])&&input.profile===PROFILE&&input.unit==='mm','InvalidInput','Choose the versioned mm datum experiment.');
  check(Array.isArray(input.bodies)&&input.bodies.length>=2&&input.bodies.length<=4&&Array.isArray(input.mates)&&input.mates.length<=16,'ResourceLimit','Use 2–4 bodies and at most 16 mates.');
  const bodies=new Map();
  for(const b of input.bodies){
    check(keys(b,['id','definitionId','grounded','pose','datums'])&&id(b.id)&&id(b.definitionId)&&!bodies.has(b.id)&&typeof b.grounded==='boolean','InvalidInput','Use unique rigid-body IDs and explicit grounding.');
    check(keys(b.pose,['position','quaternion'])&&vector(b.pose.position,3,1000)&&vector(b.pose.quaternion,4,1)&&Math.abs(norm(b.pose.quaternion)-1)<1e-8,'InvalidInput','Rigid poses require bounded mm coordinates and unit quaternions.');
    check(Array.isArray(b.datums)&&b.datums.length>0&&b.datums.length<=8,'ResourceLimit','Use 1–8 analytic local datums per body.');
    const ids=new Set();for(const d of b.datums){check(keys(d,['id','kind','origin','direction','state'])&&id(d.id)&&!ids.has(d.id)&&['point','axis','plane','frame'].includes(d.kind)&&vector(d.origin,3,1000)&&['ResolvedStable','AmbiguousReference','LostReference'].includes(d.state),'InvalidInput','Invalid semantic datum.');
      if(['axis','plane'].includes(d.kind))check(vector(d.direction,3,1)&&Math.abs(norm(d.direction)-1)<1e-8,'InvalidInput','Datum directions must be unit vectors.');
      else check(!Object.hasOwn(d,'direction'),'InvalidInput','Point/frame datums use body-local XYZ, without an extra direction.');ids.add(d.id);}
    bodies.set(b.id,b);
  }
  check(input.bodies.some(b=>b.grounded),'InvalidInput','Ground at least one body to define the world frame.');
  const ids=new Set();for(const m of input.mates){
    check(keys(m,['id','type','a','b','value'])&&id(m.id)&&!ids.has(m.id),'InvalidInput','Invalid or duplicate mate ID.');ids.add(m.id);
    check(['coincident','concentric','distance','angle','parallel','perpendicular','fixed'].includes(m.type),'UnsupportedCapability','Tangent/width and arbitrary surface mates are unsupported in E0.M3; use analytic datums.');
    const datums=[];for(const ref of [m.a,m.b]){check(keys(ref,['bodyId','datumId'])&&id(ref.bodyId)&&id(ref.datumId),'InvalidInput','Use body/datum semantic references.');const b=bodies.get(ref.bodyId),d=b?.datums.find(d=>d.id===ref.datumId);
      check(d,'LostReference','Missing datum: '+ref.bodyId+'/'+ref.datumId);check(d.state==='ResolvedStable',d.state,'Repair the datum reference before solving. No substitute was selected.');datums.push(d);}
    check(m.a.bodyId!==m.b.bodyId,'InvalidInput','Mate different bodies.');
    const kinds=datums.map(d=>d.kind);const supported=m.type==='fixed'?kinds.every(k=>k==='frame'):m.type==='coincident'?kinds[0]===kinds[1]&&['point','plane'].includes(kinds[0]):m.type==='distance'?kinds.every(k=>k==='point'):m.type==='concentric'?kinds.every(k=>k==='axis'):kinds.every(k=>['axis','plane'].includes(k));
    check(supported,'UnsupportedCapability','Incompatible datum classes for '+m.type+'.');
    if(m.type==='distance')check(Number.isFinite(m.value)&&m.value>=0&&m.value<=1000,'InvalidInput','Distance must be 0–1000 mm.');
    if(m.type==='angle')check(Number.isFinite(m.value)&&m.value>=0&&m.value<=Math.PI,'InvalidInput','Angle must be 0–pi radians.');
    if(!['distance','angle'].includes(m.type))check(!Object.hasOwn(m,'value'),'InvalidInput','This mate has no scalar dimension.');
  }
  return structuredClone(input);
}
export function datum(body,id){const d=body.datums.find(d=>d.id===id);return d;}
