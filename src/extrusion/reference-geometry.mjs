import {createHash} from 'node:crypto';
const rounded=v=>Array.isArray(v)?v.map(rounded):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,rounded(v[k])])):typeof v==='number'?Math.round(v*1e9)/1e9:v;
const digest=value=>createHash('sha256').update(JSON.stringify(rounded(value))).digest('hex');
export function exactReferenceGeometry(shape){
 const edges=shape.edges.map((edge,i)=>{
  const line=edge.geomType==='LINE',points=Array.from({length:line?2:65},(_,j)=>edge.pointAt(j/(line?1:64)).toTuple()),ends=[edge.startPoint.toTuple(),edge.endPoint.toTuple()];
  const circle=edge.geomType==='CIRCLE'&&Math.hypot(...ends[0].map((x,k)=>x-ends[1][k]))<1e-7;
  const witness=line?{type:'line',ends:ends.map(rounded).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))}:circle?{type:'circle',bounds:edge.boundingBox.bounds,length:edge.length}:null;
  return {kind:'edge',role:witness?'edge:'+digest(witness):'transient-edge-'+i,resolution:witness?'ResolvedStable':'TransientDisplayOnly',lengthMm:edge.length,points};
 });
 const counts=new Map();for(const e of edges)counts.set(e.role,(counts.get(e.role)??0)+1);
 for(const e of edges)if(counts.get(e.role)>1)e.resolution='AmbiguousReference';
 const vertices=new Map();for(const edge of shape.edges)for(const p of [edge.startPoint.toTuple(),edge.endPoint.toTuple()]){const role='vertex:'+digest(p);if(!vertices.has(role))vertices.set(role,{kind:'vertex',role,resolution:'ResolvedStable',pointMm:p});}
 return {edges,exactVertices:[...vertices.values()]};
}
