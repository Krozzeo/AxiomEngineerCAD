import initOC from 'replicad-opencascadejs';
import * as cad from 'replicad';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {check} from '../document.mjs';
import {recipe, KERNEL, UNITS, TOLERANCES} from './profile.mjs';
let kernel;
export async function initializeKernel() {
  kernel ??= await initOC({wasmBinary:await readFile(new URL(import.meta.resolve('replicad-opencascadejs/wasm'))), print:() => {}, printErr:() => {}});
  cad.setOC(kernel); return kernel;
}
function validity(oc, shape) {
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped,true,false,true);
  try { return {brepValid:analyzer.IsValid(), solids:shape.solids.length, null:shape.isNull}; } finally { analyzer.delete(); }
}
function roleElement(shape, kind, role) {
  const sign = role === 'bottom' ? -1 : 1, bounds = shape.boundingBox.bounds;
  const elements = kind === 'face' ? shape.faces : shape.edges;
  const selected = elements.filter(item => {
    if (kind === 'face') return item.geomType === 'PLANE' && item.normalAt().z*sign > 1-1e-10;
    const b = item.boundingBox.bounds, z = role === 'bottom' ? bounds[0][2] : bounds[1][2];
    return item.geomType === 'LINE' && Math.abs(b[0][2]-z)<TOLERANCES.lengthMm && Math.abs(b[1][2]-z)<TOLERANCES.lengthMm &&
      Math.abs(b[0][1]-bounds[0][1])<TOLERANCES.lengthMm && Math.abs(b[1][1]-bounds[0][1])<TOLERANCES.lengthMm;
  });
  check(selected.length === 1, 'AmbiguousReference', 'The producing role is not unique.'); return selected[0];
}
function advanceReference(builder, previous, output) {
  if (previous.state === 'AmbiguousReference' || previous.state === 'LostReference') return previous;
  const modified = builder.Modified(previous.element.wrapped);
  try {
    const count = modified.Size();
    if (count > 1) return {state:'AmbiguousReference', candidates:count, reason:'OCCT split one selected subelement into multiple descendants.'};
    if (count === 1) return {state:'ResolvedReidentified', element:cad.cast(modified.First()), candidates:1, reason:'Unique OCCT Modified lineage.'};
    if (builder.IsDeleted(previous.element.wrapped)) return {state:'LostReference', candidates:0, reason:'OCCT reports the selected subelement deleted.'};
    const items = previous.kind === 'edge' ? output.edges : output.faces;
    const same = items.filter(item => item.isSame(previous.element));
    return same.length === 1 ? {...previous, element:same[0], candidates:1, reason:'OCCT IsSame preserves the selected subelement.'} :
      {state:same.length ? 'AmbiguousReference':'LostReference', candidates:same.length, reason:'No unique surviving lineage; geometric proximity is not sufficient.'};
  } finally { modified.delete(); }
}
function faceDetails(shape, spec, ref) {
  return shape.faces.map((face, index) => {
    const center = face.center, normal = face.normalAt();
    const selected = ref.element && spec.selectorKind === 'face' && face.isSame(ref.element);
    return {id:`probe-face-${index}`, semantic:selected ? {producer:'base-extrude',role:spec.selectorRole,kind:'face',kernel:KERNEL} : null,
      type:face.geomType, areaMm2:cad.measureArea(face), center:center.toTuple(), normal:normal.toTuple(), transient:true};
  });
}
export async function geometryExperiment(input, {includeMesh=true, includeStep=false,inspectShape}={}) {
  const spec = recipe(input), oc = await initializeKernel(), f = UNITS[spec.unit];
  const [w,h,d,r] = ['width','height','depth','radius'].map(k=>spec[k]*f), started = performance.now();
  let shape = cad.drawRectangle(w,h).sketchOnPlane('XY').extrude(d);
  let ref = {state:'ResolvedStable',kind:spec.selectorKind,element:roleElement(shape,spec.selectorKind,spec.selectorRole),candidates:1,reason:'Explicit rectangular extrusion producer role.'};
  let expected = w*h*d, expectedArea = 2*(w*h+w*d+h*d), step = null;
  const history = [], retained = [shape];
  const apply = (type, tool) => {
    const builder = new oc[type](shape.wrapped,tool.wrapped), output = cad.cast(builder.Shape());
    ref = {...advanceReference(builder,ref,output),kind:spec.selectorKind};
    history.push({operation:type,reference:ref.state,candidates:ref.candidates});
    retained.push(tool,output); builder.delete(); shape = output;
  };
  try {
    if (['cut','reorder','import','kernel-change'].includes(spec.scenario)) {
      const indexes = Array.from({length:spec.count},(_,i)=>i);
      if (spec.scenario === 'reorder') indexes.reverse();
      for (const i of indexes) apply('BRepAlgoAPI_Cut',cad.drawCircle(r).sketchOnPlane('XY').extrude(d+2).translate([-w/2+w*(i+1)/(spec.count+1),0,-1]));
      expected -= spec.count*Math.PI*r*r*d;
      expectedArea += spec.count*(2*Math.PI*r*d-2*Math.PI*r*r);
    } else if (spec.scenario === 'split') {
      const gap = w/10; apply('BRepAlgoAPI_Cut',cad.makeBaseBox(gap,h+2,d+2).translateZ(-1));
      expected = (w-gap)*h*d; expectedArea = 2*((w-gap)*h+(w-gap)*d+2*h*d);
    } else if (spec.scenario === 'merge') {
      // A selector originating on one split fragment cannot silently bind to the merged face.
      const gap = w/10; const tool = cad.makeBaseBox(gap,h+2,d+2).translateZ(-1);
      apply('BRepAlgoAPI_Cut',tool);
      apply('BRepAlgoAPI_Fuse',cad.makeBaseBox(gap,h,d));
      shape = shape.simplify(); retained.push(shape);
      ref = {state:'LostReference',candidates:0,reason:'Split-fragment lineage is not proven after same-domain merge; explicit repair required.'};
    } else if (spec.scenario === 'fuse' || spec.scenario === 'common') {
      apply(spec.scenario === 'fuse' ? 'BRepAlgoAPI_Fuse':'BRepAlgoAPI_Common',cad.makeBaseBox(w,h,d).translateX(w/2));
      expected *= spec.scenario === 'fuse' ? 1.5:0.5; expectedArea = 2*((spec.scenario==='fuse'?1.5:0.5)*w*(h+d)+h*d);
    } else if (spec.scenario === 'revolve') {
      shape = cad.draw([0,0]).lineTo([r,0]).lineTo([r,d]).lineTo([0,d]).close().sketchOnPlane('XZ').revolve('Z'); retained.push(shape);
      expected = Math.PI*r*r*d; expectedArea = 2*Math.PI*r*(r+d);
      ref = {state:'LostReference',candidates:0,reason:'The rectangular extrusion producer is absent from this revolution.'};
    } else if (spec.scenario === 'delete') {
      apply('BRepAlgoAPI_Cut',cad.makeBaseBox(w+2,h+2,d+2).translateZ(-1)); expected = 0; expectedArea = 0;
    } else if (spec.scenario === 'invalid-profile') {
      shape = cad.draw([0,0]).lineTo([w,h]).lineTo([0,h]).lineTo([w,0]).close().sketchOnPlane('XY').extrude(d); retained.push(shape);
    } else if (spec.scenario === 'open-shell') {
      shape = cad.weldShellsAndFaces(shape.faces.slice(0,5)); retained.push(shape);
    } else if (spec.scenario === 'nonmanifold') {
      const other = cad.makeBaseBox(w,h,d).translate([w,h,0]); retained.push(other);
      shape = cad.makeCompound([shape,other]); retained.push(shape);
    }
    if (spec.selectorRole === 'split-fragment') ref = {state:'LostReference',candidates:0,reason:'A fragment selector cannot resolve to an unsplit producer.'};
    if (spec.scenario === 'kernel-change') ref = {state:'LostReference',candidates:0,reason:'Kernel lineage not verified across a different runtime profile; refused safely. No second runtime was executed.'};
    let state = validity(oc,shape);
    const allowSplit = spec.scenario === 'split';
    if (spec.scenario !== 'delete') check(state.brepValid && !state.null && state.solids === (allowSplit?2:1), 'InvalidGeometry',
      `Exact output rejected: B-Rep valid=${state.brepValid}, solids=${state.solids}; closed single-solid contract required.`);
    else check(state.solids===0,'InvalidGeometry','Deletion did not remove the original solid.');
    let actual = spec.scenario === 'delete' ? 0:cad.measureVolume(shape), area = spec.scenario === 'delete' ? 0:cad.measureArea(shape);
    const tolerance = Math.max(TOLERANCES.absoluteVolumeMm3,Math.abs(expected)*TOLERANCES.relativeVolume);
    check(Math.abs(actual-expected)<=tolerance, 'InvalidGeometry', 'Exact volume differs from independent analytic oracle.');
    check(Math.abs(area-expectedArea)<=Math.max(1e-5,expectedArea*1e-8),'InvalidGeometry','Exact area differs from independent analytic oracle.');
    if (spec.scenario !== 'delete' && (includeStep || spec.scenario==='import')) {
      const blob = cad.exportSTEP([{shape,name:'E0.M2 analytic fixture'}],{unit:'MM',modelUnit:'MM'});
      const text = await blob.text(), imported = await cad.importSTEP(new Blob([text])); retained.push(imported);
      const importedValidity = validity(oc,imported), importedVolume = cad.measureVolume(imported);
      check(importedValidity.brepValid && Math.abs(importedVolume-expected)<=tolerance,'InvalidGeometry','STEP roundtrip failed exact validity or analytic volume oracle.');
      step = {bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex'),importedVolumeMm3:importedVolume,
        importedValidity, fidelity:'Exact analytic single-part geometry and mm units only; no native history/assembly/metadata recovery.',...(includeStep?{text}:{})};
      if (spec.scenario==='import') { shape=imported; state=importedValidity; ref={state:'LostReference',candidates:0,reason:'Imported/healed B-Rep has no proven native feature lineage; no proximity reassignment.'}; }
    }
    const faces = spec.scenario==='delete'?[]:faceDetails(shape,spec,ref), mesh = includeMesh && spec.scenario!=='delete' ? shape.mesh({tolerance:TOLERANCES.meshDeflectionMm,angularTolerance:0.3}) : null;
    if (mesh) mesh.faceGroups = mesh.faceGroups.map(group => {
      const match = shape.faces.find(face=>face.hashCode===group.faceId);
      return {start:group.start,count:group.count,semantic:ref.element && match?.isSame(ref.element) && spec.selectorKind==='face' ? {producer:'base-extrude',role:spec.selectorRole,kind:'face'}:null};
    });
    return {spec,kernel:KERNEL,canonicalUnit:'mm',numericProfile:'E0.M2 analytic probe v0 — not final manufacturing tolerance',
      validity:state,volumeMm3:actual,expectedVolumeMm3:expected,areaMm2:area,expectedAreaMm2:expectedArea,toleranceMm3:tolerance,
      bounds:spec.scenario==='delete'?null:shape.boundingBox.bounds,faces,mesh,step,
      reference:{state:ref.state,candidates:ref.candidates,reason:ref.reason,selector:{producer:'base-extrude',kind:spec.selectorKind,role:spec.selectorRole,kernel:KERNEL}},
      history,...(inspectShape?{analysis:await inspectShape(shape,oc,spec)}:{}),elapsedMs:performance.now()-started};
  } finally {
    for (const item of new Set(retained)) { try { item.delete(); } catch {} }
  }
}
