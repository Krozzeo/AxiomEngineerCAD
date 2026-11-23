// Node's global summary can count an empty test-file wrapper as a passing test.
// Keep the actual per-file summaries so a name filter matching nothing fails.
export default async function* nativeMetrics(events) {
  for await (const event of events) {
    if (event.type === 'test:summary' && event.data.file)
      yield JSON.stringify({file: event.data.file, counts: event.data.counts}) + '\n';
  }
}

export function summarizeNativeMetrics(text) {
  const files = text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const counts = {tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0};
  for (const file of files) for (const [key, source] of Object.entries({tests: 'tests', pass: 'passed', fail: 'failed', cancelled: 'cancelled', skipped: 'skipped'}))
    counts[key] += file.counts[source] ?? 0;
  return counts;
}

export function nativeFileResults(text, root) {
  const prefix = root.replaceAll('\\', '/') + '/';
  return text.split(/\r?\n/).filter(Boolean).map(line => {
    const entry = JSON.parse(line), file = entry.file.replaceAll('\\', '/');
    if (!file.startsWith(prefix)) throw new Error('Native metric outside repository: ' + file);
    return {file: file.slice(prefix.length), counts: entry.counts};
  });
}
