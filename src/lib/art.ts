function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function hex(n: number) {
  return n.toString(16).padStart(2, "0");
}

function randColor(rng: () => number) {
  const palette = [
    [16, 16, 18],
    [22, 24, 30],
    [245, 240, 233],
    [214, 200, 178],
    [31, 92, 255],
    [255, 196, 0],
    [240, 80, 110],
    [120, 210, 170],
  ];
  const [r, g, b] = pick(rng, palette);
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function makeCoverSvgDataUrl(seed: number) {
  const rng = mulberry32(seed);
  const bg = randColor(rng);
  const c1 = randColor(rng);
  const c2 = randColor(rng);
  const c3 = randColor(rng);

  const shapes = Array.from({ length: 10 }).map((_) => {
    const x = Math.floor(rng() * 100);
    const y = Math.floor(rng() * 100);
    const w = Math.floor(20 + rng() * 60);
    const h = Math.floor(10 + rng() * 60);
    const r = Math.floor(2 + rng() * 18);
    const fill = pick(rng, [c1, c2, c3]);
    const op = 0.22 + rng() * 0.45;
    const rot = Math.floor(rng() * 360);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" fill-opacity="${op.toFixed(
      2
    )}" transform="rotate(${rot} ${x} ${y})" />`;
  });

  const rings = Array.from({ length: 3 }).map((_, i) => {
    const cx = 50 + Math.floor((rng() - 0.5) * 18);
    const cy = 50 + Math.floor((rng() - 0.5) * 18);
    const rr = 12 + i * 10 + Math.floor(rng() * 6);
    const stroke = pick(rng, [c1, c2, c3]);
    const op = 0.25 + rng() * 0.35;
    return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${stroke}" stroke-opacity="${op.toFixed(
      2
    )}" stroke-width="2" />`;
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
  <defs>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0"/>
    </filter>
    <linearGradient id="sheen" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="100" height="100" fill="${bg}" />
  <rect width="100" height="100" fill="url(#sheen)" />

  ${shapes.join("\n")}
  ${rings.join("\n")}

  <rect width="100" height="100" filter="url(#grain)" opacity="0.9" />
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}