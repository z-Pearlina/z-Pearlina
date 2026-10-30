// Paints a cumulus as flat gouache layers: a height field of overlapping puffs
// is lit from one side, posterised into tones, and each tone traced to a path.
import { contours } from 'd3-contour';
import { rng, noise2 } from './noise.mjs';

function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(a / 2);
}

// Quadratic curves through ring midpoints: round corners, very little data.
function ringToPath(ring) {
  const p = ring.slice(0, -1);
  const n = p.length;
  if (n < 3) return '';
  const r = Math.round;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(p[n - 1], p[0]);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const m = mid(p[i], p[(i + 1) % n]);
    parts.push(`${r(p[i][0])} ${r(p[i][1])} ${r(m[0])} ${r(m[1])}`);
  }
  return `M${r(start[0])} ${r(start[1])}Q${parts.join(' ')}Z`;
}

function blur(field, w, h, passes) {
  let src = field;
  for (let k = 0; k < passes; k++) {
    const out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0, c = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const xx = x + i, yy = y + j;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        sum += src[yy * w + xx]; c++;
      }
      out[y * w + x] = sum / c;
    }
    src = out;
  }
  return src;
}

function placePuffs(width, height, profile, count, rand) {
  const puffs = [];
  const base = height * 0.86;
  for (let i = 0; i < count; i++) {
    const u = 0.05 + rand() * 0.9;
    const top = base - profile(u) * base * 0.92;
    const v = Math.pow(rand(), 0.8);
    const y = base - (base - top) * v;
    const r = (0.022 + rand() * 0.055) * width * (1.3 - v * 0.65);
    // Lower billows sit closer to the viewer and overlap the ones above.
    puffs.push({ x: u * width, y, r, depth: (y / base) * height * 0.42 + rand() * 18 });
  }
  // A rim of small billows scallops the silhouette.
  const rim = Math.round(count * 0.5);
  for (let i = 0; i < rim; i++) {
    const u = 0.04 + (i + rand()) / rim * 0.92;
    const top = base - profile(u) * base * 0.92;
    const y = top + rand() * 26;
    if (y > base) continue;
    const r = (0.016 + rand() * 0.03) * width;
    puffs.push({ x: u * width, y, r, depth: (y / base) * height * 0.42 + rand() * 18 });
  }
  return puffs;
}

/**
 * @param profile (0..1 across the cloud) -> 0..1 height of the silhouette
 * @param thresholds shade values that split the tones, darkest first
 * @returns one path string for the silhouette, then one per threshold
 */
export function paintCloud({ width, height, seed, profile, puffs = 90, res = 3, light = [0.55, -0.72, 0.42], thresholds = [0.3, 0.52, 0.72], detail = 0.12, tol = 0.5 }) {
  const rand = rng(seed);
  const n1 = noise2(seed + 1), n2 = noise2(seed + 2);
  const list = placePuffs(width, height, profile, puffs, rand);
  const w = Math.ceil(width / res), h = Math.ceil(height / res);
  const edge = new Float32Array(w * h).fill(-1);
  const base = height * 0.86;

  const [lx, ly, lz] = light;
  const shade = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i * res, y = j * res;
    const wobbleX = (n1(x / 20, y / 20, 3) - 0.5) * 11;
    const wobbleY = (n1(y / 20 + 40, x / 20 + 40, 3) - 0.5) * 11;
    let best = -Infinity, s = -1, lit = 0;
    for (const p of list) {
      const dx = x + wobbleX - p.x, dy = y + wobbleY - p.y;
      const d2 = dx * dx + dy * dy;
      const e = 1 - Math.sqrt(d2) / p.r;
      if (e > s) s = e;
      if (d2 >= p.r * p.r) continue;
      const nz = Math.sqrt(p.r * p.r - d2);
      if (nz + p.depth > best) {
        best = nz + p.depth;
        lit = (dx * lx + dy * ly + nz * lz) / p.r;
      }
    }
    // Flat, slightly torn underside.
    const under = (base + (n2(x / 90, 3, 3) - 0.5) * 30 - y) / 22;
    const k = j * w + i;
    edge[k] = Math.min(s * 1.6, under);
    const rise = 1 - y / base;
    shade[k] = lit * 0.52 + rise * 0.68 + (n2(x / 60, y / 60, 3) - 0.5) * detail;
  }

  const edgeSoft = blur(edge, w, h, 1);
  const trace = (values) => {
    const geo = contours().size([w, h]).smooth(true).thresholds([0])(values)[0];
    let d = '';
    for (const poly of geo.coordinates) for (const ring of poly) {
      const scaled = ring.map(([x, y]) => [x * res, y * res]);
      if (ringArea(scaled) < 160) continue;
      const half = scaled.length >> 1;
      d += ringToPath([...simplify(scaled.slice(0, half + 1), tol * res).slice(0, -1), ...simplify(scaled.slice(half), tol * res)]);
    }
    return d;
  };

  const layers = [trace(Array.from(edgeSoft))];
  for (const t of thresholds) {
    const v = new Float32Array(w * h);
    for (let k = 0; k < v.length; k++) v[k] = Math.min(shade[k] - t, edgeSoft[k] * 1.2);
    layers.push(trace(Array.from(blur(v, w, h, 1))));
  }
  return layers;
}
