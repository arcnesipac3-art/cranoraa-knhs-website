/**
 * Codemod to formalize the portal UI class vocabulary.
 *
 * Rules (applied only to strings that look like Tailwind class lists):
 * - font-black / font-extrabold  -> font-bold        (weights above bold are shouty)
 * - tracking-widest              -> tracking-[0.1em] (extreme letterspacing)
 * - rounded-2xl / rounded-3xl    -> rounded-lg       (pillowy corners read as "AI template")
 * - border-2 / border-b-2 / ...  -> border / border-b / ...  (thin the borders)
 * - text-gray-*                  -> text-slate-*     (align with the slate scale used everywhere else)
 * - uppercase                    -> removed          (sentence case for labels)
 *
 * The transform is idempotent: running it twice yields the same output.
 */

const CLASS_HINT =
  /(?:^|[\s"'`{])(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|text-|font-|bg-|rounded|border|items-|justify-|content-|self-|gap-|space-|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|w-|h-|min-|max-|tracking-|leading-|shadow-|transition|duration-|ease-|hover:|focus:|group|divide-|overflow-|z-|order-|col-|row-|uppercase|lowercase|capitalize|italic|whitespace-|line-clamp)/;

const RULES = [
  [/\bfont-black\b/g, 'font-bold'],
  [/\bfont-extrabold\b/g, 'font-bold'],
  [/\btracking-widest\b/g, 'tracking-[0.1em]'],
  [/\brounded-(?:2xl|3xl)\b/g, 'rounded-lg'],
  [/\bborder-([tblrxy])-2\b/g, 'border-$1'],
  [/\bborder-2\b/g, 'border'],
  [/\btext-gray-/g, 'text-slate-'],
];

/**
 * Formalize one string. Returns the same string when nothing matched.
 */
function formalizeClasses(source) {
  if (typeof source !== 'string' || !CLASS_HINT.test(source)) return source;

  let out = source;
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, replacement);
  }

  // Drop the `uppercase` utility without disturbing any other byte of the
  // string (indentation, alignment, surrounding quotes):
  // - token alone on an indented line -> indentation kept, token dropped
  // - token wrapped in quotes (`cls="uppercase"`) -> the quote is kept
  // - token inside a class list -> the single separating space goes with it
  // - token at the very start -> token and its trailing space go
  out = out.replace(/^uppercase\s+/, '');
  out = out.replace(/(^|[\s"'`])uppercase(?=[\s"'`]|$)/g, (match, pre, offset, source) => {
    if (pre === '"' || pre === "'" || pre === '`') return pre;
    if (source.slice(0, offset).trim() === '') return pre;
    return '';
  });

  return out;
}

module.exports = function formalizePortalUi(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let changes = 0;

  const rewrite = (node, key) => {
    const next = formalizeClasses(node[key]);
    if (next !== node[key]) {
      node[key] = next;
      changes++;
    }
  };

  // Plain string literals (className="..." and object values).
  const stringTypes = ['Literal', 'StringLiteral'].filter(type => j[type]);
  stringTypes.forEach(type => {
    root.find(j[type]).forEach(path => {
      const node = path.value;
      const key = 'value' in node && typeof node.value === 'string' ? 'value' : null;
      if (key) rewrite(node, key);
    });
  });

  // Template literal chunks (className={`...`}).
  root.find(j.TemplateLiteral).forEach(path => {
    path.value.quasis.forEach(quasi => {
      rewrite(quasi.value, 'raw');
      if (typeof quasi.value.cooked === 'string') quasi.value.cooked = quasi.value.raw;
    });
  });

  if (changes > 0) {
    console.log(`${fileInfo.path}: ${changes} class string(s) formalized`);
  }

  return changes > 0 ? root.toSource() : null;
};

module.exports.formalizeClasses = formalizeClasses;
