import {check} from '../document.mjs';
export const KERNEL = 'OCCT-V8_0_1/replicad-opencascadejs@1.1.0';
export const SOLVER = 'PlaneGCS/@salusoft89/planegcs@1.3.0';
export const TOLERANCES = Object.freeze({lengthMm:1e-7, relativeVolume:1e-8, absoluteVolumeMm3:1e-6,
  solverResidualMm:1e-7, rankRelative:1e-7, meshDeflectionMm:0.5});
export const SCENARIOS = ['extrude','cut','revolve','fuse','common','split','merge','suppress','reorder','delete','import','kernel-change','invalid-profile','open-shell','nonmanifold'];
export const UNITS = Object.freeze({mm:1, cm:10, m:1000, inch:25.4});
export function recipe(input = {}) {
  check(input && typeof input === 'object' && !Array.isArray(input) &&
    Object.keys(input).every(k => ['scenario','width','height','depth','radius','count','unit','selectorRole','selectorKind'].includes(k)), 'InvalidInput', 'Unknown experiment field.');
  const spec = {scenario:'cut', width:40, height:30, depth:10, radius:3, count:2, unit:'mm', selectorRole:'top', selectorKind:'face', ...input};
  check(SCENARIOS.includes(spec.scenario) && Object.hasOwn(UNITS,spec.unit), 'UnsupportedCapability', 'Choose a supported lab operation and unit.');
  const factor = UNITS[spec.unit];
  for (const name of ['width','height','depth','radius']) check(Number.isFinite(spec[name]) && spec[name]*factor >= 0.01 && spec[name]*factor <= 1000,
    'InvalidGeometry', 'Lab lengths must be finite and between 0.01 and 1000 mm after conversion.');
  check(Number.isSafeInteger(spec.count) && spec.count >= 1 && spec.count <= 4, 'ResourceLimit', 'The lab supports one to four holes.');
  check(['face','edge'].includes(spec.selectorKind) && ['top','bottom','split-fragment'].includes(spec.selectorRole), 'InvalidInput', 'Unknown semantic selector.');
  if (['cut','reorder','import','kernel-change'].includes(spec.scenario)) check(spec.radius*2 < Math.min(spec.width/(spec.count+1),spec.height),
    'InvalidGeometry', 'Hole radius must leave separate nondegenerate walls.');
  return spec;
}
export function assertFiniteTree(value) {
  if (typeof value === 'number') check(Number.isFinite(value), 'InvalidInput', 'Nonfinite values are not allowed.');
  else if (Array.isArray(value)) value.forEach(assertFiniteTree);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertFiniteTree);
}
