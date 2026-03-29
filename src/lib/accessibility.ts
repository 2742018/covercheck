export type VisionMode =
  | "original"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

export type PaletteSwatch = {
  hex: string;
};

export type SimSummary = {
  averageBrightness: number;
  brightnessLabel: "dark" | "mid" | "light";
  paletteSpread: number;
  dominantStrength: number;
};

export type AccessibilityFactor = {
  key: string;
  title: string;
  impact: "positive" | "watch" | "risk";
  detail: string;
  basis: string;
  priority: number;
};

export type AccessibilityMetricRow = {
  key: string;
  title: string;
  originalValue: string;
  simulatedValue: string;
  delta: string;
  meaning: string;
  basis: string;
};

export type AccessibilityAnalysis = {
  score: number;
  label: "Stable" | "Watch" | "Fragile";
  summary: string;
  modeNote: string;
  factors: AccessibilityFactor[];
  actions: string[];
  triggerNotes: string[];
  metricRows: AccessibilityMetricRow[];
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return null;

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function luminanceFromRgb(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function simulateColor(
  r: number,
  g: number,
  b: number,
  mode: VisionMode
): [number, number, number] {
  if (mode === "original") return [r, g, b];

  if (mode === "achromatopsia") {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    return [y, y, y];
  }

  let nr = r;
  let ng = g;
  let nb = b;

  if (mode === "protanopia") {
    nr = 0.56667 * r + 0.43333 * g + 0 * b;
    ng = 0.55833 * r + 0.44167 * g + 0 * b;
    nb = 0 * r + 0.24167 * g + 0.75833 * b;
  } else if (mode === "deuteranopia") {
    nr = 0.625 * r + 0.375 * g + 0 * b;
    ng = 0.7 * r + 0.3 * g + 0 * b;
    nb = 0 * r + 0.3 * g + 0.7 * b;
  } else if (mode === "tritanopia") {
    nr = 0.95 * r + 0.05 * g + 0 * b;
    ng = 0 * r + 0.43333 * g + 0.56667 * b;
    nb = 0 * r + 0.475 * g + 0.525 * b;
  }

  return [nr, ng, nb];
}

export function getModeLabel(mode: VisionMode) {
  if (mode === "original") return "Original";
  if (mode === "protanopia") return "Protanopia";
  if (mode === "deuteranopia") return "Deuteranopia";
  if (mode === "tritanopia") return "Tritanopia";
  return "Achromatopsia";
}

export function getModeDescription(mode: VisionMode) {
  if (mode === "original") return "Original cover rendering.";
  if (mode === "protanopia") return "Reduced red-channel distinction.";
  if (mode === "deuteranopia") return "Reduced green-channel distinction.";
  if (mode === "tritanopia") return "Reduced blue-yellow distinction.";
  return "Monochrome / no colour distinction.";
}

function getModeLongDescription(mode: VisionMode) {
  if (mode === "protanopia") {
    return "This simulation reduces red-channel distinction. Red-led accents can collapse toward neighbouring dark or warm tones, so hierarchy should not depend on red alone.";
  }
  if (mode === "deuteranopia") {
    return "This simulation reduces green-channel distinction. Green-led palette differences may flatten, so foreground and background need tonal separation as well as hue separation.";
  }
  if (mode === "tritanopia") {
    return "This simulation reduces blue-yellow distinction. Blue/yellow pairings can become less dependable, so the cover should still hold together through light/dark contrast and composition.";
  }
  if (mode === "achromatopsia") {
    return "This simulation removes colour distinction almost entirely. It is the clearest test of whether the cover can still communicate through value, scale, placement, and contrast alone.";
  }
  return "Original view.";
}

export function extractPaletteFromCanvas(
  canvas: HTMLCanvasElement,
  maxColors = 6
): PaletteSwatch[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<string, number>();

  for (let i = 0; i < data.length; i += 16) {
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    const key = rgbToHex(r, g, b);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([hex]) => ({ hex }));
}

export function buildSummaryFromPalette(palette: PaletteSwatch[]): SimSummary {
  if (!palette.length) {
    return {
      averageBrightness: 50,
      brightnessLabel: "mid",
      paletteSpread: 0,
      dominantStrength: 0,
    };
  }

  const lums = palette
    .map((p) => hexToRgb(p.hex))
    .filter(Boolean)
    .map((c) => luminanceFromRgb(c!.r, c!.g, c!.b));

  const avg = lums.reduce((a, b) => a + b, 0) / lums.length;
  const min = Math.min(...lums);
  const max = Math.max(...lums);
  const spread = (max - min) * 100;
  const dominantStrength = 100 - Math.min(100, spread * 1.2);

  let brightnessLabel: SimSummary["brightnessLabel"] = "mid";
  if (avg < 0.35) brightnessLabel = "dark";
  else if (avg > 0.68) brightnessLabel = "light";

  return {
    averageBrightness: Math.round(avg * 100),
    brightnessLabel,
    paletteSpread: Math.round(spread),
    dominantStrength: Math.round(dominantStrength),
  };
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

export function buildAccessibilityAnalysis(
  original: SimSummary | null,
  simulated: SimSummary | null,
  mode: VisionMode
): AccessibilityAnalysis | null {
  if (!original || !simulated) return null;

  const brightnessDiff = simulated.averageBrightness - original.averageBrightness;
  const spreadDiff = simulated.paletteSpread - original.paletteSpread;
  const dominanceDiff = simulated.dominantStrength - original.dominantStrength;

  let score = 100;
  score -= Math.min(28, Math.max(0, Math.abs(brightnessDiff) - 4) * 2);
  score -= Math.min(38, Math.max(0, -spreadDiff) * 2.2);
  score -= Math.min(26, Math.max(0, dominanceDiff) * 1.5);
  score = clamp(Math.round(score), 0, 100);

  let label: AccessibilityAnalysis["label"] = "Fragile";
  if (score >= 76) label = "Stable";
  else if (score >= 52) label = "Watch";

  const factors: AccessibilityFactor[] = [];
  const actions: string[] = [];
  const triggerNotes: string[] = [];

  if (Math.abs(brightnessDiff) < 6) {
    factors.push({
      key: "brightness-stable",
      title: "Overall brightness stays fairly stable",
      impact: "positive",
      detail: `The image shifts by only ${Math.abs(brightnessDiff)} points in average brightness, so global light/dark balance is not changing dramatically.`,
      basis: "Average brightness is computed from the dominant palette swatches extracted from the original and simulated renderings.",
      priority: 70,
    });
    triggerNotes.push("Global brightness stays fairly similar, so major accessibility risk is more likely to come from lost colour separation than from full-scene darkening or lightening.");
  } else if (brightnessDiff > 0) {
    factors.push({
      key: "brightness-up",
      title: "The simulated view becomes lighter overall",
      impact: "watch",
      detail: `Average brightness rises by ${brightnessDiff} points, which can soften darker anchors and reduce focal contrast.`,
      basis: "Average brightness compares the luminance of the extracted palette before and after simulation.",
      priority: 83,
    });
    pushUnique(actions, "Reinforce dark anchor areas or text separation so lighter simulated values do not wash the hierarchy out.");
    triggerNotes.push("The simulated palette is lighter than the original, which can make subtle dark detail and text anchors feel weaker.");
  } else {
    factors.push({
      key: "brightness-down",
      title: "The simulated view becomes darker overall",
      impact: "watch",
      detail: `Average brightness drops by ${Math.abs(brightnessDiff)} points, which can compress already-dark regions into one broader mass.`,
      basis: "Average brightness compares the luminance of the extracted palette before and after simulation.",
      priority: 83,
    });
    pushUnique(actions, "Open up very dark regions or give titles a clearer light/dark boundary so darker simulated views do not merge together.");
    triggerNotes.push("The simulated palette is darker than the original, which increases the chance of dark areas merging together.");
  }

  if (spreadDiff <= -10) {
    factors.push({
      key: "spread-loss",
      title: "Colour separation drops noticeably",
      impact: "risk",
      detail: `Palette spread falls by ${Math.abs(spreadDiff)} points, which suggests previously distinct colours are moving closer together.`,
      basis: "Palette spread measures the luminance range across the dominant extracted swatches. Lower spread means weaker separation between key tones.",
      priority: 95,
    });
    pushUnique(actions, "Increase tonal separation between important foreground and background areas rather than relying on hue contrast alone.");
    pushUnique(actions, "Use stronger contrast, weight, outline, or overlay treatment where title emphasis currently depends on colour difference.");
    triggerNotes.push("Palette spread drops under the selected simulation, so the cover may flatten even if the original colours felt distinct.");
  } else if (spreadDiff >= 8) {
    factors.push({
      key: "spread-holds",
      title: "Tonal separation holds up relatively well",
      impact: "positive",
      detail: `Palette spread increases by ${spreadDiff} points, so some distinct light/dark separation remains available even after simulation.`,
      basis: "Palette spread measures the luminance range across the dominant extracted swatches.",
      priority: 66,
    });
    triggerNotes.push("The main tones still separate reasonably well, so hierarchy is less dependent on colour alone than it first appears.");
  } else {
    factors.push({
      key: "spread-moderate",
      title: "Palette separation changes only moderately",
      impact: "watch",
      detail: `Palette spread changes by ${Math.abs(spreadDiff)} points, so colour cues weaken somewhat but do not completely collapse.`,
      basis: "Palette spread measures the luminance range across the dominant extracted swatches.",
      priority: 62,
    });
    triggerNotes.push("Colour distinction changes, but not catastrophically. Remaining clarity will depend more on structure, scale, and placement.");
  }

  if (dominanceDiff >= 10) {
    factors.push({
      key: "dominance-up",
      title: "The image becomes more tonally dominated",
      impact: "risk",
      detail: `Dominant-tone strength rises by ${dominanceDiff} points, which means the cover is being pulled into a narrower overall tonal reading.`,
      basis: "Dominant-tone strength rises when the extracted palette behaves more like one dominant mass and less like a set of clearly separated tones.",
      priority: 90,
    });
    pushUnique(actions, "Reinforce hierarchy with scale, contrast, or positioning so focal elements do not flatten into the dominant tone.");
    triggerNotes.push("The simulated palette is more dominated by one tone, which can make the cover feel flatter and reduce focal emphasis.");
  } else if (dominanceDiff <= -8) {
    factors.push({
      key: "dominance-down",
      title: "The cover retains some tonal variation",
      impact: "positive",
      detail: `Dominant-tone strength drops by ${Math.abs(dominanceDiff)} points, so the simulated image still preserves some layered variation.`,
      basis: "Dominant-tone strength rises when the palette collapses toward one dominant tonal mass.",
      priority: 58,
    });
    triggerNotes.push("The simulated palette still carries some secondary variation, which helps prevent complete flattening.");
  } else {
    factors.push({
      key: "dominance-similar",
      title: "Dominant versus secondary tones stay fairly similar",
      impact: "watch",
      detail: `Dominant-tone strength changes by only ${Math.abs(dominanceDiff)} points, so the broad tonal hierarchy does not shift dramatically.`,
      basis: "Dominant-tone strength indicates how strongly the palette behaves like one dominant tone versus several distinct tones.",
      priority: 54,
    });
    triggerNotes.push("The simulated image does not become drastically more dominated by a single tone, so any issues may be local rather than global.");
  }

  if (simulated.averageBrightness < 35) {
    pushUnique(actions, "Watch dark regions carefully: a lighter title treatment, stronger overlay, or calmer background zone may be needed.");
  }

  if (simulated.averageBrightness > 72) {
    pushUnique(actions, "Watch pale regions carefully: a darker anchor tone or stronger foreground separation may be needed.");
  }

  if (!actions.length) {
    actions.push("No major collapse is suggested by this simulation, but title emphasis and hierarchy should still be checked in Analyze and Mockups.");
  }

  let summary =
    "This simulated view keeps enough tonal structure to remain broadly understandable, but important emphasis should still be confirmed in Analyze.";
  if (label === "Watch") {
    summary =
      "This simulated view preserves some structure, but several distinctions weaken enough that important emphasis may need reinforcement.";
  } else if (label === "Fragile") {
    summary =
      "This simulated view appears to lose enough separation that key emphasis may be relying too heavily on colour difference alone.";
  }

  const metricRows: AccessibilityMetricRow[] = [
    {
      key: "brightness",
      title: "Average brightness",
      originalValue: `${original.averageBrightness}/100 (${original.brightnessLabel})`,
      simulatedValue: `${simulated.averageBrightness}/100 (${simulated.brightnessLabel})`,
      delta: `${brightnessDiff > 0 ? "+" : ""}${brightnessDiff}`,
      meaning:
        "Shows whether the whole cover becomes lighter or darker under simulation. Large shifts can change how strongly focal anchors and text contrast read.",
      basis:
        "Computed from the luminance of the extracted dominant palette swatches in the rendered view.",
    },
    {
      key: "spread",
      title: "Palette spread",
      originalValue: `${original.paletteSpread}/100`,
      simulatedValue: `${simulated.paletteSpread}/100`,
      delta: `${spreadDiff > 0 ? "+" : ""}${spreadDiff}`,
      meaning:
        "Higher spread means the main tones are more separated. Lower spread suggests colours may collapse toward a similar tonal range.",
      basis:
        "Computed from the luminance range between the darkest and lightest extracted swatches.",
    },
    {
      key: "dominance",
      title: "Dominant tone strength",
      originalValue: `${original.dominantStrength}/100`,
      simulatedValue: `${simulated.dominantStrength}/100`,
      delta: `${dominanceDiff > 0 ? "+" : ""}${dominanceDiff}`,
      meaning:
        "Higher dominance suggests the image is reading more like one broad tonal mass. That can make hierarchy flatter.",
      basis:
        "Derived from palette spread: narrower spread raises dominant-tone strength and suggests weaker tonal variety.",
    },
  ];

  const sortedFactors = factors.sort((a, b) => b.priority - a.priority).slice(0, 4);

  return {
    score,
    label,
    summary,
    modeNote: getModeLongDescription(mode),
    factors: sortedFactors,
    actions,
    triggerNotes,
    metricRows,
  };
}

export function buildAutoInsights(
  original: SimSummary | null,
  simulated: SimSummary | null,
  mode: VisionMode
) {
  return buildAccessibilityAnalysis(original, simulated, mode)?.factors.map((f) => f.detail) ?? [];
}

export function buildActionSuggestions(
  original: SimSummary | null,
  simulated: SimSummary | null,
  mode: VisionMode = "deuteranopia"
) {
  return buildAccessibilityAnalysis(original, simulated, mode)?.actions ?? [];
}

export async function makeSimulatedImage(
  dataUrl: string,
  mode: VisionMode,
  size = 900
) {
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, w, h);

  if (mode !== "original") {
    const imageData = ctx.getImageData(0, 0, w, h);
    const px = imageData.data;

    for (let i = 0; i < px.length; i += 4) {
      const [nr, ng, nb] = simulateColor(px[i], px[i + 1], px[i + 2], mode);
      px[i] = clamp(nr, 0, 255);
      px[i + 1] = clamp(ng, 0, 255);
      px[i + 2] = clamp(nb, 0, 255);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  const palette = extractPaletteFromCanvas(canvas, 6);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    palette,
    summary: buildSummaryFromPalette(palette),
  };
}
