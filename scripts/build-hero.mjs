// Builds assets/hero-day.svg and assets/hero-night.svg.
import { writeFileSync } from 'node:fs';
import { loadFont, textPath } from './lib/text.mjs';
import { paintCloud } from './lib/clouds.mjs';
import { rng, noise2 } from './lib/noise.mjs';

const W = 1280, H = 600;

const THEMES = {
  day: {
    sky: [['0', '#8FC2E0'], ['.42', '#B5D9EC'], ['.66', '#CFE6F2'], ['.84', '#F7F1E1']],
    clouds: ['#B4CDDF', '#D2E2EA', '#F0F1E9', '#FFFDF5'],
    far: ['#C4DBE6', '#D9E7EA', '#EEF0E8', '#F8F5EA'],
    ink: '#22313F', hillFar: '#A8C6A8', hillMid: '#8FB488', meadow: '#7FA77A', meadowDeep: '#5F8A63',
    blade: ['#5F8A63', '#7FA77A', '#A3C08F'], wind: '#FFFDF4', glow: '#FFF3C4', trail: '#22313F', plane: ['#FFFCF2', '#E6DFCB', '#C9BFA6'], flower: '#F7F1E1',
  },
  night: {
    sky: [['0', '#0B1A2E'], ['.5', '#14294A'], ['.72', '#1B3352'], ['.84', '#2C4A6B']],
    clouds: ['#27405F', '#30496B', '#3B5679', '#4D6B8C'],
    far: ['#1A3050', '#21395B', '#2A4464', '#34506F'],
    ink: '#F3EAD3', hillFar: '#1D3A50', hillMid: '#1A3A47', meadow: '#1C4040', meadowDeep: '#13303A',
    blade: ['#16343D', '#2A5550', '#4F7F6C'], wind: '#CFE0EC', glow: '#F3EAD3', trail: '#F3EAD3', plane: ['#F3EAD3', '#C7CCC8', '#8FA3B4'], flower: '#CFE0EC',
  },
};

// ---- shapes shared by both themes ----

const cloudProfile = (peaks) => (u) => {
  let v = 0;
  for (const [c, wid, amp] of peaks) v = Math.max(v, amp * Math.exp(-(((u - c) / wid) ** 2)));
  return v;
};

console.log('painting clouds…');
const tower = paintCloud({
  width: 860, height: 560, seed: 41, res: 3, puffs: 420,
  profile: cloudProfile([[0.3, 0.15, 1], [0.52, 0.16, 0.72], [0.12, 0.12, 0.4], [0.78, 0.16, 0.42]]),
});
const small = [
  { width: 300, height: 130, seed: 7, puffs: 60, res: 2.5, profile: cloudProfile([[0.4, 0.28, 0.9], [0.72, 0.2, 0.55]]) },
  { width: 220, height: 96, seed: 19, puffs: 42, res: 2.5, profile: cloudProfile([[0.5, 0.3, 0.9]]) },
  { width: 380, height: 150, seed: 28, puffs: 80, res: 3, profile: cloudProfile([[0.3, 0.2, 0.7], [0.6, 0.24, 1]]) },
].map((c) => ({ ...c, layers: paintCloud(c) }));

const hill = (seed, y, amp, tilt = 0) => {
  const n = noise2(seed);
  const pts = [];
  for (let x = -20; x <= W + 20; x += 24) {
    pts.push([x, y + (n(x / 340, 1, 3) - 0.5) * amp + tilt * (x / W - 0.5)]);
  }
  let d = `M-20 ${H + 10}L${pts[0][0]} ${pts[0][1].toFixed(0)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0]} ${pts[i][1].toFixed(0)} ${mx.toFixed(0)} ${my.toFixed(0)}`;
  }
  return { d: `${d}L${W + 20} ${H + 10}Z`, top: (x) => y + (n(x / 340, 1, 3) - 0.5) * amp + tilt * (x / W - 0.5) };
};

const hillFar = hill(3, 478, 46, -14);
const hillMid = hill(5, 505, 54, 24);
const meadow = hill(9, 548, 40, -18);

function grassPath(rand, spread, count, hMin, hMax) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = Math.round((rand() - 0.5) * spread);
    const y = Math.round(rand() * 12);
    const h = hMin + rand() * (hMax - hMin);
    const lean = (rand() - 0.25) * h * 0.5;
    const w = 2 + rand() * 2.4;
    const r = Math.round;
    d += `M${x} ${y}Q${r(x + lean * 0.3)} ${r(y - h * 0.6)} ${r(x + lean)} ${r(y - h)}Q${r(x + lean * 0.3 + w)} ${r(y - h * 0.55)} ${r(x + w)} ${y}Z`;
  }
  return d;
}

const clusters = [];
{
  const rand = rng(77);
  for (let row = 0; row < 3; row++) {
    const step = [92, 76, 64][row];
    for (let x = -20; x < W + 60; x += step) {
      const px = x + rand() * 24;
      const py = row === 2 ? H + 6 : row === 1 ? meadow.top(px) + 44 : meadow.top(px) + 10;
      clusters.push({
        x: Math.round(px), y: Math.round(py), row,
        d: grassPath(rand, step * 1.45, [20, 26, 34][row], [20, 30, 40][row], [40, 62, 92][row]),
        delay: -((px / W) * 7 + rand() * 0.9).toFixed(2),
        dur: (6.5 + rand() * 1.5).toFixed(1),
      });
    }
  }
}

const flowers = [];
{
  const rand = rng(12);
  for (let i = 0; i < 34; i++) {
    const x = rand() * W;
    flowers.push([Math.round(x), Math.round(meadow.top(x) + 4 + rand() * 30), (1.6 + rand() * 1.8).toFixed(1)]);
  }
}

const stars = [];
{
  const rand = rng(31);
  for (let i = 0; i < 90; i++) stars.push([Math.round(rand() * W), Math.round(rand() * 400), (0.6 + rand() * 1.3).toFixed(1), (0.25 + rand() * 0.6).toFixed(2)]);
}

// ---- the paper plane's flight ----

const route = [[-110, 400], [150, 446], [430, 446], [690, 420], [850, 356], [960, 262], [1080, 196], [1210, 120], [1380, 30]];

function catmull(points, steps = 26) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, points.length - 1)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(points.at(-1));
  return out;
}

const curve = catmull(route);
const lengths = [0];
for (let i = 1; i < curve.length; i++) lengths.push(lengths[i - 1] + Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1]));
const flightLength = lengths.at(-1);
const flightD = 'M' + curve.filter((_, i) => i % 4 === 0 || i === curve.length - 1).map(([x, y]) => `${x.toFixed(0)} ${y.toFixed(0)}`).join('L');

function pointAt(s) {
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const f = (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
  const a = curve[i - 1], b = curve[i];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}

const FLIGHT_END = 74; // % of the loop spent crossing the frame
function planeFrames() {
  const rows = [];
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = pointAt(t * flightLength);
    const sway = Math.sin(t * Math.PI * 5) * 5;
    const pct = (t * FLIGHT_END).toFixed(1);
    rows.push(`${pct}%{transform:translate(${p.x.toFixed(1)}px,${(p.y + sway).toFixed(1)}px) rotate(${(p.angle + sway * 0.6).toFixed(1)}deg)}`);
  }
  const end = pointAt(flightLength);
  rows.push(`100%{transform:translate(${end.x.toFixed(0)}px,${end.y.toFixed(0)}px) rotate(${end.angle.toFixed(0)}deg)}`);
  return rows.join('');
}

// ---- type ----

const serif = loadFont('Cormorant', 600);
const serifMed = loadFont('Cormorant', 500);
const italic = loadFont('CormorantItalic', 500);
const ruqaa = loadFont('ArefRuqaa');
const hand = loadFont('Caveat', 500);
const brush = loadFont('YujiBoku');

const TEXT_X = 88;
const name = textPath(serif, 'Zineb Zouaoui', { size: 128, x: TEXT_X, y: 176, tracking: 1 });
const arabic = textPath(ruqaa, 'زينب زواوي', { size: 84, x: TEXT_X, y: 278 });
const role1 = textPath(serifMed, 'Mobile & Web Developer', { size: 46, x: TEXT_X, y: 350 });
const role2 = textPath(italic, 'Exploring Post-Quantum Security', { size: 46, x: TEXT_X, y: 402 });
const note = textPath(hand, 'test flight no. 1', { size: 40, x: 1010, y: 438 });
const seal = textPath(brush, '風', { size: 62, x: 0, y: 22, anchor: 'middle' });
const sealX = TEXT_X + arabic.width + 58, sealY = 252;

// ---- assembly ----

const planeShape = (c, ink) => `<g stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"><path fill="${c[0]}" d="M34 0-30-19-13 1Z"/><path fill="${c[1]}" d="M34 0-13 1-25 15Z"/><path fill="${c[2]}" d="M34 0-13 1-19 9Z"/></g>`;

const cloudGroup = (layers, tones) => layers.map((d, i) => `<path fill="${i === 0 ? 'url(#under)' : tones[i]}" d="${d}"/>`).join('');

const css = `
@keyframes far{to{transform:translateX(-1600px)}}
@keyframes mid{to{transform:translateX(-1500px)}}
@keyframes breathe{from{transform:translateX(0)}to{transform:translateX(-38px)}}
@keyframes sway{from{transform:skewX(-3deg)}to{transform:skewX(6deg)}}
@keyframes gust{0%{stroke-dashoffset:900;opacity:0}15%{opacity:.75}70%{opacity:.6}100%{stroke-dashoffset:-500;opacity:0}}
@keyframes fly{${planeFrames()}}
@keyframes draw{0%{stroke-dashoffset:${flightLength.toFixed(0)}}${FLIGHT_END}%,100%{stroke-dashoffset:0}}
@keyframes fade{0%,4%{opacity:0}12%,80%{opacity:.5}97%,100%{opacity:0}}
.far{animation:far 120s linear infinite}
.mid{animation:mid 76s linear infinite}
.tower{animation:breathe 90s ease-in-out infinite alternate}
.s{animation:sway ease-in-out infinite alternate}
.w{stroke-dasharray:260 900;animation:gust linear infinite}
.fly{animation:fly 15s linear infinite}
.draw{stroke-dasharray:${flightLength.toFixed(0)};animation:draw 15s linear infinite}
.trail{animation:fade 15s linear infinite}
@media (prefers-reduced-motion:reduce){
.far,.mid,.tower,.s,.w,.draw,.trail{animation:none}
.w{opacity:.5;stroke-dashoffset:0}
.draw{stroke-dashoffset:0}
.trail{opacity:.45}
.fly{animation:none;transform:translate(${pointAt(flightLength * 0.66).x.toFixed(0)}px,${pointAt(flightLength * 0.66).y.toFixed(0)}px) rotate(${pointAt(flightLength * 0.66).angle.toFixed(0)}deg)}
}`;

const winds = [
  ['M-40 300C200 270 330 330 560 296S900 270 1320 300', 21, 0],
  ['M-40 62C260 40 520 84 760 54S1000 40 1320 66', 27, -9],
  ['M-40 452C240 430 420 470 700 440S1050 420 1320 452', 24, -15],
];

function build(mode) {
  const t = THEMES[mode];
  const farLayer = [[0, 356, 0.8], [520, 372, 0.6], [1010, 350, 0.72]];
  const farClouds = [...farLayer, ...farLayer.map(([x, y, s]) => [x + 1600, y, s])];
  const midLayer = [[120, -30, 1], [980, -8, 2]];
  const midClouds = [...midLayer, ...midLayer.map(([x, y, i]) => [x + 1500, y, i])];
  const useCloud = (id, x, y, s = 1) => `<use href="#${id}" transform="translate(${x} ${y})${s === 1 ? '' : ` scale(${s})`}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Zineb Zouaoui, زينب زواوي. Mobile and Web Developer, exploring post-quantum security. A paper airplane glides over a summer meadow under tall clouds.</title>
<style>${css}</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${t.sky.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>
<linearGradient id="under" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="${t.clouds[0]}"/><stop offset="1" stop-color="${t.clouds[0]}" stop-opacity=".35"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${t.glow}" stop-opacity="${mode === 'day' ? '.85' : '.22'}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky.at(-1)[1]}" stop-opacity="0"/><stop offset="1" stop-color="${t.sky.at(-1)[1]}"/></linearGradient>
<linearGradient id="fadeHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.meadow}"/><stop offset="1" stop-color="${t.meadowDeep}"/></linearGradient>
<mask id="reveal" maskUnits="userSpaceOnUse" x="-150" y="0" width="1600" height="${H}"><path class="draw" d="${flightD}" fill="none" stroke="#fff" stroke-width="16"/></mask>
<filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 ${mode === 'day' ? '.3' : '.9'} 0 0 0 0 ${mode === 'day' ? '.25' : '.9'} 0 0 0 0 ${mode === 'day' ? '.15' : '.9'} 0 0 0 .55 -.2"/></filter>
<g id="tower">${cloudGroup(tower, t.clouds)}</g>
${small.map((c, i) => `<g id="m${i}">${cloudGroup(c.layers, t.clouds)}</g><g id="f${i}">${cloudGroup(c.layers, t.far).replace('url(#under)', t.far[0])}</g>`).join('\n')}
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${mode === 'night' ? `<g fill="#F3EAD3">${stars.map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`).join('')}</g>` : ''}
<circle cx="1205" cy="74" r="${mode === 'day' ? 300 : 220}" fill="url(#glow)"/>
${mode === 'night' ? '<path fill="#F3EAD3" transform="translate(82 -8)" d="M1136 50A36 36 0 1 0 1152 106 30 30 0 1 1 1136 50Z"/>' : ''}
<g class="far">${farClouds.map(([x, y, s], i) => useCloud(`f${i % 3}`, x, y, s)).join('')}</g>
<g class="mid">${midClouds.map(([x, y, i]) => useCloud(`m${i}`, x, y, i === 2 ? 0.8 : 0.9)).join('')}</g>
<g class="tower">${useCloud('tower', 660, 6)}</g>
<rect y="360" width="${W}" height="130" fill="url(#mist)"/>
<g fill="none" stroke="${t.wind}" stroke-width="1.6" stroke-linecap="round">${winds.map(([d, dur, del]) => `<path class="w" d="${d}" style="animation-duration:${dur}s;animation-delay:${del}s"/>`).join('')}</g>
<g mask="url(#reveal)"><path class="trail" d="${flightD}" fill="none" stroke="${t.trail}" stroke-width="1.8" stroke-dasharray="3 11" stroke-linecap="round"/></g>
<g class="fly">${planeShape(t.plane, t.ink)}</g>
<path d="${hillFar.d}" fill="${t.hillFar}"/>
<path d="${hillMid.d}" fill="${t.hillMid}"/>
<path d="${meadow.d}" fill="url(#fadeHill)"/>
<g fill="${t.flower}">${flowers.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity=".8"/>`).join('')}</g>
${[0, 1, 2].map((row) => `<g fill="${t.blade[row]}">${clusters.filter((c) => c.row === row).map((c) => `<g transform="translate(${c.x} ${c.y})"><path class="s" style="animation-duration:${c.dur}s;animation-delay:${c.delay}s" d="${c.d}"/></g>`).join('')}</g>`).join('\n')}
<g fill="${t.ink}"><path d="${name.d}"/><path d="${arabic.d}"/><path d="${role1.d}"/><path d="${role2.d}"/><path d="${note.d}" opacity=".85"/></g>
<g transform="translate(${sealX.toFixed(0)} ${sealY}) rotate(-3)"><rect x="-37" y="-37" width="74" height="74" rx="9" fill="#C8553D" filter="url(#rough)"/><path d="${seal.d}" fill="${mode === 'day' ? '#F4ECD8' : '#F3EAD3'}"/></g>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".16"/>
</svg>
`;
}

for (const mode of ['day', 'night']) {
  const svg = build(mode);
  const out = new URL(`../assets/hero-${mode}.svg`, import.meta.url);
  writeFileSync(out, svg);
  console.log(mode, (svg.length / 1024).toFixed(0), 'KB');
}
