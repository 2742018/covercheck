/* =========================================================
   FILE: src/analysis/composition.ts
   ========================================================= */

export type CompositionMetrics = {
  // 1) Light vs Dark
  luminanceMean: number; // 0..1
  luminanceLabel: "Dark" | "Mid" | "Light";
  luminanceExtreme: boolean;

  // 2) Color balance
  warmPct: number; // 0..100
  coolPct: number; // 0..100
  neutralPct: number; // 0..100
  saturationMean: number; // 0..1
  saturationStd: number; // 0..1
  dominantHueBin: number; // 0..11
  dominantHuePct: number; // 0..100

  // 3) Symmetry (vertical mirror similarity)
  symmetryScore: number; // 0..100

  // 4) Texture / complexity
  textureEnergy: number; // 0..100

  // 5) Organic vs technical (edge orientation structure)
  structureScore: number; // 0..100
};

export type RectPx = { sx: number; sy: number; sw: number; sh: number };

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function clamp100(x: number) {
  return Math.max(0, Math.min(100, x));
}
function luma01(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function rgbToHsv01(r: number, g: number, b: number) {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function luminanceLabel(mean: number): "Dark" | "Mid" | "Light" {
  if (mean < 0.35) return "Dark";
  if (mean > 0.68) return "Light";
  return "Mid";
}

function stepForRect(sw: number, sh: number) {
  const area = sw * sh;
  if (area <= 200_000) return 1;
  if (area <= 600_000) return 2;
  if (area <= 1_200_000) return 3;
  return 4;
}

export function computeCompositionMetrics(imageData: ImageData, rect: RectPx): CompositionMetrics {
  const { data, width, height } = imageData;

  const sx = Math.max(0, Math.min(width - 1, Math.floor(rect.sx)));
  const sy = Math.max(0, Math.min(height - 1, Math.floor(rect.sy)));
  const sw = Math.max(1, Math.min(width - sx, Math.floor(rect.sw)));
  const sh = Math.max(1, Math.min(height - sy, Math.floor(rect.sh)));

  const step = stepForRect(sw, sh);

  // 1) Light vs Dark
  let sumLum = 0;
  let count = 0;

  // 2) Color balance
  let warm = 0,
    cool = 0,
    neutral = 0;
  let sumSat = 0,
    sumSat2 = 0;
  const hueBins = new Array<number>(12).fill(0);

  // 3) Symmetry
  let symSumAbs = 0;
  let symCount = 0;

  // 4) Texture energy
  let texSum = 0;
  let texCount = 0;

  // 5) Structure peakiness
  const oriBins = new Array<number>(18).fill(0);
  let oriSum = 0;

  const xMid = sx + Math.floor(sw / 2);

  for (let y = sy; y < sy + sh; y += step) {
    for (let x = sx; x < sx + sw; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2];

      const lum = luma01(r, g, b);
      sumLum += lum;
      count++;

      const hsv = rgbToHsv01(r, g, b);
      sumSat += hsv.s;
      sumSat2 += hsv.s * hsv.s;

      if (hsv.s < 0.12 || hsv.v < 0.08) {
        neutral++;
      } else {
        const h = hsv.h;
        const isWarm = h < 45 || h >= 315;
        const isCool = h >= 135 && h <= 255;
        if (isWarm) warm++;
        else if (isCool) cool++;
        else neutral++;

        const bin = Math.max(0, Math.min(11, Math.floor(h / 30)));
        hueBins[bin]++;
      }

      // symmetry (left vs mirrored right)
      if (x < xMid) {
        const mirrorX = sx + (sw - 1) - (x - sx);
        const idx2 = (y * width + mirrorX) * 4;
        const r2 = data[idx2],
          g2 = data[idx2 + 1],
          b2 = data[idx2 + 2];
        const lum2 = luma01(r2, g2, b2);
        symSumAbs += Math.abs(lum - lum2);
        symCount++;
      }

      // texture + orientation (use right/down neighbors)
      if (x + step < sx + sw && y + step < sy + sh) {
        const idxR = (y * width + (x + step)) * 4;
        const idxD = ((y + step) * width + x) * 4;

        const lumR = luma01(data[idxR], data[idxR + 1], data[idxR + 2]);
        const lumD = luma01(data[idxD], data[idxD + 1], data[idxD + 2]);

        const dx = Math.abs(lumR - lum);
        const dy = Math.abs(lumD - lum);

        texSum += dx + dy;
        texCount++;

        const gx = lumR - lum;
        const gy = lumD - lum;
        const mag = Math.sqrt(gx * gx + gy * gy);

        if (mag > 0.03) {
          let ang = Math.atan2(gy, gx);
          if (ang < 0) ang += Math.PI;
          if (ang >= Math.PI) ang -= Math.PI;

          const bin = Math.max(0, Math.min(17, Math.floor((ang / Math.PI) * 18)));
          oriBins[bin] += mag;
          oriSum += mag;
        }
      }
    }
  }

  const lumMean = count ? sumLum / count : 0.5;
  const lumLab = luminanceLabel(lumMean);
  const lumExtreme = lumMean < 0.22 || lumMean > 0.82;

  const satMean = count ? sumSat / count : 0;
  const satVar = count ? sumSat2 / count - satMean * satMean : 0;
  const satStd = Math.sqrt(Math.max(0, satVar));

  const totWB = warm + cool + neutral;
  const warmPct = totWB ? (warm / totWB) * 100 : 0;
  const coolPct = totWB ? (cool / totWB) * 100 : 0;
  const neutralPct = totWB ? (neutral / totWB) * 100 : 0;

  let domBin = 0;
  let domCount = 0;
  for (let i = 0; i < hueBins.length; i++) {
    if (hueBins[i] > domCount) {
      domCount = hueBins[i];
      domBin = i;
    }
  }
  const domPct = totWB ? (domCount / totWB) * 100 : 0;

  const symDiff = symCount ? symSumAbs / symCount : 0.35;
  const symmetryScore = clamp100((1 - clamp01(symDiff / 0.75)) * 100);

  const texAvg = texCount ? texSum / texCount : 0;
  const textureEnergy = clamp100(clamp01(texAvg / 0.22) * 100);

  let peak = 0;
  for (const v of oriBins) peak = Math.max(peak, v);
  const peakiness = oriSum > 0 ? peak / oriSum : 0;
  const structureScore = clamp100(clamp01((peakiness - 1 / 18) / (0.35 - 1 / 18)) * 100);

  return {
    luminanceMean: lumMean,
    luminanceLabel: lumLab,
    luminanceExtreme: lumExtreme,

    warmPct: clamp100(warmPct),
    coolPct: clamp100(coolPct),
    neutralPct: clamp100(neutralPct),
    saturationMean: clamp01(satMean),
    saturationStd: clamp01(satStd),
    dominantHueBin: domBin,
    dominantHuePct: clamp100(domPct),

    symmetryScore,
    textureEnergy,
    structureScore,
  };
}