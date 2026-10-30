// Renders an SVG the way a README shows it: inside <img>, at a given width.
// usage: node shots.mjs out.png width delayMs light|dark file.svg
import { writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { chromium } from 'playwright';

const [out, width, delay, scheme, file] = process.argv.slice(2);
const svg = resolve(file);
const page_ = join(dirname(svg), `.shot-${process.pid}.html`);
const bg = scheme === 'dark' ? '#0d1117' : '#ffffff';
writeFileSync(page_, `<!doctype html><body style="margin:0;background:${bg}"><img src="${basename(svg)}" style="display:block;width:${width}px"></body>`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +width, height: 800 },
  colorScheme: scheme,
  deviceScaleFactor: +width < 500 ? 2 : 1,
});
await page.goto('file:///' + page_.replace(/\\/g, '/'));
await page.waitForTimeout(+delay);
await (await page.$('img')).screenshot({ path: out });
await browser.close();
rmSync(page_);
