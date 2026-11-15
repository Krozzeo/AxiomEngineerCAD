import {blank} from '../document.mjs';
import {upgrade} from '../native/schema.mjs';
import {command} from '../commands/domain.mjs';

export const E3_SKETCH_DEMO={id:'e3-m1-extended-sketches',name:'E3.M1 Extended Sketches'};
export function extendedSketchDemo(){
  let doc=upgrade(blank(E3_SKETCH_DEMO.name));
  const invoke=(name,input)=>{doc=command(doc,'cad.'+name+'.v1',input);};
  const sketch=(sketchId,name)=>invoke('sketch.create',{sketchId,name,definitionId:'definition-main',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
  const add=(sketchId,entity)=>invoke('sketch.entity.add',{sketchId,entity,unit:'mm'});
  sketch('mixed-profile','Arc and line profile');
  add('mixed-profile',{id:'mixed-arc',type:'arc',center:[0,0],a:[-16,0],b:[16,0],radius:16,clockwise:true,construction:false});
  add('mixed-profile',{id:'mixed-base',type:'line',a:[16,0],b:[-16,0],construction:false});
  for(const [id,a,b] of [['join-left','a','b'],['join-right','b','a']])invoke('sketch.constraint.add',{sketchId:'mixed-profile',constraint:{id,type:'coincident',refs:[{entityId:'mixed-arc',role:a},{entityId:'mixed-base',role:b}],driving:true,value:null}});
  invoke('extrusion.create',{featureId:'mixed-extrusion',sketchId:'mixed-profile',name:'Arc profile extrusion',depthMm:8,reverse:false,operation:'new-body'});
  sketch('extended-practice','Extended sketch practice');
  invoke('sketch.polygon',{sketchId:'extended-practice',id:'practice-polygon',center:[-25,28],vertex:[-19,28],sides:6,construction:false});
  for(const entity of [
    {id:'practice-axis',type:'line',a:[0,12],b:[0,48],construction:true},
    {id:'practice-trim',type:'line',a:[12,32],b:[40,32],construction:false},
    {id:'practice-cutter',type:'line',a:[26,20],b:[26,42],construction:false},
    {id:'practice-circle',type:'circle',center:[14,22],radius:3,construction:false}
  ])add('extended-practice',entity);
  return doc;
}
