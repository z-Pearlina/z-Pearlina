// Turns text into SVG path data. HarfBuzz does the shaping, so kerning and
// Arabic joining are correct and the SVG needs no font at all.
import { readFileSync } from 'node:fs';
import * as hb from 'harfbuzzjs';

export function loadFont(name, wght) {
  const data = readFileSync(new URL(`../fonts/${name}.ttf`, import.meta.url));
  const face = new hb.Face(new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.length)));
  const font = new hb.Font(face);
  if (wght) font.setVariations([hb.Variation.fromString(`wght=${wght}`)]);
  return { font, upem: face.upem };
}

const num = (n) => +n.toFixed(1);

function transformPath(d, scale, ox, oy) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let out = '';
  let isX = true;
  let sep = '';
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) { out += t; isX = true; sep = ''; continue; }
    const v = isX ? ox + +t * scale : oy - +t * scale;
    out += sep + num(v);
    sep = ' ';
    isX = !isX;
  }
  return out;
}

export function textPath(f, str, { size, x = 0, y = 0, anchor = 'start', tracking = 0 }) {
  const buffer = new hb.Buffer();
  buffer.addText(str);
  buffer.guessSegmentProperties();
  hb.shape(f.font, buffer);
  const infos = buffer.getGlyphInfos();
  const pos = buffer.getGlyphPositions();
  const s = size / f.upem;
  const width = pos.reduce((w, p) => w + p.xAdvance * s + tracking, -tracking);
  let pen = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
  let d = '';
  infos.forEach((g, i) => {
    const p = pos[i];
    const glyph = f.font.glyphToPath(g.codepoint);
    if (glyph) d += transformPath(glyph, s, pen + p.xOffset * s, y - p.yOffset * s);
    pen += p.xAdvance * s + tracking;
  });
  return { d, width };
}
