import {geometryExperiment} from './kernel.mjs';
import {solveSketch,sketchFixture} from './sketch.mjs';
import {KERNEL,SOLVER,TOLERANCES} from './profile.mjs';
export async function runSuite() {
  const cases=[],started=performance.now();
  async function run(id,task,verify,expected) {
    const start=performance.now();
    try {const value=await task();const passed=verify(value);cases.push({id,passed,expected,actual:value,elapsedMs:performance.now()-start});}
    catch(error){cases.push({id,passed:false,expected,error:{code:error.code??'OperationFailed',message:error.message},elapsedMs:performance.now()-start});}
  }
  const geometric=async spec=>{
    const r=await geometryExperiment(spec,{includeMesh:false,includeStep:spec.scenario==='extrude'});
    return {volumeMm3:r.volumeMm3,areaMm2:r.areaMm2,validity:r.validity,reference:r.reference,step:r.step?{bytes:r.step.bytes,volume:r.step.importedVolumeMm3}:null};
  };
  const positive=[
    ['GEO-EXTRUDE',{scenario:'extrude'},12000,'ResolvedStable'],
    ['GEO-CUT',{scenario:'cut',count:2},12000-180*Math.PI,'ResolvedReidentified'],
    ['GEO-REVOLVE',{scenario:'revolve'},90*Math.PI,'LostReference'],
    ['GEO-FUSE',{scenario:'fuse'},18000,'AmbiguousReference'],
    ['GEO-COMMON',{scenario:'common'},6000,'ResolvedReidentified'],
    ['TOPO-SPLIT',{scenario:'split'},10800,'AmbiguousReference'],
    ['TOPO-MERGE',{scenario:'merge'},12000,'LostReference'],
    ['TOPO-SUPPRESS',{scenario:'suppress'},12000,'ResolvedStable'],
    ['TOPO-REORDER',{scenario:'reorder'},12000-180*Math.PI,'ResolvedReidentified'],
    ['TOPO-DELETE',{scenario:'delete'},0,'LostReference'],
    ['TOPO-IMPORT',{scenario:'import'},12000-180*Math.PI,'LostReference'],
    ['TOPO-KERNEL-REFUSAL',{scenario:'kernel-change'},12000-180*Math.PI,'LostReference'],
    ['TOPO-PATTERN-COUNT',{scenario:'cut',count:4,radius:2},12000-160*Math.PI,'ResolvedReidentified'],
    ['TOPO-BASE-DIMENSION',{scenario:'cut',width:60},18000-180*Math.PI,'ResolvedReidentified'],
    ['TOPO-EDGE',{scenario:'extrude',selectorKind:'edge'},12000,'ResolvedStable'],
    ['UNITS-INCH',{scenario:'extrude',width:1,height:1,depth:1,radius:0.1,unit:'inch'},25.4**3,'ResolvedStable'],
    ['UNITS-CM',{scenario:'extrude',width:4,height:3,depth:1,radius:0.3,unit:'cm'},12000,'ResolvedStable'],
    ['GEO-SMALL-SCALE',{scenario:'extrude',width:0.1,height:0.1,depth:0.1,radius:0.01},0.001,'ResolvedStable']
  ];
  for(const [id,spec,volume,state]of positive)await run(id,()=>geometric(spec),r=>Math.abs(r.volumeMm3-volume)<=Math.max(1e-6,volume*1e-8)&&r.reference.state===state&&r.validity.brepValid,{volumeMm3:volume,reference:state});
  for(const scenario of ['invalid-profile','open-shell','nonmanifold'])await run('GEO-REJECT-'+scenario,async()=>{
    try{await geometric({scenario});return {rejected:false};}catch(error){return {rejected:error.code==='InvalidGeometry',code:error.code,message:error.message};}
  },r=>r.rejected,{code:'InvalidGeometry'});
  const expectedSketch={rectangle:['FullyDefined',0],'free-circle':['UnderDefined',2],redundant:['RedundantConsistent',0],conflict:['Inconsistent',0],singular:['SingularOrIndeterminate',null]};
  for(const [name,[status,dof]]of Object.entries(expectedSketch))await run('SOLVER2D-'+name,async()=>{
    const r=await solveSketch(sketchFixture(name));return {status:r.status,dof:r.remainingDOF,reportedDOF:r.reportedDOF,residual:r.evidence.maxResidualMm,rank:r.evidence.rank,conflicts:r.conflicts,redundant:r.redundant};
  },r=>r.status===status&&r.dof===dof,{status,dof});
  await run('SOLVER2D-DRAG',async()=>{
    const r=await solveSketch(sketchFixture('free-circle'),{drag:{pointId:'center',x:20,y:15}});
    return {accepted:r.drag.accepted,dof:r.remainingDOF,center:r.primitives.find(p=>p.id==='center'),radius:r.primitives.find(p=>p.id==='circle').radius,residual:r.evidence.maxResidualMm};
  },r=>r.accepted&&r.dof===2&&r.center.x===20&&r.center.y===15&&r.radius===4,{center:[20,15],radius:4,dof:2});
  await run('SOLVER2D-FIXED-DRAG',async()=>{
    const r=await solveSketch([{id:'fixed',type:'point',x:0,y:0,fixed:true}],{drag:{pointId:'fixed',x:10,y:10}});
    return {accepted:r.drag.accepted,point:r.primitives[0]};
  },r=>!r.accepted&&r.point.x===0&&r.point.y===0,{accepted:false,unchanged:true});
  await run('SOLVER2D-REFERENCE',async()=>{
    const items=sketchFixture('free-circle');items[2]={...items[2],radius:99,driving:false};
    const r=await solveSketch(items);return {status:r.status,dof:r.remainingDOF,radius:r.primitives.find(p=>p.id==='circle').radius,measured:r.primitives.find(p=>p.id==='radius').radius};
  },r=>r.status==='UnderDefined'&&r.dof===3&&r.radius===4&&r.measured===4,{dof:3,radius:4,measured:4});
  return {schema:'E0.M2-evidence-v0',kernel:KERNEL,solver:SOLVER,profile:TOLERANCES,
    cases,passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,total:cases.length,elapsedMs:performance.now()-started,
    limits:['No final CAD schema','No general topology naming guarantee','No second-kernel numerical migration execution','No 3D assembly solver','No WebGPU or drawing acceptance']};
}
