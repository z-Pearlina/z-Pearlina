// Builds every README image except the hero and the contribution sky.
// Edit the text below and run: npm run parts
import { writeFileSync } from 'node:fs';
import * as icons from 'simple-icons';
import { loadFont, textPath } from './lib/text.mjs';
import { rng } from './lib/noise.mjs';

const PAPER = '#F4ECD8', DAY_INK = '#22313F', CREAM = '#F3EAD3', RED = '#C8553D', SUN = '#F2C14E', MEADOW = '#7FA77A';
const THEME = {
  day: { ink: DAY_INK, soft: '#4C5B68', line: '#22313F', panel: PAPER, screw: '#B9AD92', grass: ['#5F8A63', '#7FA77A', '#A3C08F'], plane: ['#FFFCF2', '#E6DFCB', '#C9BFA6'] },
  night: { ink: CREAM, soft: '#C5C4B6', line: '#F3EAD3', panel: '#12243C', screw: '#3B5679', grass: ['#16343D', '#2A5550', '#4F7F6C'], plane: ['#F3EAD3', '#C7CCC8', '#8FA3B4'] },
};

const serif = loadFont('Cormorant', 600);
const serifMed = loadFont('Cormorant', 500);
const italic = loadFont('CormorantItalic', 500);
const hand = loadFont('Caveat', 500);
const mono = loadFont('PlexMono');
const amiri = loadFont('Amiri');
const brush = loadFont('YujiBoku');

const write = (name, svg) => {
  writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg);
  console.log(name.padEnd(24), (svg.length / 1024).toFixed(1), 'KB');
};

const open = (w, h, title, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t">
<title id="t">${title}</title>
${style ? `<style>${style}</style>` : ''}`;

const planeShape = (c, ink, s = 1) => `<g transform="scale(${s})" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"><path fill="${c[0]}" d="M34 0-30-19-13 1Z"/><path fill="${c[1]}" d="M34 0-13 1-25 15Z"/><path fill="${c[2]}" d="M34 0-13 1-19 9Z"/></g>`;

const seal = (x, y, size = 74) => {
  const glyph = textPath(brush, '風', { size: size * 0.84, x: 0, y: size * 0.3, anchor: 'middle' });
  return `<g transform="translate(${x} ${y}) rotate(-3)"><rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size / 8}" fill="${RED}"/><path d="${glyph.d}" fill="${PAPER}"/></g>`;
};

// ---- quote strip ----

function quote(mode) {
  const t = THEME[mode];
  const W = 1012, H = 170, cx = W / 2, y = 92;
  const fr = textPath(italic, 'Le vent se lève, il faut tenter de vivre.', { size: 52, x: cx, y, anchor: 'middle' });
  const en = textPath(italic, 'The wind is rising — we must try to live.', { size: 52, x: cx, y, anchor: 'middle' });
  const ar = textPath(amiri, '«تهبّ الريح… فلنحاول أن نحيا»', { size: 54, x: cx, y, anchor: 'middle' });
  const credit = textPath(hand, 'Paul Valéry, 1920', { size: 34, x: cx, y: 148, anchor: 'middle' });
  const css = `
@keyframes a{0%,2%{opacity:0}7%,29%{opacity:1}34%,100%{opacity:0}}
@keyframes wave{to{stroke-dashoffset:-96}}
.q{opacity:0;animation:a 24s ease-in-out infinite}
.e{animation-delay:-16s}.r{animation-delay:-8s}
.w{animation:wave 12s linear infinite}
@media (prefers-reduced-motion:reduce){.q,.w{animation:none}.q{opacity:0}.e{opacity:1}}`;
  return `${open(W, H, 'A line by Paul Valéry, 1920, fading between French, English and Arabic: The wind is rising, we must try to live.', css)}
<path class="w" d="M216 24C330 8 420 36 506 22S700 8 796 24" fill="none" stroke="${t.line}" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="58 38"/>
<g fill="${t.ink}"><path class="q" d="${fr.d}"/><path class="q e" d="${en.d}"/><path class="q r" d="${ar.d}"/></g>
<path d="${credit.d}" fill="${t.soft}"/>
</svg>
`;
}

// ---- contact buttons ----

function button(label, iconSvg, width, title) {
  const h = 56;
  const text = textPath(mono, label, { size: 20, x: 56, y: 35 });
  return `${open(width, h, title)}
<rect x="1" y="1" width="${width - 2}" height="${h - 2}" rx="7" fill="${PAPER}" stroke="${DAY_INK}" stroke-width="1.5"/>
<rect x="5" y="5" width="${width - 10}" height="${h - 10}" rx="4" fill="none" stroke="${DAY_INK}" stroke-opacity=".3"/>
<g fill="${DAY_INK}">${iconSvg}<path d="${text.d}"/></g>
</svg>
`;
}

const inMark = (() => {
  const g = textPath(serif, 'in', { size: 30, x: 32, y: 38, anchor: 'middle' });
  return `<rect x="17" y="13" width="30" height="30" rx="5"/><path d="${g.d}" fill="${PAPER}"/>`;
})();
const envelope = `<g fill="none" stroke="${DAY_INK}" stroke-width="2" stroke-linejoin="round"><rect x="17" y="16" width="30" height="24" rx="2"/><path d="M18 18l14 12 14-12"/></g>`;

// ---- section headings ----

function heading(mode, no, title) {
  const t = THEME[mode];
  const W = 1012, H = 92;
  const label = textPath(mono, `LOG ${no}`, { size: 28, x: 0, y: 62 });
  const name = textPath(serif, title, { size: 54, x: label.width + 22, y: 64 });
  const start = Math.round(label.width + name.width + 46);
  return `${open(W, H, `Log ${no}: ${title}`)}
<path d="${label.d}" fill="${RED}"/>
<path d="${name.d}" fill="${t.ink}"/>
<path d="M${start} 52H${W - 60}" stroke="${t.line}" stroke-opacity=".5" stroke-width="1.8" stroke-dasharray="3 10" stroke-linecap="round"/>
<g transform="translate(${W - 34} 48) rotate(-9)">${planeShape(t.plane, t.ink, 0.72)}</g>
</svg>
`;
}

// ---- instrument panel ----

const windGlyph = (color) => `<path d="M3 9h11a3 3 0 1 0-3-3M3 14h16a3 3 0 1 1-3 3M3 19h8" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
const latticeGlyph = (color) => `<g fill="${color}">${[4, 12, 20].flatMap((x) => [4, 12, 20].map((y) => `<circle cx="${x}" cy="${y}" r="1.9"/>`)).join('')}</g><path d="M4 20 12 12 20 4M4 12h16" fill="none" stroke="${color}" stroke-width="1.4"/>`;
const sealGlyph = (color) => `<path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6Z" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/><path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

const BAYS = [
  { title: 'Mobile', rows: [['React Native', icons.siReact], ['Expo', icons.siExpo], ['TypeScript', icons.siTypescript], ['NativeWind', windGlyph]] },
  { title: 'Web', rows: [['Next.js', icons.siNextdotjs], ['TypeScript', icons.siTypescript], ['Tailwind CSS', icons.siTailwindcss], ['Framer Motion', icons.siFramer]] },
  { title: 'Backend & data', rows: [['Supabase', icons.siSupabase]] },
  { title: 'Security', tag: '(learning)', rows: [['Post-quantum', latticeGlyph], ['Digital signatures', sealGlyph]] },
];

function dial(t, x, y, r, delay) {
  let ticks = '';
  for (let a = -120; a <= 120; a += 20) {
    const major = a % 60 === 0;
    const rad = ((a - 90) * Math.PI) / 180;
    const r1 = r - (major ? 12 : 7), r2 = r - 3;
    ticks += `M${(Math.cos(rad) * r1).toFixed(1)} ${(Math.sin(rad) * r1).toFixed(1)}L${(Math.cos(rad) * r2).toFixed(1)} ${(Math.sin(rad) * r2).toFixed(1)}`;
  }
  return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="none" stroke="${t.line}" stroke-width="1.6"/><circle r="${r - 3}" fill="none" stroke="${t.line}" stroke-opacity=".3"/><path d="${ticks}" stroke="${t.line}" stroke-width="1.4"/><g class="n" style="animation-delay:${delay}s"><path d="M0 8V${-(r - 13)}" stroke="${RED}" stroke-width="2.6" stroke-linecap="round"/></g><circle r="4" fill="${t.ink}"/></g>`;
}

function panel(mode) {
  const t = THEME[mode];
  const W = 1012, gap = 24, bayW = (W - gap) / 2;
  const heights = [340, 224];
  const css = `
@keyframes n{from{transform:rotate(-26deg)}to{transform:rotate(30deg)}}
.n{animation:n 16s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){.n{animation:none;transform:rotate(12deg)}}`;
  const bay = (b, i) => {
    const x = i % 2 ? bayW + gap : 0;
    const row = i < 2 ? 0 : 1;
    const y = row ? heights[0] + gap : 0;
    const h = heights[row];
    const head = textPath(serif, b.title, { size: 42, x: 28, y: 56 });
    const tag = b.tag ? textPath(hand, b.tag, { size: 36, x: 28 + head.width + 14, y: 56 }) : null;
    const rows = b.rows.map(([label, icon], r) => {
      const ry = 84 + r * 60;
      const text = textPath(mono, label, { size: 30, x: 92, y: ry + 34 });
      const glyph = typeof icon === 'function' ? icon(t.ink) : `<path d="${icon.path}" fill="${t.ink}"/>`;
      return `<g transform="translate(36 ${ry}) scale(1.75)">${glyph}</g><path d="${text.d}" fill="${t.ink}"/>`;
    }).join('');
    const corners = [[14, 14], [bayW - 14, 14], [14, h - 14], [bayW - 14, h - 14]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="4" fill="${t.screw}"/>`).join('');
    return `<g transform="translate(${x} ${y})"><rect x="1" y="1" width="${bayW - 2}" height="${h - 2}" rx="12" fill="${t.panel}" stroke="${t.line}" stroke-width="1.6"/><rect width="${bayW}" height="${h}" rx="12" fill="url(#grid)"/>${corners}<path d="${head.d}" fill="${t.ink}"/>${tag ? `<path d="${tag.d}" fill="${RED}"/>` : ''}${rows}${dial(t, bayW - 76, 74, 46, -i * 5)}</g>`;
  };
  const total = heights[0] + gap + heights[1];
  return `${open(W, total, 'Instrument panel of tools. Mobile: React Native, Expo, TypeScript, NativeWind. Web: Next.js, TypeScript, Tailwind CSS, Framer Motion. Backend and data: Supabase. Security, still learning: post-quantum cryptography and digital signatures.', css)}
<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${t.line}" stroke-opacity=".06"/></pattern></defs>
${BAYS.map(bay).join('\n')}
</svg>
`;
}

// ---- drafting sheet: the thesis note ----

function sheet() {
  const W = 1012, H = 560;
  const ink = DAY_INK;
  const text = (f, s, o) => `<path d="${textPath(f, s, o).d}"/>`;
  const box = (x, a, b, accent) => `<rect x="${x}" y="230" width="250" height="112" rx="4" fill="${accent ? '#EFE3C4' : 'none'}" stroke="${ink}" stroke-width="1.8"/>${text(mono, a, { size: 29, x: x + 125, y: 277, anchor: 'middle' })}${text(mono, b, { size: 29, x: x + 125, y: 315, anchor: 'middle' })}`;
  const arrow = (x) => `<path d="M${x} 286h48" fill="none" stroke="${ink}" stroke-width="1.8" stroke-dasharray="6 6"/><path d="M${x + 44} 277l14 9-14 9Z"/>`;
  const cell = (x, w, label, value) => `<path d="M${x} 396V${H - 40}" stroke="${ink}" stroke-width="1.4"/>${text(mono, label, { size: 21, x: x + 16, y: 430 })}${text(serifMed, value, { size: 38, x: x + 16, y: 482 })}`;
  return `${open(W, H, 'Drafting sheet. Master\'s thesis, in progress: migrating digital signatures to post-quantum cryptography, with mobile software-license verification as the case study. Drawn by Zineb Zouaoui.')}
<rect width="${W}" height="${H}" rx="6" fill="${PAPER}"/>
<rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${ink}" stroke-width="2.4"/>
<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="${ink}" stroke-opacity=".4"/>
<g fill="${ink}">
${text(serif, 'Migrating digital signatures', { size: 58, x: 62, y: 96 })}
${text(serif, 'to post-quantum cryptography', { size: 58, x: 62, y: 152 })}
${text(hand, 'case study: license checks on mobile', { size: 38, x: 64, y: 206 })}
${box(62, 'classical', 'signature', false)}${arrow(320)}${box(381, 'post-quantum', 'signature', true)}${arrow(639)}${box(700, 'license check', 'on mobile', false)}
</g>
<g fill="${ink}" stroke-linejoin="round">
<path d="M30 396H${W - 30}" stroke="${ink}" stroke-width="1.8"/>
${text(mono, 'DRAWN BY', { size: 21, x: 62, y: 430 })}${text(serifMed, 'Zineb Zouaoui', { size: 38, x: 62, y: 482 })}
${cell(340, 300, 'SUBJECT', 'Master\'s thesis')}
${cell(640, 220, 'STATUS', 'In progress')}
</g>
<path d="M860 396V${H - 40}" stroke="${ink}" stroke-width="1.4"/>
${seal(918, 462, 78)}
</svg>
`;
}

// ---- footer strip ----

function footer(mode) {
  const t = THEME[mode];
  const W = 1012, H = 170;
  const rand = rng(23);
  let groups = '';
  for (let row = 0; row < 3; row++) {
    const step = [80, 68, 56][row];
    let cluster = '';
    for (let x = -10; x < W + 40; x += step) {
      let d = '';
      for (let i = 0; i < [18, 24, 28][row]; i++) {
        const bx = Math.round((rand() - 0.5) * step * 1.4);
        const h = [34, 48, 62][row] + rand() * 34;
        const lean = (rand() - 0.25) * h * 0.5;
        const r = Math.round;
        d += `M${bx} 0Q${r(bx + lean * 0.3)} ${r(-h * 0.6)} ${r(bx + lean)} ${r(-h)}Q${r(bx + lean * 0.3 + 3)} ${r(-h * 0.5)} ${bx + 3} 0Z`;
      }
      const delay = -(((x / W) * 7 + rand()).toFixed(2));
      cluster += `<g transform="translate(${x} ${H + 2 - (2 - row) * 8})"><path class="s" style="animation-delay:${delay}s" d="${d}"/></g>`;
    }
    groups += `<g fill="${t.grass[row]}">${cluster}</g>`;
  }
  const css = `
@keyframes s{from{transform:skewX(-4deg)}to{transform:skewX(7deg)}}
@keyframes f{0%{transform:translate(-60px,70px) rotate(-4deg)}50%{transform:translate(500px,48px) rotate(-1deg)}80%,100%{transform:translate(1080px,18px) rotate(-5deg)}}
.s{animation:s 7s ease-in-out infinite alternate}
.f{animation:f 14s linear infinite}
@media (prefers-reduced-motion:reduce){.s,.f{animation:none}.f{transform:translate(760px,44px) rotate(-3deg)}}`;
  return `${open(W, H, 'Wind moving through tall grass, with a tiny paper airplane passing above it.', css)}
<g class="f">${planeShape(t.plane, t.ink, 0.62)}</g>
${groups}
</svg>
`;
}

for (const mode of ['day', 'night']) {
  write(`quote-${mode}`, quote(mode));
  write(`stack-${mode}`, panel(mode));
  write(`footer-${mode}`, footer(mode));
  write(`heading-about-${mode}`, heading(mode, '01', 'About'));
  write(`heading-stack-${mode}`, heading(mode, '02', 'Instruments'));
  write(`heading-table-${mode}`, heading(mode, '03', 'On the drafting table'));
  write(`heading-sky-${mode}`, heading(mode, '04', 'Sky log'));
}
write('thesis-sheet', sheet());
write('button-linkedin', button('LinkedIn', inMark, 176, 'LinkedIn'));
write('button-email', button('pearlinadev@gmail.com', envelope, 322, 'Email pearlinadev@gmail.com'));
