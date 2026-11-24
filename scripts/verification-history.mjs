import {readdir, readFile} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.axiom/verification');
const runs = [];
try {
  for (const entry of await readdir(root, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    try { runs.push(JSON.parse(await readFile(join(root, entry.name, 'report.json'), 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const suites = new Map();
for (const run of runs) for (const result of run.results) {
  if (result.status === 'not-run') continue;
  const row = suites.get(result.id) ?? {id: result.id, executions: 0, failures: 0, totalMs: 0, logBytes: 0};
  row.executions++; row.failures += result.status === 'failed' ? 1 : 0;
  row.totalMs += result.durationMs ?? 0; row.logBytes += result.logBytes ?? 0;
  suites.set(result.id, row);
}
console.log(JSON.stringify({runs: runs.length, measuredTokenUsage: null,
  note: 'Wall-clock durations and log bytes are measured; neither is a token-usage estimate. Different suite scopes/environments are not directly comparable.',
  slowestSuites: [...suites.values()].sort((a, b) => b.totalMs - a.totalMs).slice(0, 10),
  recent: runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5).map(r => ({
    id: r.runId, mode: r.plan.mode, passed: r.passed ?? null, durationMs: r.durationMs,
    failed: r.results.filter(x => x.status === 'failed').map(x => x.id),
  }))}, null, 2));
