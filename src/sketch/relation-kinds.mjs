import {check} from '../errors.mjs';
import {circular,arcAngles} from './curves.mjs';
export const M4_PROFILE='E1.M4-sketch/1',M5_PROFILE='E1.M5-sketch/1',isParametric=profile=>['E1.M3-sketch/1',M4_PROFILE,M5_PROFILE].includes(profile);
export const dimensions=['length','radius','diameter','x','y','distance','distance-x','distance-y','angle','line-distance'];
export const extendedRelations=['parallel','perpendicular','collinear','equal','concentric','coradial','tangent','point-on-line','point-on-circle','midpoint','horizontal-points','vertical-points','equal-curve-length','symmetry','spline-tangent',...dimensions.slice(5)];
export function pointAt(entities,ref){const e=entities.find(e=>e.id===ref?.entityId);if(!e)return null;if(e.type==='line'&&ref.role==='midpoint')return e.a.map((n,i)=>(n+e.b[i])/2);return ['a','b','point','center','control1','control2'].includes(ref.role)&&Array.isArray(e[ref.role])?e[ref.role]:null;}
export const splineHandleRoles=role=>role==='handle-a'?['a','control1']:role==='handle-b'?['b','control2']:null;
export function entityForReference(entities,ref){
 const e=entities.find(e=>e.id===ref?.entityId),roles=splineHandleRoles(ref?.role);
 if(!roles)return e;
 if(e?.type!=='spline')return null;
 return {id:e.id,type:'line',a:e[roles[0]],b:e[roles[1]],construction:true};
}
export const wholeReference=ref=>ref?.role==='entity'||!!splineHandleRoles(ref?.role);
export function validReference(entities,ref){return Boolean(wholeReference(ref)?entityForReference(entities,ref):pointAt(entities,ref));}
const entity=entityForReference,vector=l=>l.b.map((n,i)=>n-l.a[i]),length=l=>Math.hypot(...vector(l)),cross=(a,b)=>a[0]*b[1]-a[1]*b[0],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const curveLength=e=>e.type==='line'?length(e):e.radius*(e.type==='arc'?Math.abs(arcAngles(e).sweep):2*Math.PI);
export function measure(es,c){const [r,s]=c.refs,e=entity(es,r),f=s&&entity(es,s),a=pointAt(es,r),b=s&&pointAt(es,s);if(c.type==='length')return length(e);if(['radius','diameter'].includes(c.type))return e.radius*(c.type==='diameter'?2:1);if(['x','y'].includes(c.type))return a[c.type==='x'?0:1]*(c.direction??1);if(c.type==='angle'){const u=vector(e),v=vector(f);return Math.atan2(cross(u,v),dot(u,v))*(c.direction??1);}if(c.type==='distance-x'||c.type==='distance-y')return (b[c.type==='distance-x'?0:1]-a[c.type==='distance-x'?0:1])*(c.direction??1);if(c.type==='line-distance'){const d=cross(vector(e),f.a.map((n,i)=>n-e.a[i]))/length(e);return c.direction===undefined?Math.abs(d):d*c.direction;}if(c.type==='distance'){if(a&&b)return Math.hypot(b[0]-a[0],b[1]-a[1]);const p=a??b,l=a?f:e;const d=cross(vector(l),p.map((n,i)=>n-l.a[i]))/length(l);return c.direction===undefined?Math.abs(d):d*c.direction;}throw Error('This relation is not a measured dimension.');}
export function residuals(es,cs){return cs.filter(c=>c.driving).flatMap(c=>{const e=entity(es,c.refs[0]),f=c.refs[1]&&entity(es,c.refs[1]),a=pointAt(es,c.refs[0]),b=c.refs[1]&&pointAt(es,c.refs[1]);
 if(c.type==='line-distance')return [cross(vector(e),vector(f))/(length(e)*length(f)),measure(es,c)-c.value];if(dimensions.includes(c.type))return [c.type==='angle'?wrap(measure(es,c)-c.value):measure(es,c)-c.value];if(c.type==='fixed')return a.map((n,i)=>n-c.value[i]);if(c.type==='coincident')return a.map((n,i)=>n-b[i]);if(['horizontal','vertical'].includes(c.type))return c.refs.map(r=>{const l=entity(es,r);return c.type==='horizontal'?l.b[1]-l.a[1]:l.b[0]-l.a[0];});
 if(c.type==='spline-tangent'){
  const u=vector({a:e.control2,b:e.b}),v=vector({a:f.a,b:f.control1});
  return [cross(u,v)/Math.max(Math.hypot(...u),Math.hypot(...v),1e-9)];
 }
 if(c.type==='symmetry'){
  const axis=entity(es,c.refs[2]),u=vector(axis),d=length(axis);
  const midpoint=a.map((n,i)=>(n+b[i])/2-axis.a[i]);
  return [cross(u,midpoint)/d,dot(u,b.map((n,i)=>n-a[i]))/d];
 }
 if(c.type==='horizontal-points')return [a[1]-b[1]];if(c.type==='vertical-points')return [a[0]-b[0]];
 if(c.type==='parallel'||c.type==='perpendicular'||c.type==='collinear'){const u=vector(e),v=vector(f),normalize=Math.max(length(e),length(f),1e-9),base=c.type==='perpendicular'?dot(u,v):cross(u,v),rs=[base/normalize];if(c.type==='collinear')rs.push(cross(u,f.a.map((n,i)=>n-e.a[i]))/length(e));return rs;}
 if(c.type==='equal')return [e.type==='line'?length(e)-length(f):e.radius-f.radius];if(c.type==='equal-curve-length')return [curveLength(e)-curveLength(f)];
 if(c.type==='concentric'||c.type==='coradial')return [...e.center.map((n,i)=>n-f.center[i]),...(c.type==='coradial'?[e.radius-f.radius]:[])];
 if(c.type==='tangent'){if(circular(e)&&circular(f))return [Math.hypot(e.center[0]-f.center[0],e.center[1]-f.center[1])-e.radius-f.radius];const circle=circular(e)?e:f,line=e.type==='line'?e:f;return [Math.abs(cross(vector(line),circle.center.map((n,i)=>n-line.a[i])))/length(line)-circle.radius];}
 if(c.type==='point-on-circle'){const p=a??b,circle=a?f:e;return [Math.hypot(p[0]-circle.center[0],p[1]-circle.center[1])-circle.radius];}
 if(c.type==='point-on-line'||c.type==='midpoint'){const p=a??b,line=a?f:e;if(c.type==='midpoint')return p.map((n,i)=>n-(line.a[i]+line.b[i])/2);return [cross(vector(line),p.map((n,i)=>n-line.a[i]))/length(line)];}
 check(false,'UnsupportedCapability','Unknown sketch relation.');});}
export const isImplicitReference=e=>!!(e?.external&&!e.converted);
export function suggestedRelations(es,refs){if(refs.length===3){const [a,b,axis]=refs;return pointAt(es,a)&&pointAt(es,b)&&wholeReference(axis)&&entity(es,axis)?.type==='line'&&[a,b].some(ref=>!isImplicitReference(entity(es,ref)))?['symmetry']:[];}if(refs.length!==2)return [];const a=entity(es,refs[0]),b=entity(es,refs[1]);if(!a||!b||isImplicitReference(a)&&isImplicitReference(b))return [];const p=pointAt(es,refs[0]),q=pointAt(es,refs[1]);if(p&&q)return ['coincident','horizontal-points','vertical-points'];if(p||q)return (p?b:a).type==='line'?['point-on-line','midpoint']:(p?b:a).type==='circle'?['point-on-circle']:[];if(a.type==='line'&&b.type==='line')return [...(!isImplicitReference(a)&&!isImplicitReference(b)?['horizontal','vertical']:[]),'collinear','perpendicular','parallel','equal'];if(circular(a)&&circular(b))return ['coradial','tangent','concentric','equal',...(a.type==='circle'&&b.type==='circle'?['equal-curve-length']:[])];if([a.type,b.type].includes('line')&&[a,b].some(circular))return ['tangent',...([a.type,b.type].includes('circle')?['equal-curve-length']:[])];return [];}

// Redundancy is mathematically distinct from inconsistent equations. A redundant
// driving dimension still has ambiguous ownership and is a repairable UI conflict.
export function drivingConflicts(constraints,redundant=[]){const dims=constraints.filter(c=>c.driving&&dimensions.includes(c.type)),groups=new Map(),conflicts=new Set(dims.filter(c=>redundant.includes(c.id)).map(c=>c.id));for(const c of dims){const radial=['radius','diameter'].includes(c.type),refs=c.refs.map(r=>r.entityId+':'+r.role).sort(),key=(radial?'radial':c.type)+':'+refs.join('|');const group=groups.get(key)??[];group.push(c.id);groups.set(key,group);}for(const group of groups.values())if(group.length>1)for(const id of group)conflicts.add(id);return [...conflicts];}
