import {spawn, execFileSync} from 'node:child_process';
import {openSync, closeSync, existsSync} from 'node:fs';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {areas} from './verification-map.mjs';
import {createPlan, failedSuites} from './verification-plan.mjs';
import {summarizeNativeMetrics, nativeFileResults} from './verification-reporter.mjs';
import {browserScenarios} from '../tests/browser-scenarios.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = process.platform === 'win32' && existsSync('C:/Program Files/Git/cmd/git.exe')
  ? 'C:/Program Files/Git/cmd/git.exe' : 'git';
const query = args => execFileSync(git, ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), ...args],
  {cwd: root, windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();

function parse(argv) {
  const o = {selectedAreas: [], suites: [], files: []};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (['--plan', '--full', '--list', '--hardware', '--keep-going', '--changed'].includes(flag)) o[flag.slice(2)] = true;
    else if (['--area', '--suite', '--file', '--base', '--case', '--rerun-failed'].includes(flag)) {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      if (flag === '--area') o.selectedAreas.push(...value.split(','));
      else if (flag === '--suite') o.suites.push(...value.split(','));
      else if (flag === '--file') o.files.push(value.replaceAll('\\', '/'));
      else o[flag === '--case' ? 'casePattern' : flag.slice(2)] = value;
    } else throw new Error(`Unknown option: ${flag}`);
  }
  return o;
}

async function sourceFingerprint() {
  const hash = createHash('sha256');
  const files = query(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean);
  for (const file of [...new Set(files)].sort()) {
    hash.update(file + '\0');
    try { hash.update(await readFile(resolve(root, file))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; hash.update('DELETED'); }
  }
  return hash.digest('hex');
}

async function main() {
  const options = parse(process.argv.slice(2));
  if (options.list) {
    console.log(JSON.stringify({areas: Object.keys(areas), suites: ['native', ...browserScenarios.map(s => 'browser:' + s.id)],
      examples: ['npm run verify -- --plan --base HEAD~1', 'npm run verify -- --area assembly',
        'npm run verify -- --suite browser:mates-motion --hardware',
        'npm run verify -- --suite native:tests/e4-m3-motion.test.mjs --case Between',
        'npm run verify -- --rerun-failed .axiom/verification/<run>/report.json', 'npm run verify -- --full']}, null, 2));
    return;
  }
  if (options['rerun-failed']) {
    if (options.full || options.base || options.changed || options.files.length || options.selectedAreas.length || options.suites.length || options.casePattern)
      throw new Error('--rerun-failed is exclusive of scope selectors.');
    const previous = JSON.parse(await readFile(resolve(root, options['rerun-failed']), 'utf8'));
    options.suites = failedSuites(previous);
    options.casePattern = previous.plan.casePattern ?? undefined;
    options.hardware = options.hardware || previous.environment.hardwareRequested;
  }
  const explicit = options.files.length || options.selectedAreas.length || options.suites.length || options.full;
  if (options.base || options.changed || !explicit) {
    const base = options.base ?? 'HEAD';
    query(['rev-parse', '--verify', '--end-of-options', base + '^{commit}']);
    const changed = query(['diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', base, '--']).split('\0');
    const untracked = query(['ls-files', '-z', '--others', '--exclude-standard']).split('\0');
    options.files.push(...changed, ...untracked);
  }
  options.files = [...new Set(options.files.filter(Boolean))];
  const nativeFiles = (await readdir(join(root, 'tests'))).filter(f => f.endsWith('.test.mjs')).sort().map(f => 'tests/' + f);
  const plan = createPlan({...options, nativeFiles});
  if (options.plan) { console.log(JSON.stringify(plan, null, 2)); return; }
  if (options.casePattern && !plan.steps.some(s => s.id.startsWith('native:')))
    throw new Error('--case requires a focused native test selection.');
  const start = Date.now(), id = new Date(start).toISOString().replaceAll(/[:.]/g, '-') + '-' + process.pid;
  const output = join(root, '.axiom', 'verification', id);
  await mkdir(output, {recursive: true});
  const report = {schemaVersion: 1, runId: id, startedAt: new Date(start).toISOString(),
    commit: query(['rev-parse', 'HEAD']), sourceFingerprint: await sourceFingerprint(),
    environment: {runtime: process.version, os: process.platform, arch: process.arch,
      hardwareRequested: !!options.hardware, chrome: process.env.ENGINEER_CHROME ?? null},
    plan, results: [], acceptance: false, tokenUsage: null};
  const reportPath = join(output, 'report.json');
  const save = () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  await save();
  console.log(`Verification: ${plan.mode}; ${plan.steps.length} suites. Full logs: ${output}`);
  let stopped = false;
  for (const [index, step] of plan.steps.entries()) {
    if (stopped) { report.results.push({id: step.id, status: 'not-run', reason: 'stopped after failure'}); continue; }
    const log = join(output, `${String(index).padStart(2, '0')}-${step.id.replaceAll(/[^a-z0-9-]/gi, '-')}.log`);
    const evidence = join(output, 'evidence-' + index);
    await mkdir(evidence);
    const fd = openSync(log, 'w'), began = Date.now();
    const args = [...step.args], metrics = join(output, 'native-metrics-' + index + '.jsonl');
    if (step.id.startsWith('native')) args.splice(2, 0, '--test-reporter-destination=stdout',
      '--test-reporter=./scripts/verification-reporter.mjs', '--test-reporter-destination=' + metrics);
    let code, signal, spawnError;
    try {
      ({code, signal, spawnError} = await new Promise(resolveDone => {
        const child = spawn(step.command === 'node' ? process.execPath : step.command, args,
          {cwd: root, windowsHide: true, shell: false, stdio: ['ignore', fd, fd],
            env: {...process.env, ENGINEER_HARDWARE: options.hardware ? '1' : '0',
              // Full acceptance retains test-results for the independent readers.
              ENGINEER_EVIDENCE: plan.mode === 'focused' ? evidence : join(root, 'test-results')}});
        child.once('error', error => resolveDone({code: null, spawnError: error.message}));
        child.once('exit', (code, signal) => resolveDone({code, signal}));
      }));
    } finally { closeSync(fd); }
    const text = await readFile(log, 'utf8');
    const result = {id: step.id, status: code === 0 && !spawnError ? 'passed' : 'failed',
      durationMs: Date.now() - began, exitCode: code, signal, log, evidence,
      logBytes: Buffer.byteLength(text), ...(spawnError ? {spawnError} : {})};
    if (step.id.startsWith('native')) {
      result.metrics = metrics;
      const metricText = await readFile(metrics, 'utf8').catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return '';
      });
      result.counts = summarizeNativeMetrics(metricText);
      result.files = nativeFileResults(metricText, root);
      result.failedFiles = result.files.filter(f => f.counts.failed || f.counts.cancelled).map(f => f.file);
      if (result.status === 'passed' && !result.counts.pass) {
        result.status = 'failed';
        spawnError = 'No native test passed; check the case filter and selected test file.';
      }
    }
    if (result.status === 'failed') {
      const failureAt = text.search(/^not ok /m);
      const excerpt = failureAt >= 0 ? text.slice(failureAt, failureAt + 2200) : text.slice(-2200);
      result.excerpt = spawnError ?? excerpt;
      stopped = !options['keep-going'];
    }
    report.results.push(result);
    await save();
    console.log(`${result.status.toUpperCase()} ${step.id} (${result.durationMs} ms)${result.excerpt ? '\n' + result.excerpt : ''}`);
  }
  const after = await sourceFingerprint();
  report.sourceUnchangedDuringRun = after === report.sourceFingerprint;
  report.durationMs = Date.now() - start;
  report.finishedAt = new Date().toISOString();
  report.passed = report.sourceUnchangedDuringRun && report.results.every(r => r.status === 'passed');
  report.fullLocalCommandsPassed = plan.mode === 'full-local-acceptance' && report.passed;
  report.acceptance = false; // Local success is never cross-platform/publication proof.
  await save();
  await writeFile(join(root, '.axiom', 'verification', 'latest.json'), JSON.stringify({report: reportPath}) + '\n');
  console.log(JSON.stringify({passed: report.passed, mode: plan.mode, acceptance: false,
    executed: report.results.filter(r => r.status !== 'not-run').length,
    failed: report.results.filter(r => r.status === 'failed').map(r => r.id),
    notRun: report.results.filter(r => r.status === 'not-run').length,
    sourceUnchanged: report.sourceUnchangedDuringRun, durationMs: report.durationMs, report: reportPath}));
  if (!report.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
