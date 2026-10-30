// Renders README.md through GitHub's Markdown API with github-markdown-css, then
// screenshots it in light and dark at 1280 and 390 px.
// usage: node preview-readme.mjs [screenshot directory]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const shots = process.argv[2];
const css = readFileSync(new URL('node_modules/github-markdown-css/github-markdown.css', import.meta.url), 'utf8');

const res = await fetch('https://api.github.com/markdown', {
  method: 'POST',
  headers: { accept: 'application/vnd.github+json', 'content-type': 'application/json' },
  body: JSON.stringify({ text: readFileSync(new URL('README.md', root), 'utf8'), mode: 'gfm', context: 'z-Pearlina/z-Pearlina' }),
});
if (!res.ok) throw new Error(`Markdown API: ${res.status}`);
const body = (await res.text())
  .replaceAll('https://raw.githubusercontent.com/z-Pearlina/z-Pearlina/output/', 'output/')
  .replace(/(src|srcset)="assets\//g, '$1="../assets/');

mkdirSync(new URL('preview/', root), { recursive: true });
writeFileSync(new URL('preview/readme.html', root), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>README preview</title>
<style>${css}
html{color-scheme:light dark}
body{margin:0;background:#fff}
@media (prefers-color-scheme:dark){body{background:#0d1117}}
.markdown-body{box-sizing:border-box;max-width:1012px;margin:0 auto;padding:32px}
@media (max-width:767px){.markdown-body{padding:16px}}</style>
<article class="markdown-body">${body}</article>`);
console.log('wrote preview/readme.html');

if (shots) {
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme, deviceScaleFactor: width < 500 ? 2 : 1 });
    await page.goto(new URL('preview/readme.html', root).href);
    await page.waitForTimeout(5000);
    const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src));
    console.log(scheme, width, 'images', (await page.$$('img')).length, 'broken', broken, 'overflow', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await page.screenshot({ path: `${shots}/readme-${scheme}-${width}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
}
