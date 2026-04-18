export type CompositionHighlight = {
  key: string;
  title: string;
  detail: string;
  priority: number;
};

export type CompositionMetrics = {
  sampleCount: number;
  sampleStep: number;
  summary: {
    headline: string;
    guidance: string;
    basis: string;
  };
  lightDark: {
    averageLuminance: number; // 0..100
    luminanceSpread: number; // 0..100
    label: "Dark" | "Mid" | "Light";
    warning: string;
    basis: string;
    explanation: string;
  };
  colorBalance: {
    warmPct: number; // 0..100
    coolPct: number; // 0..100
    neutralPct: number; // 0..100
    averageSaturation: number; // 0..100
    saturationSpread: number; // 0..100
    dominantWeight: number; // 0..100
    label: string;
    basis: string;
    explanation: string;
  };
  symmetry: {
    score: number; // 0..100
    label: "Symmetrical" | "Balanced" | "Asymmetrical";
    basis: string;
    explanation: string;
  };
  texture: {
    energy: number; // 0..100
    label: "Low" | "Moderate" | "High";
    basis: string;
    explanation: string;
  };
  organicTechnical: {
    score: number; // 0..100
    label: "Organic" | "Balanced" | "Technical";
    basis: string;
    explanation: string;
  };
  highlights: CompositionHighlight[];
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

function percentile(sorted: number[], pct: number) {
  if (!sorted.length) return 0;
  const idx = clamp(Math.floor((sorted.length - 1) * pct), 0, sorted.length - 1);
  return sorted[idx];
}

function pushHighlight(
  list: CompositionHighlight[],
  item: CompositionHighlight
) {
  if (!list.some((existing) => existing.key === item.key)) {
    list.push(item);
  }
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

  const hueBins = new Array<number>(12).fill(0);
  const luminanceValues: number[] = [];
  const sampleStep = 2;

  for (let y = sy; y < sy + sh; y += sampleStep) {
    for (let x = sx; x < sx + sw; x += sampleStep) {
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const lum = luminance(r, g, b);
      lumSum += lum;
      luminanceValues.push(lum);

      const hsl = rgbToHsl(r, g, b);
      satSum += hsl.s;
      satSqSum += hsl.s * hsl.s;

      const bin = Math.min(11, Math.floor(((hsl.h || 0) / 360) * 12));
      hueBins[bin] += 1;

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
  const dominantWeight = clamp((Math.max(...hueBins) / Math.max(1, count)) * 100, 0, 100);
  const warmPct = Math.round((warm / Math.max(1, count)) * 100);
  const coolPct = Math.round((cool / Math.max(1, count)) * 100);
  const neutralPct = clamp(100 - warmPct - coolPct, 0, 100);
  const averageSaturation = clamp(Math.round(avgSat * 100), 0, 100);

  const sortedLum = luminanceValues.slice().sort((a, b) => a - b);
  const p10Lum = percentile(sortedLum, 0.1) * 100;
  const p90Lum = percentile(sortedLum, 0.9) * 100;
  const luminanceSpread = clamp(Math.round(p90Lum - p10Lum), 0, 100);

  let lightLabel: CompositionMetrics["lightDark"]["label"] = "Mid";
  let lightWarning = "Balanced overall luminance. Usually flexible across dark and light UI.";
  let lightExplanation = "Average luminance sits in the middle range, so overall brightness is unlikely to dominate the design by itself.";
  if (avgLum < 28) {
    lightLabel = "Dark";
    lightWarning = "Very dark covers can lose detail and make subtle typography disappear in dark UI.";
    lightExplanation = "Most samples fall into darker luminance values, so the cover will feel heavy and atmospheric before colour is considered.";
  } else if (avgLum > 72) {
    lightLabel = "Light";
    lightWarning = "Very light covers can wash out pale typography and reduce focal separation.";
    lightExplanation = "Most samples sit in light luminance values, so the cover can feel airy but may need stronger anchors for text and focal contrast.";
  }

  let balanceLabel = "Balanced palette spread";
  let colorExplanation = "Warm and cool hues are reasonably balanced, so the palette is not leaning too aggressively in one temperature direction.";
  if (dominantWeight > 42) {
    balanceLabel = "One dominant colour strongly leads the cover";
    colorExplanation = "A single hue family accounts for a large share of samples, so colour unity is strong but supporting accents matter more.";
  } else if (satSpread > 32) {
    balanceLabel = "Wide saturation spread — can feel lively but harder to control";
    colorExplanation = "Saturation swings noticeably across the artwork, which can add energy but may also split attention between focal areas.";
  } else if (satSpread < 12) {
    balanceLabel = "Tight saturation spread — controlled and cohesive";
    colorExplanation = "Most colours live inside a narrow saturation band, which tends to feel deliberate and visually cohesive.";
  }

  let symmetryScoreAccum = 0;
  let symmetryCount = 0;

  const xStart = sx;
  const xEnd = sx + sw;
  const yStart = sy;
  const yEnd = sy + sh;
  const half = Math.floor(sw / 2);

  for (let y = yStart; y < yEnd; y += sampleStep) {
    for (let dx = 0; dx < half; dx += sampleStep) {
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
    (symmetryCount ? (symmetryScoreAccum / symmetryCount) * 100 : 50),
    0,
    100
  );

  let symmetryLabel: CompositionMetrics["symmetry"]["label"] = "Balanced";
  let symmetryExplanation = "Left and right luminance are moderately related, so the composition has some balance without feeling mirrored.";
  if (symmetryScore >= 72) {
    symmetryLabel = "Symmetrical";
    symmetryExplanation = "Left and right sides are closely matched in luminance, so the cover reads as structured and stable.";
  } else if (symmetryScore < 48) {
    symmetryLabel = "Asymmetrical";
    symmetryExplanation = "Left and right sides diverge more strongly, so the cover relies on directional balance rather than mirror stability.";
  }

  let edgeSum = 0;
  let dirBins = new Array<number>(8).fill(0);
  let edgeCount = 0;

  for (let y = sy + 1; y < sy + sh - 1; y += sampleStep) {
    for (let x = sx + 1; x < sx + sw - 1; x += sampleStep) {
      const il = (y * W + (x - 1)) * 4;
      const ir = (y * W + (x + 1)) * 4;
      const iu = ((y - 1) * W + x) * 4;
      const id = ((y + 1) * W + x) * 4;

      const lx =
        luminance(data[ir], data[ir + 1], data[ir + 2]) -
        luminance(data[il], data[il + 1], data[il + 2]);
      const ly =
        luminance(data[id], data[id + 1], data[id + 2]) -
        luminance(data[iu], data[iu + 1], data[iu + 2]);

      const mag = Math.sqrt(lx * lx + ly * ly);
      edgeSum += mag;
      edgeCount += 1;

      if (mag > 0.05) {
        let angle = (Math.atan2(ly, lx) * 180) / Math.PI;
        if (angle < 0) angle += 180;
        const bin = Math.min(7, Math.floor(angle / 22.5));
        dirBins[bin] += 1;
      }
    }
  }

  const textureEnergy = clamp((edgeSum / Math.max(1, edgeCount)) * 210, 0, 100);
  let textureLabel: CompositionMetrics["texture"]["label"] = "Moderate";
  let textureExplanation = "There is enough edge activity to create movement, but not so much that the surface becomes overwhelmingly busy.";
  if (textureEnergy < 22) {
    textureLabel = "Low";
    textureExplanation = "The surface is visually calm, so hierarchy will depend more on scale, placement, and colour than on texture contrast.";
  } else if (textureEnergy > 48) {
    textureLabel = "High";
    textureExplanation = "There is strong edge activity across the artwork, which adds energy but can fight with text and focal clarity.";
  }

  const dirTotal = dirBins.reduce((a, b) => a + b, 0);
  const dirPeak = dirTotal ? Math.max(...dirBins) / dirTotal : 0.125;
  const structureScore = clamp(dirPeak * 380, 0, 100);

  let structureLabel: CompositionMetrics["organicTechnical"]["label"] = "Balanced";
  let structureExplanation = "Edge directions are mixed, so the composition blends soft organic flow with some structural order.";
  if (structureScore >= 58) {
    structureLabel = "Technical";
    structureExplanation = "Edge directions cluster into a few dominant angles, so the artwork reads as more geometric, engineered, or grid-like.";
  } else if (structureScore <= 34) {
    structureLabel = "Organic";
    structureExplanation = "Edge directions are dispersed rather than locked to a few dominant axes, so the cover reads as softer and less rigid.";
  }

  const highlights: CompositionHighlight[] = [];

  if (lightLabel === "Dark") {
    pushHighlight(highlights, {
      key: "dark",
      title: "Dark overall value range",
      detail: "The cover lives mostly in darker tones, so subtle typography and small details may disappear first in dark UI.",
      priority: 92,
    });
  } else if (lightLabel === "Light") {
    pushHighlight(highlights, {
      key: "light",
      title: "Light overall value range",
      detail: "The cover is led by lighter tones, so pale text or weak focal anchors may wash out in browsing grids.",
      priority: 92,
    });
  }

  if (dominantWeight > 42) {
    pushHighlight(highlights, {
      key: "dominant-colour",
      title: "One hue family is doing most of the work",
      detail: `The dominant hue accounts for about ${Math.round(dominantWeight)}% of sampled colour bins, so accents need to be intentional rather than incidental.`,
      priority: 82,
    });
  } else if (satSpread > 32) {
    pushHighlight(highlights, {
      key: "wide-saturation",
      title: "Saturation swings widely across the cover",
      detail: "That can feel lively and expressive, but it also makes focal control harder when type enters the composition.",
      priority: 74,
    });
  }

  if (symmetryLabel === "Symmetrical") {
    pushHighlight(highlights, {
      key: "symmetry",
      title: "The layout reads as structured and stable",
      detail: "Left and right value balance are closely matched, which usually reinforces order and control.",
      priority: 68,
    });
  } else if (symmetryLabel === "Asymmetrical") {
    pushHighlight(highlights, {
      key: "asymmetry",
      title: "The layout relies on directional balance",
      detail: "Left and right sides diverge more strongly, so focal placement has to work harder to feel intentional.",
      priority: 68,
    });
  }

  if (textureLabel === "High") {
    pushHighlight(highlights, {
      key: "texture",
      title: "Surface detail is a major part of the look",
      detail: "Strong texture can add atmosphere, but it also increases the chance of text interference and crowded thumbnails.",
      priority: 88,
    });
  } else if (textureLabel === "Low") {
    pushHighlight(highlights, {
      key: "texture-low",
      title: "The surface is calm and controlled",
      detail: "Low texture leaves more room for typography, but the cover may need stronger hierarchy elsewhere to avoid feeling flat.",
      priority: 62,
    });
  }

  if (structureLabel === "Technical") {
    pushHighlight(highlights, {
      key: "technical",
      title: "Angles and structure feel deliberate",
      detail: "Dominant edge directions suggest a more geometric or engineered visual language.",
      priority: 58,
    });
  } else if (structureLabel === "Organic") {
    pushHighlight(highlights, {
      key: "organic",
      title: "The composition feels more fluid than rigid",
      detail: "Edge directions are dispersed, which often reads as softer and more natural.",
      priority: 58,
    });
  }

  const sortedHighlights = highlights.sort((a, b) => b.priority - a.priority).slice(0, 4);

  const summaryHeadline = [lightLabel, textureLabel.toLowerCase(), symmetryLabel.toLowerCase()]
    .join(" • ")
    .replace(/(^\w)/, (m) => m.toUpperCase());

  let guidance =
    "Use these metrics as character cues rather than pass/fail rules. They explain why the artwork feels calm, busy, stable, or directional before typography is added.";
  if (textureLabel === "High") {
    guidance =
      "Because texture is high, typography needs clearer separation than usual. Contrast and placement matter more than stylistic flourishes.";
  } else if (lightLabel === "Dark" || lightLabel === "Light") {
    guidance =
      "Because the cover leans strongly dark or light, small shifts in text value can change legibility quickly. Keep the title region distinctly separated from the global tone.";
  }

  return {
    sampleCount: count,
    sampleStep,
    summary: {
      headline: summaryHeadline,
      guidance,
      basis: `Computed from ${count} sampled pixels inside the current crop / full view area at ${sampleStep}px intervals.`,
    },
    lightDark: {
      averageLuminance: Math.round(avgLum),
      luminanceSpread,
      label: lightLabel,
      warning: lightWarning,
      basis: "Average luminance converts sampled RGB values to relative luminance, then averages them across the analysed area.",
      explanation: lightExplanation,
    },
    colorBalance: {
      warmPct,
      coolPct,
      neutralPct,
      averageSaturation,
      saturationSpread: Math.round(satSpread),
      dominantWeight: Math.round(dominantWeight),
      label: balanceLabel,
      basis: "Hue percentages come from 12 hue bins. Dominant weight is the largest hue bin share. Saturation spread measures how widely saturation varies across samples.",
      explanation: colorExplanation,
    },
    symmetry: {
      score: Math.round(symmetryScore),
      label: symmetryLabel,
      basis: "Calculated by comparing luminance on the left and right sides across a vertical mirror axis.",
      explanation: symmetryExplanation,
    },
    texture: {
      energy: Math.round(textureEnergy),
      label: textureLabel,
      basis: "Calculated from local edge magnitude using neighbouring luminance differences across the analysed area.",
      explanation: textureExplanation,
    },
    organicTechnical: {
      score: Math.round(structureScore),
      label: structureLabel,
      basis: "Calculated from how strongly edge directions cluster around a few dominant angles.",
      explanation: structureExplanation,
    },
    highlights: sortedHighlights,
  };
}