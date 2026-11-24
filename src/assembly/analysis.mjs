import * as cad from 'replicad';
import {initializeKernel,geometryExperiment} from '../lab/kernel.mjs';
import {regenerateExtrusions} from '../extrusion/kernel.mjs';
import {hasExtrusions} from '../extrusion/profile.mjs';
import {componentTree} from '../components/hierarchy.mjs';
import {definitionContent} from '../components/context.mjs';
import {documentFromSnapshot} from '../components/snapshot.mjs';
import {check,validate} from '../document.mjs';
import {hash} from '../native/schema.mjs';

const zero=()=>Array.from({length:3},()=>[0,0,0]);
export function analyzeSolids(items,{clearanceMm=0}={}){
  check(Number.isFinite(clearanceMm)&&clearanceMm>=0&&clearanceMm<=1e6,'InvalidInput','Use a nonnegative clearance in mm.');
  check(items.length>0&&items.length<=32,'ResourceLimit','Assembly analysis supports1–32 solid occurrences.');
  const components=items.map(({shape,path,name,material})=>{
    const p=cad.measureShapeVolumeProperties(shape);try{
      const volumeMm3=p.volume,centroidMm=p.centerOfMass;
      const moment=direction=>{const axis=cad.makeAx1(centroidMm,direction);try{return p.wrapped.MomentOfInertia(axis);}finally{axis.delete();}};
      const geometricInertia=zero();for(let i=0;i<3;i++)geometricInertia[i][i]=moment([0,1,2].map(j=>i===j?1:0));
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const value=moment([0,1,2].map(k=>k===i||k===j?1:0))-(geometricInertia[i][i]+geometricInertia[j][j])/2;geometricInertia[i][j]=value;geometricInertia[j][i]=value;}
      check(volumeMm3>0&&Number.isFinite(volumeMm3),'InvalidGeometry','Physical properties require a positive closed solid.');
      return {path,name,volumeMm3,areaMm2:cad.measureArea(shape),centroidMm,material:material??null,massKg:material?volumeMm3*material.densityKgM3*1e-9:null,inertiaKgM2:material?geometricInertia.map(row=>row.map(v=>v*material.densityKgM3*1e-15)):null};
    }finally{p.delete();}
  });
  const pairs=[];for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){
    const left=items[a].shape,right=items[b].shape,common=left.intersect(right);let overlapMm3;
    try{overlapMm3=common.isNull||!common.solids.length?0:Math.max(0,cad.measureVolume(common));}finally{common.delete();}
    const toleranceMm3=Math.max(1e-6,Math.min(components[a].volumeMm3,components[b].volumeMm3)*1e-8),interference=overlapMm3>toleranceMm3,distanceMm=interference?0:cad.measureDistanceBetween(left,right);
    pairs.push({a:items[a].path,b:items[b].path,state:interference?'Interference':distanceMm<=1e-6?'Touching':distanceMm<clearanceMm?'BelowClearance':'Separated',overlapMm3,distanceMm,toleranceMm3});
  }
  const missingMaterials=components.filter(c=>c.massKg===null).map(c=>({path:c.path,name:c.name})),known=components.filter(c=>c.massKg!==null),knownMassKg=known.reduce((n,c)=>n+c.massKg,0),complete=!missingMaterials.length;
  let centerOfMassMm=null,inertiaKgM2=null;
  if(complete&&knownMassKg>0){
    centerOfMassMm=[0,1,2].map(i=>known.reduce((n,c)=>n+c.massKg*c.centroidMm[i],0)/knownMassKg);inertiaKgM2=zero();
    for(const c of known){const d=c.centroidMm.map((v,i)=>(v-centerOfMassMm[i])*1e-3),r2=d.reduce((n,v)=>n+v*v,0);for(let i=0;i<3;i++)for(let j=0;j<3;j++)inertiaKgM2[i][j]+=c.inertiaKgM2[i][j]+c.massKg*((i===j?r2:0)-d[i]*d[j]);}
  }
  return {profile:'E4.M5-exact-assembly-analysis/1',method:'OCCT closed B-Rep intersection, minimum distance and volume GProps; inertia about assembly center of mass in world axes',units:{length:'mm',volume:'mm3',mass:'kg',inertia:'kg m2'},clearanceMm,instanceCount:components.length,components,pairs,interferences:pairs.filter(p=>p.state==='Interference').length,touching:pairs.filter(p=>p.state==='Touching').length,complete,missingMaterials,knownMassKg,massKg:complete?knownMassKg:null,centerOfMassMm,inertiaKgM2};
}

export async function analyzeAssembly(value,options={}){
  validate(value);await initializeKernel();const shapes=[],items=[];
  const visit=async node=>{
    const source=node.sourceSnapshot?documentFromSnapshot(node.sourceSnapshot):value,part=definitionContent(source,node.definitionId,{local:true}),g=part.native.graph;
    const retain=shape=>{let placed=shape.clone();shapes.push(placed);const q=node.placement.quaternion,w=Math.max(-1,Math.min(1,q[3])),angle=2*Math.acos(w),s=Math.sqrt(Math.max(0,1-w*w));if(s>1e-12){placed=placed.rotate(angle*180/Math.PI,[0,0,0],q.slice(0,3).map(v=>v/s));shapes.push(placed);}placed=placed.translate(node.placement.position);shapes.push(placed);items.push({shape:placed,path:node.path,name:node.name,material:g.definitions.find(d=>d.id===node.definitionId)?.material});return null;};
    if(hasExtrusions(part))await regenerateExtrusions(part,{inspectShape:retain});
    else if(part.experiment)await geometryExperiment(part.experiment.spec,{includeMesh:false,inspectShape:retain});
    else check(!g.features.some(f=>f.definitionId===node.definitionId&&!f.disabled&&f.type==='step-import'),'UnsupportedCapability','This solid is not supported by the exact analysis adapter.');
    for(const child of node.children)await visit(child);
  };
  try{await visit(componentTree(value));const result={...analyzeSolids(items,options),documentId:value.documentId,revision:value.revision,inputHash:hash(value)};
    if(options.projection){const {components,pairs,...summary}=result;if(options.projection==='summary')return summary;check(['components','pairs'].includes(options.projection),'InvalidInput','Choose summary, components or pairs.');const collection=options.projection==='components'?components:pairs,offset=options.offset??0,limit=options.limit??25;check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>0&&limit<=100,'InvalidInput','Use a bounded result page.');return {profile:result.profile,documentId:value.documentId,revision:value.revision,inputHash:result.inputHash,units:result.units,collection:options.projection,items:collection.slice(offset,offset+limit),nextOffset:offset+limit<collection.length?offset+limit:null};}
    return result;}
  finally{for(const shape of new Set(shapes))shape.delete();}
}
