/**
 * Test suite for formalize-portal-ui.js codemod
 *
 * Run with: node scripts/codemods/formalize-portal-ui.test.js
 */

const jscodeshift = require('jscodeshift');
const transform = require('./formalize-portal-ui');
const { formalizeClasses } = transform;

let passCount = 0;
let failCount = 0;

function check(description, actual, expected) {
  if (actual === expected) {
    console.log(`✅ PASS: ${description}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    console.error('Expected:', expected);
    console.error('Got:     ', actual);
    failCount++;
  }
}

function runTransform(input, expected, description) {
  const output = transform({ path: 'test.jsx', source: input }, { jscodeshift });
  check(description, (output || input).trim(), expected.trim());
}

console.log('Running formalize-portal-ui.js codemod tests...\n');

/* ---------------------------------------------------------------- *
 * Unit tests: formalizeClasses()                                     *
 * ---------------------------------------------------------------- */

check(
  'font-black becomes font-bold',
  formalizeClasses('text-2xl font-black text-slate-900'),
  'text-2xl font-bold text-slate-900'
);

check(
  'font-extrabold becomes font-bold',
  formalizeClasses('font-extrabold tracking-tight'),
  'font-bold tracking-tight'
);

check(
  'tracking-widest becomes tracking-[0.1em]',
  formalizeClasses('text-xs font-semibold uppercase tracking-widest'),
  'text-xs font-semibold tracking-[0.1em]'
);

check(
  'rounded-2xl and rounded-3xl become rounded-lg',
  formalizeClasses('rounded-2xl border rounded-3xl'),
  'rounded-lg border rounded-lg'
);

check(
  'responsive rounded-2xl is rewritten',
  formalizeClasses('rounded-xl sm:rounded-2xl'),
  'rounded-xl sm:rounded-lg'
);

check(
  'border-2 becomes border',
  formalizeClasses('border-2 border-violet-600'),
  'border border-violet-600'
);

check(
  'side-specific border-b-2 becomes border-b',
  formalizeClasses('border-b-2 border-violet-600'),
  'border-b border-violet-600'
);

check(
  'text-gray-* becomes text-slate-*',
  formalizeClasses('text-gray-500 bg-white text-gray-900'),
  'text-slate-500 bg-white text-slate-900'
);

check(
  'uppercase is dropped from a class list',
  formalizeClasses('text-[11px] font-semibold uppercase tracking-wider'),
  'text-[11px] font-semibold tracking-wider'
);

check(
  'line indentation survives uppercase removal',
  formalizeClasses('      <label className="text-xs font-bold uppercase tracking-wider">'),
  '      <label className="text-xs font-bold tracking-wider">'
);

check(
  'uppercase alone on an indented line keeps the indentation',
  formalizeClasses(' '.repeat(14) + 'uppercase'),
  ' '.repeat(14)
);

check(
  'quoted uppercase only drops the token',
  formalizeClasses('const btn = cls("uppercase", \'w-full\');'),
  'const btn = cls("", \'w-full\');'
);

check(
  'uppercase at the start of a class list',
  formalizeClasses('uppercase items-center gap-2'),
  'items-center gap-2'
);

check(
  'non-class strings are untouched',
  formalizeClasses('An urgent message from the registrar'),
  'An urgent message from the registrar'
);

check(
  'unrelated class lists are untouched',
  formalizeClasses('flex items-center gap-3 px-4 py-2 text-sm font-medium'),
  'flex items-center gap-3 px-4 py-2 text-sm font-medium'
);

check(
  'text is not case-normalized by the codemod',
  formalizeClasses('w-full text-center'),
  'w-full text-center'
);

/* ---------------------------------------------------------------- *
 * Integration tests: full transform over JSX source                  *
 * ---------------------------------------------------------------- */

runTransform(
  `<div className="text-3xl font-black uppercase tracking-widest text-gray-900">Title</div>;`,
  `<div className="text-3xl font-bold tracking-[0.1em] text-slate-900">Title</div>;`,
  'Shouty heading is formalized'
);

runTransform(
  'const cls = `rounded-2xl border-2 bg-white ${active ? \'shadow-lg\' : \'\'}`;',
  'const cls = `rounded-lg border bg-white ${active ? \'shadow-lg\' : \'\'}`;',
  'Template literal class chunks are rewritten'
);

runTransform(
  'const icon = "shouty label";',
  'const icon = "shouty label";',
  'Non-class string literal is left alone'
);

runTransform(
  'export default () => <p className="text-sm text-gray-600">Body</p>;',
  'export default () => <p className="text-sm text-slate-600">Body</p>;',
  'JSX attribute string is rewritten'
);

runTransform(
  'const x = 1;',
  'const x = 1;',
  'No-op when nothing matches (returns null)'
);

/* ---------------------------------------------------------------- *
 * Idempotency                                                       *
 * ---------------------------------------------------------------- */

const sample = `const c = "text-2xl font-black uppercase tracking-widest rounded-2xl border-2 text-gray-900";`;
const once = transform({ path: 'a.jsx', source: sample }, { jscodeshift });
const twice = transform({ path: 'a.jsx', source: once }, { jscodeshift });
check('Transform is idempotent', twice === null ? once : twice, once);

console.log(`\n${'='.repeat(60)}`);
console.log(`Test Results: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60));

if (failCount > 0) process.exit(1);
