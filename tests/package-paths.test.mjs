import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,realpath,rm} from 'node:fs/promises';
import {join,resolve,basename,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';
import {blank,FILENAME} from '../src/document.mjs';
import {openLegacyInstallationFixture,verifyWorkspaceInstallation} from '../scripts/verify-workspace-installation.mjs';

test('packaged workspace and migration fixtures use the canonical Platform root when its input path is an alias',async t=>{
 const base=await mkdtemp(join(tmpdir(),'engineer-package-alias-')),physical=join(base,'canonical-projects'),alias=join(base,'input-root-alias');await mkdir(physical);await symlink(physical,alias,'junction');let host;
 t.after(async()=>{await host?.close();const actual=await realpath(base),target=await realpath(physical),path=relative(actual,target);assert.ok(basename(actual).startsWith('engineer-package-alias-')&&path&&!path.startsWith('..')&&!isAbsolute(path));await rm(base,{recursive:true,force:true});});
 host=await startHost({root:alias,stateRoot:join(base,'profile'),manifests:[resolve('platform/product.json')],checkReleases:false});await host.startup;
 assert.equal(host.manager.root,await realpath(physical));assert.notEqual(host.manager.root,alias);assert.equal((await verifyWorkspaceInstallation(host,'axiom.engineer-cad')).passed,true);
 const oldFolder=join(alias,'old-fixture-path');await mkdir(oldFolder);const oldPath=join(oldFolder,FILENAME);await writeFile(oldPath,JSON.stringify(blank('Alias fixture')));
 await assert.rejects(host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:'axiom.engineer-cad',path:oldPath}),{code:'permissionDenied'});
 const opened=await openLegacyInstallationFixture(host,resolve('.'),'axiom.engineer-cad');assert.equal(opened.state,'ready');
 const saved=JSON.parse(await readFile(resolve(host.manager.root,opened.path),'utf8'));assert.equal(saved.formatVersion,0);assert.equal(saved.metadata.name,'Prepared milestone acceptance');
 await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:opened.sessionId,expectedRevision:0,decision:'discard'});
});
