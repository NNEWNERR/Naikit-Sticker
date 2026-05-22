import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'Naikit Sticker Prototype.html');
const OUT_DIR = join(__dirname, 'extracted');
const OUT_HTML = join(OUT_DIR, 'prototype.html');
const OUT_TEMPLATE = join(OUT_DIR, 'template-raw.txt');
const OUT_MANIFEST_META = join(OUT_DIR, 'manifest-meta.json');
const ASSETS_DIR = join(OUT_DIR, 'assets');

mkdirSync(ASSETS_DIR, { recursive: true });

console.log('reading source...');
const html = readFileSync(SRC, 'utf8');

function extractScript(type) {
  const open = `<script type="${type}">`;
  const start = html.indexOf(open);
  if (start < 0) throw new Error(`tag not found: ${type}`);
  const contentStart = start + open.length;
  const close = html.indexOf('</script>', contentStart);
  if (close < 0) throw new Error(`closing tag not found: ${type}`);
  return html.slice(contentStart, close);
}

console.log('extracting manifest...');
const manifestRaw = extractScript('__bundler/manifest');
const manifest = JSON.parse(manifestRaw);
console.log('  entries:', Object.keys(manifest).length);

console.log('extracting template...');
const templateRaw = extractScript('__bundler/template');
const template = JSON.parse(templateRaw);
console.log('  template type:', typeof template, 'len:', typeof template === 'string' ? template.length : '(object)');

writeFileSync(OUT_TEMPLATE, typeof template === 'string' ? template : JSON.stringify(template, null, 2), 'utf8');
console.log('  → wrote', OUT_TEMPLATE);

console.log('decoding manifest assets...');
const meta = {};
const uuidToFilename = {};
for (const [uuid, entry] of Object.entries(manifest)) {
  try {
    const bin = Buffer.from(entry.data, 'base64');
    const bytes = entry.compressed ? gunzipSync(bin) : bin;
    const mime = entry.mimeType || entry.mime || entry.type || 'application/octet-stream';
    const ext = mimeToExt(mime);
    const filename = `${uuid}${ext}`;
    writeFileSync(join(ASSETS_DIR, filename), bytes);
    uuidToFilename[uuid] = filename;
    meta[uuid] = {
      mime,
      compressed: !!entry.compressed,
      bytes: bytes.length,
      filename,
      name: entry.name || entry.filename || null,
    };
  } catch (e) {
    meta[uuid] = { error: String(e), entryKeys: Object.keys(entry) };
  }
}
writeFileSync(OUT_MANIFEST_META, JSON.stringify(meta, null, 2), 'utf8');
console.log('  → wrote', Object.keys(meta).length, 'assets +', OUT_MANIFEST_META);

console.log('building rewritten HTML...');
let docString;
if (typeof template === 'string') {
  docString = template;
} else if (template && typeof template === 'object' && template.html) {
  docString = template.html;
} else {
  docString = JSON.stringify(template, null, 2);
}

let rewritten = docString;
for (const [uuid, filename] of Object.entries(uuidToFilename)) {
  const patterns = [uuid, `blob:${uuid}`, `__bundler://${uuid}`, `bundler://${uuid}`];
  for (const p of patterns) {
    rewritten = rewritten.split(p).join(`./assets/${filename}`);
  }
}

writeFileSync(OUT_HTML, rewritten, 'utf8');
console.log('  → wrote', OUT_HTML, '(', rewritten.length, 'chars)');
console.log('done.');

function mimeToExt(mime) {
  const m = String(mime).toLowerCase();
  if (m.includes('svg')) return '.svg';
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('woff2')) return '.woff2';
  if (m.includes('woff')) return '.woff';
  if (m.includes('ttf')) return '.ttf';
  if (m.includes('otf')) return '.otf';
  if (m.includes('json')) return '.json';
  if (m.includes('html')) return '.html';
  if (m.includes('css')) return '.css';
  if (m.includes('javascript') || m.includes('ecmascript')) return '.js';
  if (m.includes('text/')) return '.txt';
  return '.bin';
}
