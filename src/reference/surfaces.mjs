import {check} from '../errors.mjs';
import {circleWitness} from '../sketch/curve-witness.mjs';
import {createHash} from 'node:crypto';
import {unit,cross,dot,sub,scale} from './geometry.mjs';
const rounded=v=>Array.isArray(v)?v.map(rounded):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,rounded(v[k])])):typeof v==='number'?Math.round(v*1e8)/1e8:v;
export const referenceDigest=v=>createHash('sha256').update(JSON.stringify(rounded(v))).digest('hex');
const tuple=o=>{try{return [o.X(),o.Y(),o.Z()];}finally{o.delete();}};
const sample=(face,u,v)=>{const p=face.pointOnSurface(u,v);try{return p.toTuple();}finally{p.delete();}};
function conicalGeometry(face){
 const section=v=>circleWitness(Array.from({length:13},(_,i)=>sample(face,i/12,v)));
 const a=section(.25),b=section(.75),middle=section(.5);check(a&&b&&middle,'InvalidGeometry','The conical sections must resolve to native circular curves.');
 const delta=sub(b.centerMm,a.centerMm),height=Math.hypot(...delta),change=b.radiusMm-a.radiusMm;
 check(height>1e-7&&Math.abs(change)>1e-8,'InvalidGeometry','The conical axis is degenerate.');
 let direction=unit(delta);check(Math.abs(dot(direction,a.normal))>1-1e-8&&Math.abs(dot(direction,b.normal))>1-1e-8&&Math.hypot(...sub(middle.centerMm,scale(addVector(a.centerMm,b.centerMm),.5)))<1e-6&&Math.abs(middle.radiusMm-(a.radiusMm+b.radiusMm)/2)<1e-6,'InvalidGeometry','The analytic conical sections are not coaxial and linear.');
 const origin=sub(a.centerMm,scale(delta,a.radiusMm/change));if(direction.find(n=>Math.abs(n)>1e-9)<0)direction=scale(direction,-1);
 return {origin,direction:direction.map(n=>Math.abs(n)<1e-12?0:n),halfAngle:Math.atan(Math.abs(change)/height)};
}
const addVector=(a,b)=>a.map((n,i)=>n+b[i]);
function sphericalGeometry(face){
 const ps=[[.1,.25],[.4,.3],[.7,.65],[.2,.8]].map(([u,v])=>sample(face,u,v)),[p,...rest]=ps,rows=rest.map(q=>scale(sub(q,p),2)),rhs=rest.map(q=>dot(q,q)-dot(p,p)),[a,b,c]=rows,det=dot(a,cross(b,c));check(Math.abs(det)>1e-12,'InvalidGeometry','Sphere center is degenerate.');
 const origin=scale(addVector(addVector(scale(cross(b,c),rhs[0]),scale(cross(c,a),rhs[1])),scale(cross(a,b),rhs[2])),1/det),radius=Math.hypot(...sub(p,origin));
 for(const u of [.1,.4,.7])for(const v of [.2,.5,.8])check(Math.abs(Math.hypot(...sub(sample(face,u,v),origin))-radius)<1e-6,'InvalidGeometry','The native spherical witness is inconsistent.');return {origin,radius};
}
export function surfaceReference(face,area,edgeRoles=[]){
 if(face.geomType==='PLANE')return null;
 let point,normal;
 for(const [u,v]of [[.5,.5],[.37,.43],[.63,.57]]){let p,n;try{p=face.pointOnSurface(u,v);n=face.normalAt(p);const candidate=unit(n.toTuple());point=p.toTuple();normal=candidate;break;}catch{}finally{p?.delete();n?.delete();}}
 if(!point)return null;
 const right=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],u=unit(sub(right,scale(normal,dot(right,normal))));
 let geometry={kind:'surface',origin:point,point,normal,u,v:cross(normal,u)};
 const surface=face.surface;let analytic;
 try{
  if(face.geomType==='CONE')geometry={...geometry,kind:'cone',...conicalGeometry(face)};
  else if(face.geomType==='SPHERE')geometry={...geometry,kind:'sphere',...sphericalGeometry(face)};
  else if(face.geomType==='CYLINDRE'){
   analytic=surface.wrapped[{CYLINDRE:'Cylinder',CONE:'Cone',SPHERE:'Sphere'}[face.geomType]]();
   const origin=tuple(face.geomType==='CONE'?analytic.Apex():analytic.Location());
   if(face.geomType==='SPHERE')geometry={...geometry,kind:'sphere',origin,radius:analytic.Radius()};
   else{const axis=analytic.Axis();let direction;try{direction=unit(tuple(axis.Direction()));if(direction.find(n=>Math.abs(n)>1e-9)<0)direction=scale(direction,-1);direction=direction.map(n=>Math.abs(n)<1e-12?0:n);}finally{axis.delete();}
    geometry={...geometry,kind:face.geomType==='CONE'?'cone':'cylinder',origin:face.geomType==='CYLINDRE'?addVector(origin,scale(direction,dot(sub(point,origin),direction))):origin,direction,...(face.geomType==='CYLINDRE'?{radius:analytic.Radius()}:{halfAngle:analytic.SemiAngle()})};}
  }
 }catch{geometry={kind:'surface',origin:point,point,normal,u,v:cross(normal,u)};}finally{analytic?.delete();surface.delete();}
 return {role:'surface:'+referenceDigest({geometry,area,boundary:[...edgeRoles].sort()}),geometry};
}
