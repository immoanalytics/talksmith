// Extracts the inline component sections from Talksmith.html into
// components/*.jsx so the reference copies never drift from the canonical
// source. The inline script is the source of truth; this just splits it on
// the `// === components/NAME.jsx ===` markers and writes each block out.
//
// Usage:
//   node scripts/extract-components.cjs          # write components/
//   node scripts/extract-components.cjs --check  # fail if out of sync (CI)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'Talksmith.html');
const OUT = path.join(ROOT, 'components');

const html = fs.readFileSync(HTML, 'utf8');
const scriptMatch = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('Could not find the inline <script type="text/babel"> block.');
  process.exit(1);
}
const body = scriptMatch[1];

// Split on the section markers, keeping the name with each chunk.
const MARKER = /^\/\/ === components\/([\w.]+) ===\s*$/gm;
const sections = [];
let m, last = null;
while ((m = MARKER.exec(body))) {
  if (last) last.end = m.index;
  last = { name: m[1], start: m.index + m[0].length };
  sections.push(last);
}
if (last) last.end = body.length;

if (sections.length === 0) {
  console.error('No component markers found.');
  process.exit(1);
}

const check = process.argv.includes('--check');
let drift = 0;

for (const s of sections) {
  const content = body.slice(s.start, s.end).replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
  const file = path.join(OUT, s.name);
  if (check) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current !== content) {
      console.error(`drift: components/${s.name} is out of sync with Talksmith.html`);
      drift++;
    }
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(file, content);
    console.log(`wrote components/${s.name}`);
  }
}

if (check && drift) {
  console.error(`\n${drift} component file(s) out of sync. Run: node scripts/extract-components.cjs`);
  process.exit(1);
}
console.log(check ? 'components/ in sync ✓' : `extracted ${sections.length} components`);
