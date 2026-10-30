// Renders the last year of GitHub activity as a flight log. Each active week
// raises a cumulus from the horizon, taller when busier; the paper plane climbs
// over them, and a drafting scale below shows every week.
// In the Action it reads the calendar with GITHUB_TOKEN; without a token it
// falls back to the public calendar page. Output: OUT_DIR (default ../preview/output).
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFont, textPath } from './lib/text.mjs';
import { paintCloud } from './lib/clouds.mjs';
import { rng } from './lib/noise.mjs';

const LOGIN = process.env.LOGIN ?? 'z-Pearlina';
const OUT = resolve(process.env.OUT_DIR ?? new URL('../preview/output', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

async function fromApi() {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (json.errors || !res.ok) throw new Error(JSON.stringify(json));
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return { total: cal.totalContributions, weeks: cal.weeks.map((w) => ({ date: w.contributionDays[0].date, count: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0) })) };
}

async function fromPublicPage() {
  const html = await (await fetch(`https://github.com/users/${LOGIN}/contributions`)).text();
  const dates = new Map([...html.matchAll(/data-date="([\d-]+)" id="([^"]+)"/g)].map((m) => [m[2], m[1]]));
  const counts = new Map();
  for (const m of html.matchAll(/for="([^"]+)"[^>]*>([\d,]+) contributions? on/g)) counts.set(dates.get(m[1]), +m[2].replace(/,/g, ''));
  const days = [...dates.values()].sort();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    weeks.push({ date: slice[0], count: slice.reduce((s, d) => s + (counts.get(d) ?? 0), 0) });
  }
  return { total: weeks.reduce((s, w) => s + w.count, 0), weeks };
}

const { total, weeks } = process.env.GITHUB_TOKEN ? await fromApi().catch(fromPublicPage) : await fromPublicPage();

const W = 1012, H = 492, HORIZON = 346, RED = '#C8553D', PAPER = '#F4ECD8', DAY_INK = '#22313F';
const THEMES = {
  day: {
    sky: [['0', '#8FC2E0'], ['.42', '#B5D9EC'], ['.6', '#CFE6F2'], ['.72', '#F7F1E1']],
    clouds: ['#B4CDDF', '#D2E2EA', '#F0F1E9', '#FFFDF5'], far: '#DCE8E8', ink: DAY_INK, wind: '#FFFDF4', glow: '#FFF3C4',
    hill: '#A8C6A8', meadow: '#7FA77A', meadowDeep: '#5F8A63', blades: ['#5F8A63', '#A3C08F'], plane: ['#FFFCF2', '#E6DFCB', '#C9BFA6'], haze: '#F7F1E1',
  },
  night: {
    sky: [['0', '#0B1A2E'], ['.45', '#14294A'], ['.6', '#1B3352'], ['.72', '#2C4A6B']],
    clouds: ['#27405F', '#30496B', '#3B5679', '#4D6B8C'], far: '#27425F', ink: '#F3EAD3', wind: '#CFE0EC', glow: '#F3EAD3',
    hill: '#1D3A50', meadow: '#1C4040', meadowDeep: '#13303A', blades: ['#16343D', '#4F7F6C'], plane: ['#F3EAD3', '#C7CCC8', '#8FA3B4'], haze: '#2C4A6B',
  },
};

// ---- reading the data ----

const max = Math.max(...weeks.map((w) => w.count), 1);
const step = (W - 96) / Math.max(weeks.length - 1, 1);
const weekX = (i) => 48 + i * step;
const peakIndex = weeks.reduce((best, w, i) => (w.count > weeks[best].count ? i : best), 0);

const STAMP_W = 320, STAMP_H = 240;
const stamps = [
  [[0.42, 0.2, 1], [0.7, 0.16, 0.62], [0.2, 0.13, 0.5]],
  [[0.56, 0.2, 1], [0.28, 0.17, 0.66], [0.82, 0.12, 0.44]],
  [[0.48, 0.15, 1], [0.72, 0.17, 0.72], [0.24, 0.16, 0.6]],
].map((peaks, i) => paintCloud({
  width: STAMP_W, height: STAMP_H, seed: [17, 58, 91][i], puffs: 170, res: 2,
  profile: (u) => peaks.reduce((v, [c, w, a]) => Math.max(v, a * Math.exp(-(((u - c) / w) ** 2))), 0.16),
}));

const rand = rng(5);
const BASE = HORIZON + 6;
const clouds = weeks.map((w, i) => {
  if (!w.count) return null;
  const size = 0.3 + 0.8 * Math.sqrt(w.count / max);
  // A stamp's base sits at 86% of its height; the base stays on the horizon.
  return { i, size, stamp: i % 3, cx: weekX(i), x: weekX(i) - STAMP_W * 0.5 * size, y: BASE - STAMP_H * 0.86 * size + rand() * 6, top: BASE - STAMP_H * 0.8 * size };
}).filter(Boolean).sort((a, b) => b.size - a.size);

// The plane's altitude: a little above whatever cloud lies under it.
const ceiling = (x) => {
  let y = 262;
  for (const c of clouds) {
    const fall = Math.exp(-(((x - c.cx) / (STAMP_W * 0.42 * c.size + 20)) ** 2));
    y = Math.min(y, 262 - (262 - (c.top - 34)) * fall);
  }
  return Math.max(y, 130);
};

const raw = [];
for (let x = -90; x <= W + 90; x += 8) raw.push([x, ceiling(x)]);
const curve = raw.map(([x], i) => {
  let sum = 0, n = 0;
  for (let k = -6; k <= 6; k++) {
    const p = raw[i + k];
    if (p) { sum += p[1]; n++; }
  }
  return [x, sum / n];
});
const lengths = [0];
for (let i = 1; i < curve.length; i++) lengths.push(lengths[i - 1] + Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1]));
const flightLength = lengths.at(-1);
const flightD = 'M' + curve.filter((_, i) => i % 3 === 0 || i === curve.length - 1).map(([x, y]) => `${x} ${y.toFixed(0)}`).join('L');

function pointAt(s) {
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const f = (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
  const a = curve[i - 1], b = curve[i];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}

const FLIGHT_END = 82;
const frames = [];
for (let i = 0; i <= 48; i++) {
  const p = pointAt((i / 48) * flightLength);
  frames.push(`${((i / 48) * FLIGHT_END).toFixed(1)}%{transform:translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.angle.toFixed(1)}deg)}`);
}
const lastPoint = pointAt(flightLength), restPoint = pointAt(flightLength * 0.72);
frames.push(`100%{transform:translate(${lastPoint.x.toFixed(0)}px,${lastPoint.y.toFixed(0)}px) rotate(${lastPoint.angle.toFixed(0)}deg)}`);

// ---- type and the drafting scale ----

const serif = loadFont('Cormorant', 600);
const mono = loadFont('PlexMono');
const hand = loadFont('Caveat', 500);
const summary = textPath(serif, `${total.toLocaleString('en-US')} contributions in the last year`, { size: 46, x: 30, y: 58 });
const subtitle = textPath(hand, 'taller clouds, busier weeks', { size: 34, x: 32, y: 96 });

const peakX = weekX(peakIndex);
const peakCloud = clouds.find((c) => c.i === peakIndex);
const noteRight = peakX < W * 0.6;
const noteAnchorX = noteRight ? peakX + STAMP_W * 0.42 * peakCloud.size + 26 : peakX - STAMP_W * 0.42 * peakCloud.size - 26;
const noteY = Math.max(peakCloud.top + 66, 150);
const peakNote = textPath(hand, `busiest week: ${weeks[peakIndex].count}`, { size: 36, x: noteAnchorX, y: noteY, anchor: noteRight ? 'start' : 'end' });

const leader = noteRight
  ? `M${(noteAnchorX - 8).toFixed(0)} ${noteY - 10}C${(noteAnchorX - 50).toFixed(0)} ${noteY - 34} ${(peakX + 44).toFixed(0)} ${(peakCloud.top + 2).toFixed(0)} ${(peakX + 12).toFixed(0)} ${(peakCloud.top + 14).toFixed(0)}`
  : `M${(noteAnchorX + 8).toFixed(0)} ${noteY - 10}C${(noteAnchorX + 50).toFixed(0)} ${noteY - 34} ${(peakX - 44).toFixed(0)} ${(peakCloud.top + 2).toFixed(0)} ${(peakX - 12).toFixed(0)} ${(peakCloud.top + 14).toFixed(0)}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SCALE_TOP = 402, SCALE_LINE = 446;
const labels = [];
{
  let last = -1;
  weeks.forEach((w, i) => {
    const m = +w.date.slice(5, 7) - 1;
    if (m !== last && m % 2 === 0 && i < weeks.length - 2) labels.push(textPath(mono, MONTHS[m], { size: 25, x: weekX(i), y: 474, anchor: 'middle' }).d);
    last = m;
  });
}
const quietTicks = weeks.map((w, i) => (w.count ? '' : `M${weekX(i).toFixed(1)} ${SCALE_LINE}v-6`)).join('');
const bars = weeks.map((w, i) => {
  if (!w.count) return '';
  const h = 8 + 28 * Math.sqrt(w.count / max);
  return `<rect x="${(weekX(i) - 3).toFixed(1)}" y="${(SCALE_LINE - h).toFixed(1)}" width="6" height="${h.toFixed(1)}" rx="1.5" fill="${i === peakIndex ? RED : DAY_INK}"/>`;
}).join('');

function grass() {
  const r = rng(61);
  const out = [[], []];
  for (let row = 0; row < 2; row++) {
    for (let x = -10; x < W + 40; x += 46) {
      let d = '';
      for (let i = 0; i < 16; i++) {
        const bx = Math.round((r() - 0.5) * 66), h = 22 + r() * (row ? 34 : 24), lean = (r() - 0.25) * h * 0.5;
        const rd = Math.round;
        d += `M${bx} 0Q${rd(bx + lean * 0.3)} ${rd(-h * 0.6)} ${rd(bx + lean)} ${rd(-h)}Q${rd(bx + lean * 0.3 + 3)} ${rd(-h * 0.5)} ${bx + 3} 0Z`;
      }
      out[row].push(`<g transform="translate(${x} ${row ? 412 : 398})"><path class="s" style="animation-delay:${-(((x / W) * 7 + r()).toFixed(2))}s" d="${d}"/></g>`);
    }
  }
  return out;
}
const blades = grass();

const stars = [];
{
  const r = rng(31);
  for (let i = 0; i < 70; i++) stars.push([Math.round(r() * W), Math.round(r() * 300), (0.6 + r() * 1.2).toFixed(1), (0.25 + r() * 0.6).toFixed(2)]);
}

function build(mode) {
  const t = THEMES[mode];
  const stampDefs = stamps.map((layers, i) => `<g id="c${i}">${layers.map((d, k) => `<path fill="${k ? t.clouds[k] : 'url(#under)'}" d="${d}"/>`).join('')}</g>`).join('');
  const css = `
@keyframes fly{${frames.join('')}}
@keyframes draw{0%{stroke-dashoffset:${flightLength.toFixed(0)}}${FLIGHT_END}%,100%{stroke-dashoffset:0}}
@keyframes trail{0%,4%{opacity:0}12%,88%{opacity:.6}98%,100%{opacity:0}}
@keyframes drift{from{transform:translateX(7px)}to{transform:translateX(-9px)}}
@keyframes far{to{transform:translateX(-1200px)}}
@keyframes gust{0%{stroke-dashoffset:760;opacity:0}15%{opacity:.7}70%{opacity:.55}100%{stroke-dashoffset:-420;opacity:0}}
@keyframes s{from{transform:skewX(-4deg)}to{transform:skewX(7deg)}}
.fly{animation:fly 18s linear infinite}
.draw{stroke-dasharray:${flightLength.toFixed(0)};animation:draw 18s linear infinite}
.trail{animation:trail 18s linear infinite}
.d{animation:drift 48s ease-in-out infinite alternate}
.far{animation:far 140s linear infinite}
.w{stroke-dasharray:200 760;animation:gust linear infinite}
.s{animation:s 7s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){
.d,.far,.w,.s,.draw,.trail{animation:none}
.w{opacity:0}.trail{opacity:.5}.draw{stroke-dashoffset:0}
.fly{animation:none;transform:translate(${restPoint.x.toFixed(0)}px,${restPoint.y.toFixed(0)}px) rotate(${restPoint.angle.toFixed(0)}deg)}
}`;
  const farHills = [0, 1].map((k) => `<path transform="translate(${k * 1200} 0)" d="M0 ${HORIZON}C60 ${HORIZON - 18} 110 ${HORIZON - 30} 180 ${HORIZON - 16}S300 ${HORIZON - 40} 380 ${HORIZON - 20}S520 ${HORIZON - 12} 600 ${HORIZON - 26}S760 ${HORIZON - 38} 860 ${HORIZON - 18}S1080 ${HORIZON - 30} 1200 ${HORIZON}Z"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">${total} contributions over the last year, drawn as a flight log. A cloud rises for each active week, taller when the week was busier, and a paper airplane climbs over them. The busiest week had ${weeks[peakIndex].count}.</title>
<style>${css}</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${t.sky.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>
<linearGradient id="under" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="${t.clouds[0]}"/><stop offset="1" stop-color="${t.clouds[0]}" stop-opacity=".4"/></linearGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.haze}" stop-opacity="0"/><stop offset="1" stop-color="${t.haze}"/></linearGradient>
<linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.meadow}"/><stop offset="1" stop-color="${t.meadowDeep}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${t.glow}" stop-opacity="${mode === 'day' ? '.8' : '.2'}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
<mask id="reveal" maskUnits="userSpaceOnUse" x="-120" y="0" width="1260" height="${H}"><path class="draw" d="${flightD}" fill="none" stroke="#fff" stroke-width="14"/></mask>
<clipPath id="r"><rect width="${W}" height="${H}" rx="10"/></clipPath>
${stampDefs}
</defs>
<g clip-path="url(#r)">
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${mode === 'night' ? `<g fill="#F3EAD3">${stars.map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`).join('')}</g>` : ''}
<circle cx="${W - 92}" cy="84" r="${mode === 'day' ? 230 : 170}" fill="url(#glow)"/>
${mode === 'night' ? `<path fill="#F3EAD3" transform="translate(${W - 1230} 6)" d="M1136 50A36 36 0 1 0 1152 106 30 30 0 1 1 1136 50Z"/>` : ''}
<g class="far" fill="${t.far}">${farHills}</g>
<g class="d">${clouds.map((c) => `<use href="#c${c.stamp}" transform="translate(${c.x.toFixed(0)} ${c.y.toFixed(0)}) scale(${c.size.toFixed(2)})"/>`).join('')}</g>
<rect y="${HORIZON - 96}" width="${W}" height="100" fill="url(#mist)"/>
<g fill="none" stroke="${t.wind}" stroke-width="1.6" stroke-linecap="round"><path class="w" d="M-40 140C200 116 420 170 620 136S860 118 1060 146" style="animation-duration:23s"/><path class="w" d="M-40 268C240 246 460 292 700 258S900 240 1060 270" style="animation-duration:27s;animation-delay:-11s"/></g>
<g mask="url(#reveal)"><path class="trail" d="${flightD}" fill="none" stroke="${t.ink}" stroke-width="1.8" stroke-dasharray="3 10" stroke-linecap="round"/></g>
<g class="fly" stroke="${t.ink}" stroke-width="1.3" stroke-linejoin="round"><path fill="${t.plane[0]}" d="M34 0-30-19-13 1Z"/><path fill="${t.plane[1]}" d="M34 0-13 1-25 15Z"/><path fill="${t.plane[2]}" d="M34 0-13 1-19 9Z"/></g>
<path d="M0 ${HORIZON + 10}C200 ${HORIZON - 12} 420 ${HORIZON + 18} 620 ${HORIZON + 4}S900 ${HORIZON - 8} ${W} ${HORIZON + 10}V${H}H0Z" fill="${t.hill}"/>
<g fill="${t.blades[0]}">${blades[0].join('')}</g>
<path d="M0 ${HORIZON + 44}C260 ${HORIZON + 28} 520 ${HORIZON + 54} ${W} ${HORIZON + 36}V${H}H0Z" fill="url(#field)"/>
<g fill="${t.blades[1]}">${blades[1].join('')}</g>
<rect x="20" y="${SCALE_TOP}" width="${W - 40}" height="78" rx="4" fill="${PAPER}" stroke="${DAY_INK}" stroke-width="1.4"/>
<path d="M36 ${SCALE_LINE}H${W - 36}" stroke="${DAY_INK}" stroke-width="1.4"/>
<path d="${quietTicks}" stroke="${DAY_INK}" stroke-opacity=".45" stroke-width="1.2"/>
${bars}
<path d="${labels.join('')}" fill="${DAY_INK}"/>
<path d="${summary.d}" fill="${t.ink}"/>
<path d="${subtitle.d}" fill="${t.ink}" opacity=".85"/>
<path d="${peakNote.d}" fill="${t.ink}"/>
<path d="${leader}" fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>
<circle cx="${(peakX + (noteRight ? 12 : -12)).toFixed(0)}" cy="${(peakCloud.top + 14).toFixed(0)}" r="4" fill="${RED}"/>
</g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const mode of ['day', 'night']) writeFileSync(resolve(OUT, `sky-${mode}.svg`), build(mode));
console.log(`${total} contributions over ${weeks.length} weeks, ${clouds.length} clouds, busiest ${weeks[peakIndex].count} on ${weeks[peakIndex].date} -> ${OUT}`);
