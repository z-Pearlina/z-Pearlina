// Self-check for everything the README shows. Build the assets and sky first.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const files = [
  ...readdirSync(new URL('assets/', root)).map((f) => new URL(`assets/${f}`, root)),
  ...readdirSync(new URL('preview/output/', root)).map((f) => new URL(`preview/output/${f}`, root)),
];
const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
let biggest = 0;
for (const url of files) {
  const name = url.pathname.split('/').pop();
  const s = readFileSync(url, 'utf8');
  const kb = statSync(url).size / 1024;
  biggest = Math.max(biggest, kb);
  if (kb > 300) problems.push(`${name}: ${kb.toFixed(0)} KB`);
  const external = [...s.matchAll(/https?:[^"' )]+/g)].filter((m) => m[0] !== 'http://www.w3.org/2000/svg');
  if (external.length) problems.push(`${name}: external URL ${external[0][0]}`);
  if (/<script|@import|<image|<foreignObject|<text[ >]|@font-face/.test(s)) problems.push(`${name}: forbidden element`);
  if (!/<title id="t">[^<]{3,}/.test(s)) problems.push(`${name}: no title`);
  if (/animation:/.test(s) && !/prefers-reduced-motion/.test(s)) problems.push(`${name}: no reduced-motion rule`);
  await page.goto(url.href);
  const parsed = await page.evaluate(() => document.documentElement.tagName === 'svg' && !document.querySelector('parsererror'));
  if (!parsed) problems.push(`${name}: invalid SVG`);
  await page.waitForTimeout(300);
  const a = await page.screenshot();
  await page.waitForTimeout(900);
  if (!a.equals(await page.screenshot())) problems.push(`${name}: moves under reduced motion`);
}
await browser.close();

const readme = readFileSync(new URL('README.md', root), 'utf8');
const imgs = [...readme.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
for (const i of imgs) if (!/alt="[^"]{3,}"/.test(i)) problems.push(`README: missing alt ${i}`);
for (const m of readme.matchAll(/(?:src|srcset)="(assets\/[^"]+)"/g)) {
  try { statSync(new URL(m[1], root)); } catch { problems.push(`README: missing ${m[1]}`); }
}
if (/<style|<script|\bclass=|\bstyle=/.test(readme)) problems.push('README: uses stripped HTML');

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['hero ink on sky', '#22313F', '#8FC2E0', 3], ['hero ink on cloud', '#22313F', '#B4CDDF', 3],
  ['hero cream on sky', '#F3EAD3', '#14294A', 3], ['hero cream on cloud', '#F3EAD3', '#4D6B8C', 3],
  ['quote on white', '#22313F', '#FFFFFF', 4.5], ['quote on dark', '#F3EAD3', '#0D1117', 4.5],
  ['credit on white', '#4C5B68', '#FFFFFF', 4.5], ['credit on dark', '#C5C4B6', '#0D1117', 4.5],
  ['panel ink', '#22313F', '#F4ECD8', 4.5], ['panel night', '#F3EAD3', '#12243C', 4.5],
  ['log label on white', '#C8553D', '#FFFFFF', 3], ['log label on dark', '#C8553D', '#0D1117', 3],
  ['learning tag day', '#C8553D', '#F4ECD8', 3], ['learning tag night', '#C8553D', '#12243C', 3],
  ['seal', '#F4ECD8', '#C8553D', 3], ['months on hill', '#22313F', '#7FA77A', 3], ['months on night hill', '#F3EAD3', '#1C4040', 3],
];
for (const [n, a, b, min] of pairs) {
  const r = ratio(a, b);
  console.log(`${n.padEnd(24)} ${r.toFixed(1)}:1${r < min ? ' LOW' : ''}`);
  if (r < min) problems.push(`contrast ${n}`);
}
console.log(`${files.length} SVGs, largest ${biggest.toFixed(0)} KB, ${imgs.length} README images`);
console.log(problems.length ? problems.join('\n') : 'all checks passed');
