import {make_gcs_wrapper, SolveStatus} from '@salusoft89/planegcs';
import {check} from '../document.mjs';
import {assertFiniteTree, SOLVER, TOLERANCES} from './profile.mjs';
const kinds = {point:[],line:['p1_id','p2_id'],circle:['c_id'],coordinate_x:['p_id'],coordinate_y:['p_id'],
  horizontal_l:['l_id'],vertical_l:['l_id'],p2p_distance:['p1_id','p2_id'],p2p_coincident:['p1_id','p2_id'],circle_radius:['c_id']};
const geometry = p => ['point','line','circle'].includes(p.type);
export function validateSketch(items) {
  check(Array.isArray(items)&&items.length>0&&items.length<=64,'ResourceLimit','Use 1–64 sketch primitives in this probe.');
  assertFiniteTree(items);
  const ids = new Map(items.map(p=>[p.id,p]));
  check(ids.size===items.length&&items.every(p=>typeof p.id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(p.id)&&Object.hasOwn(kinds,p.type)), 'InvalidInput','Use unique IDs and supported sketch primitives.');
  for (const p of items) {
    for (const key of kinds[p.type]) {
      const target = ids.get(p[key]), expected = key==='l_id'?'line':p.type==='circle_radius'?'circle':'point';
      check(target?.type===expected,'LostReference','Missing or incompatible sketch reference: '+p.id+'.'+key);
    }
    if (p.type==='point') check(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1000&&Math.abs(p.y)<=1000&&typeof p.fixed==='boolean','InvalidInput','Invalid bounded sketch point.');
    for (const key of ['x','y','distance','radius']) if (Object.hasOwn(p,key)) check(typeof p[key]==='number'&&Math.abs(p[key])<=1000,'InvalidInput','This probe uses finite literal dimensions only.');
    if(p.driving===false)check(['coordinate_x','coordinate_y','p2p_distance','circle_radius'].includes(p.type),'UnsupportedCapability','Only measured dimensions can be reference-only in this probe.');
    if (p.type==='circle'||p.type==='circle_radius') check(p.radius>0.01,'InvalidGeometry','Circle radius is degenerate.');
    if (p.type==='p2p_distance') check(p.distance>=0,'InvalidGeometry','Distance cannot be negative.');
    if (p.type==='line') {
      const a=ids.get(p.p1_id),b=ids.get(p.p2_id);check(Math.hypot(a.x-b.x,a.y-b.y)>1e-9,'InvalidGeometry','Collapsed sketch line.');
    }
  }
  return items;
}
function residuals(items) {
  const ids=new Map(items.map(p=>[p.id,p])), rows=[];
  for (const c of items.filter(p=>!geometry(p)&&p.driving!==false)) {
    const a=ids.get(c.p_id??c.p1_id),b=ids.get(c.p2_id),l=ids.get(c.l_id),circle=ids.get(c.c_id);
    if(c.type==='coordinate_x')rows.push({id:c.id,value:a.x-c.x});
    if(c.type==='coordinate_y')rows.push({id:c.id,value:a.y-c.y});
    if(c.type==='p2p_distance')rows.push({id:c.id,value:Math.hypot(a.x-b.x,a.y-b.y)-c.distance});
    if(c.type==='p2p_coincident')rows.push({id:c.id,value:a.x-b.x},{id:c.id,value:a.y-b.y});
    if(c.type==='circle_radius')rows.push({id:c.id,value:circle.radius-c.radius});
    if(c.type==='horizontal_l'||c.type==='vertical_l') {
      const p=ids.get(l.p1_id),q=ids.get(l.p2_id);rows.push({id:c.id,value:c.type==='horizontal_l'?p.y-q.y:p.x-q.x});
    }
  }
  return rows;
}
export function rankEvidence(items) {
  const variables=items.flatMap((p,index)=>p.type==='point'&&!p.fixed?[{index,key:'x'},{index,key:'y'}]:p.type==='circle'?[{index,key:'radius'}]:[]);
  const initial=residuals(items),jacobian=initial.map(()=>[]);
  variables.forEach(({index,key},column)=>{
    const changed=structuredClone(items), step=1e-6*Math.max(1,Math.abs(changed[index][key]));changed[index][key]+=step;
    residuals(changed).forEach((row,i)=>{jacobian[i][column]=(row.value-initial[i].value)/step;});
  });
  let rank=0; const matrix=jacobian.map(row=>[...row]);
  const magnitude=Math.max(1,...matrix.flat().map(Math.abs)),threshold=magnitude*TOLERANCES.rankRelative;
  for(let col=0;col<variables.length&&rank<matrix.length;col++){
    let pivot=rank;for(let i=rank+1;i<matrix.length;i++)if(Math.abs(matrix[i][col])>Math.abs(matrix[pivot][col]))pivot=i;
    if(Math.abs(matrix[pivot][col])<=threshold)continue;
    [matrix[pivot],matrix[rank]]=[matrix[rank],matrix[pivot]];
    const divisor=matrix[rank][col];for(let j=col;j<variables.length;j++)matrix[rank][j]/=divisor;
    for(let i=rank+1;i<matrix.length;i++){const factor=matrix[i][col];for(let j=col;j<variables.length;j++)matrix[i][j]-=factor*matrix[rank][j];}
    rank++;
  }
  const ids=new Map(items.map(p=>[p.id,p]));
  const singular=items.some(c=>c.type==='p2p_distance'&&c.driving!==false&&Math.hypot(ids.get(c.p1_id).x-ids.get(c.p2_id).x,ids.get(c.p1_id).y-ids.get(c.p2_id).y)<1e-8);
  return {variables:variables.length,rows:initial.length,rank,dof:variables.length-rank,singular,residuals:initial,
    maxResidualMm:Math.max(0,...initial.map(r=>Math.abs(r.value))),method:'Independent finite-difference Jacobian and pivoted elimination; regular local configurations only'};
}
export async function solveSketch(primitives, {drag}={}) {
  const source=structuredClone(validateSketch(primitives));
  let items=structuredClone(source),start=performance.now();
  if(drag){
    check(typeof drag.pointId==='string'&&Number.isFinite(drag.x)&&Number.isFinite(drag.y)&&Math.abs(drag.x)<=1000&&Math.abs(drag.y)<=1000,'InvalidInput','Invalid drag target.');
    check(items.find(p=>p.id===drag.pointId)?.type==='point','LostReference','Drag point is absent.');
    items.push({id:'drag_x',type:'coordinate_x',p_id:drag.pointId,x:drag.x,temporary:true},{id:'drag_y',type:'coordinate_y',p_id:drag.pointId,y:drag.y,temporary:true});
  }
  const g=await make_gcs_wrapper();
  try {
    // A reference dimension is measured after solve, never an auxiliary unconstrained solver variable.
    const references=items.filter(p=>p.driving===false);
    g.set_max_iterations(100);g.set_convergence_threshold(1e-10);g.push_primitives_and_params(items.filter(p=>p.driving!==false));
    const numericStatus=g.solve(),conflicts=g.get_gcs_conflicting_constraints(),redundant=g.get_gcs_redundant_constraints();
    const reportedDOF=g.gcs.dof();
    if([SolveStatus.Success,SolveStatus.Converged].includes(numericStatus)&&!conflicts.length)g.apply_solution();
    let solved=structuredClone(g.sketch_index.get_primitives());
    const solvedIds=new Map(solved.map(p=>[p.id,p]));
    for(const original of references){const c={...original};
      if(c.type==='coordinate_x')c.x=solvedIds.get(c.p_id).x;
      if(c.type==='coordinate_y')c.y=solvedIds.get(c.p_id).y;
      if(c.type==='circle_radius')c.radius=solvedIds.get(c.c_id).radius;
      if(c.type==='p2p_distance'){const a=solvedIds.get(c.p1_id),b=solvedIds.get(c.p2_id);c.distance=Math.hypot(a.x-b.x,a.y-b.y);}
      solved.push(c);
    }
    const evidence=rankEvidence(solved),inputEvidence=rankEvidence(source);
    let status;
    if(conflicts.length||![SolveStatus.Success,SolveStatus.Converged].includes(numericStatus)||evidence.maxResidualMm>TOLERANCES.solverResidualMm)status='Inconsistent';
    else if(evidence.singular||inputEvidence.singular||(!drag&&reportedDOF!==evidence.dof))status='SingularOrIndeterminate';
    else if(redundant.length||evidence.rows>evidence.rank)status='RedundantConsistent';
    else status=evidence.dof===0?'FullyDefined':'UnderDefined';
    const valid=['FullyDefined','UnderDefined','RedundantConsistent'].includes(status);
    if(drag&&valid){
      solved=solved.filter(p=>!p.id.startsWith('drag_'));
      const permanent=rankEvidence(solved);
      check(permanent.maxResidualMm<=TOLERANCES.solverResidualMm,'ConstraintConflict','Drag violated permanent constraints.');
      return {solver:SOLVER,status:permanent.dof===0?'FullyDefined':'UnderDefined',numericStatus,remainingDOF:permanent.dof,reportedDOF,evidence:permanent,
        conflicts,redundant,primitives:solved,drag:{accepted:true,target:drag},elapsedMs:performance.now()-start};
    }
    return {solver:SOLVER,status,numericStatus,remainingDOF:status==='SingularOrIndeterminate'?null:evidence.dof,reportedDOF,evidence,
      conflicts,redundant,primitives:valid?solved:source,...(drag?{drag:{accepted:false,target:drag}}:{}),elapsedMs:performance.now()-start};
  } finally { g.destroy_gcs_module(); }
}
export function sketchFixture(name='rectangle') {
  const point=(id,x,y,fixed=false)=>({id,type:'point',x,y,fixed}),coordinate=(id,p_id,type,value)=>({id,type,p_id,[type==='coordinate_x'?'x':'y']:value});
  if(name==='free-circle'||name==='drag-circle')return [point('center',5,8),{id:'circle',type:'circle',c_id:'center',radius:4},{id:'radius',type:'circle_radius',c_id:'circle',radius:4}];
  if(name==='singular')return [point('origin',0,0,true),point('moving',0,0),{id:'zero_distance',type:'p2p_distance',p1_id:'origin',p2_id:'moving',distance:0}];
  if(name==='redundant'||name==='conflict')return [point('p',2,3),coordinate('x','p','coordinate_x',10),coordinate('y','p','coordinate_y',20),coordinate('x_again','p','coordinate_x',name==='conflict'?11:10)];
  check(name==='rectangle','UnsupportedCapability','Unknown sketch fixture.');
  return [point('a',0,0,true),point('b',30,2),point('c',32,18),point('d',-1,21),
    {id:'ab',type:'line',p1_id:'a',p2_id:'b'},{id:'bc',type:'line',p1_id:'b',p2_id:'c'},
    {id:'cd',type:'line',p1_id:'c',p2_id:'d'},{id:'da',type:'line',p1_id:'d',p2_id:'a'},
    {id:'bottom_h',type:'horizontal_l',l_id:'ab'},{id:'right_v',type:'vertical_l',l_id:'bc'},
    {id:'top_h',type:'horizontal_l',l_id:'cd'},{id:'left_v',type:'vertical_l',l_id:'da'},
    {id:'width',type:'p2p_distance',p1_id:'a',p2_id:'b',distance:40},
    {id:'height',type:'p2p_distance',p1_id:'b',p2_id:'c',distance:30}];
}
