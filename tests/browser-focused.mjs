// Real Platform/browser harness. Never substitutes for full milestone acceptance.
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';
import {seedHistoricalFixtures} from '../scripts/acceptance-demo-fixtures.mjs';
import {prepareModernUI} from './modern-ui-support.mjs';
import {scenarioById, constructionLaunchOptions, runBrowserScenario} from './browser-scenarios.mjs';

const ids = process.argv.slice(2);
if (!ids.length) throw new Error('Pass at least one browser scenario ID. Use npm run verify -- --list.');
const selected = [...new Set(ids)].map(scenarioById); // Validate before launching anything.
const root = await mkdtemp(join(tmpdir(), 'engineer-focused-'));
assert.ok(resolve(root).startsWith(join(resolve(tmpdir()), 'engineer-focused-')));
const evidence = resolve(process.env.ENGINEER_EVIDENCE ?? 'test-results/focused');
await mkdir(evidence, {recursive: true});
const hardware = process.env.ENGINEER_HARDWARE === '1', launch = constructionLaunchOptions(hardware);
const report = {kind: 'focused-browser', acceptance: false, selected: selected.map(s => s.id),
  runtime: process.version, os: process.platform, renderer: hardware ? 'hardware-requested' : 'software-forced',
  criteria: [], pageErrors: [], scenarios: []};
let host, browser;
try {
  host = await startHost({root: join(root, 'projects'), stateRoot: join(root, 'state'),
    manifests: [resolve('platform/product.json')], checkReleases: false});
  await host.startup;
  browser = await chromium.launch(launch);
  report.browser = browser.version();
  if (hardware) {
    const cdp = await browser.newBrowserCDPSession();
    report.hardware = (await cdp.send('SystemInfo.getInfo')).gpu.devices;
  }
  const context = await browser.newContext({viewport: {width: 1550, height: 1050}});
  const observed = new WeakSet();
  const observe = page => {
    if (observed.has(page)) return;
    observed.add(page);
    prepareModernUI(page);
    page.on('pageerror', e => report.pageErrors.push(e.message));
  };
  context.on('page', observe);
  const fixtures = [...new Map(selected.flatMap(s => s.fixtures).map(f => [f.id, f])).values()];
  const setupStart = performance.now();
  if (fixtures.length) await seedHistoricalFixtures(host, undefined, fixtures);
  report.fixtures = fixtures.map(f => f.id);
  report.fixtureSetupMs = Math.round(performance.now() - setupStart);
  const hub = await context.newPage();
  await hub.goto(host.url);
  for (const {id} of selected) {
    console.log(`Scenario: ${id}`);
    await runBrowserScenario(id, {context, host, observe, evidence, report, hub});
  }
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } finally {
    try { await host?.close(); } finally {
      await writeFile(join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
      await rm(root, {recursive: true, force: true});
    }
  }
}
console.log(JSON.stringify({passed: report.passed, acceptance: false, scenarios: report.scenarios,
  error: report.error?.split('\n')[0], pageErrors: report.pageErrors, report: join(evidence, 'browser-report.json')}));
