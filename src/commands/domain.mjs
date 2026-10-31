import {check,validate,validateMetadata} from '../document.mjs';
import {recipe,UNITS,KERNEL} from '../lab/profile.mjs';
import {syncBindings} from '../native/schema.mjs';
import {hasIntegration,synchronize,dimensions} from '../integration/profile.mjs';
export function featureOf(value,id){const f=value.native?.graph.features.find(f=>f.id===id);check(f,'LostReference','Feature identity is missing.');check(f.type==='geometry-probe','UnsupportedCapability','This command requires a geometry-probe feature.');return f;}
function length(q,targetUnit){check(Object.hasOwn(UNITS,q.unit),'InvalidUnits','Choose mm, cm, m or inch for length.');return q.value*UNITS[q.unit]/UNITS[targetUnit];}
// One pure command reducer serves manual MAIN changes, headless replay and isolated proposals.
export function command(value,name,input){check(value.formatVersion===1,'IncompatibleVersion','Open/convert a native v1 study first.');const next=structuredClone(value);
  if(name==='cad.metadata.set.v1'){validateMetadata(input);next.metadata=structuredClone(input);}
  else if(name==='cad.feature.update.v1'){const f=featureOf(next,input.featureId);check(f.definitionId===next.native.graph.primaryDefinitionId,'UnsupportedCapability','Only the primary probe is editable in E0.M5.');const spec=recipe(f.data.spec);
    if(hasIntegration(next)){check(['width','height','depth','radius'].includes(input.parameter),'UnsupportedCapability','Integrated study exposes width/height/depth/radius driving parameters only.');next.native.graph.parameters.find(p=>p.id==='parameter-'+input.parameter).value=length(input.quantity,'mm');synchronize(next);validate(next);return next;}
    if(input.parameter==='count'){check(input.quantity.unit==='scalar','InvalidUnits','Hole count is dimensionless.');spec.count=input.quantity.value;}
    else spec[input.parameter]=length(input.quantity,spec.unit);next.experiment={...f.data,spec:recipe(spec)};
  }else if(name==='cad.feature.extrude.v1'){check(next.native.graph.primaryDefinitionId===input.definitionId,'LostReference','Choose the existing primary definition.');check(!next.experiment&&!next.native.graph.features.some(f=>f.id===input.featureId),'InvalidInput','Create extrusion only in an empty primary geometry slot.');
    next.experiment={profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe({scenario:'extrude',width:length(input.width,'mm'),height:length(input.height,'mm'),depth:length(input.depth,'mm')})};syncBindings(next);next.native.graph.features.find(f=>f.type==='geometry-probe'&&f.definitionId===input.definitionId).id=input.featureId;
  }else check(false,'UnsupportedCapability','No registered shared mutation handler.');
  syncBindings(next);validate(next);return next;
}
export function featureContext(value,id){const f=featureOf(value,id),s=recipe(f.data.spec);return {id:f.id,definitionId:f.definitionId,type:f.type,scenario:s.scenario,dimensions:Object.fromEntries(['width','height','depth','radius','count'].map(k=>[k,{value:s[k],unit:k==='count'?'scalar':s.unit}])),selectors:['top','bottom'].map(role=>({producerId:f.id,role,kind:'face',kernel:KERNEL})),...(hasIntegration(value)?{drivingParameters:dimensions(value.native.graph),profile:'E0.M7-chain/1'}:{}),kernel:KERNEL};}
