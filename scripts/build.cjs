// Production build: Talksmith.html → dist/.
//
// Talksmith.html stays the no-build dev source (React/Babel from a CDN, JSX
// compiled in the browser on every load). This produces the deployable
// version of the same page:
//   - JSX precompiled and minified by esbuild (no Babel download or
//     in-browser compile, so first paint is much faster)
//   - React/ReactDOM served from dist/vendor (no CDN dependency at runtime)
//   - content-hashed file names, so they can be cached forever
//
// Usage: node scripts/build.cjs   (or: npm run build)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const html = fs.readFileSync(path.join(ROOT, 'Talksmith.html'), 'utf8');

function fail(msg) { console.error(`build: ${msg}`); process.exit(1); }
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);

// Replace exactly one match, so a changed template fails loudly instead of
// silently shipping a page that still points at the CDN.
function replaceOnce(src, re, replacement, what) {
  const matches = src.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  if (!matches || matches.length !== 1) fail(`expected exactly one ${what}, found ${matches ? matches.length : 0}`);
  return src.replace(re, replacement);
}

const appMatch = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!appMatch) fail('inline <script type="text/babel"> not found');

const { code } = esbuild.transformSync(appMatch[1], {
  loader: 'jsx',
  jsx: 'transform',          // React.createElement — React is a global here
  minify: true,
  target: 'es2020',
  legalComments: 'none',
});

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'vendor'), { recursive: true });

function emit(rel, content) {
  fs.writeFileSync(path.join(DIST, rel), content);
  return rel;
}

// Vendor React from node_modules, checking the version matches the CDN tag
// so dev and prod run the same React.
function vendor(pkg, umdFile) {
  const tag = html.match(new RegExp(`https://unpkg\\.com/${pkg}@([\\d.]+)/umd/${umdFile.replace(/\./g, '\\.')}`));
  if (!tag) fail(`CDN <script> for ${pkg} not found`);
  const installed = require(path.join(ROOT, 'node_modules', pkg, 'package.json')).version;
  if (installed !== tag[1]) fail(`${pkg}: page uses ${tag[1]} but node_modules has ${installed}`);
  const src = fs.readFileSync(path.join(ROOT, 'node_modules', pkg, 'umd', umdFile));
  return emit(`vendor/${pkg}-${installed}.${hash(src)}.min.js`, src);
}
const reactJs = vendor('react', 'react.production.min.js');
const reactDomJs = vendor('react-dom', 'react-dom.production.min.js');
const appJs = emit(`app.${hash(code)}.js`, code);

let out = html;
out = replaceOnce(out, /<script src="https:\/\/unpkg\.com\/react@[^"]+"[^>]*><\/script>/,
  `<script src="${reactJs}"></script>`, 'React <script>');
out = replaceOnce(out, /<script src="https:\/\/unpkg\.com\/react-dom@[^"]+"[^>]*><\/script>/,
  `<script src="${reactDomJs}"></script>`, 'ReactDOM <script>');
out = replaceOnce(out, /<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]+"[^>]*><\/script>\n?/,
  '', 'Babel <script>');
out = replaceOnce(out, /<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/,
  () => `<script src="${appJs}"></script>`, 'inline app script');
emit('index.html', out);

const kb = (f) => (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(0) + ' KB';
console.log(`built dist/: index.html ${kb('index.html')}, ${appJs} ${kb(appJs)}, vendor React ${kb(reactJs)} + ${kb(reactDomJs)}`);
