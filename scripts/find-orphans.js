/* Find source files under frontend/src that no other file imports.
 *
 * Usage: npm run audit:orphans
 * Exits 1 when orphans are found so it can gate CI or a pre-commit hook.
 *
 * This is a heuristic (basename matching), so treat hits as candidates to
 * investigate rather than proof: confirm with a search before deleting.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'frontend', 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC).filter((f) => /\.(jsx?|tsx?)$/.test(f));
const rel = (f) => path.relative(SRC, f).split(path.sep).join('/');

// Per-file contents, keyed by relative path, so we can exclude self-references.
const contents = new Map(files.map((f) => [rel(f), fs.readFileSync(f, 'utf8')]));

// Config/entry files outside src that may reference src files.
const extraRoots = [
  'frontend/vite.config.js',
  'frontend/vite.config.ts',
  'frontend/index.html',
  'frontend/tailwind.config.js',
  'frontend/src/index.css',
  'frontend/src/main.jsx',
  'frontend/src/main.tsx',
  'frontend/src/App.jsx',
  'frontend/src/App.tsx',
];
for (const e of extraRoots) {
  const p = path.join(ROOT, e);
  if (fs.existsSync(p)) contents.set('<root>/' + e, fs.readFileSync(p, 'utf8'));
}

const isRoot = (r) =>
  /(^|\/)(main|index)\.(jsx?|tsx?)$/.test(r) ||
  /^test\//.test(r) ||
  /\.(test|spec|stories)\.(jsx?|tsx?)$/.test(r) ||
  /(^|\/)(App|index)\.(jsx?|tsx?)$/.test(r);

const all = [...contents.values()].join('\n<<<FILE>>>\n');
const orphans = [];

for (const f of files) {
  const r = rel(f);
  if (isRoot(r)) continue;
  const base = path.basename(f).replace(/\.(jsx?|tsx?)$/, '');

  // Match an import/export-from/require/dynamic-import path ending in this basename,
  // with or without a file extension.
  const re = new RegExp(
    `(?:from\\s*|import\\s*\\(|require\\s*\\(|import\\s*)['"\`][^'"'\`\\s]*/${base}(?:\\.[A-Za-z0-9]+)?['"\`]`,
  );
  const reBare = new RegExp(
    `['"\`]\\.{1,2}/${base}(?:\\.[A-Za-z0-9]+)?['"\`]`,
  );

  // Check every other file; ignore matches inside the file itself.
  let referenced = false;
  for (const [k, v] of contents) {
    if (k === r) continue;
    if (re.test(v) || reBare.test(v)) {
      referenced = true;
      break;
    }
  }
  if (!referenced) orphans.push(r);
}

console.log('total source files: ' + files.length);
console.log('orphans: ' + orphans.length);
for (const o of orphans.sort()) console.log('  ' + o);

// Non-zero exit makes this usable as a gate, not just a report.
if (orphans.length > 0) process.exitCode = 1;
