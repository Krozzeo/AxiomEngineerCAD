import {sameSupportFrame} from '../extrusion/planar.mjs';
import {regenerateExtrusions} from '../extrusion/kernel.mjs';
import {geometryExperiment} from '../lab/kernel.mjs';
import {planeFrame} from './profile.mjs';
import {check} from '../errors.mjs';
import {TOLERANCES} from '../lab/profile.mjs';
export async function verifySketchSupport(feature,graph){const producer=graph.features.find(f=>f.id===feature.data.plane.producerId),role=feature.data.plane.role;
 if(producer?.type==='sketch-extrusion'){const result=await regenerateExtrusions({graph},{featureId:producer.id}),faces=result.faces.filter(f=>f.role===role&&['ResolvedStable','ResolvedReidentified'].includes(f.resolution));check(faces.length===1,faces.length?'AmbiguousReference':'LostReference','Sketch support is no longer uniquely proven. Reselect its exact planar face.');if(feature.data.plane.frame)check(sameSupportFrame(feature.data.plane.frame,faces[0].planeFrame),'LostReference','The stored sketch frame differs from the exact face. Repair its support.');return {state:faces[0].resolution,candidates:1,role,normal:faces[0].planeNormal,reason:'Unique exact cap of the named sketch extrusion.'};}
 if(['top','bottom'].includes(role))return (await geometryExperiment({...producer.data.spec,selectorRole:role,selectorKind:'face'},{includeMesh:false})).reference;
 const frame=planeFrame(feature,graph),spec=producer.data.spec;
 check(['extrude','cut'].includes(spec.scenario)&&['left','right','front','back'].includes(role),'UnsupportedCapability','Choose a proven planar role of the primary extrusion.');
 const result=await geometryExperiment(spec,{includeMesh:false,inspectShape:shape=>{const faces=shape.faces.filter(face=>{if(face.geomType!=='PLANE')return false;const normal=face.normalAt().toTuple(),center=face.center.toTuple();return normal.every((n,i)=>Math.abs(n-frame.normal[i])<1e-10)&&Math.abs(center.reduce((sum,n,i)=>sum+(n-frame.origin[i])*frame.normal[i],0))<=TOLERANCES.lengthMm;});check(faces.length===1,faces.length?'AmbiguousReference':'LostReference','The named extrusion boundary plane must resolve to one actual B-Rep face.');return {state:'ResolvedStable',candidates:1,role,normal:faces[0].normalAt().toTuple(),reason:'Unique named planar boundary of the bounded extrusion/cut producer; no transient face index.'};}});return result.analysis;
}
