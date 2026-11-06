import {prepareModernUI} from './modern-ui-support.mjs';
import {waitEditorIdle} from './browser-support.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, rm, readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';

const root = await mkdtemp(join(tmpdir(), 'engineer-browser-')), evidence = resolve(process.env.ENGINEER_EVIDENCE??'test-results');
await mkdir(evidence, {recursive:true});
let browser, child, host, direct;
const report = {milestone:'E1.M5', platform:'0.1.12', providerCommit:'6d240845cd77eb1879738d32c9f2b8fcfd7297c5',
  runtime:process.version, os:process.platform, architecture:process.arch, criteria:[], pageErrors:[],
  renderer:'Canvas CPU preview derived from actual OCCT tessellation; exact metrics from isolated CPU/Wasm; M6 WebGPU evidence is reported separately; no real AI model acceptance claimed'};
try {
  browser = await chromium.launch(process.env.ENGINEER_HARDWARE==='1'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,ignoreDefaultArgs:['--disable-gpu-compositing']}:{headless:true});if(process.env.ENGINEER_HARDWARE==='1'){const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getInfo');report.hardware={devices:info.gpu.devices.map(d=>({vendorId:d.vendorId,deviceId:d.deviceId,vendorString:d.vendorString,deviceString:d.deviceString,driverVendor:d.driverVendor,driverVersion:d.driverVersion})),browser:browser.version(),flags:[],softwareForced:false};} report.browser = browser.version();
  const context = await browser.newContext({viewport:{width:1440, height:960}});
  const observe = page => { prepareModernUI(page); page.setDefaultTimeout(15000); page.on('pageerror', e => { report.pageErrors.push(e.message); console.error('EDITOR PAGE ERROR', new URL(page.url()).pathname, e.stack); }); };
  context.on('page',observe);
  child = spawn(process.execPath, ['src/cli.mjs', '--root', join(root, 'direct'), '--create', 'study', '--name', 'Direct lifecycle study'], {cwd:resolve('.'), windowsHide:true, stdio:['ignore','pipe','pipe']});
  const ready = await new Promise((yes, no) => {
    let output = '', errors = ''; const timer = setTimeout(() => no(Error('Direct startup deadline: ' + errors)), 15000);
    child.stderr.on('data', c => { errors += c; });
    child.stdout.on('data', c => { output += c; if (output.includes('\n')) { clearTimeout(timer); try { yes(JSON.parse(output.split('\n')[0])); } catch (e) { no(e); } } });
    child.once('exit', code => { clearTimeout(timer); no(Error('Direct process exited ' + code + ': ' + errors)); });
  });
  assert.equal(ready.ready, true);
  // Fail each authenticated startup service explicitly; module initialization must
  // report disconnection rather than leave rejected promises in dependent modules.
  for(const paths of [['cad/context','cad/catalog'],['document'],['cad/status']]){
    const unavailable=await context.newPage();let failures=0;
    for(const path of paths)await unavailable.route('**/v1/'+path,route=>{failures++;return route.abort('failed');});
    await unavailable.goto(ready.editorUrl);await unavailable.locator('body[data-workbench-ready=true][data-sketch-ready=true]').waitFor();
    await unavailable.waitForTimeout(1000);assert.ok(failures>0);await unavailable.close();
  }
  report.criteria.push('Unavailable startup context/catalog/document/history services report disconnection without unhandled promise rejection');
  direct = await context.newPage(); observe(direct); await direct.goto((ready.editorUrl).replace('/#','/?workspace=labs#'));await waitEditorIdle(direct);
  await direct.locator('#name:not([disabled])').waitFor();
  assert.equal(await direct.locator('#name').inputValue(), 'Direct lifecycle study');
  await direct.locator('#notes').fill('Provisional design intent: preserve this note after reopening.');
  await direct.locator('#save').click(); await direct.locator('#message').filter({hasText:'projectBusy'}).waitFor();
  await direct.locator('#apply').click(); await direct.locator('#message').filter({hasText:'Properties applied'}).waitFor();
  await direct.locator('#save').click(); await direct.locator('#message').filter({hasText:'Document saved locally'}).waitFor();
  const nativePath = join(root, 'direct', 'study', 'project.engineer-provisional.json');
  assert.match(JSON.parse(await readFile(nativePath)).metadata.notes, /preserve this note/);
  report.criteria.push('Direct CLI launches an authenticated browser editor; pending fields block save; applied properties persist');
  await direct.locator('#spatial-lab > summary').click();
  await direct.waitForFunction(()=>document.querySelector('#assembly-json').value.includes('shaft'));
  await direct.locator('#assembly-solve').click();await direct.locator('#assembly-status').filter({hasText:'UnderDefined · DOF 2'}).waitFor();
  await direct.locator('#assembly-move').click();await direct.locator('#assembly-status').filter({hasText:'drag accepted'}).waitFor();
  await direct.locator('#assembly-pose').filter({hasText:'35.000000'}).waitFor();
  await direct.locator('#assembly-canvas').scrollIntoViewIfNeeded();
  const canvasBox=await direct.locator('#assembly-canvas').boundingBox();
  await direct.mouse.move(canvasBox.x+canvasBox.width/2,canvasBox.y+canvasBox.height/2);await direct.mouse.down();await direct.mouse.move(canvasBox.x+canvasBox.width/2,canvasBox.y+canvasBox.height/2-40);await direct.mouse.up();
  await direct.locator('#assembly-status').filter({hasText:'UnderDefined · DOF 2 · drag accepted'}).waitFor();
  await direct.waitForFunction(()=>!document.querySelector('#assembly-pose').textContent.includes('35.000000'));
  await direct.locator('#assembly-keep').click();await direct.locator('#revision').filter({hasText:'2'}).waitFor();
  const spatialSaved=direct.waitForResponse(r=>r.url().endsWith('/v1/save'));await direct.locator('#save').click();await spatialSaved;
  assert.ok(JSON.parse(await readFile(nativePath)).assembly.bodies[1].pose.position[2]>35);
  await direct.locator('#assembly-suite').click();await direct.locator('#assembly-suite-summary').filter({hasText:'Passed 28 / 28'}).waitFor();
  await direct.locator('#assembly-suite-details > summary').click();
  await direct.locator('#assembly-fixture').selectOption('conflict-distance');await direct.waitForFunction(()=>document.querySelector('#assembly-json').value.includes('distance-conflict'));
  await direct.locator('#assembly-solve').click();await direct.locator('#assembly-status').filter({hasText:'Inconsistent'}).waitFor();assert.equal(await direct.locator('#assembly-keep').isDisabled(),true);
  await direct.locator('#assembly-fixture').selectOption('locked');await direct.waitForFunction(()=>document.querySelector('#assembly-json').value.includes('"lock"'));
  await direct.locator('#assembly-solve').click();await direct.locator('#assembly-status').filter({hasText:'FullyDefined · DOF 0'}).waitFor();
  await direct.locator('#assembly-move').click();await direct.locator('#assembly-status').filter({hasText:'drag rejected'}).waitFor();
  await direct.locator('#assembly-fixture').selectOption('coaxial');await direct.waitForFunction(()=>document.querySelector('#assembly-json').value.includes('"coaxial"'));
  await direct.locator('#assembly-solve').click();await direct.locator('#assembly-status').filter({hasText:'UnderDefined · DOF 2'}).waitFor();
  report.criteria.push('Spatial UI solves six-DOF poses, moves and pointer-drags within coaxial freedom, saves recipe, executes 28 cases, rejects conflicts and fully locked movement');
  await direct.screenshot({path:join(evidence,'spatial.png'),fullPage:true});
  await direct.locator('#geometry-lab > summary').click();
  await direct.locator('#lab-form').getByRole('button',{name:'Build exact preview',exact:true}).click();
  await direct.locator('#lab-status').filter({hasText:'Completed geometry'}).waitFor();
  await direct.locator('#lab-metrics').filter({hasText:'11434.513322'}).waitFor();
  await direct.locator('#lab-width').fill('60');await direct.locator('#lab-build').click();
  await direct.locator('#lab-status').filter({hasText:'Completed geometry'}).waitFor();
  await direct.locator('#lab-metrics').filter({hasText:'17434.513322'}).waitFor();
  await direct.locator('#lab-keep').click();await direct.locator('#revision').filter({hasText:'3'}).waitFor();
  const persisted=direct.waitForResponse(r=>r.url().endsWith('/v1/save'));
  await direct.locator('#save').click();await persisted;await direct.locator('#message').filter({hasText:'Document saved locally'}).waitFor();
  assert.equal(JSON.parse(await readFile(nativePath)).experiment.spec.width,60);
  await direct.locator('#lab-scenario').selectOption('invalid-profile');await direct.locator('#lab-build').click();
  await direct.locator('#lab-status').filter({hasText:'failed'}).waitFor();
  assert.match(await direct.locator('#lab-metrics').textContent(),/17434\.513322/);
  await direct.locator('#lab-suite').click();await direct.locator('#suite-summary').filter({hasText:'Passed 29 / 29'}).waitFor();
  await direct.locator('#sketch-solve').click();await direct.locator('#sketch-status').filter({hasText:'FullyDefined'}).waitFor();
  await direct.locator('#sketch-drag').click();await direct.locator('#sketch-status').filter({hasText:'UnderDefined · remaining DOF: 2'}).waitFor();
  report.criteria.push('Real kernel preview changes volume with width; recipe persists; invalid result retains last good preview; 29-case corpus and constrained circle drag pass');
  await direct.locator('#lab-scenario').selectOption('cut');await direct.locator('#lab-build').click();
  await direct.locator('#lab-status').filter({hasText:'Completed geometry'}).waitFor();
  await direct.locator('#lab-canvas').click({position:{x:450,y:110}});
  await direct.locator('#lab-selection').filter({hasText:'Selected semantic reference'}).waitFor();
  report.criteria.push('Visible depth-buffer face picking resolves the proven producer role');
  await direct.locator('#suite-details > summary').click();
  await direct.screenshot({path:join(evidence, 'direct.png'), fullPage:true});
  await direct.locator('#close').click(); await direct.locator('[data-decision=cancel]').click();
  await direct.locator('#close-dialog').waitFor({state:'hidden'});
  assert.equal(await direct.locator('#connection').textContent(), 'Connected · Local session');
  // Hold the close response across a polling tick: queued reads must not outlive close.
  await direct.route('**/v1/close',async route=>{const response=await route.fetch();await new Promise(r=>setTimeout(r,1400));await route.fulfill({response});});
  await direct.locator('#close').click(); await direct.locator('[data-decision=save]').click();
  await direct.locator('#connection').filter({hasText:'Session closed'}).waitFor();
  await direct.waitForTimeout(1200);
  assert.equal(await direct.locator('#connection').textContent(),'Session closed');
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
  await editor.goto((session.editorUrl).replace('/#','/?workspace=labs#'));await waitEditorIdle(editor); await editor.locator('#name:not([disabled])').waitFor();
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
  await hub.locator('[data-route="/installations"]').click();
  await hub.getByRole('button',{name:'Load Demos',exact:true}).click();
  await hub.waitForFunction(()=>document.querySelector('.load-demos')?.textContent==='Load Demos');const {seedHistoricalFixtures}=await import('../scripts/acceptance-demo-fixtures.mjs');await seedHistoricalFixtures(host);
  const demoEntry=host.manager.catalog().recents.find(p=>p.name==='E0.M2 Geometry & Sketch Lab');
  assert.ok(demoEntry,'Version-owned demo was not registered');
  const demoDoc=JSON.parse(await readFile(demoEntry.path));assert.equal(demoDoc.experiment.spec.scenario,'cut');
  const spatialDemo=host.manager.catalog().recents.find(p=>p.name==='E0.M3 Spatial Mate Lab');assert.ok(spatialDemo);assert.equal(JSON.parse(await readFile(spatialDemo.path)).assembly.profile,'E0.M3-datums-v0');
  await hub.getByRole('link',{name:'Projects',exact:true}).click();
  const demoRow=hub.locator('#project-rows tr').filter({hasText:'E0.M3 Spatial Mate Lab'});await demoRow.getByRole('button',{name:'Open E0.M3 Spatial Mate Lab',exact:true}).click();await demoRow.getByText('Active · saved',{exact:true}).waitFor();
  const demoSessionId=await demoRow.getAttribute('data-session-id'),openedDemo=host.manager.catalog().sessions.find(s=>s.sessionId===demoSessionId);
  const demoPage=await context.newPage();observe(demoPage);await demoPage.goto((openedDemo.editorUrl).replace('/#','/?workspace=labs#'));await waitEditorIdle(demoPage);await demoPage.waitForFunction(()=>document.querySelector('#assembly-json').value.includes('E0.M3-datums-v0'));
  await demoPage.locator('#spatial-lab > summary').click();await demoPage.locator('#assembly-solve').click();await demoPage.locator('#assembly-status').filter({hasText:'UnderDefined · DOF 2'}).waitFor();await demoPage.screenshot({path:join(evidence,'spatial-demo.png'),fullPage:true});
  report.criteria.push('Actual Hub Load Demos registers both labs and opens/solves the native spatial demo in its installed product session');
  const {verifySketchProjectUI}=await import('./browser-sketch.mjs');await verifySketchProjectUI({hub,context,host,evidence,observe,report});
  {const row=hub.locator('#project-rows tr').filter({hasText:'E2.M1 Semantic Geometry & Evidence'});await row.getByRole('button',{name:'Open E2.M1 Semantic Geometry & Evidence',exact:true}).click();await row.getByText('Active · saved',{exact:true}).waitFor();const openedId=await row.getAttribute('data-session-id'),opened=host.manager.catalog().sessions.find(s=>s.sessionId===openedId),p=await context.newPage();observe(p);await p.goto(opened.editorUrl);await p.locator('body[data-sketch-ready=true]').waitFor();await p.waitForFunction(()=>window.engineerViewport?.proof?.exact?.volumeMm3>0);const {verifyM5SketchUI,verifyM5ParameterUI,verifyM5ExtrusionUI,verifyM5SeparatedParameters}=await import('./browser-m5.mjs');await verifyM5SketchUI({page:p,evidence,report});await verifyM5ParameterUI({page:p,evidence,report});await verifyM5ExtrusionUI({page:p,evidence,report});await verifyM5SeparatedParameters({page:p,evidence,report});await waitEditorIdle(p);const {sketchDocument}=await import('./browser-sketch.mjs'),closing=await sketchDocument(p);p.on('dialog',d=>d.accept());await p.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:opened.sessionId,expectedRevision:closing.revision,decision:'discard'});const origin=new URL(opened.editorUrl).origin;for(const owned of context.pages())if(owned.frames().some(f=>f.url().startsWith(origin+'/'))){owned.on('dialog',d=>d.accept());await owned.close();}}
  {const {verifyInteractionProjectUI}=await import('./browser-sketch-interactions.mjs');await verifyInteractionProjectUI({hub,context,host,evidence,observe,report});}
  {const {verifyRecoveryProjectUI}=await import('./browser-editing-recovery.mjs');await verifyRecoveryProjectUI({hub,context,host,evidence,observe,report});}
  {const {verifyConsolidationProjectUI}=await import('./browser-consolidation.mjs');await verifyConsolidationProjectUI({context,host,evidence,observe,report});}
  {const row=hub.locator('#project-rows tr').filter({hasText:'E1.M4 Equations & Sketch Workbench'});await row.getByRole('button',{name:'Open E1.M4 Equations & Sketch Workbench',exact:true}).click();await row.getByText('Active · saved',{exact:true}).waitFor();const awaitSessionId=await row.getAttribute('data-session-id');const opened=host.manager.catalog().sessions.find(s=>s.sessionId===awaitSessionId);const {verifyParameterPanels}=await import('./browser-parameter-panels.mjs');await verifyParameterPanels({context,session:opened,host,evidence,report});const p=await context.newPage();observe(p);await p.goto(opened.editorUrl);const {verifyM4Navigation}=await import('./browser-navigation-m4.mjs');await verifyM4Navigation({page:p,evidence,report});const {verifyParameterUI}=await import('./browser-parameters.mjs');await verifyParameterUI({page:p,evidence,report});await waitEditorIdle(p);const closingDocument=await p.evaluate(async()=>{const r=await fetch('/v1/document',{headers:{Authorization:'Bearer '+sessionStorage.getItem('engineer-token')}});return (await r.json()).document;});p.on('dialog',d=>d.accept());await p.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:opened.sessionId,expectedRevision:closingDocument.revision,decision:'discard'});}
  {const entry=host.manager.catalog().recents.find(p=>p.name==='E1.M3 Parametric Sketches'),opened=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path:entry.path}),p=await context.newPage();observe(p);await p.goto(opened.editorUrl);const {verifyParametricUI}=await import('./browser-parametric-sketch.mjs');await verifyParametricUI({page:p,evidence,report});await waitEditorIdle(p);const closingDocument=await p.evaluate(async()=>{const r=await fetch('/v1/document',{headers:{Authorization:'Bearer '+sessionStorage.getItem('engineer-token')}});return (await r.json()).document;});p.on('dialog',d=>d.accept());await p.close();const s=host.manager.catalog().sessions.find(s=>s.sessionId===opened.sessionId);await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:opened.sessionId,expectedRevision:closingDocument.revision,decision:'discard'});}
  const {verifyNativeUI}=await import('./browser-native.mjs');await verifyNativeUI({hub,context,host,evidence,observe,report});
  const {verifyReviewUI}=await import('./browser-review.mjs');await verifyReviewUI({hub,context,host,evidence,observe,report});
  const {verifyProofUI}=await import('./browser-proof.mjs');await verifyProofUI({hub,context,host,evidence,observe,report});if(process.env.ENGINEER_HARDWARE==='1')assert.equal(report.proof.gpu.classification,'hardware-adapter');
  const {verifyIntegrationUI}=await import('./browser-integration.mjs');await verifyIntegrationUI({hub,context,host,evidence,observe,report});
  const {verifyWorkbenchUI}=await import('./browser-workbench.mjs');await verifyWorkbenchUI({hub,context,host,evidence,observe,report});assert.deepEqual(report.pageErrors, []); report.passed = true;
} catch (error) { report.failure = error.stack; if (direct) await direct.screenshot({path:join(evidence, 'failure.png')}).catch(() => {}); throw error; }
finally {
  await writeFile(join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); await host?.close(); child?.kill();
  if (child && child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
  await rm(root, {recursive:true, force:true});
}
console.log(JSON.stringify(report, null, 2));
