import {arcAngles,arcPoint,intersections,parameterOn,pointOn,within} from '../sketch/curves.mjs';
import {check} from '../errors.mjs';

const eps=1e-7,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const edgeLength=e=>e.type==='line'?dist(e.a,e.b):e.radius*Math.abs(arcAngles(e).sweep);
const reverse=e=>({...e,a:e.b,b:e.a,...(e.type==='arc'?{clockwise:!e.clockwise}:{})});
function integrals(edge){
  const [x,y]=edge.a,[u,v]=edge.b;
  if(edge.type==='line')return [(x*v-u*y)/2,(v-y)*(x*x+x*u+u*u)/6,-(u-x)*(y*y+y*v+v*v)/6];
  const [cx,cy]=edge.center,r=edge.radius,{start,sweep}=arcAngles(edge);
  const primitive=t=>{
    const s=Math.sin(t),c=Math.cos(t),sc=Math.sin(2*t)/4;
    return [
      (r*cx*s-r*cy*c+r*r*t)/2,
      r*(cx*cx*s+2*cx*r*(t/2+sc)+r*r*(s-s*s*s/3))/2,
      r*(-cy*cy*c+2*cy*r*(t/2-sc)+r*r*(-c+c*c*c/3))/2
    ];
  };
  const a=primitive(start),b=primitive(start+sweep);
  return b.map((n,i)=>n-a[i]);
}
function closedWires(edges){
  const nodes=[];
  const node=point=>{
    const hits=nodes.filter(n=>dist(n.point,point)<eps);
    check(hits.length<=1,'AmbiguousReference','Near-coincident profile endpoints are ambiguous.');
    if(hits.length)return hits[0];
    const found={point,edges:[]};nodes.push(found);return found;
  };
  const records=edges.map(edge=>{
    const a=node(edge.a),b=node(edge.b);
    check(a!==b,'InvalidGeometry','Curve endpoints must differ.');
    const entry={edge,a,b};a.edges.push(entry);b.edges.push(entry);return entry;
  });
  check(nodes.every(n=>n.edges.length===2),'InvalidGeometry','Join curve endpoints into unbranched closed loops.');
  const remaining=new Set(records),loops=[];
  while(remaining.size){
    const first=remaining.values().next().value,start=first.a,ordered=[];
    let current=start,entry=first;
    do{
      check(remaining.delete(entry),'InvalidGeometry','Profile connectivity is inconsistent.');
      const forward=entry.a===current;
      ordered.push(forward?entry.edge:reverse(entry.edge));
      current=forward?entry.b:entry.a;entry=current.edges.find(e=>e!==entry);
    }while(current!==start);
    loops.push(ordered);
  }
  return loops;
}
const interior=(edge,p)=>{const t=parameterOn(edge,p);return t!==null&&t>eps&&t<1-eps;};
function verifyWire(edges){
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
    const a=edges[i],b=edges[j],shared=[...(j===i+1?[a.b]:[]),...(i===0&&j===edges.length-1?[a.a]:[])];
    const hit=intersections(a,b),overlap=hit.coincident&&(
      [a.a,a.b,pointOn(a,.5)].some(p=>interior(b,p))||[b.a,b.b,pointOn(b,.5)].some(p=>interior(a,p))
    );
    check(!overlap&&hit.points.every(p=>shared.some(q=>dist(p,q)<eps)),'InvalidGeometry','A closed profile crosses or overlaps itself.');
  }
}
function rayCrossings(e,[x,y]){
  if(e.type==='line'){
    const [a,b]=[e.a,e.b];
    return (a[1]>y)!==(b[1]>y)&&x<a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1])?1:0;
  }
  const [cx,cy]=e.center,r=e.radius;
  const breaks=[0,1,...[-1,1].map(sign=>parameterOn(e,[cx,cy+sign*r])).filter(t=>t!==null&&t>eps&&t<1-eps)].sort((a,b)=>a-b);
  let count=0;
  for(let i=1;i<breaks.length;i++){
    const a=arcPoint(e,breaks[i-1]),b=arcPoint(e,breaks[i]);
    if((a[1]>y)===(b[1]>y))continue;
    const mid=arcPoint(e,(breaks[i-1]+breaks[i])/2),root=Math.sqrt(Math.max(0,r*r-(y-cy)**2));
    if(x<cx+Math.sign(mid[0]-cx)*root)count++;
  }
  return count;
}
function inside(loop,p){
  if(loop.kind==='circle')return dist(loop.center,p)<loop.radius-eps;
  return !loop.edges.some(e=>within(e,p))&&loop.edges.reduce((n,e)=>n+rayCrossings(e,p),0)%2===1;
}
export function curvedProfile(entities){
  const loops=entities.filter(e=>e.type==='circle').map(e=>({...e,kind:'circle',edges:[e],entityIds:[e.id],area:Math.PI*e.radius**2,perimeter:2*Math.PI*e.radius,centroid:e.center}));
  for(const edges of closedWires(entities.filter(e=>e.type!=='circle'))){
    verifyWire(edges);
    const [area,mx,my]=edges.map(integrals).reduce((a,b)=>a.map((n,i)=>n+b[i]),[0,0,0]);
    check(Math.abs(area)>eps,'InvalidGeometry','Profile area is zero.');
    const entityIds=edges.map(e=>e.id);
    loops.push({kind:'curved',id:[...entityIds].sort().join('+'),edges,entityIds,area:Math.abs(area),centroid:[mx/area,my/area],perimeter:edges.reduce((sum,e)=>sum+edgeLength(e),0)});
  }
  check(loops.length<=5,'ResourceLimit','One outer loop and at most four holes are supported.');
  for(let i=0;i<loops.length;i++)for(let j=i+1;j<loops.length;j++)for(const a of loops[i].edges)for(const b of loops[j].edges){
    const hit=intersections(a,b);
    check(!hit.points.length&&!(hit.coincident&&(a.type==='circle'&&b.type==='circle'||a.type==='arc'&&interior(b,pointOn(a,.5))||b.type==='arc'&&interior(a,pointOn(b,.5)))),'InvalidGeometry','Profile loops intersect or touch.');
  }
  const sample=loop=>loop.kind==='circle'?[loop.center[0]+loop.radius,loop.center[1]]:loop.edges[0].a;
  const outerLoops=loops.filter(a=>!loops.some(b=>a!==b&&inside(b,sample(a))));
  check(outerLoops.length===1,'InvalidGeometry','Disjoint outer contours require a later multi-body feature.');
  const outer=outerLoops[0],holes=loops.filter(l=>l!==outer);
  check(holes.every(h=>inside(outer,sample(h))&&!holes.some(other=>h!==other&&inside(other,sample(h)))),'InvalidGeometry','Nested or detached holes are unsupported.');
  const area=outer.area-holes.reduce((sum,h)=>sum+h.area,0);
  check(area>eps,'InvalidGeometry','Profile has no positive material area.');
  const centroid=[0,1].map(i=>(outer.area*outer.centroid[i]-holes.reduce((sum,h)=>sum+h.area*h.centroid[i],0))/area);
  return {outer,holes,area,centroid,perimeter:loops.reduce((sum,l)=>sum+l.perimeter,0),entityIds:entities.map(e=>e.id).sort()};
}
