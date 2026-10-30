import {mkdir, lstat, realpath} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EngineerAdapter} from '../platform/adapter.mjs';
import {authorized} from './paths.mjs';
import {check} from './document.mjs';

const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  check(['--root','--create','--open','--name'].includes(args[i]) && args[i + 1], 'invalidRequest', 'Usage: npm start -- --root <folder> (--create <folder> --name <name> | --open <project>)');
  check(!Object.hasOwn(options, args[i]), 'invalidRequest', 'Do not repeat options.'); options[args[i]] = args[i + 1];
}
check(options['--root'] && !!options['--create'] !== !!options['--open'], 'invalidRequest', 'Choose a root and either --create or --open.');
const requestedRoot = resolve(options['--root']); await mkdir(requestedRoot, {recursive:true});
// Derive child paths from the same canonical root negotiated with the adapter.
// Windows TEMP can spell an existing root with an 8.3 short-name prefix.
check(!(await lstat(requestedRoot)).isSymbolicLink(), 'permissionDenied', 'Authorize an ordinary project root.');
const root = await realpath(requestedRoot);
const adapter = new EngineerAdapter(), sessionId = randomUUID();
const call = (method, params) => { const requestId = randomUUID(); return adapter.request({protocolVersion:1, productId:'axiom.engineer-cad', requestId, correlationId:requestId, sessionId, actor:{kind:'human', id:'direct-cli'}, params, method}); };
try {
  await call('initialize', {platformVersion:'0.1.12', authorizedRoot:root});
  const path = resolve(root, options['--create'] ?? options['--open']);
  if (options['--create']) {
    await authorized(adapter.root, dirname(path));
    try { await lstat(path); } catch (error) { if (error.code !== 'ENOENT') throw error; await mkdir(path); }
  }
  const result = await call(options['--create'] ? 'project.create' : 'project.open', {path, name:options['--name'] ?? 'Untitled engineering document', operationId:randomUUID()});
  console.log(JSON.stringify({ready:true, product:'Axiom Engineer CAD', milestone:'E0.M5', editorUrl:result.editorUrl, status:result.status}));
} catch (error) { await adapter.shutdown(); throw error; }
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {
  if (adapter.doc?.status().dirty) console.error('Unsaved edits will be discarded. Previously saved data is preserved.');
  void adapter.shutdown().then(() => process.exit(0));
});
