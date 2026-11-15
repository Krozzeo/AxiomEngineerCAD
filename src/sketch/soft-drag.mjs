// Only connected relations can influence an interactive drag.
export function dragComponent(data,ref){
 const links=new Map();
 for(const constraint of data.constraints)if(constraint.driving)for(const participant of constraint.refs){
  const list=links.get(participant.entityId)??[];list.push(constraint);links.set(participant.entityId,list);
 }
 const entities=new Set([ref.entityId]),constraints=new Set();
 for(const id of entities)for(const constraint of links.get(id)??[]){
  if(constraints.has(constraint))continue;
  constraints.add(constraint);
  for(const participant of constraint.refs)entities.add(participant.entityId);
 }
 return {...data,entities:data.entities.filter(entity=>entities.has(entity.id)),constraints:[...constraints]};
}

// Pointer goals are projected into permitted motion; only exact solver results can escape.
export async function solveSoftDrag(data,drag,{solve,jacobian,pointAt,derivedId,residuals,check}){
 check(drag?.ref&&Array.isArray(drag.target)&&drag.target.length===2&&drag.target.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000),'InvalidInput','Invalid bounded drag target.');const e=data.entities.find(e=>e.id===drag.ref.entityId);check(e,'LostReference','Drag participant is missing.');const ref=drag.ref.role==='entity'?{entityId:e.id,role:e.type==='line'?'midpoint':['circle','arc'].includes(e.type)?'center':e.type==='spline'?'a':'point'}:drag.ref;const radial=ref.role==='circumference'&&e.type==='circle',offset=radial?drag.target.map((n,i)=>n-e.center[i]):null,magnitude=radial?Math.hypot(...offset):0,direction=radial?(magnitude>1e-9?offset.map(n=>n/magnitude):[1,0]):null;
 const atRef=es=>{if(!radial)return pointAt(es,ref);const circle=es.find(x=>x.id===ref.entityId);return circle.center.map((n,i)=>n+direction[i]*circle.radius);};
 check(atRef(data.entities),'LostReference','Choose a draggable semantic point or segment.');const original=await solve(data);if(!original.valid)return original;
 let held=e.type==='line'&&['a','b'].includes(ref.role)?{entityId:e.id,role:ref.role==='a'?'b':'a'}:null;let temporary=held?{id:derivedId('drag-hold',e.id,held.role),type:'fixed',refs:[held],driving:true,value:[...pointAt(data.entities,held)]}:null;let cs=temporary?[...data.constraints,temporary]:data.constraints;
 if(temporary){const before=goalSpace(jacobian(data.entities,data.constraints),data.entities,ref),after=goalSpace(jacobian(data.entities,cs),data.entities,ref);const coupled=data.constraints.some(c=>c.driving&&c.refs.some(r=>r.entityId===e.id)&&c.refs.some(r=>r.entityId!==e.id));if(before.rank>0&&after.rank===0||coupled&&(before.rank!==after.rank||before.rank===1&&Math.abs(before.direction[0]*after.direction[1]-before.direction[1]*after.direction[0])>1e-7)){held=null;temporary=null;cs=data.constraints;}}

 let best=original,bestError=distance(atRef(best.entities),drag.target);if(bestError<1e-8)return best;
 for(let iteration=0;iteration<8;iteration++){
  const es=best.entities,{variables,nullspace}=jacobian(es,cs),basis=orthonormal(nullspace),index=es.findIndex(e=>e.id===ref.entityId),rows=basis.map(vector=>[0,1].map(axis=>variables.reduce((sum,v,i)=>sum+(v.i!==index?0:radial?(v.k==='radius'?vector[i]*direction[axis]:v.k==='center'&&v.j===axis?vector[i]:0):v.j===axis&&(v.k===ref.role||ref.role==='midpoint'&&['a','b'].includes(v.k))?vector[i]*(ref.role==='midpoint'?.5:1):0),0)));if(!basis.length)break;
  const at=atRef(es),delta=drag.target.map((x,i)=>x-at[i]),step=project(rows,delta),coefficients=rows.map(row=>row[0]*step[0]+row[1]*step[1]);let vectors=[coefficients];if(Math.hypot(...coefficients)<1e-8){const n=rows.findIndex(row=>Math.hypot(...row)>1e-8);if(n<0)break;const probe=Math.min(2,Math.max(.02,bestError*.05));const straight=basis.every((vector,j)=>Math.hypot(...rows[j])<1e-8||[1,-1].every(sign=>{const candidate=structuredClone(es);for(const [i,v]of variables.entries()){const change=vector[i]*probe*sign;if(v.j===null)candidate[v.i][v.k]+=change;else candidate[v.i][v.k][v.j]+=change;}try{return residuals(candidate,cs).every(n=>Number.isFinite(n)&&Math.abs(n)<1e-8);}catch{return false;}}));if(straight)break;vectors=[1,-1].map(sign=>basis.map((_,i)=>i===n?sign*probe:0));}
  let improved=false;for(const coefficient of vectors){for(const fraction of [1,.5,.25]){const candidate=structuredClone(es);for(let i=0;i<variables.length;i++){const v=variables[i],change=basis.reduce((sum,b,j)=>sum+b[i]*coefficient[j]*fraction,0);if(v.j===null)candidate[v.i][v.k]+=change;else candidate[v.i][v.k][v.j]+=change;}
    let result;try{result=await solve({...data,entities:candidate,constraints:cs});}catch(error){if(['InvalidGeometry','InvalidInput'].includes(error.code))continue;throw error;}if(!result.valid)continue;const error=distance(atRef(result.entities),drag.target);if(error+1e-8<bestError){const permanent=temporary?await solve({...data,entities:result.entities}):result;if(!permanent.valid)continue;const finalError=distance(atRef(permanent.entities),drag.target);if(finalError+1e-8>=bestError)continue;best=permanent;bestError=finalError;improved=true;break;}}
   if(improved)break;}if(!improved||bestError<1e-7)break;
 }
 return {...best,drag:{requestedTarget:[...drag.target],effectiveTarget:atRef(best.entities),heldReference:held,method:'Constrained nullspace goal followed by pinned PlaneGCS solve and independent residual/DOF verification'}};
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function orthonormal(vectors){const out=[];for(const v of vectors){const u=[...v];for(const q of out){const dot=u.reduce((sum,x,i)=>sum+x*q[i],0);for(let i=0;i<u.length;i++)u[i]-=dot*q[i];}const norm=Math.hypot(...u);if(norm>1e-9)out.push(u.map(x=>x/norm));}return out;}
function project(rows,delta){const a=rows.reduce((s,r)=>s+r[0]**2,0),b=rows.reduce((s,r)=>s+r[0]*r[1],0),d=rows.reduce((s,r)=>s+r[1]**2,0),det=a*d-b*b,trace=a+d;if(trace<1e-16)return [0,0];if(det>trace*trace*1e-12)return [(d*delta[0]-b*delta[1])/det,(a*delta[1]-b*delta[0])/det];const lambda=(trace+Math.hypot(a-d,2*b))/2,raw=Math.abs(b)>1e-12?[b,lambda-a]:a>=d?[1,0]:[0,1],norm=Math.hypot(...raw),u=raw.map(x=>x/norm),value=(u[0]*delta[0]+u[1]*delta[1])/lambda;return u.map(x=>x*value);}

// In a connected constraint network, a convenience anchor may not remove real motion.
function goalSpace(info,entities,ref){
 const index=entities.findIndex(e=>e.id===ref.entityId),rows=orthonormal(info.nullspace).map(vector=>[0,1].map(axis=>info.variables.reduce((sum,v,i)=>sum+(v.i===index&&v.j===axis&&(v.k===ref.role||ref.role==='midpoint'&&['a','b'].includes(v.k))?vector[i]*(ref.role==='midpoint'?.5:1):0),0)));
 const a=rows.reduce((s,r)=>s+r[0]**2,0),b=rows.reduce((s,r)=>s+r[0]*r[1],0),d=rows.reduce((s,r)=>s+r[1]**2,0),trace=a+d;
 if(trace<1e-14)return {rank:0};if(a*d-b*b>trace*trace*1e-10)return {rank:2};
 const lambda=(trace+Math.hypot(a-d,2*b))/2,raw=Math.abs(b)>1e-12?[b,lambda-a]:a>=d?[1,0]:[0,1],norm=Math.hypot(...raw);return {rank:1,direction:raw.map(v=>v/norm)};
}
