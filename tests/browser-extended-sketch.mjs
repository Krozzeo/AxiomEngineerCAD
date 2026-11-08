import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {openSketchFromManager,selectSketchComponent,sketchCommit,sketchDocument,sketchScreen,sketchSettled} from './browser-sketch.mjs';
import {waitEditorIdle} from './browser-support.mjs';

export async function verifyExtendedSketchUI({context,host,evidence,observe,report}){
  const entry=host.manager.catalog().recents.find(p=>p.name==='E3.M1 Extended Sketches');
  assert.ok(entry,'E3.M1 demo missing.');
  const open=()=>host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path:entry.path});
  const close=(session,revision)=>host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:revision,decision:'discard'});
  let session=await open(),page=await context.newPage();
  observe(page);
  try{
    await page.goto(session.editorUrl);await waitEditorIdle(page);
    await page.waitForFunction(()=>Math.abs((window.engineerViewport.proof?.exact?.volumeMm3??0)-Math.PI*1024)<1e-4);
    if(evidence)await page.screenshot({path:join(evidence,'e3-m1-mixed-solid.png')});
    await openSketchFromManager(page,'extended-practice');await sketchSettled(page);
    await page.locator('#edit-sketch-fit').evaluate(button=>button.click());await sketchSettled(page);
    const click=async(x,y,{bypass=false}={})=>{
      const p=await sketchScreen(page,x,y),box=await page.locator('#proof-canvas').boundingBox();
      assert.ok(p.x>box.x&&p.x<box.x+box.width&&p.y>box.y&&p.y<box.y+box.height,JSON.stringify({x,y,p,box}));
      if(bypass)await page.keyboard.down('Control');
      try{await page.mouse.click(p.x,p.y);}finally{if(bypass)await page.keyboard.up('Control');}
    };
    const tool=name=>page.locator('[data-sketch-tool='+name+']').click();
    const practice=async()=>(await sketchDocument(page)).native.graph.features.find(f=>f.id==='extended-practice').data;
    await tool('arc');await click(-13,38,{bypass:true});await click(-5,38,{bypass:true});
    await sketchCommit(page,()=>click(-13,46,{bypass:true}));
    assert.equal((await practice()).entities.filter(e=>e.type==='arc').length,1);
    await tool('polygon');await page.locator('#sketch-polygon-sides').fill('5');
    const lines=(await practice()).entities.filter(e=>e.type==='line').length;
    await click(-30,9,{bypass:true});await sketchCommit(page,()=>click(-24,9,{bypass:true}));
    assert.equal((await practice()).entities.filter(e=>e.type==='line').length,lines+5);
    await tool('trim');await sketchCommit(page,()=>click(34,32));
    assert.ok(Math.abs((await practice()).entities.find(e=>e.id==='practice-trim').b[0]-26)<1e-5);
    await tool('split');await sketchCommit(page,()=>click(19,32));
    await tool('select');await selectSketchComponent(page,'practice-circle');
    await page.locator('#sketch-mirror').click();await selectSketchComponent(page,'practice-axis');
    await sketchCommit(page,()=>page.locator('#sketch-transform').getByRole('button',{name:'Apply',exact:true}).click());
    assert.ok((await practice()).entities.some(e=>e.type==='circle'&&e.center[0]<-10&&e.center[1]>20&&!e.construction));
    await selectSketchComponent(page,'practice-circle');await page.getByRole('button',{name:'Sketch Pattern options'}).click();
    await page.locator('#sketch-circular-pattern').click();
    await selectSketchComponent(page,'practice-axis','midpoint');
    await sketchCommit(page,()=>page.locator('#sketch-transform').getByRole('button',{name:'Apply',exact:true}).click());
    assert.ok((await practice()).entities.filter(e=>e.type==='circle'&&!e.construction).length>=4);
    await tool('spline');
    await page.locator('#edit-sketch-inspector').getByRole('heading',{name:'Spline',exact:true}).waitFor();
    await click(-30,18,{bypass:true});await click(-24,22,{bypass:true});
    await sketchCommit(page,()=>click(-12,18,{bypass:true}));
    const spline=(await practice()).entities.find(e=>e.type==='spline');
    assert.ok(spline?.control1&&spline.control2);
    await tool('select');
    const corners=await Promise.all([sketchScreen(page,-34,27),sketchScreen(page,-9,13)]);
    await page.mouse.move(corners[0].x,corners[0].y);await page.mouse.down();
    await page.mouse.move(corners[1].x,corners[1].y,{steps:8});await page.mouse.up();
    assert.ok(await page.locator('[data-sketch-entity-id="'+spline.id+'"][data-role=entity][aria-selected=true]').count()||
      await page.locator('[data-sketch-entity="'+spline.id+'"] path[stroke="#7979ff"]').count());
    const splineOptions=page.getByRole('button',{name:'Spline options'});
    await splineOptions.click();await page.locator('[data-sketch-tool=equation-curve]').waitFor();
    await splineOptions.click();await page.locator('[data-sketch-tool=equation-curve]').waitFor({state:'hidden'});
    await splineOptions.click();await tool('equation-curve');
    await sketchCommit(page,()=>page.locator('.sketch-equation-form').getByRole('button',{name:'Apply'}).click());
    assert.ok((await practice()).entities.some(e=>e.type==='equation-curve'&&e.samples.length===65));
    await selectSketchComponent(page,'practice-circle');await page.locator('#sketch-pattern').click();
    await page.locator('[data-wb-tree=features]').click();await page.locator('[data-source-id=datum-x]').click();
    await page.locator('#sketch-pattern-count').fill('14');await page.locator('#sketch-pattern-count').press('Enter');
    await page.getByRole('button',{name:'Total distance',exact:true}).click();
    await page.locator('#sketch-pattern-spacing').fill('30');await page.locator('#sketch-pattern-spacing').press('Enter');
    await sketchCommit(page,()=>page.locator('#sketch-transform').getByRole('button',{name:'Apply',exact:true}).click());
    assert.equal((await practice()).patterns.at(-1).generated.length,13);
    if(evidence)await page.screenshot({path:join(evidence,'e3-m1-extended-sketch.png')});
    await page.locator('#edit-sketch-exit').click();await sketchSettled(page);
    const saved=page.waitForResponse(r=>r.url().endsWith('/v1/save'));await page.locator('#save').click();
    assert.equal((await saved).status(),200);
    const source=await sketchDocument(page);assert.deepEqual(JSON.parse(await readFile(entry.path,'utf8')),source);
    await page.close();await close(session,source.revision);session=null;
    session=await open();page=await context.newPage();observe(page);await page.goto(session.editorUrl);await waitEditorIdle(page);
    assert.deepEqual(await sketchDocument(page),source);
    report.extendedSketch={passed:true,arcs:true,polygon:true,trim:true,split:true,mirror:true,pattern:true,spline:true,marquee:true,equationCurve:true,externalPattern:true,saveReopen:true};
  }finally{
    await page.close().catch(()=>{});
    if(session)await close(session,JSON.parse(await readFile(entry.path,'utf8')).revision);
  }
}
