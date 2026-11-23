// Explicit impact rules, reviewed with the owning subsystem. Unknown code expands
// to full validation; never silently classify it as a cosmetic change.
export const areas = {
  tooling: {risk: 'development-only', read: ['docs/VERIFICATION.md'], native: /^verification-/, browser: []},
  appearance: {risk: 'visual', read: ['app/', 'docs/VERIFICATION.md'], native: /^$/, browser: ['workbench', 'operation-ux']},
  layout: {risk: 'shared-ui', read: ['app/dock-workbench.mjs', 'app/workspace-ui.mjs'], native: /^(docking|project-workspace|e4-m2-workspace)/, browser: ['project', 'workbench']},
  selection: {risk: 'shared-ui', read: ['app/interaction-workbench.mjs', 'app/selection-coordinator.mjs'], native: /^(selection-candidates|interaction|visibility|direct-references)/, browser: ['project', 'mates-motion', 'operation-ux', 'sketch-interaction']},
  assembly: {risk: 'solver-and-references', read: ['docs/E4_M3_MATES_MOTION.md', 'src/assembly/native.mjs'], native: /^(assembly|component-motion|e4-|project-components)/, browser: ['versioned-assemblies', 'mates-motion', 'mates-legacy', 'components']},
  sketch: {risk: 'solver-and-references', read: ['src/sketch/', 'app/sketch-workbench.mjs'], native: /^(sketch|extended-sketch|parametric-sketch|editing|dimension-intent|direct-references)/, browser: ['sketch-interaction', 'extended-sketch', 'editing-recovery']},
  parameters: {risk: 'expressions-and-dependencies', read: ['src/parameters/', 'docs/E3_M4_DEPENDENCIES.md'], native: /^(parameter|parameters|m4-(formulas|dependencies)|dimension-intent)/, browser: ['parameters', 'operation-ux']},
  features: {risk: 'geometry-and-history', read: ['src/extrusion/', 'app/feature-actions.mjs'], native: /^(extrusion|feature-|m3-(finishing|references)|m4-finishing|reference-rollback)/, browser: ['feature-construction', 'feature-refinements', 'feature-operations', 'finishing']},
  exchange: {risk: 'native-files', read: ['docs/E3_M5_INTEROPERABILITY.md', 'src/exchange/'], native: /^m[56]-(step|exchange|production|old-reader)/, browser: ['step', 'production']},
  persistence: {risk: 'document-preservation', read: ['src/native/', 'src/workspace/session.mjs'], native: /^(native|version-branches|reference-rollback|project-|e4-|session-operations|m5-old-reader|editing-old-reader)/, browser: ['project', 'components', 'editing-recovery', 'production']},
  rendering: {risk: 'shared-renderer', read: ['app/gpu-view.mjs', 'tests/hardware-proof.mjs'], native: /^(proof|camera|editing-camera|preview-requests|workbench-worker)/, browser: ['proof', 'workbench', 'mates-motion', 'feature-construction']},
  drawings: {risk: 'projection-and-export', read: ['src/drawing/', 'tests/browser-proof.mjs'], native: /^(proof|e2-m2|e2-m4|integration|e1m5-consolidation)/, browser: ['proof']},
  platform: {risk: 'lifecycle-and-authorization', read: ['platform/adapter.mjs', 'src/server.mjs'], native: /^(platform|lifecycle|commands|session-operations|package-paths|assistant-platform)/, browser: ['startup', 'workbench']},
  review: {risk: 'review-and-transactions', read: ['src/review/', 'app/assistant-workbench.mjs'], native: /^(commands|assistant-platform|integration|e2-m4)/, browser: ['workbench']},
};

export const impactRules = [
  {test: /^(scripts\/verif|tests\/(verification-|browser-(focused|scenarios)))/, areas: ['tooling']},
  {test: /^tests\/browser\.mjs$/, areas: ['tooling'], full: true},
  {test: /^(package(-lock)?\.json|\.github\/|platform\/product\.json)/, areas: ['tooling'], full: true},
  {test: /^app\/(assembly-|mate-tree|components-)/, areas: ['assembly']},
  {test: /^src\/assembly\//, areas: ['assembly']},
  {test: /^src\/workspace\//, areas: ['assembly', 'persistence', 'layout']},
  {test: /^app\/(workspace-ui|project\.|dock-|panel-|docking)/, areas: ['layout']},
  {test: /^app\/.*(selection|interaction-workbench|visibility)/, areas: ['selection']},
  {test: /^app\/(gpu-|proof\.|camera|viewport)/, areas: ['rendering', 'selection']},
  {test: /^app\/.*(sketch|trim|snap|curve)/, areas: ['sketch']},
  {test: /^src\/sketch\//, areas: ['sketch']},
  {test: /^(src\/parameters\/|app\/.*(parameter|equation|autocomplete))/, areas: ['parameters']},
  {test: /^(src\/(extrusion|features|reference)\/|app\/.*(feature-|operation-inspector|operation-value|reference-))/, areas: ['features']},
  {test: /^(src\/(exchange|step)\/|app\/.*(exchange|import|export))/, areas: ['exchange']},
  {test: /^src\/(native|document|versions)\//, areas: ['persistence']},
  {test: /^(src\/drawing\/|app\/.*drawing)/, areas: ['drawings']},
  {test: /^(platform\/|src\/(server|cli|session|auth))/, areas: ['platform']},
  {test: /^(src\/.*(review|proposal)|app\/.*(assistant|review))/, areas: ['review']},
  // Shared stylesheet/icon changes need representative contexts, not CAD oracles.
  {test: /^app\/.*\.(css)$|^app\/icons\.mjs$/, areas: ['appearance']},
];

export function impactOf(path) {
  path = path.replaceAll('\\', '/');
  // Documentation alone cannot alter CAD runtime. Build policy files above are
  // intentionally classified before this rule.
  if (/\.(md|txt)$/.test(path) || path === 'docs/PROJECT_STATE.json')
    return {areas: [], reason: 'documentation', full: false};
  const matches = impactRules.filter(rule => rule.test.test(path));
  if (matches.length) return {areas: [...new Set(matches.flatMap(r => r.areas))],
    reason: 'explicit impact map', full: matches.some(r => r.full)};
  return {areas: [], reason: 'unmapped: review required, full fallback', full: true};
}
