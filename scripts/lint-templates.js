#!/usr/bin/env node
/**
 * Naikit Sticker — design-token lint for templates.
 *
 * Bans the two patterns that bypass the design system:
 *   1. Hex colour literals (#RGB / #RRGGBB / #RRGGBBAA) inside *.component.html.
 *   2. Static `style="…"` attributes (any inline styling) on those templates.
 *
 * Dynamic `[style.X]="expr"` bindings are allowed because the value may come
 * from user data (e.g. <group>.color in setting/group). If you need a design
 * colour, add it to tailwind.config.js + global.scss instead.
 *
 * Usage: `npm run design:lint` (also run automatically by CI if wired).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const HEX_RE = /#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?(?:[0-9A-Fa-f]{2})?\b/g;
const STATIC_STYLE_RE = /\sstyle\s*=\s*"[^"]*"/g;

/** Files that contain hex literals we explicitly allow (none today). */
const ALLOWED_FILES = new Set([]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function lintFile(file) {
  const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
  if (ALLOWED_FILES.has(rel)) return [];
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const violations = [];
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    let m;
    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(line))) {
      violations.push({
        file: rel,
        line: lineNo,
        rule: 'no-hex-literal',
        snippet: line.trim(),
        match: m[0],
      });
    }
    STATIC_STYLE_RE.lastIndex = 0;
    while ((m = STATIC_STYLE_RE.exec(line))) {
      violations.push({
        file: rel,
        line: lineNo,
        rule: 'no-static-style',
        snippet: line.trim(),
        match: m[0].trim(),
      });
    }
  });
  return violations;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`lint-templates: src directory not found at ${ROOT}`);
    process.exit(2);
  }
  const files = walk(ROOT);
  let total = 0;
  const groupedByRule = { 'no-hex-literal': 0, 'no-static-style': 0 };
  for (const file of files) {
    const vs = lintFile(file);
    for (const v of vs) {
      total++;
      groupedByRule[v.rule]++;
      console.log(`${v.file}:${v.line}  [${v.rule}]  ${v.match}`);
      console.log(`    ${v.snippet}`);
    }
  }
  if (total === 0) {
    console.log(`design:lint OK — scanned ${files.length} templates, 0 violations.`);
    return;
  }
  console.error(
    `\ndesign:lint FAILED — ${total} violation(s) ` +
    `(no-hex-literal: ${groupedByRule['no-hex-literal']}, no-static-style: ${groupedByRule['no-static-style']}).`
  );
  console.error(
    `Fix: replace hex with a Tailwind token (tailwind.config.js) or CSS variable (global.scss). ` +
    `Replace static style="…" with a class.`
  );
  process.exit(1);
}

main();
