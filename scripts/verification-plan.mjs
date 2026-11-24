import {areas, impactOf} from './verification-map.mjs';
import {browserScenarios, scenarioById} from '../tests/browser-scenarios.mjs';

export function createPlan({files = [], selectedAreas = [], suites = [], full = false, nativeFiles = [], casePattern} = {}) {
  const reasons = files.map(path => {
    const directNative = nativeFiles.includes(path);
    const directBrowser = browserScenarios.some(s => path === 'tests/' + s.module.slice(2));
    return {path, ...(directNative || directBrowser
      ? {areas: [], full: false, reason: 'directly edited executable test'} : impactOf(path))};
  });
  const chosen = new Set([...selectedAreas, ...reasons.flatMap(r => r.areas)]);
  for (const area of chosen) if (!areas[area]) throw new Error(`Unknown area: ${area}`);
  const all = full || reasons.some(r => r.full);
  const browser = new Set();
  const native = new Set();
  for (const area of chosen) {
    for (const file of nativeFiles) if (areas[area].native.test(file.split('/').at(-1))) native.add(file);
    for (const id of areas[area].browser) browser.add(id);
  }
  // Directly edited tests always run, even before their new impact rule exists.
  for (const file of files) {
    if (/^tests\/[^/]+\.test\.mjs$/.test(file) && nativeFiles.includes(file)) native.add(file);
    for (const scenario of browserScenarios)
      if (file === 'tests/' + scenario.module.slice(2)) browser.add(scenario.id);
  }
  for (const suite of suites) {
    if (suite === 'native') nativeFiles.forEach(file => native.add(file));
    else if (suite.startsWith('native:')) {
      const file = suite.slice(7);
      if (!nativeFiles.includes(file)) throw new Error(`Unknown native test: ${file}`);
      native.add(file);
    } else if (suite.startsWith('browser:')) browser.add(scenarioById(suite.slice(8)).id);
    else throw new Error(`Unknown suite: ${suite}`);
  }
  if (all && casePattern) throw new Error('--case cannot narrow full acceptance. Use a native suite for focused diagnosis.');
  const steps = [{id: 'context', command: 'node', args: ['scripts/project-context.mjs', '--check']}];
  if (all) {
    steps.push({id: 'native', command: 'node', args: ['--test', '--test-reporter=tap', '--test-timeout=30000', ...nativeFiles]});
    steps.push({id: 'browser:full', command: 'node', args: ['tests/browser.mjs']});
    for (const mode of ['', '--integrated', '--extrusion', '--proposal', '--reconstruction'])
      steps.push({id: 'pdf:' + (mode.slice(2) || 'fixtures'), command: 'python',
        args: ['scripts/verify-vector-pdf.py', ...(mode ? ['test-results', mode] : [])]});
    steps.push({id: 'step:export', command: 'node', args: ['scripts/export-step-qa.mjs']},
      {id: 'performance', command: 'node', args: ['scripts/measure-production.mjs']},
      {id: 'step:verify', command: 'python', args: ['scripts/verify-step.py']});
  } else {
    // Preserve Node's file concurrency instead of starting one serial runner per
    // file. Per-file native metrics still permit retrying just failed files.
    const selectedNative = [...native].sort();
    if (selectedNative.length) steps.push({id: selectedNative.length === 1 ? 'native:' + selectedNative[0] : 'native', command: 'node',
      args: ['--test', '--test-reporter=tap', '--test-timeout=30000', ...(casePattern ? ['--test-name-pattern=' + casePattern] : []), ...selectedNative]});
    for (const id of browser) steps.push({id: 'browser:' + id, command: 'node', args: ['tests/browser-focused.mjs', id]});
  }
  return {schemaVersion: 1, mode: all ? 'full-local-acceptance' : 'focused',
    acceptance: false, crossPlatformAcceptance: false,
    scope: [...chosen].map(id => ({id, risk: areas[id].risk, read: areas[id].read})),
    changedFiles: reasons, steps, casePattern: casePattern ?? null,
    note: all ? 'Complete local commands; cross-platform CI and installed hardware evidence are separate.'
      : 'Focused development evidence only; never publish using this result as full acceptance.'};
}

export function failedSuites(report) {
  if (report.schemaVersion !== 1 || !Array.isArray(report.results)) throw new Error('Unsupported verification report.');
  const failed = report.results.filter(r => r.status === 'failed').flatMap(r =>
    r.id === 'native' && report.plan?.mode === 'focused' && r.failedFiles?.length
      ? r.failedFiles.map(file => 'native:' + file) : [r.id]);
  if (!failed.length) throw new Error('Report has no failed suites to repeat.');
  if (failed.some(id => !id.startsWith('native:') && !id.startsWith('browser:') || id === 'browser:full'))
    throw new Error('Repeat a full/context/oracle failure explicitly; it cannot be relabelled as a focused suite.');
  return failed;
}
