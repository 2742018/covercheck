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

export function buildAutoInsights(
  original: SimSummary | null,
  simulated: SimSummary | null,
  mode: VisionMode
) {
  if (!original || !simulated) return [];

  const out: string[] = [];
  const brightnessDiff = simulated.averageBrightness - original.averageBrightness;
  const spreadDiff = simulated.paletteSpread - original.paletteSpread;
  const dominanceDiff = simulated.dominantStrength - original.dominantStrength;

  if (Math.abs(brightnessDiff) < 6) {
    out.push(
      `Overall brightness remains fairly stable under ${getModeLabel(mode).toLowerCase()}.`
    );
  } else if (brightnessDiff > 0) {
    out.push(
      "The simulated view appears lighter overall, which may soften darker focal contrasts."
    );
  } else {
    out.push(
      "The simulated view appears darker overall, which may compress detail in already dark areas."
    );
  }

  if (spreadDiff < -8) {
    out.push(
      "Colour separation appears reduced, so previously distinct tones may collapse together more easily."
    );
  } else if (spreadDiff > 8) {
    out.push(
      "Tonal spread remains relatively strong, so some visual separation is still preserved."
    );
  } else {
    out.push(
      "Palette separation changes only moderately, so hierarchy may depend more on layout and light/dark contrast than hue alone."
    );
  }

  if (dominanceDiff > 8) {
    out.push(
      "The cover may feel flatter or more dominated by a narrower tonal range in the simulated view."
    );
  } else if (dominanceDiff < -8) {
    out.push(
      "The simulated image still retains some tonal variation, which helps prevent complete visual flattening."
    );
  } else {
    out.push(
      "The overall balance of dominant versus secondary tones remains fairly similar."
    );
  }

  out.push(
    "Use this simulation as an accessibility-aware visual check: if key emphasis disappears here, the cover may rely too heavily on colour difference alone."
  );

  return out;
}

export function buildActionSuggestions(
  original: SimSummary | null,
  simulated: SimSummary | null
) {
  if (!original || !simulated) return [];

  const out: string[] = [];

  if (simulated.paletteSpread < original.paletteSpread - 8) {
    out.push(
      "Increase tonal separation between key foreground and background areas, not just hue difference."
    );
  }

  if (simulated.dominantStrength > original.dominantStrength + 8) {
    out.push(
      "Reinforce hierarchy with scale, contrast, or placement so important elements do not flatten into the overall palette."
    );
  }

  if (simulated.averageBrightness < 35) {
    out.push(
      "Watch for dark regions merging together; a lighter text treatment or stronger overlay may help."
    );
  }

  if (simulated.averageBrightness > 72) {
    out.push(
      "Watch for pale areas washing together; a darker anchor tone or stronger text separation may help."
    );
  }

  if (!out.length) {
    out.push(
      "No major collapse is suggested by this quick simulation, but title emphasis and hierarchy should still be checked in Analyze and Mockups."
    );
  }

  return out;
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