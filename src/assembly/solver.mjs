import {check} from '../errors.mjs';
import {assemblyRecipe,NUMERIC,SPATIAL,datum} from './profile.mjs';
import {add,sub,mul,dot,cross,norm,rotate,inverse,qmul,log,increment,rank,linear,exp} from './math.mjs';
function world(b,ref){const d=datum(b,ref.datumId);return {...d,origin:add(b.pose.position,rotate(b.pose.quaternion,d.origin)),direction:d.direction?rotate(b.pose.quaternion,d.direction):null,quaternion:b.pose.quaternion};}
export function relations(bodies,mates){const index=new Map(bodies.map(b=>[b.id,b])),rows=[];let singular=false;
  const append=(m,values,unit)=>values.forEach(value=>rows.push({id:m.id,value,unit}));
  for(const m of mates){const a=world(index.get(m.a.bodyId),m.a),b=world(index.get(m.b.bodyId),m.b),v=sub(b.origin,a.origin);
    if(m.type==='between'){const mid=(refs)=>{const planes=refs.map(ref=>world(index.get(ref.bodyId),ref));return {origin:mul(planes.reduce((v,p)=>add(v,p.origin),[0,0,0]),1/planes.length),direction:planes[0].direction,planes};},x=mid([m.a,...m.extraA]),y=mid([m.b,...m.extraB]);for(const set of [x,y])for(const plane of set.planes.slice(1))append(m,cross(set.direction,plane.direction),'direction');append(m,cross(x.direction,y.direction),'direction');append(m,[dot(sub(y.origin,x.origin),x.direction)],'mm');}
    if(m.type==='tangent'){if(a.kind==='cylinder'&&b.kind==='cylinder'){append(m,cross(a.direction,b.direction),'direction');append(m,[norm(cross(v,a.direction))-a.radius-b.radius],'mm');}else{const plane=a.kind==='plane'?a:b,cylinder=a.kind==='cylinder'?a:b;append(m,[dot(plane.direction,cylinder.direction)],'direction');append(m,[Math.abs(dot(sub(cylinder.origin,plane.origin),plane.direction))-cylinder.radius],'mm');}}
    if(m.type==='fixed'){const position=m.relative?add(a.origin,rotate(a.quaternion,m.relative.position)):a.origin,quaternion=m.relative?qmul(a.quaternion,m.relative.quaternion):a.quaternion;append(m,sub(b.origin,position),'mm');append(m,log(qmul(b.quaternion,inverse(quaternion))),'rad');}
    if(m.type==='coincident'&&a.kind==='point')append(m,v,'mm');
    if(m.type==='coincident'&&a.kind==='plane'){append(m,cross(a.direction,b.direction),'direction');append(m,[dot(v,a.direction)],'mm');}
    if(m.type==='concentric'){append(m,cross(a.direction,b.direction),'direction');append(m,cross(v,a.direction),'mm');}
    if(m.type==='parallel')append(m,cross(a.direction,b.direction),'direction');
    if(m.type==='perpendicular')append(m,[dot(a.direction,b.direction)],'direction');
    if(m.type==='distance'){if(a.kind==='plane'||b.kind==='plane'){const normal=a.direction??b.direction;if(a.kind==='plane'&&b.kind==='plane')append(m,cross(a.direction,b.direction),'direction');append(m,[dot(v,normal)-m.value],'mm');}else{singular ||= norm(v)<1e-8;append(m,[norm(v)-m.value],'mm');}}
    if(m.type==='angle'){const s=norm(cross(a.direction,b.direction));if(m.regularized&&(m.value<1e-8||Math.abs(m.value-Math.PI)<1e-8)){append(m,cross(a.direction,b.direction),'direction');append(m,[dot(a.direction,b.direction)-Math.cos(m.value)],'direction');}else{singular ||= s<1e-8;append(m,[Math.atan2(s,dot(a.direction,b.direction))-m.value],'rad');}}
  }return {rows,singular};
}
const valid=rows=>rows.every(r=>Math.abs(r.value)<=(r.unit==='mm'?NUMERIC.lengthMm:NUMERIC.angleRad));
function jacobian(bodies,variables,mates,extra=()=>[]){const base=[...relations(bodies,mates).rows,...extra(bodies)],n=variables.length*6,J=base.map(()=>Array(n).fill(0)),h=NUMERIC.differenceStep;
  for(let col=0;col<n;col++){const d=Array(n).fill(0);d[col]=h;const plus=[...relations(increment(bodies,variables,d),mates).rows,...extra(increment(bodies,variables,d))];d[col]=-h;const minus=[...relations(increment(bodies,variables,d),mates).rows,...extra(increment(bodies,variables,d))];for(let row=0;row<base.length;row++)J[row][col]=(plus[row].value-minus[row].value)/(2*h);}return {rows:base,J};}
function optimize(initial,mates,extra=()=>[]){let bodies=structuredClone(initial),lambda=1e-3,iterations=0;const variables=bodies.flatMap((b,i)=>b.grounded?[]:[i]),n=variables.length*6;
  for(;iterations<NUMERIC.maxIterations;iterations++){
    const {rows,J}=jacobian(bodies,variables,mates,extra);if(valid(rows)||!n)break;const residual=rows.map(r=>r.value),cost=dot(residual,residual);
    const a=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
    for(let i=0;i<n;i++){for(let j=0;j<n;j++)a[i][j]=J.reduce((s,row)=>s+row[i]*row[j],0);a[i][i]+=lambda;b[i]=-J.reduce((s,row,k)=>s+row[i]*residual[k],0);}
    let step=linear(a,b);if(!step)break;const length=norm(step);if(length>50)step=mul(step,50/length);
    const candidate=increment(bodies,variables,step),values=[...relations(candidate,mates).rows,...extra(candidate)].map(r=>r.value),next=dot(values,values);
    if(next<cost){bodies=candidate;lambda=Math.max(1e-12,lambda/4);}else lambda=Math.min(1e12,lambda*10);
    if(lambda>=1e12||norm(step)<1e-12)break;
  }return {bodies,iterations,variables};
}
export function solveAssembly(input,{drag,targets,projectTargets=false}={}){
  const source=assemblyRecipe(input),started=performance.now(),seed=structuredClone(source.bodies);
  if(source.profile!=='E0.M3-datums-v0')for(const m of source.mates.filter(m=>m.type==='perpendicular'||m.type==='angle')){const a=seed.find(b=>b.id===m.a.bodyId),b=seed.find(b=>b.id===m.b.bodyId),wa=world(a,m.a),wb=world(b,m.b);if(norm(cross(wa.direction,wb.direction))<1e-6&&(m.type==='perpendicular'||Math.abs(Math.acos(Math.max(-1,Math.min(1,dot(wa.direction,wb.direction))))-m.value)>1e-8)){const target=!b.grounded?b:!a.grounded?a:null;if(target){let axis=cross(wa.direction,Math.abs(wa.direction[0])<.8?[1,0,0]:[0,1,0]);axis=mul(axis,.02/norm(axis));target.pose.quaternion=qmul(exp(axis),target.pose.quaternion);}}}
  for(const m of source.mates.filter(m=>m.type==='tangent')){const a=seed.find(b=>b.id===m.a.bodyId),b=seed.find(b=>b.id===m.b.bodyId),wa=world(a,m.a),wb=world(b,m.b),target=!b.grounded?b:!a.grounded?a:null;if(!target)continue;if(wa.kind==='cylinder'&&wb.kind==='cylinder'&&norm(cross(sub(wb.origin,wa.origin),wa.direction))<1e-7){const axis=cross(wa.direction,Math.abs(wa.direction[0])<.8?[1,0,0]:[0,1,0]);target.pose.position=add(target.pose.position,mul(axis,.02/norm(axis)));}else if(wa.kind!==wb.kind){const plane=wa.kind==='plane'?wa:wb,cylinder=wa.kind==='cylinder'?wa:wb;if(Math.abs(dot(sub(cylinder.origin,plane.origin),plane.direction))<1e-7)target.pose.position=add(target.pose.position,mul(plane.direction,.02));}}
  const base=optimize(seed,source.mates);let solved=base,dragResult=null;
  if(drag||targets?.length){
   const targetList=targets??[drag];for(const drag of targetList){check(drag&&typeof drag==='object'&&Object.keys(drag).every(k=>['bodyId','position','quaternion'].includes(k))&&source.bodies.some(b=>b.id===drag.bodyId),'LostReference','Drag a known body.');
    check(Array.isArray(drag.position)&&drag.position.length===3&&drag.position.every(x=>Number.isFinite(x)&&Math.abs(x)<=(source.profile!=='E0.M3-datums-v0'?1e6:1000)),'InvalidInput','Drag position must be a bounded mm vector.');
    if(drag.quaternion)check(Array.isArray(drag.quaternion)&&drag.quaternion.length===4&&drag.quaternion.every(Number.isFinite)&&Math.abs(norm(drag.quaternion)-1)<1e-8,'InvalidInput','Drag orientation must be a unit quaternion.');
    }
    const extra=bodies=>targetList.flatMap(drag=>{const b=bodies.find(b=>b.id===drag.bodyId);return [...sub(b.pose.position,drag.position).map(value=>({id:'temporary-drag',value,unit:'mm'})),...(drag.quaternion?log(qmul(b.pose.quaternion,inverse(drag.quaternion))).map(value=>({id:'temporary-drag',value,unit:'rad'})):[])];});
    let attempted=optimize(base.bodies,source.mates,extra);if(projectTargets){const soft=bodies=>extra(bodies).map(row=>({...row,value:row.value*.001}));const near=optimize(base.bodies,source.mates,soft);attempted=optimize(near.bodies,source.mates);}
    const accepted=valid(relations(base.bodies,source.mates).rows)&&valid(relations(attempted.bodies,source.mates).rows)&&(projectTargets||valid(extra(attempted.bodies)));
    dragResult={accepted,target:structuredClone(targets??drag),reason:accepted?'Temporary target satisfied; permanent mate rank measured after removal.':'Infeasible target; previous feasible poses preserved.',iterations:attempted.iterations};if(accepted)solved=attempted;
  }
  const {rows,J}=jacobian(solved.bodies,solved.variables,source.mates),n=solved.variables.length*6,r=rank(J,n,NUMERIC.rankThreshold),state=relations(solved.bodies,source.mates),redundant=[];
  const accumulated=[];let previous=0;for(const m of source.mates){accumulated.push(...J.filter((_,i)=>rows[i].id===m.id));const next=rank(accumulated,n,NUMERIC.rankThreshold);if(next===previous)redundant.push(m.id);previous=next;}
  const conflicts=[...new Set(rows.filter(row=>!valid([row])).map(row=>row.id))],consistent=conflicts.length===0,singular=state.singular;
  const contradictory=source.mates.some((m,i)=>['distance','angle'].includes(m.type)&&source.mates.slice(0,i).some(other=>other.type===m.type&&JSON.stringify([other.a,other.b].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))===JSON.stringify([m.a,m.b].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))&&Math.abs(other.value-m.value)>(m.type==='distance'?NUMERIC.lengthMm:NUMERIC.angleRad)*2));
  let withinBounds=true;try{assemblyRecipe({...source,bodies:solved.bodies});}catch{withinBounds=false;}
  const status=!withinBounds?'Unsolved':!consistent?(contradictory||n===0?'Inconsistent':singular?'SingularOrIndeterminate':'Unsolved'):singular?'SingularOrIndeterminate':redundant.length?'RedundantConsistent':n-r===0?'FullyDefined':'UnderDefined';
  const applicable=consistent&&!singular&&withinBounds&&(!dragResult||dragResult.accepted);
  const bodyDOF=Object.fromEntries(solved.bodies.map((body,index)=>{const k=solved.variables.indexOf(index);return [body.id,body.grounded?0:consistent&&!singular?6-r+rank(J.map(row=>row.filter((_,i)=>i<k*6||i>=k*6+6)),n-6,NUMERIC.rankThreshold):null];}));
  return {bodyDOF,solver:SPATIAL,numeric:NUMERIC,status,remainingDOF:consistent&&!singular?n-r:null,rank:r,variables:n,grounded:source.bodies.filter(b=>b.grounded).map(b=>b.id),redundant,conflicts,
    evidence:{rows,maxLengthResidualMm:Math.max(0,...rows.filter(r=>r.unit==='mm').map(r=>Math.abs(r.value))),maxAngularResidualRad:Math.max(0,...rows.filter(r=>r.unit!=='mm').map(r=>Math.abs(r.value))),method:'Central-difference world tangent Jacobian; pivoted local rank; no global uniqueness claim.'},
    applicable,drag:dragResult,recipe:source,poses:solved.bodies.map(b=>({bodyId:b.id,...b.pose})),
    solvedRecipe:applicable?{...source,bodies:solved.bodies}:null,iterations:solved.iterations,elapsedMs:performance.now()-started,
    limits:['Local numerical prototype; no global convergence proof','Analytic datums only; no arbitrary B-Rep mating',...(source.profile==='E0.M3-datums-v0'?['Tangent and width unsupported']:['Analytic cylinder/plane tangency; plane-set Between only']),'CPU datum diagram is not interference or WebGPU evidence']};
}
