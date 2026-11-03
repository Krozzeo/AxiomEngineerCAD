import {createHash} from 'node:crypto';
import {check} from '../errors.mjs';

const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v);check(n>1e-10,'InvalidGeometry','A planar support needs a nondegenerate frame.');return v.map(x=>x/n);};
const rounded=v=>Array.isArray(v)?v.map(rounded):Math.round(v*1e9)/1e9;
const compare=(a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b));

// A conservative exact-geometry witness, never an array index or GPU face hash.
// If an affected face cannot retain this witness, resolution is explicitly lost.
export function planarSupport(face,center,area){
 if(face.geomType!=='PLANE')return null;
 const normal=unit(face.normalAt().toTuple()),axis=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],u=unit(axis.map((n,i)=>n-dot(axis,normal)*normal[i])),v=cross(normal,u);
 const edges=face.edges.map(edge=>({type:edge.geomType,length:rounded(edge.length),points:Array.from({length:edge.geomType==='LINE'?2:65},(_,i)=>rounded(edge.pointAt(i/(edge.geomType==='LINE'?1:64)).toTuple())).sort(compare)})).sort((a,b)=>compare(a,b));
 const witness={normal:rounded(normal),center:rounded(center),area:rounded(area),edges};
 const role='planar:'+createHash('sha256').update(JSON.stringify(witness)).digest('hex');
 return {role,frame:{origin:[...center],u,v,normal}};
}

export function validateSupportFrame(frame){
 const keys=['origin','u','v','normal'];check(frame&&Object.keys(frame).length===4&&keys.every(k=>Array.isArray(frame[k])&&frame[k].length===3&&frame[k].every(n=>Number.isFinite(n)&&Math.abs(n)<=10000)),'InvalidInput','A planar support requires a bounded exact frame.');
 check(['u','v','normal'].every(k=>Math.abs(Math.hypot(...frame[k])-1)<1e-9)&&Math.abs(dot(frame.u,frame.v))<1e-9&&cross(frame.u,frame.v).every((n,i)=>Math.abs(n-frame.normal[i])<1e-9),'InvalidInput','A support frame must be orthonormal and right-handed.');
 return frame;
}

export function sameSupportFrame(a,b){return ['origin','u','v','normal'].every(k=>a[k].every((n,i)=>Math.abs(n-b[k][i])<=1e-7));}
