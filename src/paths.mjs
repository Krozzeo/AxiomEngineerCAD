import {lstat, realpath} from 'node:fs/promises';
import {resolve, relative, isAbsolute, sep, join} from 'node:path';
import {check} from './document.mjs';

export async function authorized(root, path) {
  check(typeof path === 'string' && path.length > 0, 'invalidRequest', 'Choose a project path.');
  const absolute = resolve(path), rel = relative(root, absolute);
  check(!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep), 'permissionDenied', 'Project path is outside the authorized root.');
  let current = root;
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = join(current, segment);
    const info = await lstat(current);
    check(!info.isSymbolicLink(), 'permissionDenied', 'Linked project paths are not allowed.');
  }
  const canonical = await realpath(absolute), actual = relative(root, canonical);
  check(!isAbsolute(actual) && actual !== '..' && !actual.startsWith('..' + sep), 'permissionDenied', 'Project path escapes its authorized root.');
  return canonical;
}
