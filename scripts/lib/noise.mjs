// Seeded random numbers and smooth value noise for hand-feeling shapes.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function noise2(seed) {
  const r = rng(seed);
  const size = 256;
  const table = Float32Array.from({ length: size * size }, () => r());
  const at = (x, y) => table[((y & 255) << 8) | (x & 255)];
  const fade = (t) => t * t * (3 - 2 * t);
  const base = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = fade(x - xi), v = fade(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
    return a + (b - a) * v;
  };
  return (x, y, octaves = 4) => {
    let amp = 0.5, sum = 0, f = 1;
    for (let i = 0; i < octaves; i++) { sum += amp * base(x * f, y * f); amp /= 2; f *= 2; }
    return sum;
  };
}
