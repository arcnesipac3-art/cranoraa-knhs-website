/**
 * Verify that the formalize-portal-ui codemod only made documented changes.
 *
 * For every modified file outside the hand-rewritten set, compares the HEAD
 * version line-by-line with the working tree: line counts must match, and
 * every differing line must satisfy worktree === formalizeClasses(HEAD).
 *
 * Run: node scripts/codemods/verify-formalize-diff.js
 */
const { execSync } = require('child_process');
const { formalizeClasses } = require('./formalize-portal-ui');

const HAND_REWRITTEN = new Set([
  'frontend/src/components/Layout.jsx',
  'frontend/src/components/PublicLayout.jsx',
  'frontend/src/index.css',
  // Public pages fully rewritten by hand before the codemod ran.
  'frontend/src/pages/HomeDepEd.jsx',
  'frontend/src/pages/About.jsx',
  'frontend/src/pages/Mission.jsx',
  'frontend/src/pages/Vision.jsx',
  'frontend/src/pages/Programs.jsx',
  'frontend/src/pages/K12Programs.jsx',
  'frontend/src/pages/SeniorHigh.jsx',
  'frontend/src/pages/Contact.jsx',
  'frontend/src/pages/NewsEvents.jsx',
  'frontend/src/pages/Portals.jsx',
  'frontend/src/pages/LearningMaterials.jsx',
  'frontend/src/pages/PrivacyPolicy.jsx',
  'frontend/src/pages/TermsOfService.jsx',
  'frontend/src/pages/AnnouncementDetails.jsx',
  'frontend/src/pages/NotFound.jsx',
  'frontend/src/pages/Calendar.jsx',
  'frontend/src/pages/Enrollment.jsx',
  'frontend/src/pages/EnrollmentTracking.jsx',
  'frontend/src/pages/Faculty.jsx',
]);

const fs = require('fs');

const modified = execSync('git diff --name-only -- frontend/src', { encoding: 'utf8' })
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean)
  .filter(f => !HAND_REWRITTEN.has(f));

const unexpected = [];
let checkedLines = 0;
let checkedFiles = 0;

for (const file of modified) {
  const head = execSync(`git show HEAD:${file}`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const now = fs.readFileSync(file, 'utf8');
  const before = head.split('\n');
  const after = now.split('\n');
  checkedFiles++;

  if (before.length !== after.length) {
    unexpected.push(`${file}: line count changed ${before.length} -> ${after.length}`);
    continue;
  }

  for (let i = 0; i < before.length; i++) {
    if (before[i] === after[i]) continue;
    checkedLines++;
    if (formalizeClasses(before[i]) !== after[i]) {
      unexpected.push(`${file}:${i + 1}\n  - ${before[i]}\n  + ${after[i]}`);
    }
  }
}

console.log(`Checked ${checkedFiles} codemod-touched files, ${checkedLines} changed lines.`);
if (unexpected.length) {
  console.error(`\n❌ ${unexpected.length} change(s) NOT explained by the rule table:`);
  unexpected.slice(0, 40).forEach(u => console.error(u + '\n'));
  process.exit(1);
}
console.log('✅ Every changed line is exactly formalizeClasses(HEAD line).');
