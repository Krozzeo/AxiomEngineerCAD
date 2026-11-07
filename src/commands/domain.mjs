import {dimensionSources,dimensionIdentity} from '../parameters/dimension-sources.mjs';
import {renamedDimensionExpressions} from '../parameters/expressions.mjs';
import {extrusionCommand,EXTRUSION_TYPE} from '../extrusion/profile.mjs';
import {parameterCommand,applyParameters,parameterTarget} from '../parameters/profile.mjs';
import {sketchCommand,pruneImplicitReferences} from '../sketch/profile.mjs';
import {check,validate,validateMetadata} from '../document.mjs';
import {recipe,UNITS,KERNEL} from '../lab/profile.mjs';
import {syncBindings,canonical,hash} from '../native/schema.mjs';
import {hasIntegration,synchronize,dimensions} from '../integration/profile.mjs';
import {drawingEvidence,DRAWING_TRANSLATOR} from '../proof/drawing-evidence.mjs';
import {M5_PROFILE} from '../sketch/relations.mjs';
export function featureOf(value,id){const f=value.native?.graph.features.find(f=>f.id===id);check(f,'LostReference','Feature identity is missing.');check(f.type==='geometry-probe','UnsupportedCapability','This command requires a geometry-probe feature.');return f;}
function length(q,targetUnit){check(Object.hasOwn(UNITS,q.unit),'InvalidUnits','Choose mm, cm, m or inch for length.');return q.value*UNITS[q.unit]/UNITS[targetUnit];}
// One pure command reducer serves manual MAIN changes, headless replay and isolated proposals.
export function command(value,name,input){check(value.formatVersion===1,'IncompatibleVersion','Open/convert a native v1 study first.');if(name==='cad.drawing.reconstruct.v1')return reconstruct(value,input.svg);
 const next=structuredClone(value);
  if(name==='cad.drawing.layout.set.v1'){
    const graph=next.native.graph,producer=graph.features.find(f=>f.id===input.producerId);
    check(producer?.type===EXTRUSION_TYPE&&producer.definitionId===graph.primaryDefinitionId&&!producer.disabled,
      'LostReference','Choose an enabled extrusion in the primary definition.');
    const current=graph.drawings.find(drawing=>drawing.id==='drawing-e2-layout');
    const layout={...input,views:['top','front'].filter(view=>input.views.includes(view)),
      dimensions:['width','depth'].filter(dimension=>input.dimensions.includes(dimension))};
    check((!layout.dimensions.includes('width')||layout.views.includes('top'))&&(!layout.dimensions.includes('depth')||layout.views.includes('front')),
      'InvalidInput','Width requires the top view and depth requires the front view.');
    if(!current||canonical(current.layout)!==canonical(layout)){
      const drawing={id:'drawing-e2-layout',revision:(current?.revision??-1)+1,layout,
        sheets:[{id:'sheet-e2-a4',size:'A4',views:[],notes:[]}]};
      graph.drawings=graph.drawings.filter(item=>item!==current);
      graph.drawings.push(drawing);
    }
  }
  else if(name==='cad.feature.enable.v1'){const f=next.native.graph.features.find(f=>f.id===input.featureId);check(f&&['sketch-primitives','sketch-extrusion','geometry-probe'].includes(f.type),'LostReference','Choose an editable sketch or operation.');if(input.enabled)delete f.disabled;else f.disabled=true;}
  else if(name.startsWith('cad.extrusion.')){
   const target={kind:'feature',featureId:input.featureId,parameter:'depth'};
   check(!input.depthParameterId||input.replaceDepthBinding,'InvalidInput','A depth driver requires an explicit binding update.');
   if(input.replaceDepthBinding){const previous=next.native.graph.parameters.find(p=>p.targets?.some(t=>t.kind==='feature'&&t.featureId===target.featureId&&t.parameter==='depth'));if(previous)parameterCommand(next,'cad.parameter.bind.v1',{parameterId:previous.id,target,enabled:false});}
   extrusionCommand(next,name,input);
   if(input.depthParameterId)parameterCommand(next,'cad.parameter.bind.v1',{parameterId:input.depthParameterId,target,enabled:true});
  }
  else if(name.startsWith('cad.parameter.')){parameterCommand(next,name,input);}
  else if(name.startsWith('cad.sketch.')){if(input.unbind){check(name==='cad.sketch.constraint.update.v1','InvalidInput','Only a dimension update can explicitly replace its binding with a literal.');for(const p of next.native.graph.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.kind!=='dimension'||t.sketchId!==input.sketchId||t.constraintId!==input.constraint.id);}if(name==='cad.sketch.constraint.update.v1'&&parameterTarget(next.native.graph,input.sketchId,input.constraint.id)){const {name:oldName,placement:oldPlacement,refs:oldRefs,...before}=next.native.graph.features.find(f=>f.id===input.sketchId).data.constraints.find(c=>c.id===input.constraint.id),{name:newName,placement:newPlacement,refs:newRefs,...after}=input.constraint;check(canonical(before)===canonical(after),'ConstraintConflict','This dimension is driven by a parameter. Edit its expression in Parameter Manager.');}if(name==='cad.sketch.constraint.update.v1'){const sources=dimensionSources(next.native.graph),old=sources.find(d=>d.sketchId===input.sketchId&&d.constraintId===input.constraint.id);if(old&&old.name!==input.constraint.name){const edits=renamedDimensionExpressions(next.native.graph.parameters,next.native.graph.definitions,sources,dimensionIdentity(old),input.constraint.name);check(!edits.size||/^[A-Za-z_][A-Za-z_0-9]{0,63}$/.test(input.constraint.name??''),'InvalidInput','A dimension used in expressions requires an identifier name.');for(const [id,expression]of edits)next.native.graph.parameters.find(p=>p.id===id).expression=expression;}}sketchCommand(next,name,input);if(['cad.sketch.entity.delete.v1','cad.sketch.entities.delete.v1'].includes(name)){const retained=new Set(next.native.graph.features.find(f=>f.id===input.sketchId).data.constraints?.map(c=>c.id)??[]);for(const p of next.native.graph.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.kind!=='dimension'||t.sketchId!==input.sketchId||retained.has(t.constraintId));}if(['cad.sketch.constraints.delete.v1','cad.sketch.constraint.delete.v1','cad.sketch.delete.v1'].includes(name))for(const p of next.native.graph.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.kind!=='dimension'||t.sketchId!==input.sketchId||name==='cad.sketch.constraint.delete.v1'&&t.constraintId!==input.constraintId||name==='cad.sketch.constraints.delete.v1'&&!input.constraintIds.includes(t.constraintId));}
  else if(name==='cad.metadata.set.v1'){validateMetadata(input);next.metadata=structuredClone(input);}
  else if(name==='cad.feature.delete.v1'){const g=next.native.graph,f=g.features.find(f=>f.id===input.featureId);check(f,'LostReference','Feature is missing.');check(!g.features.some(x=>x.dependsOn.includes(f.id)),'LostReference','Delete or repair dependent features first.');check(!hasIntegration(next),'UnsupportedCapability','The retained E0 integrated proof has a fixed feature contract; general feature graph editing follows E1.M5/E3.');if(f.definitionId===g.primaryDefinitionId&&f.type==='geometry-probe')delete next.experiment;if(f.definitionId===g.primaryDefinitionId&&f.type==='spatial-probe')delete next.assembly;for(const p of g.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.kind!=='feature'||t.featureId!==f.id);g.features.splice(g.features.indexOf(f),1);}
  else if(name==='cad.feature.update.v1'){check(!next.native.graph.parameters.some(p=>p.targets?.some(t=>t.kind==='feature'&&t.featureId===input.featureId&&t.parameter===input.parameter)),'ConstraintConflict','This feature dimension is controlled by Parameter Manager.');const extrusion=next.native.graph.features.find(f=>f.id===input.featureId&&f.type===EXTRUSION_TYPE);if(extrusion){check(input.parameter==='depth','UnsupportedCapability','An extrusion exposes its depth dimension.');extrusionCommand(next,'cad.extrusion.update.v1',{featureId:extrusion.id,name:extrusion.data.name,depthMm:length(input.quantity,'mm'),reverse:extrusion.data.reverse});applyParameters(next);validate(next);return next;}const f=featureOf(next,input.featureId);check(f.definitionId===next.native.graph.primaryDefinitionId,'UnsupportedCapability','Only the primary probe is editable in E0.M5.');const spec=recipe(f.data.spec);
    if(hasIntegration(next)){check(['width','height','depth','radius'].includes(input.parameter),'UnsupportedCapability','Integrated study exposes width/height/depth/radius driving parameters only.');next.native.graph.parameters.find(p=>p.id==='parameter-'+input.parameter).value=length(input.quantity,'mm');synchronize(next);applyParameters(next);validate(next);return next;}
    if(input.parameter==='count'){check(input.quantity.unit==='scalar','InvalidUnits','Hole count is dimensionless.');spec.count=input.quantity.value;}
    else spec[input.parameter]=length(input.quantity,spec.unit);next.experiment={...f.data,spec:recipe(spec)};
  }else if(name==='cad.feature.extrude.v1'){check(next.native.graph.primaryDefinitionId===input.definitionId,'LostReference','Choose the existing primary definition.');check(!next.experiment&&!next.native.graph.features.some(f=>f.id===input.featureId),'InvalidInput','Create extrusion only in an empty primary geometry slot.');
    next.experiment={profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe({scenario:'extrude',width:length(input.width,'mm'),height:length(input.height,'mm'),depth:length(input.depth,'mm')})};syncBindings(next);next.native.graph.features.find(f=>f.type==='geometry-probe'&&f.definitionId===input.definitionId).id=input.featureId;
  }else check(false,'UnsupportedCapability','No registered shared mutation handler.');
  pruneImplicitReferences(next);for(const f of next.native?.graph.features??[])if(f.type==='sketch-primitives'){const old=value.native?.graph.features.find(x=>x.id===f.id),removed=(old?.data.entities??[]).filter(e=>e.external).map(e=>e.external.producerId);f.dependsOn=f.dependsOn.filter(id=>!removed.includes(id)||id===f.data.plane.producerId||f.data.entities.some(e=>e.external?.producerId===id));}applyParameters(next);syncBindings(next);validate(next);return next;
}
function reconstruct(value,svg){
 const graph=value.native.graph;
 check(!graph.features.length&&!graph.instances.length&&!graph.drawings.length,
  'UnsupportedCapability','Reconstruction requires an empty native part.');
 const {values}=drawingEvidence(svg),{width,height,depth,boreDiameter,boreX,boreY}=values;
 const sketchId='drawing-profile',featureId='drawing-extrusion',definitionId=graph.primaryDefinitionId;
 const apply=(name,input)=>{value=command(value,'cad.'+name+'.v1',input);};
 const ref=(entityId,role='entity')=>({entityId,role});
 apply('sketch.create',{sketchId,definitionId,name:'Reconstructed plate profile',plane:{kind:'datum',role:'xy'},profile:M5_PROFILE});
 apply('sketch.entity.add',{sketchId,unit:'mm',entity:{id:'drawing-outline',type:'rectangle',construction:false,a:[0,0],b:[width,height]}});
 const lines=value.native.graph.features[0].data.entities;
 const base=lines.find(e=>e.a[1]===0&&e.b[1]===0),side=lines.find(e=>e.a[0]===width&&e.b[0]===width);
 apply('sketch.entity.add',{sketchId,unit:'mm',entity:{id:'drawing-bore',type:'circle',construction:false,center:[boreX,boreY],radius:boreDiameter/2}});
 for(const constraint of [
  {id:'drawing-origin',type:'fixed',refs:[ref(base.id,'a')],value:[0,0]},
  {id:'drawing-width',name:'DrawingWidth',type:'length',refs:[ref(base.id)],value:width},
  {id:'drawing-height',name:'DrawingHeight',type:'length',refs:[ref(side.id)],value:height},
  {id:'drawing-diameter',name:'DrawingBoreDiameter',type:'diameter',refs:[ref('drawing-bore')],value:boreDiameter},
  {id:'drawing-bore-x',type:'x',refs:[ref('drawing-bore','center')],value:boreX},
  {id:'drawing-bore-y',type:'y',refs:[ref('drawing-bore','center')],value:boreY}
 ])apply('sketch.constraint.add',{sketchId,constraint:{...constraint,driving:true}});
 apply('extrusion.create',{featureId,sketchId,name:'Reconstructed extrusion',depthMm:depth,reverse:false,operation:'new-body'});
 const source=Buffer.from(svg);
 value.native.graph.sources.push({id:'drawing-source',filename:'orthographic-source.svg',bytes:source.length,sha256:hash(source),
  base64:source.toString('base64'),translator:{id:DRAWING_TRANSLATOR,version:'1'},fidelity:'Explicit dimensions and orthographic SVG geometry'});
 validate(value);
 return value;
}
export function featureContext(value,id){const extrusion=value.native.graph.features.find(f=>f.id===id&&f.type===EXTRUSION_TYPE);if(extrusion)return {id,definitionId:extrusion.definitionId,type:extrusion.type,name:extrusion.data.name,sketchId:extrusion.data.sketchId,operation:extrusion.data.operation,reverse:extrusion.data.reverse,dimensions:{depth:{value:extrusion.data.depthMm,unit:'mm'}},selectors:['top','bottom'].map(role=>({producerId:id,role,kind:'face',kernel:KERNEL})),kernel:KERNEL};const f=featureOf(value,id),s=recipe(f.data.spec);return {id:f.id,definitionId:f.definitionId,type:f.type,scenario:s.scenario,dimensions:Object.fromEntries(['width','height','depth','radius','count'].map(k=>[k,{value:s[k],unit:k==='count'?'scalar':s.unit}])),selectors:['top','bottom'].map(role=>({producerId:f.id,role,kind:'face',kernel:KERNEL})),...(hasIntegration(value)?{drivingParameters:dimensions(value.native.graph),profile:'E0.M7-chain/1'}:{}),kernel:KERNEL};}
