import test from 'node:test';import assert from 'node:assert/strict';
import {cameraBasis,normalTarget,cameraMatrix,perspectiveMatrix,project,screenRay} from '../app/cad-camera.mjs';
import {planeFrame} from '../src/sketch/profile.mjs';
test('every principal support normal/right orientation aligns screen axes and both projection/ray paths agree',()=>{
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
 for(const role of ['xy','xz','yz'])for(const reverseNormal of [false,true])for(let rightQuarterTurns=0;rightQuarterTurns<4;rightQuarterTurns++){
  const frame=planeFrame({data:{plane:{kind:'datum',role,orientation:{reverseNormal,rightQuarterTurns}}}},{}),camera={...normalTarget({yaw:.7,pitch:.4,roll:.3},frame.normal,{toggle:false,right:frame.u}),center:frame.origin,pan:[0,0],span:100},basis=cameraBasis(camera);
  near(dot(basis.right,frame.u),1);near(dot(basis.up,frame.v),1);near(dot(basis.toward,frame.normal),1);
  const reversed=cameraBasis(normalTarget(camera,frame.normal));near(dot(reversed.up,basis.up),1);near(dot(reversed.toward,basis.toward),-1);
  for(const projection of ['orthographic','perspective']){const world=frame.origin.map((x,i)=>x+frame.u[i]*10+frame.v[i]*5),matrix=(projection==='perspective'?perspectiveMatrix:cameraMatrix)({...camera,aspect:2}),p=project(world,matrix,1000,500);assert.ok(p[0]>500&&p[1]<250);const ray=screenRay(camera,p[0]/1000,p[1]/500,2,projection),t=dot(frame.origin.map((x,i)=>x-ray.origin[i]),frame.normal)/dot(ray.direction,frame.normal),hit=ray.origin.map((x,i)=>x+ray.direction[i]*t);hit.forEach((x,i)=>near(x,world[i]));}
 }
});
