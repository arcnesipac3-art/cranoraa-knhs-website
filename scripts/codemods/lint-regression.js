/**
 * Lints the HEAD version of every changed file (via --stdin) and reports
 * problems that do not exist in the current working tree version.
 *
 * Run: node scripts/codemods/lint-regression.js
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const FRONTEND = path.join(ROOT, 'frontend');

const changed = execSync('git diff --name-only -- frontend/src', { encoding: 'utf8', cwd: ROOT })
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean);

/** Lint a buffer as if it were `relPath` (path relative to frontend/). */
function lintBuffer(source, relPath) {
  const res = spawnSync(
    'npx',
    ['eslint', '--stdin', '--stdin-filename', relPath, '--format', 'json', '--no-error-on-unmatched-pattern'],
    {
      input: source,
      encoding: 'utf8',
      cwd: FRONTEND,
      maxBuffer: 64 * 1024 * 1024,
      shell: true,
    }
  );
  const out = res.stdout || '';
  const start = out.indexOf('[');
  if (start === -1) return [];
  try {
    const parsed = JSON.parse(out.slice(start));
    const msgs = [];
    for (const f of parsed) {
      for (const m of f.messages) msgs.push(`${m.ruleId || 'fatal'}: ${m.message}`);
    }
    return msgs;
  } catch (e) {
    return ['PARSE_ERROR'];
  }
}

let regressions = 0;
let checked = 0;

for (const file of changed) {
  const relPath = file.replace(/^frontend\//, '');
  const abs = path.join(ROOT, file);

  const now = lintBuffer(fs.readFileSync(abs, 'utf8'), relPath);
  const headSrc = execSync(`git show HEAD:${file}`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    cwd: ROOT,
  });
  const head = lintBuffer(headSrc, relPath);
  checked++;

  const count = arr => {
    const map = {};
    arr.forEach(m => (map[m] = (map[m] || 0) + 1));
    return map;
  };
  const countNow = count(now);
  const countHead = count(head);

  const newIssues = [];
  for (const [m, c] of Object.entries(countNow)) {
    const extra = c - (countHead[m] || 0);
    if (extra > 0) for (let i = 0; i < extra; i++) newIssues.push(m);
  }
  if (newIssues.length) {
    regressions += newIssues.length;
    console.log(`\n${relPath}: +${newIssues.length} new problem(s)`);
    [...new Set(newIssues)].forEach(m => console.log(`   ${m}`));
  }
}

console.log(`\nChecked ${checked} changed files. New problems vs HEAD: ${regressions}`);
process.exit(regressions > 0 ? 1 : 0);
