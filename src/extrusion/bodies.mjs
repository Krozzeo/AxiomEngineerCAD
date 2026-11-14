import * as cad from 'replicad';
import {createHash} from 'node:crypto';

export function exactBodies(shape){
 return shape.solids.map(solid=>{
  const physical=cad.measureShapeVolumeProperties(solid);
  let center;try{center=physical.centerOfMass;}finally{physical.delete();}
  const volume=cad.measureVolume(solid),area=cad.measureArea(solid),witness=[volume,area,...center,...solid.boundingBox.bounds.flat()].map(n=>Math.round(n*1e8)/1e8);
  const role='body:'+createHash('sha256').update(JSON.stringify(witness)).digest('hex');
  return {solid,role,volumeMm3:volume,areaMm2:area};
 });
}
