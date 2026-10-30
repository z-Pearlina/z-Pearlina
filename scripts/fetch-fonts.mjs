// Downloads the OFL fonts used by the generators into scripts/fonts (git-ignored).
import { writeFile, access } from 'node:fs/promises';

const BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/';
const FONTS = {
  'Cormorant.ttf': 'cormorantgaramond/CormorantGaramond[wght].ttf',
  'CormorantItalic.ttf': 'cormorantgaramond/CormorantGaramond-Italic[wght].ttf',
  'Caveat.ttf': 'caveat/Caveat[wght].ttf',
  'PlexMono.ttf': 'ibmplexmono/IBMPlexMono-Regular.ttf',
  'ArefRuqaa.ttf': 'arefruqaa/ArefRuqaa-Bold.ttf',
  'Amiri.ttf': 'amiri/Amiri-Regular.ttf',
  'YujiBoku.ttf': 'yujiboku/YujiBoku-Regular.ttf',
};

for (const [name, path] of Object.entries(FONTS)) {
  const out = new URL(`fonts/${name}`, import.meta.url);
  try { await access(out); continue; } catch {}
  const res = await fetch(BASE + encodeURI(path).replace(/\[/g, '%5B').replace(/\]/g, '%5D'));
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log('ok', name);
}
