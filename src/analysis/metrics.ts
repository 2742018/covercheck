// src/analysis/metrics.ts

export type NormalizedRect = { x: number; y: number; w: number; h: number };

export type RegionMetrics = {
  p10: number;
  p90: number;
  contrastRatio: number;
  contrastScore: number; // 0..100
  edgeDensity: number; // 0..1
  clutterScore: number; // 0..100 (higher = cleaner)
};

export type SafeMarginResult = {
  inset: number; // 0..1
  score: number; // 0..100
  outsidePct: number; // 0..100
  pass: boolean;
};

export type PaletteResult = {
  image: string[]; // hex
  region: string[]; // hex
  regionAvg: string; // hex
  text: {
    primary: string; // "#000000" or "#ffffff"
    primaryRatio: number;
    secondary: string;
    secondaryRatio: number;
    accent: string; // high-contrast palette color vs region avg
    accentRatio: number;
  };
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function srgbToLinear01(v01: number) {
  if (v01 <= 0.04045) return v01 / 12.92;
  return Math.pow((v01 + 0.055) / 1.055, 2.4);
}

function rgbToRelLuminance01(r: number, g: number, b: number) {
  const R = srgbToLinear01(r / 255);
  const G = srgbToLinear01(g / 255);
  const B = srgbToLinear01(b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatioRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const L1 = rgbToRelLuminance01(a.r, a.g, a.b);
  const L2 = rgbToRelLuminance01(b.r, b.g, b.b);
  const bright = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (bright + 0.05) / (dark + 0.05);
}

function lumaByte(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sumUint32(arr: Uint32Array) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

function percentileFromHist(hist: Uint32Array, total: number, p: number) {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

function normRectToPixels(imageData: ImageData, rect: NormalizedRect) {
  const { width, height } = imageData;

  const x0 = clamp(Math.floor(rect.x * width), 0, width - 1);
  const y0 = clamp(Math.floor(rect.y * height), 0, height - 1);

  const x1 = clamp(Math.ceil((rect.x + rect.w) * width), x0 + 1, width);
  const y1 = clamp(Math.ceil((rect.y + rect.h) * height), y0 + 1, height);

  return { x0, y0, x1, y1 };
}

export function computeRegionMetrics(imageData: ImageData, rect: NormalizedRect): RegionMetrics {
  const { data, width } = imageData;
  const { x0, y0, x1, y1 } = normRectToPixels(imageData, rect);

  const hist = new Uint32Array(256);

  const areaW = x1 - x0;
  const areaH = y1 - y0;

  // Samples ~ up to 120k points max (keeps it fast on phones)
  const step = Math.max(1, Math.floor(Math.sqrt((areaW * areaH) / 120_000)));

  let edgeHits = 0;
  let edgeSamples = 0;

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const idx = (y * width + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 10) continue;

      const yByte = lumaByte(r, g, b);
      hist[clamp(Math.round(yByte), 0, 255)]++;

      // Simple edge estimate using right + down differences
      if (x + 1 < x1 && y + 1 < y1) {
        const idxR = (y * width + (x + 1)) * 4;
        const idxD = ((y + 1) * width + x) * 4;

        const yR = lumaByte(data[idxR], data[idxR + 1], data[idxR + 2]);
        const yD = lumaByte(data[idxD], data[idxD + 1], data[idxD + 2]);

        const grad = Math.abs(yR - yByte) + Math.abs(yD - yByte);
        edgeSamples++;
        if (grad > 28) edgeHits++;
      }
    }
  }

  const total = Math.max(1, sumUint32(hist));
  const p10 = percentileFromHist(hist, total, 0.10);
  const p90 = percentileFromHist(hist, total, 0.90);

  const L1 = srgbToLinear01(p90 / 255);
  const L2 = srgbToLinear01(p10 / 255);
  const bright = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  const contrastRatio = (bright + 0.05) / (dark + 0.05);

  const contrastScore = clamp(((contrastRatio - 1) / (7 - 1)) * 100, 0, 100);

  const edgeDensity = edgeSamples > 0 ? edgeHits / edgeSamples : 0;

  // edgeDensity ~0.02 = very clean, ~0.15 = busy
  const clutterScore = clamp(((0.15 - edgeDensity) / (0.15 - 0.02)) * 100, 0, 100);

  return { p10, p90, contrastRatio, contrastScore, edgeDensity, clutterScore };
}

export function computeSafeMargin(region: NormalizedRect, inset = 0.08): SafeMarginResult {
  const safe = { x: inset, y: inset, w: 1 - inset * 2, h: 1 - inset * 2 };

  const ix0 = Math.max(region.x, safe.x);
  const iy0 = Math.max(region.y, safe.y);
  const ix1 = Math.min(region.x + region.w, safe.x + safe.w);
  const iy1 = Math.min(region.y + region.h, safe.y + safe.h);

  const regionArea = Math.max(1e-9, region.w * region.h);
  const overlapW = Math.max(0, ix1 - ix0);
  const overlapH = Math.max(0, iy1 - iy0);
  const overlapArea = overlapW * overlapH;

  const insideFrac = overlapArea / regionArea;
  const score = clamp(insideFrac * 100, 0, 100);
  const outsidePct = clamp((1 - insideFrac) * 100, 0, 100);

  return { inset, score, outsidePct, pass: score >= 95 };
}

function rgbToHex(r: number, g: number, b: number) {
  const to2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(full, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function extractDominantColors(imageData: ImageData, rect?: NormalizedRect, maxColors = 6) {
  const { data, width, height } = imageData;
  const bounds = rect ? normRectToPixels(imageData, rect) : { x0: 0, y0: 0, x1: width, y1: height };

  const areaW = bounds.x1 - bounds.x0;
  const areaH = bounds.y1 - bounds.y0;
  const step = Math.max(1, Math.floor(Math.sqrt((areaW * areaH) / 80_000)));

  // 4-bit per channel quantization => 4096 bins
  const counts = new Uint32Array(4096);

  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;

  for (let y = bounds.y0; y < bounds.y1; y += step) {
    for (let x = bounds.x0; x < bounds.x1; x += step) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 10) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      sr += r;
      sg += g;
      sb += b;
      n++;

      const rq = r >> 4;
      const gq = g >> 4;
      const bq = b >> 4;
      const bin = (rq << 8) | (gq << 4) | bq;
      counts[bin]++;
    }
  }

  const avgHex = n > 0 ? rgbToHex(sr / n, sg / n, sb / n) : "#777777";

  const top: Array<{ bin: number; c: number }> = [];
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c) top.push({ bin: i, c });
  }
  top.sort((a, b) => b.c - a.c);

  const colors: string[] = [];
  for (const t of top.slice(0, maxColors * 3)) {
    const rq = (t.bin >> 8) & 15;
    const gq = (t.bin >> 4) & 15;
    const bq = t.bin & 15;

    const r = rq * 16 + 8;
    const g = gq * 16 + 8;
    const b = bq * 16 + 8;

    const hex = rgbToHex(r, g, b);
    if (!colors.includes(hex)) colors.push(hex);
    if (colors.length >= maxColors) break;
  }

  return { colors, avgHex };
}

function recommendText(avgHex: string, palette: string[]) {
  const avg = hexToRgb(avgHex);

  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  const w = contrastRatioRgb(avg, white);
  const b = contrastRatioRgb(avg, black);

  const primary = w >= b ? "#ffffff" : "#000000";
  const primaryRatio = Math.max(w, b);

  const secondary = w >= b ? "#000000" : "#ffffff";
  const secondaryRatio = Math.min(w, b);

  let accent = palette[0] ?? "#ffc400";
  let accentRatio = 0;
  for (const h of palette) {
    const cr = contrastRatioRgb(avg, hexToRgb(h));
    if (cr > accentRatio) {
      accentRatio = cr;
      accent = h;
    }
  }

  return { primary, primaryRatio, secondary, secondaryRatio, accent, accentRatio };
}

export function computePalette(imageData: ImageData, region: NormalizedRect | null): PaletteResult {
  const img = extractDominantColors(imageData, undefined, 6);
  const reg = region ? extractDominantColors(imageData, region, 6) : { colors: [], avgHex: "#777777" };
  const text = recommendText(reg.avgHex, reg.colors.length ? reg.colors : img.colors);

  return {
    image: img.colors,
    region: reg.colors,
    regionAvg: reg.avgHex,
    text,
  };
}
