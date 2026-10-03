/**
 * Applies the formalize-portal-ui rule table to source files line by line.
 *
 * Unlike the jscodeshift runner, this never reprints AST nodes, so it cannot
 * reformat, re-indent, add parentheses or drop blank lines: the only bytes
 * that change are the class tokens covered by formalizeClasses().
 *
 * Usage: node scripts/codemods/apply-formalize.js <dir-or-file> [...]
 */
const fs = require('fs');
const path = require('path');
const { formalizeClasses } = require('./formalize-portal-ui');

const EXTS = new Set(['.jsx', '.js', '.tsx', '.ts']);

function collect(target, out = []) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      collect(path.join(target, entry), out);
    }
  } else if (EXTS.has(path.extname(target))) {
    out.push(target);
  }
  return out;
}

let changedFiles = 0;
let changedLines = 0;

for (const target of process.argv.slice(2)) {
  for (const file of collect(target)) {
    const original = fs.readFileSync(file, 'utf8');
    const eol = original.includes('\r\n') ? '\r\n' : '\n';
    const lines = original.split(eol);
    let touched = false;

    const next = lines.map(line => {
      const replaced = formalizeClasses(line);
      if (replaced !== line) {
        touched = true;
        changedLines++;
      }
      return replaced;
    });

    if (touched) {
      fs.writeFileSync(file, next.join(eol), 'utf8');
      changedFiles++;
      console.log(`${file}: rewritten`);
    }
  }
}

console.log(`\n${changedFiles} file(s), ${changedLines} line(s) formalized.`);
