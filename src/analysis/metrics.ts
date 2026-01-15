export type NormalizedRect = { x: number; y: number; w: number; h: number };

export type RegionMetrics = {
  contrastRatio: number;     // WCAG-style ratio from sampled luminance percentiles
  contrastScore: number;     // 0–100 derived
  clutterScore: number;      // 0–100 (higher = cleaner)
};

export type SafeMarginResult = {
  score: number;             // 0–100
  pass: boolean;
  outsidePct: number;        // 0–100
};

export type PaletteResult = {
  regionAvg: string;
  region: string[];
  image: string[];
  text: {
    primary: string;
    secondary: string;
    accent: string;
    primaryRatio: number;
    secondaryRatio: number;
    accentRatio: number;
  };
  compatible: {
    complement: string;
    analogous: string[];       // 2 colors
    triadic: string[];         // 2 colors
    splitComplement: string[]; // 2 colors
    tints: string[];           // lighter versions of base
    shades: string[];          // darker versions of base
  };
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function clamp01(v: number) {
  return clamp(v, 0, 1);
}

function rectToPxRect(img: ImageData, r: NormalizedRect) {
  const x = Math.floor(clamp01(r.x) * img.width);
  const y = Math.floor(clamp01(r.y) * img.height);
  const w = Math.max(1, Math.floor(clamp01(r.w) * img.width));
  const h = Math.max(1, Math.floor(clamp01(r.h) * img.height));
  return {
    x,
    y,
    w: Math.min(w, img.width - x),
    h: Math.min(h, img.height - y),
  };
}

function srgbToLin(u8: number) {
  const c = u8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relLuminance(r: number, g: number, b: number) {
  const R = srgbToLin(r);
  const G = srgbToLin(g);
  const B = srgbToLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatioFromL(L1: number, L2: number) {
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(clamp(Math.round(r), 0, 255))}${to(clamp(Math.round(g), 0, 255))}${to(clamp(Math.round(b), 0, 255))}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const Hp = (h % 360) / 60;
  const X = C * (1 - Math.abs((Hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= Hp && Hp < 1) { r1 = C; g1 = X; b1 = 0; }
  else if (1 <= Hp && Hp < 2) { r1 = X; g1 = C; b1 = 0; }
  else if (2 <= Hp && Hp < 3) { r1 = 0; g1 = C; b1 = X; }
  else if (3 <= Hp && Hp < 4) { r1 = 0; g1 = X; b1 = C; }
  else if (4 <= Hp && Hp < 5) { r1 = X; g1 = 0; b1 = C; }
  else { r1 = C; g1 = 0; b1 = X; }
  const m = l - C / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function samplePixels(img: ImageData, rect: { x: number; y: number; w: number; h: number }, maxSamples = 8000) {
  const { data, width } = img;
  const total = rect.w * rect.h;
  const step = Math.max(1, Math.floor(Math.sqrt(total / maxSamples)));
  const out: Array<[number, number, number]> = [];
  for (let y = rect.y; y < rect.y + rect.h; y += step) {
    for (let x = rect.x; x < rect.x + rect.w; x += step) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 10) continue;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}

function dominantPalette(samples: Array<[number, number, number]>, count = 6) {
  // quantize -> histogram -> pick top distinct
  const hist = new Map<number, number>();
  for (const [r, g, b] of samples) {
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    hist.set(key, (hist.get(key) ?? 0) + 1);
  }
  const ranked = [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

  const picked: string[] = [];
  const tooClose = (c1: string, c2: string) => {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    const d = Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
    return d < 90;
  };

  for (const key of ranked) {
    const r = ((key >> 8) & 15) * 17 + 8;
    const g = ((key >> 4) & 15) * 17 + 8;
    const b = (key & 15) * 17 + 8;
    const hex = rgbToHex(r, g, b);

    if (!picked.some((p) => tooClose(p, hex))) picked.push(hex);
    if (picked.length >= count) break;
  }
  return picked;
}

function avgColor(samples: Array<[number, number, number]>) {
  let r = 0, g = 0, b = 0;
  const n = Math.max(1, samples.length);
  for (const s of samples) { r += s[0]; g += s[1]; b += s[2]; }
  return rgbToHex(r / n, g / n, b / n);
}

function bestTextColors(bgHex: string) {
  const bg = hexToRgb(bgHex);
  const Lbg = relLuminance(bg.r, bg.g, bg.b);

  const black = { hex: "#000000", L: relLuminance(0, 0, 0) };
  const white = { hex: "#ffffff", L: relLuminance(255, 255, 255) };

  const crBlack = contrastRatioFromL(Lbg, black.L);
  const crWhite = contrastRatioFromL(Lbg, white.L);

  const primary = crWhite >= crBlack ? white.hex : black.hex;
  const secondary = primary === white.hex ? "#e6e6e6" : "#1a1a1a";

  // accent: pick whichever of these “pops” with better contrast
  const accents = ["#ffc400", "#7cf1ff", "#ff5a9f", "#a8ff60"];
  let best = accents[0];
  let bestCR = 0;
  for (const a of accents) {
    const c = hexToRgb(a);
    const cr = contrastRatioFromL(Lbg, relLuminance(c.r, c.g, c.b));
    if (cr > bestCR) { bestCR = cr; best = a; }
  }

  return {
    primary,
    secondary,
    accent: best,
    primaryRatio: Math.max(crBlack, crWhite),
    secondaryRatio: contrastRatioFromL(Lbg, relLuminance(...Object.values(hexToRgb(secondary)) as [number, number, number])),
    accentRatio: bestCR,
  };
}

function harmony(baseHex: string) {
  const base = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(base.r, base.g, base.b);
  const mk = (hh: number, ss = s, ll = l) => {
    const rgb = hslToRgb((hh + 360) % 360, clamp(ss, 0, 1), clamp(ll, 0, 1));
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  };

  const complement = mk(h + 180);
  const analogous = [mk(h - 30), mk(h + 30)];
  const triadic = [mk(h - 120), mk(h + 120)];
  const splitComplement = [mk(h + 150), mk(h - 150)];

  const tints = [mk(h, s, clamp(l + 0.12, 0, 1)), mk(h, s, clamp(l + 0.24, 0, 1))];
  const shades = [mk(h, s, clamp(l - 0.12, 0, 1)), mk(h, s, clamp(l - 0.24, 0, 1))];

  return { complement, analogous, triadic, splitComplement, tints, shades };
}

export function computeSafeMargin(region: NormalizedRect, inset = 0.08): SafeMarginResult {
  const safe = { x: inset, y: inset, w: 1 - inset * 2, h: 1 - inset * 2 };

  const ix = Math.max(region.x, safe.x);
  const iy = Math.max(region.y, safe.y);
  const ax = Math.min(region.x + region.w, safe.x + safe.w);
  const ay = Math.min(region.y + region.h, safe.y + safe.h);

  const interW = Math.max(0, ax - ix);
  const interH = Math.max(0, ay - iy);
  const interA = interW * interH;

  const regA = Math.max(1e-9, region.w * region.h);
  const insidePct = (interA / regA) * 100;
  const outsidePct = 100 - insidePct;
  const score = insidePct;

  return { score, pass: insidePct >= 95, outsidePct };
}

export function computeRegionMetrics(img: ImageData, region: NormalizedRect): RegionMetrics {
  const rect = rectToPxRect(img, region);
  const samples = samplePixels(img, rect, 9000);

  // Contrast (percentile-based luminance)
  const lum = samples.map(([r, g, b]) => relLuminance(r, g, b)).sort((a, b) => a - b);
  const n = lum.length || 1;
  const p10 = lum[Math.floor(n * 0.10)] ?? 0;
  const p90 = lum[Math.floor(n * 0.90)] ?? 0.9;
  const contrastRatio = contrastRatioFromL(p90, p10);

  // Score mapping: 1..7+ into 0..100
  const contrastScore = clamp(((contrastRatio - 1) / 6) * 100, 0, 100);

  // Clutter: simple edge density (difference between neighbors)
  // More edges => lower score.
  const { data, width, height } = img;
  let edgeSum = 0;
  let edgeCount = 0;

  const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h;
  const step = Math.max(1, Math.floor(Math.sqrt((rect.w * rect.h) / 9000)));

  const lumAt = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return relLuminance(data[i], data[i + 1], data[i + 2]);
  };

  for (let y = y0; y < y1 - 1; y += step) {
    for (let x = x0; x < x1 - 1; x += step) {
      const L = lumAt(x, y);
      const Lr = lumAt(Math.min(x + 1, width - 1), y);
      const Ld = lumAt(x, Math.min(y + 1, height - 1));
      edgeSum += Math.abs(L - Lr) + Math.abs(L - Ld);
      edgeCount += 2;
    }
  }

  const edgeMean = edgeCount ? edgeSum / edgeCount : 0;
  // edgeMean ~0..0.25 (typical). Map to 100..0
  const clutterScore = clamp(100 - edgeMean * 520, 0, 100);

  return { contrastRatio, contrastScore, clutterScore };
}

export function computePalette(img: ImageData, region: NormalizedRect): PaletteResult {
  const fullRect = { x: 0, y: 0, w: img.width, h: img.height };
  const regionRect = rectToPxRect(img, region);

  const regionSamples = samplePixels(img, regionRect, 7000);
  const imageSamples = samplePixels(img, fullRect, 9000);

  const regionAvg = avgColor(regionSamples);
  const regionPal = dominantPalette(regionSamples, 6);
  const imagePal = dominantPalette(imageSamples, 6);

  const text = bestTextColors(regionAvg);
  const compatible = harmony(regionAvg);

  return {
    regionAvg,
    region: regionPal,
    image: imagePal,
    text,
    compatible,
  };
}
