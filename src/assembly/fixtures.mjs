import {PROFILE} from './profile.mjs';
import {exp} from './math.mjs';
export const FIXTURES=['coaxial','three-body','free','point','planes','distance','angle','parallel','perpendicular','locked','redundant','conflict-distance','conflict-angle','singular-distance','singular-angle','missing','ambiguous','tangent','width'];
const ref=(bodyId,datumId='origin')=>({bodyId,datumId});
function body(id,grounded,position){return {id,definitionId:id+'-definition',grounded,pose:{position,quaternion:[0,0,0,1]},datums:[
  {id:'origin',kind:'point',origin:[0,0,0],state:'ResolvedStable'},
  {id:'axis',kind:'axis',origin:[0,0,0],direction:[0,0,1],state:'ResolvedStable'},
  {id:'plane',kind:'plane',origin:[0,0,0],direction:[0,0,1],state:'ResolvedStable'},
  {id:'frame',kind:'frame',origin:[0,0,0],state:'ResolvedStable'}]};}
export function assemblyFixture(name='coaxial'){
  const data={profile:PROFILE,unit:'mm',bodies:[body('shaft',true,[0,0,0]),body('collar',false,[6,4,15])],mates:[]};
  const mate=(id,type,a,b,value)=>({id,type,a,b,...(value===undefined?{}:{value})});
  const axis=mate('coaxial','concentric',ref('shaft','axis'),ref('collar','axis'));
  const distance=value=>mate('distance','distance',ref('shaft'),ref('collar'),value);
  const angle=value=>mate('angle','angle',ref('shaft','axis'),ref('collar','axis'),value);
  if(['coaxial','three-body','redundant','conflict-distance','singular-distance'].includes(name))data.mates.push(axis);
  if(name==='three-body'){data.bodies.push(body('cap',false,[-3,5,28]));data.mates.push(mate('cap-coaxial','concentric',ref('shaft','axis'),ref('cap','axis')),mate('collar-cap-spacing','distance',ref('collar'),ref('cap'),12));}
  if(name==='point')data.mates.push(mate('point','coincident',ref('shaft'),ref('collar')));
  if(name==='planes')data.mates.push(mate('planes','coincident',ref('shaft','plane'),ref('collar','plane')));
  if(name==='distance')data.mates.push(distance(20));
  if(name==='angle'||name==='conflict-angle'){data.bodies[1].pose.quaternion=exp([.4,0,0]);data.mates.push(angle(Math.PI/3));}
  if(name==='parallel'||name==='perpendicular'){data.bodies[1].pose.quaternion=exp([.4,.2,.1]);data.mates.push(mate(name,name,ref('shaft','axis'),ref('collar','axis')));}
  if(name==='locked')data.mates.push(mate('lock','fixed',ref('shaft','frame'),ref('collar','frame')));
  if(name==='redundant')data.mates.push({...axis,id:'duplicate-axis'});
  if(name==='conflict-distance')data.mates.push(distance(10),{...distance(20),id:'distance-conflict'});
  if(name==='conflict-angle')data.mates.push({...angle(Math.PI/2),id:'angle-conflict'});
  if(name==='singular-distance'){data.bodies[1].pose.position=[0,0,0];data.mates.push(distance(0));}
  if(name==='singular-angle'){data.bodies[1].pose.position=[0,0,15];data.mates.push(angle(0));}
  if(['missing','ambiguous'].includes(name)){data.mates.push(axis);if(name==='missing')axis.b.datumId='deleted-axis';else data.bodies[1].datums[1].state='AmbiguousReference';}
  if(name==='tangent'||name==='width')data.mates.push(mate(name,name,ref('shaft','plane'),ref('collar','plane')));
  if(!FIXTURES.includes(name))throw Object.assign(Error('Unknown assembly fixture.'),{code:'UnsupportedCapability'});return data;
}
