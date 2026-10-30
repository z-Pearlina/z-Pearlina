// Writes preview/hero.html: both banners inside <img>, as a README shows them.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const uri = (m) => 'data:image/svg+xml;base64,' + readFileSync(new URL(`../assets/hero-${m}.svg`, import.meta.url)).toString('base64');
const block = (m, label, bg, fg) => `<section style="background:${bg};color:${fg}"><h2>${label}</h2><img src="${uri(m)}" alt=""><h3>390 px</h3><img class="p" src="${uri(m)}" alt=""></section>`;
mkdirSync(new URL('../preview/', import.meta.url), { recursive: true });
writeFileSync(new URL('../preview/hero.html', import.meta.url), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hero preview</title>
<style>body{margin:0;font:15px system-ui}section{padding:24px 16px}h2,h3{font-weight:500;margin:0 auto 12px;max-width:1012px}h3{margin-top:20px;opacity:.7}img{display:block;width:100%;max-width:1012px;margin:0 auto}img.p{max-width:358px;margin-left:max(0px,calc(50% - 506px))}</style>
${block('day', 'Day, on GitHub light', '#ffffff', '#1f2328')}${block('night', 'Night, on GitHub dark', '#0d1117', '#e6edf3')}`);
