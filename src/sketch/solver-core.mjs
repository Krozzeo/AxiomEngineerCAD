import {arcTangencyValid,circular} from './curves.mjs';
import {solveSoftDrag,dragComponent} from './soft-drag.mjs';
import {M5_PROFILE,isParametric,measure as measured,residuals as equations,drivingConflicts,dimensions,splineHandleRoles,entityForReference,wholeReference,equationTangent} from './relation-kinds.mjs';
export function createSketchSolver({validateEntity,make_gcs_wrapper,SolveStatus,derivedId,pointAt,validReference,TOLERANCES,SOLVER,check}){
const accepted=s=>['UnderDefined','FullyDefined','RedundantConsistent'].includes(s);
const vars=entities=>entities.flatMap((e,i)=>['point','a','b','center','control1','control2','radius'].filter(k=>e[k]!==undefined).flatMap(k=>k==='radius'?[{i,k,j:null}]:[0,1].map(j=>({i,k,j}))));
const get=(es,v)=>v.j===null?es[v.i][v.k]:es[v.i][v.k][v.j];
const set=(es,v,n)=>{if(v.j===null)es[v.i][v.k]=n;else es[v.i][v.k][v.j]=n;};
function rank(matrix,columns){const m=matrix.map(row=>[...row]),pivots=[];let row=0;const threshold=Math.max(1,...m.flat().map(Math.abs))*TOLERANCES.rankRelative;for(let col=0;col<columns&&row<m.length;col++){let pivot=row;for(let i=row+1;i<m.length;i++)if(Math.abs(m[i][col])>Math.abs(m[pivot][col]))pivot=i;if(Math.abs(m[pivot][col])<=threshold)continue;[m[row],m[pivot]]=[m[pivot],m[row]];const d=m[row][col];for(let j=0;j<columns;j++)m[row][j]/=d;for(let i=0;i<m.length;i++)if(i!==row){const f=m[i][col];for(let j=0;j<columns;j++)m[i][j]-=f*m[row][j];}pivots.push(col);row++;}const free=Array.from({length:columns},(_,i)=>i).filter(i=>!pivots.includes(i)),movable=new Set(free);pivots.forEach((p,i)=>{if(free.some(j=>Math.abs(m[i][j])>threshold))movable.add(p);});const nullspace=free.map(col=>{const vector=Array(columns).fill(0);vector[col]=1;pivots.forEach((p,i)=>vector[p]=-m[i][col]);return vector;});return {rank:row,movable,nullspace};}
const exactEquations=(es,cs)=>[...equations(es,cs),...es.filter(e=>e.type==='arc').flatMap(e=>[e.a,e.b].map(p=>Math.hypot(p[0]-e.center[0],p[1]-e.center[1])-e.radius))];
function jacobian(es,cs){
 const variables=vars(es),groups=[];
 let row=0;
 for(const constraint of cs){const initial=equations(es,[constraint]);groups.push({row,initial,entities:new Set(constraint.refs.map(ref=>ref.entityId)),evaluate:entities=>equations(entities,[constraint])});row+=initial.length;}
 for(const entity of es.filter(e=>e.type==='arc')){
  const evaluate=entities=>{const arc=entities.find(e=>e.id===entity.id);return [arc.a,arc.b].map(p=>Math.hypot(p[0]-arc.center[0],p[1]-arc.center[1])-arc.radius);};
  const initial=evaluate(es);groups.push({row,initial,entities:new Set([entity.id]),evaluate});row+=initial.length;
 }
 const initial=groups.flatMap(group=>group.initial),matrix=initial.map(()=>Array(variables.length).fill(0));
 for(const [col,v]of variables.entries()){
  const affected=groups.filter(group=>group.initial.length&&group.entities.has(es[v.i].id));if(!affected.length)continue;
  const plus=es.slice(),minus=es.slice();plus[v.i]=structuredClone(es[v.i]);minus[v.i]=structuredClone(es[v.i]);
  const n=get(es,v),h=1e-5*Math.max(1,Math.abs(n));set(plus,v,n+h);set(minus,v,n-h);
  for(const group of affected){const a=group.evaluate(plus),b=group.evaluate(minus);for(let i=0;i<a.length;i++)matrix[group.row+i][col]=(a[i]-b[i])/(2*h);}
 }
 return {variables,initial,matrix,...rank(matrix,variables.length)};
}
function mobility(es,cs,system=jacobian(es,cs)){
 const {variables,initial,...r}=system,pointStates={},referenceDOF={},byEntity=es.map(()=>[]);
 variables.forEach((v,index)=>byEntity[v.i].push(index));
 for(const [index,entity]of es.entries()){
  const indices=byEntity[index];
  for(const role of ['point','a','b','center','control1','control2',...(entity.type==='line'?['midpoint']:[])]){
   if(role!=='midpoint'&&!entity[role])continue;
   const axes=[0,1].map(axis=>indices.filter(k=>variables[k].j===axis&&(variables[k].k===role||role==='midpoint'&&['a','b'].includes(variables[k].k))));
   const projected=axes.map(columns=>r.nullspace.map(vector=>columns.reduce((sum,k)=>sum+vector[k]*(role==='midpoint'?.5:1),0)));
   const key=entity.id+':'+role;referenceDOF[key]=rank(projected,r.nullspace.length).rank;pointStates[key]=referenceDOF[key]?'UnderDefined':'FullyDefined';
  }
  referenceDOF[entity.id+':entity']=rank(indices.map(k=>r.nullspace.map(vector=>vector[k])),r.nullspace.length).rank;
 }
 return {coordinateStates:Object.fromEntries(variables.map((v,k)=>[es[v.i].id+':'+v.k+(v.j===null?'':':'+v.j),r.movable.has(k)?'UnderDefined':'FullyDefined'])),pointStates,referenceDOF,variables:variables.length,rows:initial.length,rank:r.rank,dof:variables.length-r.rank,maxResidualMm:Math.max(0,...initial.map(Math.abs)),entities:Object.fromEntries(es.map((e,i)=>[e.id,byEntity[i].some(k=>r.movable.has(k))?'UnderDefined':'FullyDefined'])),method:'Independent central-difference constraint Jacobian, reduced elimination and nullspace mobility'};
}
function dimensionConflicts(es,cs,system){
 const conflicts=new Set(drivingConflicts(cs,[])),owners=[],blocks=[];let offset=0;
 for(const c of cs.filter(c=>c.driving)){const count=equations(es,[c]).length,indices=Array.from({length:count},(_,i)=>offset+i);for(const index of indices)owners[index]=c.id;blocks.push({c,indices});offset+=count;}
 if(system.matrix.length<=system.rank)return [...conflicts];
 const transpose=Array.from({length:system.variables.length},(_,i)=>system.matrix.map(row=>row[i])),dependencies=rank(transpose,system.matrix.length).nullspace;
 for(const {c,indices}of blocks){if(!dimensions.includes(c.type)||!indices.every(index=>dependencies.some(v=>Math.abs(v[index])>1e-8)))continue;
  if(indices.length>1&&rank(system.matrix.filter((_,i)=>!indices.includes(i)),system.variables.length).rank<system.rank)continue;
  conflicts.add(c.id);for(const dependency of dependencies)if(indices.some(index=>Math.abs(dependency[index])>1e-8))dependency.forEach((n,i)=>{if(Math.abs(n)>1e-8)if(owners[i])conflicts.add(owners[i]);});
 }
 return [...conflicts];
}
async function solveParametric(data,{drag,reuse}={}){if(drag&&data.profile===M5_PROFILE){
 const component=dragComponent(data,drag.ref);
 const result=await solveSoftDrag(component,drag,{solve:next=>solveParametric(next,{reuse}),jacobian,pointAt,derivedId,residuals:exactEquations,check});
 if(!result.valid||component.entities.length===data.entities.length)return result;
 const solved=new Map(result.entities.map(entity=>[entity.id,entity]));
 const checked=await solveParametric({...data,entities:data.entities.map(entity=>solved.get(entity.id)??entity)},{reuse});
 return {...checked,drag:result.drag};
 }check(isParametric(data.profile),'UnsupportedCapability','Upgrade this sketch before solving relations.');const start=performance.now(),original=structuredClone(data.entities),source=structuredClone(original),constraints=data.constraints,lost=constraints.filter(c=>c.refs.some(r=>!validReference(source,r))).map(c=>c.id);if(lost.length){const validConstraints=constraints.filter(c=>!lost.includes(c.id)),known=await solveParametric({...data,constraints:validConstraints},{reuse}),affected=new Set(constraints.filter(c=>lost.includes(c.id)).flatMap(c=>c.refs.map(r=>r.entityId))),satisfied=mobility(source,validConstraints).maxResidualMm<=TOLERANCES.solverResidualMm;return {...known,solver:SOLVER,status:'LostReference',valid:false,remainingDOF:null,lost,entities:source,entityStates:Object.fromEntries(source.map(e=>[e.id,affected.has(e.id)?'LostReference':satisfied?known.entityStates[e.id]:'Inconsistent'])),pointStates:Object.fromEntries(Object.entries(known.pointStates??{}).map(([key,state])=>[key,affected.has(key.slice(0,key.lastIndexOf(':')))?'LostReference':satisfied?state:'Inconsistent'])),elapsedMs:performance.now()-start};}
 // PlaneGCS point/line distance is unsigned. Seed the explicitly chosen side,
 // then solve all permanent equations and verify signed residuals independently.
 for(const c of constraints.filter(c=>c.driving&&c.direction!==undefined&&['distance','line-distance'].includes(c.type)&&!c.refs.some(ref=>splineHandleRoles(ref.role)))){const [r,s]=c.refs,e=source.find(e=>e.id===r.entityId),f=source.find(e=>e.id===s.entityId),p=pointAt(source,r),q=pointAt(source,s);if(c.type==='distance'&&p&&q)continue;const line=c.type==='line-distance'?e:p?f:e,ref=c.type==='line-distance'?null:p?r:s,point=c.type==='line-distance'?f.a:p??q,u=line.b.map((n,i)=>n-line.a[i]),length=Math.hypot(...u),normal=[-u[1]/length,u[0]/length],distance=point.reduce((sum,n,i)=>sum+(n-line.a[i])*normal[i],0),target=c.value*c.direction;if(distance*target>0||Math.abs(distance-target)<1e-9)continue;const delta=normal.map(n=>n*(target-distance));if(c.type==='line-distance'){f.a=f.a.map((n,i)=>n+delta[i]);f.b=f.b.map((n,i)=>n+delta[i]);}else{const entity=source.find(e=>e.id===ref.entityId);if(ref.role==='midpoint'){entity.a=entity.a.map((n,i)=>n+delta[i]);entity.b=entity.b.map((n,i)=>n+delta[i]);}else entity[ref.role]=entity[ref.role].map((n,i)=>n+delta[i]);}}
 const primitives=[],origins=new Map(),refIds=new Map(),compiled=new Map(),owner=new Map();
 const put=(key,p)=>{const id=derivedId('gcs',key);primitives.push({id,...p});return id;};
 for(const e of source){for(const role of ['point','a','b','center','control1','control2'])if(e[role]){const key=e.id+':'+role,p=e[role],id=put(key,{type:'point',x:p[0],y:p[1],fixed:false});refIds.set(key,id);origins.set(id,{entityId:e.id,role});}if(e.type==='line')compiled.set(e.id,put(e.id,{type:'line',p1_id:refIds.get(e.id+':a'),p2_id:refIds.get(e.id+':b')}));if(circular(e)){
   const circle=put(e.id,{type:'circle',c_id:refIds.get(e.id+':center'),radius:e.radius});compiled.set(e.id,circle);
   if(e.type==='arc')for(const role of ['a','b'])put(e.id+':arc-'+role,{type:'point_on_circle',p_id:refIds.get(e.id+':'+role),c_id:circle});
  }}
 const point=ref=>{const key=ref.entityId+':'+ref.role;if(refIds.has(key))return refIds.get(key);const p=pointAt(source,ref),fixed=source.find(e=>e.id===ref.entityId)?.type==='equation-curve',id=put(key,{type:'point',x:p[0],y:p[1],fixed});refIds.set(key,id);if(!fixed)put(key+':binding',{type:'p2p_symmetric_ppp',p1_id:refIds.get(ref.entityId+':a'),p2_id:refIds.get(ref.entityId+':b'),p_id:id});return id;};
 const lineFor=ref=>{
  const roles=splineHandleRoles(ref.role);
  if(!roles)return compiled.get(ref.entityId);
  const key=ref.entityId+':'+ref.role;
  if(!compiled.has(key))compiled.set(key,put(key,{type:'line',p1_id:point({...ref,role:roles[0]}),p2_id:point({...ref,role:roles[1]})}));
  return compiled.get(key);
 };
 const endpoint=(ref,index)=>point({...ref,role:(splineHandleRoles(ref.role)??['a','b'])[index]});
 const add=(c,suffix,p)=>{const id=put(c.id+suffix,p);owner.set(id,c.id);};
 for(const c of constraints.filter(c=>c.driving)){
  const [target,other]=c.refs,e=entityForReference(source,target),f=other&&entityForReference(source,other),line=lineFor(target),second=f&&lineFor(other),p=wholeReference(target)?null:point(target),q=other&&!wholeReference(other)?point(other):null;
  const literal=c.value*(c.direction??1),pair=(suffix,fields)=>add(c,suffix,fields),center=shape=>point({entityId:shape.id,role:'center'}),pl=()=>({p_id:p??q,l_id:p?second:line}),coincident=(p1_id,p2_id,suffix='')=>pair(suffix,{type:'p2p_coincident',p1_id,p2_id});
  if(c.type==='coincident')coincident(p,q);
  else if(c.type==='fixed')for(const [i,k]of ['x','y'].entries())pair(k,{type:'coordinate_'+k,p_id:p,[k]:c.value[i]});
  else if(['horizontal','vertical'].includes(c.type))for(const [i,ref]of c.refs.entries())pair(String(i),{type:c.type+'_l',l_id:lineFor(ref)});
  else if(c.type==='length')pair('',{type:'p2p_distance',p1_id:endpoint(target,0),p2_id:endpoint(target,1),distance:c.value});
  else if(['radius','diameter'].includes(c.type))pair('',{type:'circle_radius',c_id:line,radius:c.value/(c.type==='diameter'?2:1)});
  else if(['x','y'].includes(c.type))pair('',{type:'coordinate_'+c.type,p_id:p,[c.type]:literal});
  else if(c.type==='distance')pair('',p&&q?{type:'p2p_distance',p1_id:p,p2_id:q,distance:c.value}:{type:'p2l_distance',...pl(),distance:c.direction===undefined?c.value:Math.abs(c.value)});
  else if(['distance-x','distance-y','horizontal-points','vertical-points'].includes(c.type)){const axis=['distance-x','vertical-points'].includes(c.type)?'x':'y';pair('',{type:'difference',param1:{o_id:p,prop:axis},param2:{o_id:q,prop:axis},difference:c.type.startsWith('distance')?literal:0});}
  else if(c.type==='spline-tangent'){
   const handle=(shape,from,to)=>put(c.id+':'+shape.id,{type:'line',p1_id:point({entityId:shape.id,role:from}),p2_id:point({entityId:shape.id,role:to})});
   pair('',{type:'parallel',l1_id:handle(e,'control2','b'),l2_id:handle(f,'a','control1')});
  }
  else if(c.type==='symmetry')pair('',{type:'p2p_symmetric_ppl',p1_id:p,p2_id:q,l_id:lineFor(c.refs[2])});
  else if(c.type==='angle')pair('',{type:'l2l_angle_ll',l1_id:line,l2_id:second,angle:literal});
  else if(['parallel','perpendicular','collinear'].includes(c.type)){pair('',{type:c.type==='perpendicular'?'perpendicular_ll':'parallel',l1_id:line,l2_id:second});if(c.type==='collinear')pair('point',{type:'point_on_line_pl',p_id:endpoint(other,0),l_id:line});}
  else if(c.type==='line-distance'){pair('parallel',{type:'parallel',l1_id:line,l2_id:second});pair('distance',{type:'p2l_distance',p_id:endpoint(other,0),l_id:line,distance:c.direction===undefined?c.value:Math.abs(c.value)});}
  else if(c.type==='point-on-circle')pair('',{type:'point_on_circle',p_id:p??q,c_id:p?second:line});
  else if(c.type==='point-on-line')pair('',{type:'point_on_line_pl',...pl()});
  else if(c.type==='midpoint'){const l=p?other:target;pair('',{type:'p2p_symmetric_ppp',p1_id:endpoint(l,0),p2_id:endpoint(l,1),p_id:p??q});}
  else if(c.type==='concentric'||c.type==='coradial'){coincident(center(e),center(f));if(c.type==='coradial')pair('radius',{type:'equal_radius_cc',c1_id:line,c2_id:second});}
  else if(c.type==='equation-tangent'){
   const equation=p?e:f,otherShape=p?f:e,t=equationTangent(equation,p?target:other),anchor=p??q;
   const origin=pointAt(source,p?target:other),end=put(c.id+':tangent-end',{type:'point',x:origin[0]+t[0],y:origin[1]+t[1],fixed:true});
   const tangent=put(c.id+':tangent-line',{type:'line',p1_id:anchor,p2_id:end});
   if(otherShape.type==='line'){
    pair('direction',{type:'parallel',l1_id:tangent,l2_id:p?second:line});
    pair('contact',{type:'point_on_line_pl',p_id:anchor,l_id:p?second:line});
   }else{
    const normalEnd=put(c.id+':normal-end',{type:'point',x:origin[0]-t[1],y:origin[1]+t[0],fixed:true});
    const normal=put(c.id+':normal-line',{type:'line',p1_id:anchor,p2_id:normalEnd});
    pair('direction',{type:'point_on_line_pl',p_id:center(otherShape),l_id:normal});
    pair('contact',{type:'point_on_circle',p_id:anchor,c_id:p?second:line});
   }
  }
  else if(c.type==='tangent'){if(circular(e)&&circular(f))pair('',{type:'tangent_circumf',p1_id:center(e),p2_id:center(f),rd1:{o_id:line,prop:'radius'},rd2:{o_id:second,prop:'radius'},internal:false});else pair('',{type:'tangent_lc',l_id:e.type==='line'?line:second,c_id:circular(e)?line:second});}
  else if(c.type==='equal'||c.type==='equal-curve-length'){if(e.type===f.type||c.type==='equal'&&circular(e)&&circular(f))pair('',e.type==='line'?{type:'equal_length',l1_id:line,l2_id:second}:{type:'equal_radius_cc',c1_id:line,c2_id:second});else {const l=e.type==='line'?e:f,circle=e.type==='circle'?e:f,origin=put(c.id+'aux-origin',{type:'point',x:0,y:0,fixed:true}),b=put(c.id+'aux-b',{type:'point',x:circle.radius,y:0,fixed:false}),d=put(c.id+'aux-c',{type:'point',x:circle.radius,y:circle.radius*2*Math.PI,fixed:false}),base=put(c.id+'aux-base',{type:'line',p1_id:origin,p2_id:b}),height=put(c.id+'aux-height',{type:'line',p1_id:b,p2_id:d}),diagonal=put(c.id+'aux-diagonal',{type:'line',p1_id:origin,p2_id:d});pair('horizontal',{type:'horizontal_l',l_id:base});pair('vertical',{type:'vertical_l',l_id:height});pair('radius',{type:'p2p_distance',p1_id:origin,p2_id:b,distance:{o_id:compiled.get(circle.id),prop:'radius'}});pair('angle',{type:'l2l_angle_ll',l1_id:base,l2_id:diagonal,angle:Math.atan(2*Math.PI)});pair('length',{type:'equal_length',l1_id:height,l2_id:e.type==='line'?line:second});}}
  else check(false,'UnsupportedCapability','Unsupported solver relation.');
 }
 if(drag){check(drag&&drag.ref&&Array.isArray(drag.target)&&drag.target.length===2&&drag.target.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000),'InvalidInput','Invalid bounded drag target.');const e=source.find(e=>e.id===drag.ref.entityId);check(e,'LostReference','Drag participant is missing.');let targets;if(drag.ref.role==='entity'&&e.type==='line'){const mid=e.a.map((n,i)=>(n+e.b[i])/2),delta=drag.target.map((n,i)=>n-mid[i]);targets=['a','b'].map(role=>({ref:{entityId:e.id,role},target:e[role].map((n,i)=>n+delta[i])}));}else{const ref=drag.ref.role==='entity'&&e.type==='circle'?{entityId:e.id,role:'center'}:drag.ref;check(pointAt(source,ref),'LostReference','Choose a draggable point or line.');targets=[{ref,target:drag.target}];if(e.type==='line'&&['a','b'].includes(ref.role)){const opposite=ref.role==='a'?'b':'a';primitives.find(p=>p.id===point({entityId:e.id,role:opposite})).fixed=true;}}for(const [i,t]of targets.entries())for(const [j,k]of ['x','y'].entries())put('drag:'+i+k,{type:'coordinate_'+k,p_id:point(t.ref),[k]:t.target[j],temporary:true});}
 if(!primitives.length)return {solver:SOLVER,status:'UnderDefined',valid:true,remainingDOF:0,entities:source,entityStates:Object.fromEntries(source.map(e=>[e.id,'FullyDefined'])),conflicts:[],redundant:[],lost:[],references:[],elapsedMs:performance.now()-start};
 const g=reuse??await make_gcs_wrapper();try{g.set_max_iterations(100);g.set_convergence_threshold(1e-10);g.push_primitives_and_params(primitives);let numericStatus=g.solve();const translate=xs=>[...new Set(xs.map(id=>owner.get(id)).filter(Boolean))],initialConflicts=translate(g.get_gcs_conflicting_constraints());let conflicts=initialConflicts,redundant=translate(g.get_gcs_redundant_constraints()),reportedDOF=g.gcs.dof();let numericOK=[SolveStatus.Success,SolveStatus.Converged].includes(numericStatus)&&!conflicts.length;const es=structuredClone(source);if(numericOK){g.apply_solution();if(drag){const permanent=structuredClone(g.sketch_index.get_primitives()).filter(p=>!p.temporary).map(p=>p.type==='point'&&origins.has(p.id)?{...p,fixed:false}:p);g.clear_data();g.push_primitives_and_params(permanent);numericStatus=g.solve();conflicts=translate(g.get_gcs_conflicting_constraints());redundant=translate(g.get_gcs_redundant_constraints());reportedDOF=g.gcs.dof();numericOK=[SolveStatus.Success,SolveStatus.Converged].includes(numericStatus)&&!conflicts.length;if(numericOK)g.apply_solution();}const solved=new Map(g.sketch_index.get_primitives().map(p=>[p.id,p]));for(const [id,ref]of origins){const p=solved.get(id);es.find(e=>e.id===ref.entityId)[ref.role]=[p.x,p.y];}for(const e of es)if(circular(e))e.radius=solved.get(compiled.get(e.id)).radius;}
 if(numericOK){
  for(const e of es)validateEntity(e);
  const missed=constraints.filter(c=>c.driving&&c.type==='tangent'&&!arcTangencyValid(...c.refs.map(ref=>entityForReference(es,ref))));
  if(missed.length){numericOK=false;conflicts=[...new Set([...conflicts,...missed.map(c=>c.id)])];}
 }const system=jacobian(es,constraints),evidence=mobility(es,constraints,system),valid=numericOK&&evidence.maxResidualMm<=TOLERANCES.solverResidualMm;let status=!valid?'Inconsistent':reportedDOF!==evidence.dof?'SingularOrIndeterminate':redundant.length||evidence.rows>evidence.rank?'RedundantConsistent':evidence.dof?'UnderDefined':'FullyDefined';if(status==='SingularOrIndeterminate')return {solver:SOLVER,status,valid:false,numericStatus,reportedDOF,remainingDOF:null,evidence,entities:original,entityStates:Object.fromEntries(source.map(e=>[e.id,status])),conflicts,redundant,lost:[],references:[],elapsedMs:performance.now()-start};const ambiguousDrivers=data.profile===M5_PROFILE&&status==='RedundantConsistent'?dimensionConflicts(es,constraints,system):[];conflicts=[...new Set([...conflicts,...ambiguousDrivers])];const involved=new Set(constraints.filter(c=>conflicts.includes(c.id)).flatMap(c=>c.refs.map(r=>r.entityId)));return {solver:SOLVER,status,overdefined:ambiguousDrivers.length>0,valid:accepted(status)&&!ambiguousDrivers.length,numericStatus,reportedDOF,remainingDOF:evidence.dof,evidence,entities:valid?es:original,pointStates:valid&&!ambiguousDrivers.length?evidence.pointStates:{},entityStates:valid&&!ambiguousDrivers.length?evidence.entities:Object.fromEntries(source.map(e=>[e.id,involved.size&&!involved.has(e.id)?'UnderDefined':'Inconsistent'])),conflicts,redundant,lost:[],references:constraints.filter(c=>!c.driving).map(c=>({id:c.id,value:measured(valid?es:source,c),unit:c.type==='angle'?'rad':'mm'})),elapsedMs:performance.now()-start};}finally{if(reuse)g.clear_data();else g.destroy_gcs_module();}
}

return {solveParametric,mobility};
}
