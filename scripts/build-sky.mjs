// Renders the last year of GitHub activity as a sky: one cloud per active week.
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

const W = 1012, H = 380, HORIZON = 300;
const THEMES = {
  day: { sky: ['#9CC9E3', '#CFE6F2', '#F7F1E1'], clouds: ['#B4CDDF', '#D2E2EA', '#F0F1E9', '#FFFDF5'], ink: '#22313F', hill: '#7FA77A', hill2: '#A8C6A8', plane: ['#FFFCF2', '#E6DFCB', '#C9BFA6'] },
  night: { sky: ['#0B1A2E', '#1B3352', '#2C4A6B'], clouds: ['#27405F', '#30496B', '#3B5679', '#4D6B8C'], ink: '#F3EAD3', hill: '#1C4040', hill2: '#1D3A50', plane: ['#F3EAD3', '#C7CCC8', '#8FA3B4'] },
};

const stamps = [17, 58, 91].map((seed) => paintCloud({
  width: 240, height: 120, seed, puffs: 60, res: 2.5,
  profile: (u) => 0.9 * Math.exp(-(((u - 0.5) / 0.3) ** 2)) + 0.25,
}));

const serif = loadFont('Cormorant', 600);
const mono = loadFont('PlexMono');
const summary = textPath(serif, `${total.toLocaleString('en-US')} contributions in the last year`, { size: 42, x: 30, y: 60 });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const step = (W - 80) / Math.max(weeks.length - 1, 1);
const weekX = (i) => 40 + i * step;

const labels = [];
let last = -1;
weeks.forEach((w, i) => {
  const m = +w.date.slice(5, 7) - 1;
  if (m !== last && m % 3 === 0 && i < weeks.length - 3) labels.push(textPath(mono, MONTHS[m], { size: 28, x: weekX(i), y: H - 22 }).d);
  last = m;
});

const max = Math.max(...weeks.map((w) => w.count), 1);
const rand = rng(5);
const clouds = weeks.map((w, i) => {
  if (!w.count) return null;
  const size = 0.3 + 0.75 * Math.sqrt(w.count / max);
  const lane = [0, 2, 1][i % 3];
  const y = 158 + lane * 34 + rand() * 14;
  return { x: weekX(i) - 120 * size, y: y - 60 * size * (1 + (2 - lane) * 0.1), size, stamp: i % 3, lane };
}).filter(Boolean).sort((a, b) => a.lane - b.lane);

function build(mode) {
  const t = THEMES[mode];
  const stampDefs = stamps.map((layers, i) => `<g id="c${i}">${layers.map((d, k) => `<path fill="${t.clouds[k]}" d="${d}"/>`).join('')}</g>`).join('');
  const css = `
@keyframes fly{0%{transform:translate(-70px,250px) rotate(-8deg)}35%{transform:translate(340px,190px) rotate(-7deg)}70%{transform:translate(700px,120px) rotate(-11deg)}84%,100%{transform:translate(1090px,44px) rotate(-12deg)}}
@keyframes drift{to{transform:translateX(-14px)}}
.fly{animation:fly 16s linear infinite}
.d{animation:drift 60s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){.fly,.d{animation:none}.fly{transform:translate(620px,136px) rotate(-10deg)}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">${total} contributions in the last year, drawn as a sky: one cloud for each active week, larger when the week was busier, with a paper airplane crossing.</title>
<style>${css}</style>
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset=".6" stop-color="${t.sky[1]}"/><stop offset=".8" stop-color="${t.sky[2]}"/></linearGradient><clipPath id="r"><rect width="${W}" height="${H}" rx="10"/></clipPath>${stampDefs}</defs>
<g clip-path="url(#r)">
<rect width="${W}" height="${H}" fill="url(#s)"/>
<g class="d">${clouds.map((c) => `<use href="#c${c.stamp}" transform="translate(${c.x.toFixed(0)} ${c.y.toFixed(0)}) scale(${c.size.toFixed(2)})"/>`).join('')}</g>
<g class="fly" stroke="${t.ink}" stroke-width="1.3" stroke-linejoin="round"><path fill="${t.plane[0]}" d="M34 0-30-19-13 1Z"/><path fill="${t.plane[1]}" d="M34 0-13 1-25 15Z"/><path fill="${t.plane[2]}" d="M34 0-13 1-19 9Z"/></g>
<path d="M0 ${HORIZON + 8}C200 ${HORIZON - 16} 420 ${HORIZON + 14} 620 ${HORIZON}S900 ${HORIZON - 12} ${W} ${HORIZON + 6}V${H}H0Z" fill="${t.hill2}"/>
<path d="M0 ${HORIZON + 26}C260 ${HORIZON + 10} 520 ${HORIZON + 36} ${W} ${HORIZON + 18}V${H}H0Z" fill="${t.hill}"/>
<path d="${summary.d}" fill="${t.ink}"/>
<path d="${labels.join('')}" fill="${mode === 'day' ? '#22313F' : '#F3EAD3'}"/>
</g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const mode of ['day', 'night']) writeFileSync(resolve(OUT, `sky-${mode}.svg`), build(mode));
console.log(`${total} contributions over ${weeks.length} weeks, ${clouds.length} clouds -> ${OUT}`);
