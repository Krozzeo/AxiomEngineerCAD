import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, rm, readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';

const root = await mkdtemp(join(tmpdir(), 'engineer-browser-')), evidence = resolve('test-results');
await mkdir(evidence, {recursive:true});
let browser, child, host, direct;
const report = {milestone:'E0.M1', platform:'0.1.12', providerCommit:'6d240845cd77eb1879738d32c9f2b8fcfd7297c5',
  runtime:process.version, os:process.platform, architecture:process.arch, criteria:[], pageErrors:[],
  renderer:'No renderer — lifecycle UI only; no WebGPU, exact geometry or AI acceptance claimed'};
try {
  browser = await chromium.launch({headless:true}); report.browser = browser.version();
  const context = await browser.newContext({viewport:{width:1440, height:960}});
  const observe = page => { page.setDefaultTimeout(15000); page.on('pageerror', e => report.pageErrors.push(e.message)); };
  child = spawn(process.execPath, ['src/cli.mjs', '--root', join(root, 'direct'), '--create', 'study', '--name', 'Direct lifecycle study'], {cwd:resolve('.'), windowsHide:true, stdio:['ignore','pipe','pipe']});
  const ready = await new Promise((yes, no) => {
    let output = '', errors = ''; const timer = setTimeout(() => no(Error('Direct startup deadline: ' + errors)), 15000);
    child.stderr.on('data', c => { errors += c; });
    child.stdout.on('data', c => { output += c; if (output.includes('\n')) { clearTimeout(timer); try { yes(JSON.parse(output.split('\n')[0])); } catch (e) { no(e); } } });
    child.once('exit', code => { clearTimeout(timer); no(Error('Direct process exited ' + code + ': ' + errors)); });
  });
  assert.equal(ready.ready, true);
  direct = await context.newPage(); observe(direct); await direct.goto(ready.editorUrl);
  await direct.locator('#name:not([disabled])').waitFor();
  assert.equal(await direct.locator('#name').inputValue(), 'Direct lifecycle study');
  await direct.locator('#notes').fill('Provisional design intent: preserve this note after reopening.');
  await direct.locator('#save').click(); await direct.locator('#message').filter({hasText:'projectBusy'}).waitFor();
  await direct.locator('#apply').click(); await direct.locator('#message').filter({hasText:'Properties applied'}).waitFor();
  await direct.locator('#save').click(); await direct.locator('#message').filter({hasText:'Document saved locally'}).waitFor();
  const nativePath = join(root, 'direct', 'study', 'project.engineer-provisional.json');
  assert.match(JSON.parse(await readFile(nativePath)).metadata.notes, /preserve this note/);
  report.criteria.push('Direct CLI launches an authenticated browser editor; pending fields block save; applied properties persist');
  await direct.screenshot({path:join(evidence, 'direct.png'), fullPage:true});
  await direct.locator('#close').click(); await direct.locator('[data-decision=cancel]').click();
  await direct.locator('#close-dialog').waitFor({state:'hidden'});
  assert.equal(await direct.locator('#connection').textContent(), 'Connected · Local session');
  await direct.locator('#close').click(); await direct.locator('[data-decision=save]').click();
  await direct.locator('#connection').filter({hasText:'Session closed'}).waitFor();
  await direct.close(); direct = null;
  report.criteria.push('Direct Cancel retains session; Save and close releases the running editor');

  const projects = join(root, 'hosted'); await mkdir(projects);
  host = await startHost({root:projects, stateRoot:join(root, 'profile'), manifests:[resolve('platform/product.json')], checkReleases:false}); await host.startup;
  const hub = await context.newPage(); observe(hub); await hub.goto(host.url);
  await hub.locator('#product option').waitFor({state:'attached'});
  await hub.locator('#new-project-button').click();
  await hub.locator('#product').selectOption('axiom.engineer-cad'); await hub.locator('#name').fill('Engineer Hub acceptance');
  const popup = context.waitForEvent('page'); await hub.locator('#create-form button[type=submit]').click();
  const editor = await popup; observe(editor);
  const card = hub.locator('#project-rows tr').first(); await card.getByText('Active · saved', {exact:true}).waitFor();
  const sessionId = await card.getAttribute('data-session-id');
  const session = host.manager.catalog().sessions.find(s => s.sessionId === sessionId);
  await editor.goto(session.editorUrl); await editor.locator('#name:not([disabled])').waitFor();
  assert.equal(await editor.locator('#close').isVisible(), false);
  await editor.locator('#notes').fill('Created through the actual Platform Hub.');
  await editor.locator('#apply').click(); await editor.locator('#message').filter({hasText:'Properties applied'}).waitFor();
  await hub.locator('#refresh').click(); await card.getByText('Unsaved changes', {exact:true}).waitFor();
  await card.getByRole('button', {name:'Close Engineer Hub acceptance', exact:true}).click();
  await hub.locator('#close-dialog').getByRole('button', {name:'Cancel', exact:true}).click();
  await card.getByText('Unsaved changes', {exact:true}).waitFor();
  await card.getByRole('button', {name:'Save Engineer Hub acceptance', exact:true}).click();
  await card.getByText('Active · saved', {exact:true}).waitFor();
  assert.equal(JSON.parse(await readFile(join(projects, session.path))).metadata.notes, 'Created through the actual Platform Hub.');
  await editor.locator('#state').filter({hasText:'All changes saved locally'}).waitFor();
  await editor.screenshot({path:join(evidence, 'hosted.png'), fullPage:true});
  await hub.screenshot({path:join(evidence, 'hub.png'), fullPage:true});
  editor.on('dialog', d => d.accept()); await editor.close();
  await card.getByRole('button', {name:'Close Engineer Hub acceptance', exact:true}).click();
  await hub.locator('#close-dialog').getByRole('button', {name:'Save and close', exact:true}).click();
  await card.getByText('Closed', {exact:true}).waitFor();
  await card.getByRole('button', {name:'Open Engineer Hub acceptance', exact:true}).click();
  await card.getByText('Active · saved', {exact:true}).waitFor();
  const reopened = host.manager.catalog().sessions.find(s => s.state === 'ready');
  assert.equal(reopened.status.projectId, session.status.projectId);
  report.criteria.push('Hub UI creates real CAD adapter session', 'Editor changes appear in Hub status', 'Hub Cancel/Save/Close/Reopen preserve document identity and content');
  assert.deepEqual(report.pageErrors, []); report.passed = true;
} catch (error) { report.failure = error.stack; if (direct) await direct.screenshot({path:join(evidence, 'failure.png')}).catch(() => {}); throw error; }
finally {
  await writeFile(join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); await host?.close(); child?.kill();
  if (child && child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
  await rm(root, {recursive:true, force:true});
}
console.log(JSON.stringify(report, null, 2));
