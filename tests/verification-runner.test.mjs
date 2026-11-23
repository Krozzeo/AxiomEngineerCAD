import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFile, readdir} from 'node:fs/promises';
import {createPlan, failedSuites} from '../scripts/verification-plan.mjs';
import {areas, impactOf} from '../scripts/verification-map.mjs';
import nativeMetrics, {summarizeNativeMetrics} from '../scripts/verification-reporter.mjs';
import {browserScenarios, constructionScenarios, scenarioById, constructionLaunchOptions} from './browser-scenarios.mjs';

const nativeFiles = (await readdir(new URL('./', import.meta.url))).filter(f => f.endsWith('.test.mjs')).map(f => 'tests/' + f);
test('cosmetic, solver and unknown changes select different impact; unknown code cannot silently pass as cosmetic', () => {
  const css = createPlan({files: ['app/project.css'], nativeFiles});
  assert.equal(css.mode, 'focused');
  assert.ok(css.steps.some(s => s.id === 'browser:project'));
  assert.ok(!css.steps.some(s => s.id === 'step:verify' || s.id === 'browser:step'));
  const solver = createPlan({files: ['src/assembly/solver.mjs'], nativeFiles});
  assert.ok(solver.steps.some(s => s.args.includes('tests/e4-m3-motion.test.mjs')));
  assert.ok(solver.steps.some(s => s.id === 'browser:mates-legacy'));
  assert.equal(createPlan({files: ['src/new-unmapped-system.mjs'], nativeFiles}).mode, 'full-local-acceptance');
  assert.deepEqual(impactOf('docs/VERIFICATION.md').areas, []);
});
test('direct test edits run the existing case; overlapping areas deduplicate suites', () => {
  const p = createPlan({files: ['tests/e4-m3-motion.test.mjs'], selectedAreas: ['assembly', 'persistence'], nativeFiles});
  assert.equal(p.mode, 'focused');
  assert.equal(p.steps.flatMap(s => s.args).filter(arg => arg === 'tests/e4-m3-motion.test.mjs').length, 1);
  assert.equal(createPlan({files: ['tests/browser-e4-m3.mjs'], nativeFiles}).steps.at(-1).id, 'browser:mates-motion');
});
test('case diagnosis is explicit; full acceptance retains every native file and all independent oracles', () => {
  const focused = createPlan({suites: ['native:tests/e4-m3-motion.test.mjs'], nativeFiles, casePattern: 'Between'});
  assert.ok(focused.steps.at(-1).args.includes('--test-name-pattern=Between'));
  const full = createPlan({full: true, nativeFiles});
  assert.ok(nativeFiles.every(f => full.steps.find(s => s.id === 'native').args.includes(f)));
  for (const id of ['browser:full', 'pdf:fixtures', 'pdf:integrated', 'pdf:extrusion', 'pdf:proposal', 'pdf:reconstruction', 'step:export', 'step:verify', 'performance'])
    assert.ok(full.steps.some(s => s.id === id), id);
  assert.equal(full.acceptance, false);
  assert.throws(() => createPlan({full: true, casePattern: 'one', nativeFiles}), /cannot narrow/);
});
test('retry repeats failed suites only and never imports a previous success or upgrades partial evidence', () => {
  const report = {schemaVersion: 1, results: [
    {id: 'browser:project', status: 'passed'}, {id: 'browser:mates-motion', status: 'failed'},
    {id: 'browser:parameters', status: 'not-run'},
  ]};
  assert.deepEqual(failedSuites(report), ['browser:mates-motion']);
  assert.deepEqual(failedSuites({schemaVersion: 1, plan: {mode: 'focused'}, results: [
    {id: 'native', status: 'failed', failedFiles: ['tests/e4-m3-motion.test.mjs']},
  ]}), ['native:tests/e4-m3-motion.test.mjs']);
  assert.throws(() => failedSuites({schemaVersion: 1, results: [{id: 'browser:full', status: 'failed'}]}), /explicitly/);
  assert.throws(() => failedSuites({schemaVersion: 1, results: []}), /no failed/);
  assert.throws(() => createPlan({selectedAreas: ['invented'], nativeFiles}), /Unknown area/);
  assert.throws(() => createPlan({suites: ['native:../../outside.mjs'], nativeFiles}), /Unknown native/);
  assert.throws(() => scenarioById('invented'), /Unknown browser/);
});
test('focused catalogue reuses real exports and known demo fixtures; complete construction order is preserved', async () => {
  const ids = new Set();
  const {historicalDemoCatalog} = await import('../scripts/acceptance-demo-fixtures.mjs');
  const product = JSON.parse(await readFile(new URL('../platform/product.json', import.meta.url)));
  const known = new Set([...historicalDemoCatalog.map(f => f.id), ...product.demos.map(f => f.id)]);
  for (const scenario of browserScenarios) {
    assert.equal(ids.has(scenario.id), false); ids.add(scenario.id);
    assert.equal(typeof (await import(scenario.module))[scenario.entry], 'function');
    for (const fixture of scenario.fixtures) assert.ok(known.has(fixture.id), fixture.id);
  }
  assert.deepEqual(constructionScenarios, ['components', 'mates-motion', 'mates-legacy', 'project', 'production', 'step', 'parameters', 'finishing', 'operation-ux', 'feature-refinements', 'feature-construction']);
  for (const area of Object.values(areas)) for (const id of area.browser) assert.ok(ids.has(id));
  assert.equal(constructionLaunchOptions(false).args.includes('--enable-unsafe-webgpu'), true);
  assert.equal(constructionLaunchOptions(true).args, undefined);
});
test('CLI dry plan is machine readable and invalid selectors fail before launching tests', () => {
  const json = execFileSync(process.execPath, ['scripts/verify.mjs', '--plan', '--suite', 'browser:mates-motion'], {encoding: 'utf8', windowsHide: true});
  const plan = JSON.parse(json);
  assert.deepEqual(plan.steps.map(s => s.id), ['context', 'browser:mates-motion']);
  for (const args of [['--area'], ['--not-an-option'], ['--suite', 'browser:unknown']]) {
    const r = spawnSync(process.execPath, ['scripts/verify.mjs', ...args], {encoding: 'utf8', windowsHide: true});
    assert.equal(r.status, 1);
  }
});
test('native metric summaries ignore empty file wrappers; a real filter match is measured', async () => {
  async function* events() {
    yield {type: 'test:summary', data: {file: 'empty.mjs', counts: {tests: 0, passed: 0}}};
    yield {type: 'test:summary', data: {counts: {tests: 1, passed: 1}}};
  }
  let text = ''; for await (const item of nativeMetrics(events())) text += item;
  assert.equal(summarizeNativeMetrics(text).pass, 0);
  assert.equal(summarizeNativeMetrics(JSON.stringify({file: 'actual.mjs', counts: {tests: 2, passed: 1, failed: 1}})).tests, 2);
  assert.equal(summarizeNativeMetrics('').pass, 0);
});
