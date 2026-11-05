import {buildProof} from '../proof/kernel.mjs';
import {externalGeometry} from './external-geometry.mjs';
import {planeFrame} from './profile.mjs';
import {check} from '../document.mjs';

// Rebuild source geometry without trusting the imported display or its proposed coordinates.
export async function verifyExternalReferences(f,c,value){
const referenceDocument=structuredClone({...value,native:{...value.native,graph:c.graph}});
for(const key of ['experiment','assembly']){if(c[key])referenceDocument[key]=structuredClone(c[key]);
else delete referenceDocument[key];
}const sourceSketch=referenceDocument.native.graph.features.find(x=>x.id===f.id);
sourceSketch.data.entities=[];
sourceSketch.data.constraints=[];
sourceSketch.dependsOn=sourceSketch.data.plane.kind==='face'?[sourceSketch.data.plane.producerId]:[];
for(const p of referenceDocument.native.graph.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.sketchId!==f.id);
const proof=await buildProof(referenceDocument,{viewportOnly:true,rollbackAt:f.id}),frame=planeFrame(f,c.graph);
for(const e of f.data.entities.filter(e=>e.external)){const expected=externalGeometry(proof.scene,e.external,frame);
check(e.type===expected.type&&(e.construction||e.converted),'LostReference','External reference type changed.');
for(const key of ['point','a','b','center','radius'])if(expected[key]!==undefined){const a=Array.isArray(expected[key])?expected[key]:[expected[key]],b=Array.isArray(e[key])?e[key]:[e[key]];
check(a.every((x,i)=>Math.abs(x-b[i])<1e-6),'LostReference','External geometry changed; remove and reselect its reference before rebuilding.');
}const roles=e.type==='line'?['a','b']:e.type==='circle'?['center']:['point'];
check(roles.every(role=>f.data.constraints.some(k=>k.type==='fixed'&&k.driving&&k.refs[0].entityId===e.id&&k.refs[0].role===role&&k.value.every((x,i)=>Math.abs(x-e[role][i])<1e-6)))&&(e.type!=='circle'||f.data.constraints.some(k=>k.type==='radius'&&k.driving&&k.refs[0].entityId===e.id&&Math.abs(k.value-e.radius)<1e-6)),'LostReference','External geometry must retain its source-controlled dimensions.');
}
}
