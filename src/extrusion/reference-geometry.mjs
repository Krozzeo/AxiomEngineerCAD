import {circleWitness,closedCircularBoundary} from '../sketch/curve-witness.mjs';
import {createHash} from 'node:crypto';
const rounded=v=>Array.isArray(v)?v.map(rounded):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,rounded(v[k])])):typeof v==='number'?Math.round(v*1e9)/1e9:v;
const digest=value=>createHash('sha256').update(JSON.stringify(rounded(value))).digest('hex');
export function exactReferenceGeometry(shape){
 const faces=shape.faces,adjacent=new Map();
 for(const face of faces)for(const edge of face.edges){const id=edge.hashCode;if(!adjacent.has(id))adjacent.set(id,[]);adjacent.get(id).push(face);}
 const internal=edge=>{if(edge.geomType!=='LINE')return false;const fs=adjacent.get(edge.hashCode)??[];
  // A straight generator bounding only one cylindrical face is a periodic seam.
  if(fs.length===1)return fs[0].geomType==='CYLINDRE';
  if(fs.length!==2||fs[0].geomType!==fs[1].geomType||!['PLANE','CYLINDRE'].includes(fs[0].geomType))return false;
  const p=edge.pointAt(.5).toTuple(),a=fs[0].normalAt(p),b=fs[1].normalAt(p);
  try{return a.toTuple().reduce((s,n,i)=>s+n*b.toTuple()[i],0)>1-1e-9;}finally{a.delete();b.delete();}
 };
 let edges=shape.edges.map((edge,i)=>{
  const line=edge.geomType==='LINE',points=Array.from({length:line?2:65},(_,j)=>edge.pointAt(j/(line?1:64)).toTuple()),ends=[edge.startPoint.toTuple(),edge.endPoint.toTuple()];
  const circle=edge.geomType==='CIRCLE'&&Math.hypot(...ends[0].map((x,k)=>x-ends[1][k]))<1e-7;
  const witness=line?{type:'line',ends:ends.map(rounded).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))}:circle?{type:'circle',bounds:edge.boundingBox.bounds,length:edge.length}:null;
  return {_members:[edge.hashCode],kind:'edge',role:witness?'edge:'+digest(witness):'transient-edge-'+i,resolution:witness?'ResolvedStable':'TransientDisplayOnly',lengthMm:edge.length,points,...(internal(edge)?{displayHidden:true}:{}),...(edge.geomType==='CIRCLE'?{curve:circleWitness(points),bounds:edge.boundingBox.bounds}:{})};
 });
 // A circular boundary can consist of several exact B-Rep arcs. Accept the
 // composite only after proving connectivity, a single winding and full length.
 const circles=new Map();for(const e of edges)if(e.curve){const key=digest({center:e.curve.centerMm,radius:e.curve.radiusMm,normal:e.curve.normal});if(!circles.has(key))circles.set(key,[]);circles.get(key).push(e);}
 for(const arcs of circles.values()){const curve=arcs[0].curve,boundary=closedCircularBoundary(arcs,curve);if(!boundary)continue;if(arcs.length===1){arcs[0].curve={...curve,full:true};continue;}const combined={_members:arcs.flatMap(e=>e._members),kind:'edge',role:'edge:'+digest({type:'circle-boundary',center:curve.centerMm,radius:curve.radiusMm,normal:curve.normal}),resolution:'ResolvedStable',lengthMm:boundary.lengthMm,points:boundary.points,curve:{...curve,full:true},sourcePolicy:'Verified connected full circular boundary composed of '+arcs.length+' exact B-Rep arcs'};edges=edges.filter(e=>!arcs.includes(e));edges.push(combined);}
 const counts=new Map();for(const e of edges)counts.set(e.role,(counts.get(e.role)??0)+1);
 for(const e of edges)if(counts.get(e.role)>1)e.resolution='AmbiguousReference';
 const vertices=new Map();for(const edge of shape.edges)for(const p of [edge.startPoint.toTuple(),edge.endPoint.toTuple()]){const role='vertex:'+digest(p);if(!vertices.has(role))vertices.set(role,{kind:'vertex',role,resolution:'ResolvedStable',pointMm:p});}
 const faceEdgeRoles=Object.fromEntries(shape.faces.map(face=>[face.hashCode,edges.filter(e=>face.edges.some(edge=>e._members.includes(edge.hashCode))).map(e=>e.role)]));
 return {edges:edges.map(({_members,...edge})=>edge),exactVertices:[...vertices.values()],faceEdgeRoles};
}
