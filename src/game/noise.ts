export function hash2d(x: number, z: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1442695041);
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hash3d(x: number, y: number, z: number, seed: number): number {
  let h =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(z, 2147483647) +
    Math.imul(seed, 1442695041);
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function valueNoise2d(x: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(z - zi);
  const aa = hash2d(xi, zi, seed);
  const ba = hash2d(xi + 1, zi, seed);
  const ab = hash2d(xi, zi + 1, seed);
  const bb = hash2d(xi + 1, zi + 1, seed);
  return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v) * 2 - 1;
}

export function valueNoise3d(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);

  const c000 = hash3d(xi, yi, zi, seed);
  const c100 = hash3d(xi + 1, yi, zi, seed);
  const c010 = hash3d(xi, yi + 1, zi, seed);
  const c110 = hash3d(xi + 1, yi + 1, zi, seed);
  const c001 = hash3d(xi, yi, zi + 1, seed);
  const c101 = hash3d(xi + 1, yi, zi + 1, seed);
  const c011 = hash3d(xi, yi + 1, zi + 1, seed);
  const c111 = hash3d(xi + 1, yi + 1, zi + 1, seed);

  const x00 = lerp(c000, c100, u);
  const x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u);
  const x11 = lerp(c011, c111, u);

  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1;
}

export function fbm2d(
  x: number,
  z: number,
  seed: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5
): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2d(x * freq, z * freq, seed + i * 1013) * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / maxAmp;
}

export function ridged2d(x: number, z: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise2d(x * freq, z * freq, seed + i * 2029));
    sum += n * n * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / maxAmp;
}
