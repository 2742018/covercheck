export type CompositionMetrics = {
  lightDark: {
    averageLuminance: number; // 0..100
    label: "Dark" | "Mid" | "Light";
    warning: string;
  };
  colorBalance: {
    warmPct: number;          // 0..100
    coolPct: number;          // 0..100
    saturationSpread: number; // 0..100
    dominantWeight: number;   // 0..100
    label: string;
  };
  symmetry: {
    score: number; // 0..100
    label: "Symmetrical" | "Balanced" | "Asymmetrical";
  };
  texture: {
    energy: number; // 0..100
    label: "Low" | "Moderate" | "High";
  };
  organicTechnical: {
    score: number; // 0..100 (higher = technical)
    label: "Organic" | "Balanced" | "Technical";
  };
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function luminance(r: number, g: number, b: number) {
  const toLinear = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

export function computeCompositionMetrics(
  imageData: ImageData,
  rect?: { sx: number; sy: number; sw: number; sh: number }
): CompositionMetrics {
  const data = imageData.data;
  const W = imageData.width;
  const H = imageData.height;

  const sx = rect ? clamp(Math.round(rect.sx), 0, W - 1) : 0;
  const sy = rect ? clamp(Math.round(rect.sy), 0, H - 1) : 0;
  const sw = rect ? clamp(Math.round(rect.sw), 1, W - sx) : W;
  const sh = rect ? clamp(Math.round(rect.sh), 1, H - sy) : H;

  let lumSum = 0;
  let count = 0;

  let warm = 0;
  let cool = 0;
  let satSum = 0;
  let satSqSum = 0;

  const bins = new Array<number>(12).fill(0);

  for (let y = sy; y < sy + sh; y += 2) {
    for (let x = sx; x < sx + sw; x += 2) {
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const lum = luminance(r, g, b);
      lumSum += lum;

      const hsl = rgbToHsl(r, g, b);
      satSum += hsl.s;
      satSqSum += hsl.s * hsl.s;

      const bin = Math.min(11, Math.floor(((hsl.h || 0) / 360) * 12));
      bins[bin] += 1;

      const hue = hsl.h;
      if ((hue >= 0 && hue < 70) || hue >= 300) warm += 1;
      else if (hue >= 140 && hue < 260) cool += 1;

      count += 1;
    }
  }

  const avgLum = count ? (lumSum / count) * 100 : 50;
  const avgSat = count ? satSum / count : 0;
  const satVariance = count ? Math.max(0, satSqSum / count - avgSat * avgSat) : 0;
  const satSpread = clamp(Math.sqrt(satVariance) * 220, 0, 100);
  const dominantWeight = clamp((Math.max(...bins) / Math.max(1, count)) * 100, 0, 100);

  let lightLabel: CompositionMetrics["lightDark"]["label"] = "Mid";
  let lightWarning = "Balanced overall luminance. Usually flexible across dark and light UI.";
  if (avgLum < 28) {
    lightLabel = "Dark";
    lightWarning = "Very dark covers can lose detail and make subtle typography disappear in dark UI.";
  } else if (avgLum > 72) {
    lightLabel = "Light";
    lightWarning = "Very light covers can wash out pale typography and reduce focal separation.";
  }

  const warmPct = Math.round((warm / Math.max(1, count)) * 100);
  const coolPct = Math.round((cool / Math.max(1, count)) * 100);

  let balanceLabel = "Balanced palette spread";
  if (dominantWeight > 42) balanceLabel = "One dominant colour strongly leads the cover";
  else if (satSpread > 32) balanceLabel = "Wide saturation spread — can feel lively but harder to control";
  else if (satSpread < 12) balanceLabel = "Tight saturation spread — controlled and cohesive";

  let symmetryScoreAccum = 0;
  let symmetryCount = 0;

  const xStart = sx;
  const xEnd = sx + sw;
  const yStart = sy;
  const yEnd = sy + sh;
  const half = Math.floor(sw / 2);

  for (let y = yStart; y < yEnd; y += 2) {
    for (let dx = 0; dx < half; dx += 2) {
      const xl = xStart + dx;
      const xr = xEnd - 1 - dx;

      const il = (y * W + xl) * 4;
      const ir = (y * W + xr) * 4;

      const ll = luminance(data[il], data[il + 1], data[il + 2]);
      const lr = luminance(data[ir], data[ir + 1], data[ir + 2]);

      symmetryScoreAccum += 1 - Math.abs(ll - lr);
      symmetryCount += 1;
    }
  }

  const symmetryScore = clamp(
    ((symmetryCount ? symmetryScoreAccum / symmetryCount : 0.5) * 100),
    0,
    100
  );

  let symmetryLabel: CompositionMetrics["symmetry"]["label"] = "Balanced";
  if (symmetryScore >= 72) symmetryLabel = "Symmetrical";
  else if (symmetryScore < 48) symmetryLabel = "Asymmetrical";

  let edgeSum = 0;
  let dirBins = new Array<number>(8).fill(0);
  let edgeCount = 0;

  for (let y = sy + 1; y < sy + sh - 1; y += 2) {
    for (let x = sx + 1; x < sx + sw - 1; x += 2) {
      const i = (y * W + x) * 4;
      const il = (y * W + (x - 1)) * 4;
      const ir = (y * W + (x + 1)) * 4;
      const iu = ((y - 1) * W + x) * 4;
      const id = ((y + 1) * W + x) * 4;

      const l = luminance(data[i], data[i + 1], data[i + 2]);
      const lx = luminance(data[ir], data[ir + 1], data[ir + 2]) - luminance(data[il], data[il + 1], data[il + 2]);
      const ly = luminance(data[id], data[id + 1], data[id + 2]) - luminance(data[iu], data[iu + 1], data[iu + 2]);

      const mag = Math.sqrt(lx * lx + ly * ly);
      edgeSum += mag;
      edgeCount += 1;

      if (mag > 0.05) {
        let angle = (Math.atan2(ly, lx) * 180) / Math.PI;
        if (angle < 0) angle += 180;
        const bin = Math.min(7, Math.floor(angle / 22.5));
        dirBins[bin] += 1;
      }

      void l;
    }
  }

  const textureEnergy = clamp((edgeSum / Math.max(1, edgeCount)) * 210, 0, 100);
  let textureLabel: CompositionMetrics["texture"]["label"] = "Moderate";
  if (textureEnergy < 22) textureLabel = "Low";
  else if (textureEnergy > 48) textureLabel = "High";

  const dirTotal = dirBins.reduce((a, b) => a + b, 0);
  const dirPeak = dirTotal ? Math.max(...dirBins) / dirTotal : 0.125;
  const structureScore = clamp(dirPeak * 380, 0, 100);

  let structureLabel: CompositionMetrics["organicTechnical"]["label"] = "Balanced";
  if (structureScore >= 58) structureLabel = "Technical";
  else if (structureScore <= 34) structureLabel = "Organic";

  return {
    lightDark: {
      averageLuminance: Math.round(avgLum),
      label: lightLabel,
      warning: lightWarning,
    },
    colorBalance: {
      warmPct,
      coolPct,
      saturationSpread: Math.round(satSpread),
      dominantWeight: Math.round(dominantWeight),
      label: balanceLabel,
    },
    symmetry: {
      score: Math.round(symmetryScore),
      label: symmetryLabel,
    },
    texture: {
      energy: Math.round(textureEnergy),
      label: textureLabel,
    },
    organicTechnical: {
      score: Math.round(structureScore),
      label: structureLabel,
    },
  };
}