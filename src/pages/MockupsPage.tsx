import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import { computePalette, type NormalizedRect, type PaletteResult } from "../analysis/metrics";
import { computeCompositionMetrics, type CompositionMetrics } from "../analysis/composition";

type MockupsState = { dataUrl?: string };

type UiTheme = "dark" | "light";

const PX_OPTIONS = [48, 64, 96, 128, 256, 512, 768, 1024, 1500, 2000, 2500, 3000] as const;
type ThumbSize = (typeof PX_OPTIONS)[number];

const RECOMMENDED_PX = 3000;
const CONTEXT_PREVIEW_SIZES = { grid: 96, playlist: 64, search: 48, share: 256 } as const;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function clamp01(v: number) {
  return clamp(v, 0, 1);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** Center-crop rect from src into dst aspect ratio (like object-fit: cover). */
function coverCrop(srcW: number, srcH: number, dstW: number, dstH: number) {
  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;

  let sw = srcW;
  let sh = srcH;
  let sx = 0;
  let sy = 0;

  if (srcAR > dstAR) {
    sw = Math.round(srcH * dstAR);
    sx = Math.round((srcW - sw) / 2);
  } else {
    sh = Math.round(srcW / dstAR);
    sy = Math.round((srcH - sh) / 2);
  }

  return { sx, sy, sw, sh };
}

/** Crop rect with user pan+zoom. posX01/posY01 pick crop window location (0..1). zoom >= 1 */
function coverCropWithPosZoom(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  posX01: number,
  posY01: number,
  zoom: number
) {
  const base = coverCrop(srcW, srcH, dstW, dstH);
  const sw = Math.max(1, base.sw / zoom);
  const sh = Math.max(1, base.sh / zoom);

  const maxX = Math.max(0, srcW - sw);
  const maxY = Math.max(0, srcH - sh);

  const sx = Math.round(maxX * clamp01(posX01));
  const sy = Math.round(maxY * clamp01(posY01));

  return {
    sx,
    sy,
    sw: Math.max(1, Math.round(sw)),
    sh: Math.max(1, Math.round(sh)),
  };
}

/** Builds many square thumbs that match current cropPos/zoom */
async function makeSquareThumbs(
  dataUrl: string,
  sizes: number[],
  cropPos: { x: number; y: number },
  zoom: number
) {
  const img = await loadImage(dataUrl);
  const thumbs: Record<string, string> = {};

  for (const s of sizes) {
    const canvas = document.createElement("canvas");
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    const { sx, sy, sw, sh } = coverCropWithPosZoom(
      img.naturalWidth,
      img.naturalHeight,
      1,
      1,
      cropPos.x,
      cropPos.y,
      zoom
    );

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, s, s);
    thumbs[String(s)] = canvas.toDataURL("image/png");
  }

  return { thumbs, w: img.naturalWidth, h: img.naturalHeight };
}

async function buildAnalysisImageData(dataUrl: string, maxDim = 1024) {
  const img = await loadImage(dataUrl);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;

  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, w, h);

  return {
    imageData: ctx.getImageData(0, 0, w, h),
    natural: { w: w0, h: h0 },
  };
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return null;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return { r, g, b };
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
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) {
    rp = c;
    gp = x;
    bp = 0;
  } else if (h < 120) {
    rp = x;
    gp = c;
    bp = 0;
  } else if (h < 180) {
    rp = 0;
    gp = c;
    bp = x;
  } else if (h < 240) {
    rp = 0;
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    gp = 0;
    bp = c;
  } else {
    rp = c;
    gp = 0;
    bp = x;
  }

  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function deriveCompatible(baseHex: string) {
  const rgb = hexToRgb(baseHex);
  if (!rgb) {
    return {
      complement: "#000000",
      analogous: ["#000000", "#000000"],
      triadic: ["#000000", "#000000"],
    };
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const complement = hslToHex((h + 180) % 360, Math.min(1, s * 0.95), l);
  const analogous = [
    hslToHex((h + 25) % 360, Math.min(1, s * 0.9), l),
    hslToHex((h + 335) % 360, Math.min(1, s * 0.9), l),
  ];
  const triadic = [
    hslToHex((h + 120) % 360, Math.min(1, s * 0.95), l),
    hslToHex((h + 240) % 360, Math.min(1, s * 0.95), l),
  ];

  return { complement, analogous, triadic };
}

type ColorStats = {
  hue: number;
  sat: number;
  light: number;
  brightnessLabel: "dark" | "mid" | "light";
  saturationLabel: "muted" | "balanced" | "vivid";
  temperatureLabel: "cool" | "neutral" | "warm";
};

function statsFromPalette(pal: PaletteResult): ColorStats {
  const rgb = hexToRgb(pal.regionAvg);
  if (!rgb) {
    return {
      hue: 0,
      sat: 0,
      light: 0.5,
      brightnessLabel: "mid",
      saturationLabel: "balanced",
      temperatureLabel: "neutral",
    };
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const brightnessLabel: ColorStats["brightnessLabel"] =
    l < 0.35 ? "dark" : l > 0.68 ? "light" : "mid";

  const saturationLabel: ColorStats["saturationLabel"] =
    s < 0.25 ? "muted" : s > 0.58 ? "vivid" : "balanced";

  const temperatureLabel: ColorStats["temperatureLabel"] =
    (h >= 20 && h <= 75) || (h >= 300 && h <= 360)
      ? "warm"
      : h >= 150 && h <= 260
        ? "cool"
        : "neutral";

  return { hue: h, sat: s, light: l, brightnessLabel, saturationLabel, temperatureLabel };
}

type CompositionUiMetrics = {
  luminanceLabel: string;
  textureEnergy: number;
  symmetryScore: number;
  structureScore: number;
};

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toPct01Or100(v: number): number {
  return v <= 1 ? v * 100 : v;
}

function luminanceToLabel(lum01: number): string {
  return lum01 < 0.35 ? "dark" : lum01 > 0.68 ? "light" : "mid";
}

function normalizeCompositionForUi(raw: CompositionMetrics | null): CompositionUiMetrics | null {
  if (!raw) return null;

  const r = raw as unknown as Record<string, unknown>;

  const label =
    (typeof r.luminanceLabel === "string" && r.luminanceLabel) ||
    (typeof r.brightnessLabel === "string" && r.brightnessLabel) ||
    (typeof r.lumaLabel === "string" && r.lumaLabel) ||
    null;

  const lum =
    asNumber(r.luminance) ??
    asNumber(r.luma) ??
    asNumber(r.avgLuminance) ??
    asNumber(r.meanLuminance) ??
    null;

  const luminanceLabel =
    label ?? (lum != null ? luminanceToLabel(lum <= 1 ? lum : lum / 255) : "—");

  const tex =
    asNumber(r.textureEnergy) ??
    asNumber(r.texture) ??
    asNumber(r.textureScore) ??
    asNumber(r.texture_level) ??
    null;

  const sym =
    asNumber(r.symmetryScore) ??
    asNumber(r.symmetry) ??
    asNumber(r.symmetry_metric) ??
    null;

  const str =
    asNumber(r.structureScore) ??
    asNumber(r.structure) ??
    asNumber(r.shapeScore) ??
    asNumber(r.edgeStructure) ??
    asNumber(r.compositionStructure) ??
    null;

  return {
    luminanceLabel,
    textureEnergy: tex != null ? toPct01Or100(tex) : 0,
    symmetryScore: sym != null ? toPct01Or100(sym) : 0,
    structureScore: str != null ? toPct01Or100(str) : 0,
  };
}

type GenreKey =
  | "Pop"
  | "Hip-Hop"
  | "EDM"
  | "Rock"
  | "Metal"
  | "Ambient"
  | "Lo-fi"
  | "Jazz"
  | "Classical"
  | "Indie"
  | "Folk";

type GenreProfile = {
  name: GenreKey;
  palette: string[];
  traits: string[];
  targets: {
    brightness: ColorStats["brightnessLabel"][];
    saturation: ColorStats["saturationLabel"][];
    temperature: ColorStats["temperatureLabel"][];
  };
  guidance: string[];
};

const GENRES: Record<GenreKey, GenreProfile> = {
  Pop: {
    name: "Pop",
    palette: ["#ff4d6d", "#ffd166", "#06d6a0", "#118ab2"],
    traits: ["High clarity at small size", "Clean focal point", "One strong accent color", "Bold type is common"],
    targets: { brightness: ["mid", "light"], saturation: ["balanced", "vivid"], temperature: ["warm", "neutral"] },
    guidance: ["Increase color separation (overlay behind title)", "Use one vivid accent + simple base", "Keep text centered safe-zone"],
  },
  "Hip-Hop": {
    name: "Hip-Hop",
    palette: ["#111111", "#f2f2f2", "#ffdd00", "#d00000"],
    traits: ["Strong contrast", "Bold typography or icon mark", "Texture can be high but controlled", "Edge risk is common"],
    targets: { brightness: ["dark", "mid"], saturation: ["balanced", "vivid"], temperature: ["neutral", "warm"] },
    guidance: ["Push contrast (white-on-dark or dark-on-light)", "Avoid corners for small text/logos", "Use one aggressive accent (yellow/red)"],
  },
  EDM: {
    name: "EDM",
    palette: ["#00f5ff", "#7b2cff", "#ff3df2", "#0b0c0e"],
    traits: ["Neon accents", "High saturation", "Graphic shapes", "Clear center composition"],
    targets: { brightness: ["dark", "mid"], saturation: ["vivid"], temperature: ["cool", "neutral"] },
    guidance: ["Try neon accent on dark base", "Use glow/soft gradient behind type", "Keep type weight robust at 64px"],
  },
  Rock: {
    name: "Rock",
    palette: ["#111111", "#d9d9d9", "#b08d57", "#5a5a5a"],
    traits: ["Grit/texture", "Stronger midtones", "Iconic symbol or photo", "Type can be condensed/strong"],
    targets: { brightness: ["dark", "mid"], saturation: ["muted", "balanced"], temperature: ["neutral", "warm"] },
    guidance: ["Let texture exist—but give text a calmer zone", "Use subtle warm accent (bronze/sepia)", "Protect edges from crop/UI"],
  },
  Metal: {
    name: "Metal",
    palette: ["#0b0c0e", "#2b2b2b", "#e6e6e6", "#8a8a8a"],
    traits: ["Dark + contrast hierarchy", "Dense imagery, but title must survive", "Logos often fail safe-area"],
    targets: { brightness: ["dark"], saturation: ["muted", "balanced"], temperature: ["neutral", "cool"] },
    guidance: ["Increase text isolation (panel/halo/overlay)", "Avoid placing logos near corners", "Check 64px preview early"],
  },
  Ambient: {
    name: "Ambient",
    palette: ["#0b1320", "#1c2541", "#5bc0be", "#f1f5f9"],
    traits: ["Low clutter zones", "Soft gradients", "Minimal type", "Mood-first but still legible"],
    targets: { brightness: ["mid", "dark"], saturation: ["muted", "balanced"], temperature: ["cool", "neutral"] },
    guidance: ["Use soft gradient strip behind type", "Keep typography sparse but not too thin", "Prefer calm regions (low clutter)"],
  },
  "Lo-fi": {
    name: "Lo-fi",
    palette: ["#f2e9e4", "#c9ada7", "#22223b", "#4a4e69"],
    traits: ["Warm/nostalgic tones", "Gentle contrast", "Illustration/texture", "Readable but soft"],
    targets: { brightness: ["mid", "light"], saturation: ["muted", "balanced"], temperature: ["warm", "neutral"] },
    guidance: ["Lean into warm muted palette", "Use slightly heavier type than you think", "Avoid tiny type near edges"],
  },
  Jazz: {
    name: "Jazz",
    palette: ["#1b1b1b", "#f5f1e8", "#b08968", "#3d405b"],
    traits: ["Elegant contrast", "Warm accents", "Typographic structure", "Space and hierarchy"],
    targets: { brightness: ["mid", "dark"], saturation: ["muted", "balanced"], temperature: ["warm", "neutral"] },
    guidance: ["Use one warm accent (gold/bronze)", "Keep layout structured (poster-like)", "Protect safe-area for smaller type"],
  },
  Classical: {
    name: "Classical",
    palette: ["#f7f7f2", "#1b1b1b", "#6c757d", "#c9b37e"],
    traits: ["Clean hierarchy", "High clarity", "Neutral base", "Small type must still pass"],
    targets: { brightness: ["light", "mid"], saturation: ["muted", "balanced"], temperature: ["neutral", "warm"] },
    guidance: ["Use neutral base and strong type contrast", "Keep margins generous", "Avoid busy textures behind type"],
  },
  Indie: {
    name: "Indie",
    palette: ["#e6e1d6", "#2b2d42", "#ef233c", "#8d99ae"],
    traits: ["Distinctive concept", "Muted base + 1 accent", "Asymmetry with safe margins", "Texture allowed"],
    targets: { brightness: ["mid", "light"], saturation: ["muted", "balanced"], temperature: ["neutral", "warm"] },
    guidance: ["Use one accent color deliberately", "Keep title zone calm (overlay if needed)", "Test grid context (competition)"],
  },
  Folk: {
    name: "Folk",
    palette: ["#3a5a40", "#a3b18a", "#dad7cd", "#6b705c"],
    traits: ["Earthy palette", "Natural texture", "Readable but understated", "Centered composition common"],
    targets: { brightness: ["mid", "light"], saturation: ["muted", "balanced"], temperature: ["warm", "neutral"] },
    guidance: ["Use earthy neutrals + one deeper tone", "Avoid harsh neon accents", "Ensure text contrast stays ≥ target"],
  },
};

function scoreMatch(stats: ColorStats, genre: GenreProfile) {
  const b = genre.targets.brightness.includes(stats.brightnessLabel) ? 1 : 0;
  const s = genre.targets.saturation.includes(stats.saturationLabel) ? 1 : 0;
  const t = genre.targets.temperature.includes(stats.temperatureLabel) ? 1 : 0;
  const total = b + s + t;
  const pct = Math.round((total / 3) * 100);
  const label = pct >= 80 ? "Strong" : pct >= 55 ? "Medium" : "Loose";
  return { pct, label };
}

function safeInsetRectCss(inset = 0.08) {
  const pad = inset * 100;
  return { left: `${pad}%`, top: `${pad}%`, right: `${pad}%`, bottom: `${pad}%` } as const;
}

type InsightTone = "good" | "warn" | "bad";

type MockupInsightCard = {
  title: string;
  tone: InsightTone;
  detail: string;
  basis: string;
};

type MockupInsightBundle = {
  summary: string;
  cards: MockupInsightCard[];
  priorities: string[];
  scoreBasis: string[];
  contextNotes: {
    grid: string;
    playlist: string;
    search: string;
    share: string;
  };
};

function buildMockupInsights(args: {
  targetPx: number;
  imageSize: { w: number; h: number } | null;
  cropSource: { sw: number; sh: number } | null;
  stats: ColorStats | null;
  compositionUi: CompositionUiMetrics | null;
  matchPct: number | null;
  zoom: number;
  showOverlay: boolean;
  overlayStrength: number;
  safeInset: number;
}): MockupInsightBundle | null {
  const {
    targetPx,
    imageSize,
    cropSource,
    stats,
    compositionUi,
    matchPct,
    zoom,
    showOverlay,
    overlayStrength,
    safeInset,
  } = args;

  if (!imageSize || !stats || !compositionUi) return null;

  const minSourceDim = Math.min(imageSize.w, imageSize.h);
  const minCropDim = cropSource ? Math.min(cropSource.sw, cropSource.sh) : minSourceDim;
  const texture = compositionUi.textureEnergy;
  const structure = compositionUi.structureScore;

  const sourceSupportsTarget = minSourceDim >= targetPx;
  const cropSupportsTarget = minCropDim >= targetPx;

  const cards: MockupInsightCard[] = [];
  const priorities: string[] = [];
  const scoreBasis: string[] = [];

  const addPriority = (text: string) => {
    if (!priorities.includes(text)) priorities.push(text);
  };

  cards.push({
    title: "Export size readiness",
    tone: sourceSupportsTarget && cropSupportsTarget ? "good" : sourceSupportsTarget ? "warn" : "bad",
    detail:
      sourceSupportsTarget && cropSupportsTarget
        ? `Your uploaded image and current crop can support a ${targetPx}px square export without forcing upscaling.`
        : sourceSupportsTarget
          ? `The full image is large enough for ${targetPx}px, but the current zoom/crop leaves only about ${Math.round(minCropDim)}px of source detail in the square crop.`
          : `The uploaded source is smaller than the current ${targetPx}px target, so a final export at this size would require upscaling.`,
    basis: `Source image ${imageSize.w}×${imageSize.h}px • crop source ${Math.round(minCropDim)}px • target ${targetPx}px`,
  });
  scoreBasis.push(`Export comments compare the uploaded image size (${imageSize.w}×${imageSize.h}px) and current crop detail (${Math.round(minCropDim)}px minimum side) against the selected target of ${targetPx}px.`);
  if (!sourceSupportsTarget) {
    addPriority(`Replace the upload with a larger source image or lower the export target until the file genuinely supports ${targetPx}px.`);
  }
  if (sourceSupportsTarget && !cropSupportsTarget) {
    addPriority(`Reduce zoom slightly or reframe the crop so the selected square still contains enough source detail for ${targetPx}px export.`);
  }

  const strongIconRead = structure >= 58 && texture <= 62;
  const muddyIconRisk = texture >= 72 || (structure < 42 && stats.saturationLabel === "muted");
  cards.push({
    title: "Thumbnail identity",
    tone: strongIconRead ? "good" : muddyIconRisk ? "bad" : "warn",
    detail: strongIconRead
      ? "The cover has a clear enough shape structure to remain recognisable when the platform shrinks it into a small icon."
      : muddyIconRisk
        ? "Fine detail is likely to merge together at very small sizes, so the cover may lose identity in crowded grids or search views."
        : "The cover should remain understandable, but it may need a stronger focal contrast or simpler shape reading to hold attention quickly.",
    basis: `Structure ${Math.round(structure)}/100 • texture ${Math.round(texture)}/100 • saturation ${stats.saturationLabel}`,
  });
  scoreBasis.push(`Thumbnail identity comments are based on structure (${Math.round(structure)}/100), texture (${Math.round(texture)}/100), and overall colour intensity (${stats.saturationLabel}).`);
  if (muddyIconRisk) {
    addPriority("Simplify the busiest focal area or increase one stronger shape/contrast anchor so the cover reads faster at thumbnail size.");
  }

  const cropPressureHigh = zoom >= 1.55;
  const cropPressureMid = zoom >= 1.25;
  cards.push({
    title: "Crop pressure",
    tone: cropPressureHigh ? "bad" : cropPressureMid ? "warn" : "good",
    detail: cropPressureHigh
      ? "The crop is pushed in quite far, so the meaning of the artwork may shift and the available source detail for export is reduced."
      : cropPressureMid
        ? "The crop is moderately tightened. This can improve focus, but it also makes the final framing more sensitive to edge and detail loss."
        : "The crop is relatively open, so the artwork keeps more context and more usable source detail for export.",
    basis: `Zoom ${Math.round(zoom * 100)}% • crop source ${Math.round(minCropDim)}px`,
  });
  scoreBasis.push(`Crop-pressure comments are based on zoom (${Math.round(zoom * 100)}%) and the amount of original image detail still available inside the crop.`);
  if (cropPressureHigh) {
    addPriority("Pull the crop back slightly if the artwork starts to feel over-framed or if the crop is causing your available export detail to drop.");
  }

  const overlayPressure = showOverlay ? overlayStrength : 0;
  const overlayRisk = overlayPressure >= 0.68 && stats.brightnessLabel !== "light";
  cards.push({
    title: "Overlay tolerance",
    tone: overlayRisk ? "warn" : "good",
    detail: overlayRisk
      ? "Strong interface overlays on a non-light base can further flatten contrast, so the artwork may feel heavier or less open in-app."
      : "The current mood should tolerate common interface overlays without dramatically changing the overall read.",
    basis: `Overlay ${showOverlay ? `${Math.round(overlayStrength * 100)}%` : "off"} • brightness ${stats.brightnessLabel}`,
  });
  scoreBasis.push(`Overlay comments are triggered from the current overlay setting (${showOverlay ? `${Math.round(overlayStrength * 100)}%` : "off"}) and the cover's overall brightness (${stats.brightnessLabel}).`);
  if (overlayRisk) {
    addPriority("Keep the main focal area clear of very dark heavy texture if the cover will often sit under interface overlays.");
  }

  const safeRisk = safeInset < 0.07;
  cards.push({
    title: "Safe margin pressure",
    tone: safeRisk ? "warn" : "good",
    detail: safeRisk
      ? "A tighter safe guide leaves less room for platform framing, rounded corners, and labels, so edge-sensitive details deserve extra checking."
      : "The current safe-guide setting leaves a sensible buffer for corners, overlays, and tight UI framing.",
    basis: `Safe guide ${Math.round(safeInset * 100)}% inset`,
  });
  scoreBasis.push(`Safe-margin comments come from the current safe-guide inset (${Math.round(safeInset * 100)}%).`);
  if (safeRisk) {
    addPriority("Use a slightly larger safe inset when checking mockups if logos, faces, or typography are close to the edges.");
  }

  if (matchPct != null) {
    cards.push({
      title: "Genre/mood alignment",
      tone: matchPct >= 75 ? "good" : matchPct >= 55 ? "warn" : "bad",
      detail:
        matchPct >= 75
          ? "The cover mood sits close to the selected genre reference, so colour direction and atmosphere already feel coherent."
          : matchPct >= 55
            ? "The cover partially matches the selected genre direction. This can work, but the mood reads as a softer or broader interpretation."
            : "The cover sits quite far from the selected genre reference. That may be intentional, but it increases the need for a clearly readable focal idea.",
      basis: `Genre alignment ${matchPct}%`,
    });
    scoreBasis.push(`Genre comments use the current palette mood match (${matchPct}%) against the selected reference genre.`);
    if (matchPct < 55) {
      addPriority("If the genre mismatch is not intentional, adjust palette warmth, saturation, or contrast to move closer to the chosen reference direction.");
    }
  }

  const summary = sourceSupportsTarget && cropSupportsTarget && strongIconRead
    ? `This crop is in a strong position for a ${targetPx}px export: it keeps enough source detail and should still hold a recognisable thumbnail identity.`
    : `Use this page as a pressure test rather than a pass/fail verdict: the mockups suggest that export size, crop tightness, or thumbnail clarity still need attention before the cover is finalised.`;

  const contextNotes = {
    grid: muddyIconRisk
      ? "In a crowded grid, the cover is more likely to merge into neighbouring artwork because its detail level is still high for very small viewing."
      : strongIconRead
        ? "In a crowded grid, the artwork should remain recognisable because the main shapes and tonal separation survive downscaling."
        : "In a crowded grid, recognisability will depend on whether one dominant focal area stays clearer than the surrounding texture.",
    playlist: texture >= 68
      ? "In playlist rows, busy texture may compete with the tiny cover size, so the image could feel denser than intended."
      : "In playlist rows, the cover should stay relatively readable as an icon because the composition is not overly dense.",
    search: muddyIconRisk
      ? "At search-result scale, the cover risks becoming more of a colour block than a clear image, so distinct silhouette matters most."
      : "At search-result scale, the cover should still function as an identifying icon rather than collapsing completely into noise.",
    share: cropPressureHigh
      ? "For larger promo/share framing, this crop is quite tight, so double-check that the chosen crop still expresses the project mood and not only the focal object."
      : "For larger promo/share framing, the current crop keeps enough surrounding context to feel intentional as well as legible.",
  };

  return { summary, cards, priorities, scoreBasis, contextNotes };
}

export default function MockupsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as MockupsState;

  const [dataUrl, setDataUrl] = React.useState<string | null>(state.dataUrl ?? null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const [uiTheme, setUiTheme] = React.useState<UiTheme>("dark");
  const [rounded, setRounded] = React.useState(true);
  const [showOverlay, setShowOverlay] = React.useState(true);
  const [overlayStrength, setOverlayStrength] = React.useState(0.6);
  const [showSafe, setShowSafe] = React.useState(false);
  const [safeInset, setSafeInset] = React.useState(0.08);

  const [thumbSize, setThumbSize] = React.useState<ThumbSize>(RECOMMENDED_PX);
  const [distance, setDistance] = React.useState(22);

  const [cropPos, setCropPos] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = React.useState(1);
  const [panCrop, setPanCrop] = React.useState(false);

  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(null);

  const [palette, setPalette] = React.useState<PaletteResult | null>(null);
  const [stats, setStats] = React.useState<ColorStats | null>(null);
  const [genre, setGenre] = React.useState<GenreKey>("Indie");

  const [composition, setComposition] = React.useState<CompositionMetrics | null>(null);
  const compositionUi = React.useMemo(() => normalizeCompositionForUi(composition), [composition]);

  const [sheetMode, setSheetMode] = React.useState(false);

  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const panRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    basePos: { x: number; y: number };
  }>({
    active: false,
    startX: 0,
    startY: 0,
    basePos: { x: 0.5, y: 0.5 },
  });

  const distScale = React.useMemo(() => Math.max(0.72, 1 - distance * 0.0035), [distance]);
  const distBlur = React.useMemo(() => Math.min(3, distance * 0.035), [distance]);

  const BASE = import.meta.env.BASE_URL || "/";
  const neighborCovers = React.useMemo(() => {
    const fallbackSvg = (seed: number) => {
      const hue = seed % 360;
      const a = hslToHex(hue, 0.65, 0.45);
      const b = hslToHex((hue + 35) % 360, 0.6, 0.25);
      const svg = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${a}"/>
              <stop offset="1" stop-color="${b}"/>
            </linearGradient>
          </defs>
          <rect width="512" height="512" fill="url(#g)"/>
          <circle cx="380" cy="160" r="120" fill="rgba(255,255,255,0.10)"/>
          <rect x="70" y="330" width="300" height="18" fill="rgba(0,0,0,0.18)"/>
          <rect x="70" y="360" width="220" height="14" fill="rgba(0,0,0,0.14)"/>
        </svg>
      `);
      return `data:image/svg+xml;charset=utf-8,${svg}`;
    };

    const pool = Array.from(
      { length: 11 },
      (_, i) => `${BASE}play/${String(i + 1).padStart(2, "0")}.jpg`
    );

    const out: string[] = [];
    for (let i = 0; i < 11; i++) out.push(pool[i] ?? fallbackSvg(100 + i * 19));
    return out;
  }, [BASE]);

  const coverRadius = rounded ? 14 : 0;

  const imgStyle = React.useMemo(() => {
    return {
      objectPosition: `${cropPos.x * 100}% ${cropPos.y * 100}%`,
      transform: `scale(${zoom})`,
      transformOrigin: "center",
    } as const;
  }, [cropPos.x, cropPos.y, zoom]);

  const genreProfile = GENRES[genre];
  const match = React.useMemo(() => (stats ? scoreMatch(stats, genreProfile) : null), [stats, genreProfile]);
  const compatible = React.useMemo(() => (palette ? deriveCompatible(palette.regionAvg) : null), [palette]);

  const selectedThumb = thumbs[String(thumbSize)] || dataUrl || "";
  const gridThumb = selectedThumb || thumbs[String(CONTEXT_PREVIEW_SIZES.grid)] || thumbs["96"] || thumbs["128"] || dataUrl || "";
  const playlistThumb = selectedThumb || thumbs[String(CONTEXT_PREVIEW_SIZES.playlist)] || thumbs["64"] || gridThumb || dataUrl || "";
  const searchThumb = selectedThumb || thumbs[String(CONTEXT_PREVIEW_SIZES.search)] || thumbs["48"] || playlistThumb || dataUrl || "";
  const shareThumb = selectedThumb || thumbs[String(CONTEXT_PREVIEW_SIZES.share)] || thumbs["256"] || gridThumb || dataUrl || "";

  const thumbRenderSizes = React.useMemo(
    () => Array.from(new Set<number>([thumbSize, ...Object.values(CONTEXT_PREVIEW_SIZES)])).sort((a, b) => a - b),
    [thumbSize]
  );

  const cropSource = React.useMemo(() => {
    if (!imgSize) return null;
    return coverCropWithPosZoom(imgSize.w, imgSize.h, 1, 1, cropPos.x, cropPos.y, zoom);
  }, [imgSize, cropPos.x, cropPos.y, zoom]);

  const mockupInsights = React.useMemo(
    () =>
      buildMockupInsights({
        targetPx: thumbSize,
        imageSize: imgSize,
        cropSource,
        stats,
        compositionUi,
        matchPct: match?.pct ?? null,
        zoom,
        showOverlay,
        overlayStrength,
        safeInset,
      }),
    [thumbSize, imgSize, cropSource, stats, compositionUi, match?.pct, zoom, showOverlay, overlayStrength, safeInset]
  );

  React.useEffect(() => {
    if (!dataUrl) {
      setThumbs({});
      setImgSize(null);
      setPalette(null);
      setStats(null);
      setComposition(null);
      return;
    }

    let alive = true;

    void (async () => {
      setBusy(true);
      setError(null);

      try {
        const imgData = await buildAnalysisImageData(dataUrl, 1024);
        if (!alive) return;

        const full: NormalizedRect = { x: 0, y: 0, w: 1, h: 1 };
        const pal = computePalette(imgData.imageData, full);
        setPalette(pal);
        setStats(statsFromPalette(pal));

        const cropRect = coverCropWithPosZoom(
          imgData.imageData.width,
          imgData.imageData.height,
          1,
          1,
          cropPos.x,
          cropPos.y,
          zoom
        );

        setComposition(computeCompositionMetrics(imgData.imageData, cropRect));

        const res = await makeSquareThumbs(dataUrl, thumbRenderSizes, cropPos, zoom);
        if (!alive) return;

        setThumbs(res.thumbs);
        setImgSize({ w: res.w, h: res.h });
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to process image");
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [dataUrl, cropPos.x, cropPos.y, zoom, thumbRenderSizes]);

  React.useEffect(() => {
    if (!sheetMode) return;

    const handler = () => setSheetMode(false);
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [sheetMode]);

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);

    try {
      const url = await fileToObjectUrl(file);
      setDataUrl(url);
      setCropPos({ x: 0.5, y: 0.5 });
      setZoom(1);
      setPanCrop(false);
      setThumbs({});
      setImgSize(null);
      setPalette(null);
      setStats(null);
      setComposition(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!panCrop || !imgSize || !stageRef.current) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    panRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      basePos: { ...cropPos },
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current.active || !panCrop || !imgSize || !stageRef.current) return;

    const r = stageRef.current.getBoundingClientRect();
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    const { sw, sh } = coverCropWithPosZoom(
      imgSize.w,
      imgSize.h,
      1,
      1,
      panRef.current.basePos.x,
      panRef.current.basePos.y,
      zoom
    );

    const maxX = Math.max(1, imgSize.w - sw);
    const maxY = Math.max(1, imgSize.h - sh);

    const deltaPosX = -(dx * (sw / r.width)) / maxX;
    const deltaPosY = -(dy * (sh / r.height)) / maxY;

    setCropPos({
      x: clamp01(panRef.current.basePos.x + deltaPosX),
      y: clamp01(panRef.current.basePos.y + deltaPosY),
    });
  }

  function onPointerUp() {
    panRef.current.active = false;
  }

  function printSheet() {
    setSheetMode(true);
    requestAnimationFrame(() => window.print());
  }

  return (
    <div className={`analyzeWrap mockupsWrap ${sheetMode ? "mxSheetMode" : ""}`}>
      <div className="mockHero mxNoPrint">
        <div className="mockHeroTop">
          <button className="ghostBtn" onClick={() => navigate("/play")}>
            ← BACK
          </button>

          <div className="mockHeroActions">
            <button className="ghostBtn" onClick={() => fileRef.current?.click()} disabled={busy}>
              UPLOAD COVER
            </button>
            <button
              className="primaryBtn"
              disabled={!dataUrl}
              onClick={() => navigate("/analyze", { state: { dataUrl } })}
            >
              OPEN IN ANALYZE
            </button>
          </div>

          <input
            ref={fileRef}
            className="hiddenFile"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div className="testKicker">Real-world Simulation</div>
        <h1 className="testTitle">Mockups / Context Preview</h1>
        <p className="testLead">
          This page simulates how your cover is actually encountered on streaming platforms:
          small grid tiles, playlist rows, and UI overlays. Use it to pressure-test recognisability at small sizes while still checking whether your chosen crop can support a recommended <b>3000px</b> final square export.
        </p>

        <div className="mockBullets">
          <div className="mockBullet">
            <div className="mockBulletHead">Why it matters</div>
            <div className="mockBulletText">A cover that looks great full-size can fail as a 64px thumbnail.</div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">What to do here</div>
            <div className="mockBulletText">Pick the best thumbnail crop, then check readability + recognizability.</div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">Evidence for write-ups</div>
            <div className="mockBulletText">Export a sheet showing mockups + checklist for evaluation.</div>
          </div>
        </div>

        <hr className="mockRule" />
      </div>

      {!dataUrl && (
        <div className="emptyState mxNoPrint">
          <div className="emptyTitle">No cover selected.</div>
          <div className="emptySub">
            Upload a cover or click a tile on PLAY, then return here to preview streaming contexts.
          </div>
          <button className="primaryBtn" onClick={() => fileRef.current?.click()}>
            UPLOAD
          </button>
        </div>
      )}

      {dataUrl && (
        <>
          <div className="panelDark mxNoPrint">
            <div className="panelTop">
              <div className="panelTitle">Controls + Thumbnail Crop</div>
              <div className="panelNote">
                Use <b>PAN CROP</b> to reposition what the streaming square crop shows. The selected px target below controls the working/export size being tested, while the preview cards stay locked to realistic small platform sizes so playlist, search, and promo views do not scale unrealistically.
              </div>
            </div>

            <div className="panelBody">
              <div className="mockControlsGrid">
                <div className="mockCropCol">
                  <div
                    ref={stageRef}
                    className={`mockCropStage ${panCrop ? "isPanning" : ""}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    title={panCrop ? "Drag to reposition crop" : "Turn PAN CROP on to reposition"}
                  >
                    <img
                      className="mockCropImg"
                      src={dataUrl}
                      alt="Cover source"
                      draggable={false}
                      style={imgStyle}
                    />
                    {showSafe && <div className="mockSafe" style={safeInsetRectCss(safeInset)} />}
                  </div>

                  <div className="mockCropMeta">
                    <div className="metaRow">
                      {imgSize && <span className="tag">{imgSize.w}×{imgSize.h}</span>}
                      <span className="tag">zoom {Math.round(zoom * 100)}%</span>
                      <span className="tag">{panCrop ? "mode: PAN" : "mode: VIEW"}</span>
                      <span className="tag">target {thumbSize}px{thumbSize === RECOMMENDED_PX ? " • recommended" : ""}</span>
                    </div>

                    {compositionUi && (
                      <div className="metaRow" style={{ marginTop: 8 }}>
                        <span className="tag">brightness: {compositionUi.luminanceLabel}</span>
                        <span className="tag">texture: {Math.round(compositionUi.textureEnergy)}/100</span>
                        <span className="tag">symmetry: {Math.round(compositionUi.symmetryScore)}/100</span>
                        <span className="tag">shape: {Math.round(compositionUi.structureScore)}/100</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mockSettingsCol">
                  <div className="mockToolbar">
                    <div className="mockControl">
                      <div className="mockLabel">UI theme</div>
                      <div className="pillRow">
                        <button className={`pillBtn ${uiTheme === "dark" ? "on" : ""}`} onClick={() => setUiTheme("dark")}>
                          DARK
                        </button>
                        <button className={`pillBtn ${uiTheme === "light" ? "on" : ""}`} onClick={() => setUiTheme("light")}>
                          LIGHT
                        </button>
                      </div>
                    </div>

                    <div className="mockControl">
                      <div className="mockLabel">Corners</div>
                      <button className={`pillBtn ${rounded ? "on" : ""}`} onClick={() => setRounded((v) => !v)}>
                        {rounded ? "ROUNDED" : "SQUARE"}
                      </button>
                    </div>

                    <div className="mockControl">
                      <div className="mockLabel">UI overlays</div>
                      <button className={`pillBtn ${showOverlay ? "on" : ""}`} onClick={() => setShowOverlay((v) => !v)}>
                        {showOverlay ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="mockControl wide">
                      <div className="mockLabel">Overlay strength</div>
                      <div className="mockRangeRow">
                        <input
                          className="mockRange"
                          type="range"
                          min={0}
                          max={0.95}
                          step={0.01}
                          value={overlayStrength}
                          onChange={(e) => setOverlayStrength(parseFloat(e.currentTarget.value))}
                        />
                        <span className="tag">{Math.round(overlayStrength * 100)}%</span>
                      </div>
                    </div>

                    <div className="mockControl">
                      <div className="mockLabel">Safe guide</div>
                      <button className={`pillBtn ${showSafe ? "on" : ""}`} onClick={() => setShowSafe((v) => !v)}>
                        {showSafe ? "SHOWING" : "HIDDEN"}
                      </button>
                    </div>

                    <div className="mockControl wide">
                      <div className="mockLabel">Safe inset</div>
                      <div className="mockRangeRow">
                        <input
                          className="mockRange"
                          type="range"
                          min={0.04}
                          max={0.14}
                          step={0.005}
                          value={safeInset}
                          onChange={(e) => setSafeInset(parseFloat(e.currentTarget.value))}
                        />
                        <span className="tag">{Math.round(safeInset * 100)}%</span>
                      </div>
                    </div>

                    <div className="mockControl">
                      <div className="mockLabel">PAN CROP</div>
                      <button className={`pillBtn ${panCrop ? "on" : ""}`} onClick={() => setPanCrop((v) => !v)}>
                        {panCrop ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="mockControl wide">
                      <div className="mockLabel">Zoom</div>
                      <div className="mockRangeRow">
                        <input
                          className="mockRange"
                          type="range"
                          min={1}
                          max={2.5}
                          step={0.01}
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.currentTarget.value))}
                        />
                        <button
                          className="ghostBtn"
                          onClick={() => {
                            setCropPos({ x: 0.5, y: 0.5 });
                            setZoom(1);
                          }}
                        >
                          RESET
                        </button>
                      </div>
                    </div>

                    <div className="mockControl wide">
                      <div className="mockLabel">Working / export size</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div className="pillRow">
                          {PX_OPTIONS.map((s) => (
                            <button
                              key={s}
                              className={`pillBtn ${thumbSize === s ? "on" : ""}`}
                              onClick={() => setThumbSize(s)}
                              title={s === RECOMMENDED_PX ? "Recommended" : undefined}
                            >
                              {s}px{s === RECOMMENDED_PX ? " • recommended" : ""}
                            </button>
                          ))}
                        </div>
                        <div className="miniHint">
                          <b>Recommended square working/export size:</b> 3000px. The smaller px options are there to pressure-test recognisability and crop stability before you confirm the final export. The examples below now update with your selected px target, while each panel still tells you the usual platform-sized context it is simulating (grid about 96px, playlist about 64px, search about 48px, promo about 256px).
                        </div>
                      </div>
                    </div>

                    <div className="mockControl wide">
                      <div className="mockLabel">Viewing distance (glance)</div>
                      <div className="mockRangeRow">
                        <input
                          className="mockRange"
                          type="range"
                          min={0}
                          max={80}
                          value={distance}
                          onChange={(e) => setDistance(parseInt(e.currentTarget.value, 10))}
                        />
                        <span className="tag">
                          scale {Math.round(distScale * 100)}% • blur {distBlur.toFixed(1)}px
                        </span>
                      </div>
                    </div>
                  </div>

                  {error && <div className="errorLine">{error}</div>}
                  {busy && <div className="miniHint" style={{ marginTop: 10 }}>Processing…</div>}
                </div>
              </div>
            </div>

            <div className="panelBottom mxNoPrint">
              <div className="metaRow">
                <button className="primaryBtn" onClick={printSheet} disabled={!dataUrl}>
                  EXPORT MOCKUPS SHEET (PDF)
                </button>
                <button className="ghostBtn" onClick={() => navigate("/analyze", { state: { dataUrl } })}>
                  IMPROVE IN ANALYZE
                </button>
              </div>
            </div>
          </div>

          <div className="mockupsGrid mxNoPrint">
            <div className="mockupsLeft">
              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Streaming grid</div>
                  <div className="panelNote">Tests recognizability and thumbnail identity in crowded feeds.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={{ ["--mockScale" as any]: distScale, ["--mockBlur" as any]: `${distBlur}px` }}
                  >
                    <div className="mockGrid">
                      {Array.from({ length: 12 }, (_, i) => {
                        const isCenter = i === 4;
                        const src = isCenter ? gridThumb : neighborCovers[i % neighborCovers.length];

                        return (
                          <div key={i} className="mockCell">
                            <div
                              className="mockCover"
                              style={{ borderRadius: coverRadius, backgroundImage: `url(${src})` }}
                            />
                            {showOverlay && <div className="mockOverlay" style={{ opacity: overlayStrength }} />}
                            {isCenter && <div className="mockBadge">YOU</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="miniHint" style={{ marginTop: 12 }}>
                    Grid tiles are usually around {CONTEXT_PREVIEW_SIZES.grid}px here, but the center example updates with your selected {thumbSize}px target. If the cover becomes muddy, use Analyze to increase contrast in the title region or reduce texture behind type.
                  </div>
                  {mockupInsights && (
                    <div className="detailLine" style={{ marginTop: 10 }}>
                      <b>Grid reading:</b> {mockupInsights.contextNotes.grid}
                    </div>
                  )}
                  {mockupInsights && (
                    <div className="detailLine" style={{ marginTop: 12 }}>
                      <b>Playlist reading:</b> {mockupInsights.contextNotes.playlist}
                    </div>
                  )}
                </div>
              </div>

              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`} style={{ marginTop: 25 }}>
                <div className="panelTop" >
                  <div className="panelTitle">Playlist row</div>
                  <div className="panelNote">Common view: usually around 64px on platform, but this example updates with your selected px target so you can compare pressure-test sizes against the usual context.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={{ ["--mockScale" as any]: distScale, ["--mockBlur" as any]: `${distBlur}px` }}
                  >
                    <div className="mockList">
                      {Array.from({ length: 6 }, (_, i) => {
                        const isYou = i === 1;
                        const src = isYou ? playlistThumb : neighborCovers[(i + 3) % neighborCovers.length];

                        return (
                          <div key={i} className="mockRow">
                            <div
                              className="mockCover tiny"
                              style={{
                                borderRadius: coverRadius,
                                backgroundImage: `url(${src})`,
                                width: CONTEXT_PREVIEW_SIZES.playlist,
                                height: CONTEXT_PREVIEW_SIZES.playlist,
                              }}
                            />
                            <div className="mockText">
                              <div className="mockTitleLine">
                                {isYou ? "Your Track" : `Track ${i + 1}`}
                                {showOverlay && <span className="mockBadgeSmall">E</span>}
                              </div>
                              <div className="mockSubLine">{isYou ? "Your Artist" : "Artist Name"}</div>
                            </div>
                            <div className="mockTime">
                              {3 + i}:{String((i * 7) % 60).padStart(2, "0")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="detailLine" style={{ marginTop: 12 }}>
                    <b>Playlist context:</b> The row is simulating a playlist surface that is usually around {CONTEXT_PREVIEW_SIZES.playlist}px, but the cover image inside it is currently being generated from your selected {thumbSize}px target.
                  </div>
                </div>
              </div>

              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`} style={{ marginTop: 25 }}>
                <div className="panelTop">
                  <div className="panelTitle">Search results</div>
                  <div className="panelNote">Even smaller thumbnails. Search results are usually around 48px, but this example updates with your selected px target so you can see how the cover survives inside that compact context.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={{ ["--mockScale" as any]: distScale, ["--mockBlur" as any]: `${distBlur}px` }}
                  >
                    <div className="mockSearch">
                      {Array.from({ length: 5 }, (_, i) => {
                        const isYou = i === 2;
                        const src = isYou ? searchThumb : neighborCovers[(i + 7) % neighborCovers.length];

                        return (
                          <div key={i} className="mockSearchRow">
                            <div
                              className="mockCover tiny"
                              style={{
                                borderRadius: coverRadius,
                                backgroundImage: `url(${src})`,
                                width: CONTEXT_PREVIEW_SIZES.search,
                                height: CONTEXT_PREVIEW_SIZES.search,
                              }}
                            />
                            <div className="mockText">
                              <div className="mockTitleLine">{isYou ? "Your Album" : `Album ${i + 1}`}</div>
                              <div className="mockSubLine">{isYou ? "Your Artist" : "Artist"}</div>
                            </div>
                            <div className="mockRowRight">⋯</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {mockupInsights && (
                    <div className="detailLine" style={{ marginTop: 12 }}>
                      <b>Search reading:</b> {mockupInsights.contextNotes.search}
                    </div>
                  )}
                  <div className="detailLine" style={{ marginTop: 12 }}>
                    <b>Search context:</b> Search results are usually around {CONTEXT_PREVIEW_SIZES.search}px, but this preview is currently using your selected {thumbSize}px source inside that icon-like layout.
                  </div>
                </div>
              </div>

              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`} style={{ marginTop: 25 }}>
                <div className="panelTop">
                  <div className="panelTitle">Share / promo tile</div>
                  <div className="panelNote">Editorial framing for socials. Promo tiles are often larger than playlist/search icons, usually around 256px here, but this example still updates with your selected px target.</div>
                </div>

                <div className="panelBody">
                  <div className="mockShareCard">
                    <div className="mockShareTop">
                      <span className="mockPill">NEW RELEASE</span>
                      <span className="mockPill ghost">LISTEN</span>
                    </div>

                    <div className="mockShareCover">
                      <div
                        className="mockCover big"
                        style={{ borderRadius: coverRadius, backgroundImage: `url(${shareThumb})` }}
                      />
                      {showOverlay && <div className="mockOverlay soft" style={{ opacity: overlayStrength * 0.35 }} />}
                    </div>

                    <div className="mockShareText">
                      <div className="mockTitleLine">Your Album</div>
                      <div className="mockSubLine">Your Artist</div>
                      <div className="miniHint" style={{ marginTop: 8 }}>
                        If the crop changes the meaning, reposition it with PAN CROP.
                      </div>
                      {mockupInsights && (
                        <div className="detailLine" style={{ marginTop: 10 }}>
                          <b>Share / promo reading:</b> {mockupInsights.contextNotes.share}
                        </div>
                      )}
                      <div className="detailLine" style={{ marginTop: 10 }}>
                        <b>Promo context:</b> This tile is representing a promo surface that is usually around {CONTEXT_PREVIEW_SIZES.share}px, while the cover source updates with your selected {thumbSize}px target.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panelDark" style={{ marginTop: 25 }}>
                <div className="panelTop">
                  <div className="panelTitle">Quick checklist</div>
                  <div className="panelNote">Use as short evaluation evidence.</div>
                </div>
                <div className="panelBody">
                  <div className="mxChecklist">
                    <div className="mxCheckItem">
                      <div className="mxCheckHead">Thumbnail identity</div>
                      <div className="mxCheckText">At small platform sizes, does it still feel unique and not muddy — and does the selected crop still support your chosen export size?</div>
                    </div>
                    <div className="mxCheckItem">
                      <div className="mxCheckHead">Edge risk</div>
                      <div className="mxCheckText">Any critical content too close to corners or overlays?</div>
                    </div>
                    <div className="mxCheckItem">
                      <div className="mxCheckHead">Crop meaning</div>
                      <div className="mxCheckText">Does your chosen crop still represent the intended concept or mood?</div>
                    </div>
                    <div className="mxCheckItem">
                      <div className="mxCheckHead">Readability expectation</div>
                      <div className="mxCheckText">If the title zone feels busy here, it will likely fail clutter checks in Analyze.</div>
                    </div>
                  </div>

                  <div className="mxActions">
                    <button className="primaryBtn" onClick={printSheet}>
                      EXPORT SHEET (PDF)
                    </button>
                    <button className="ghostBtn" onClick={() => navigate("/analyze", { state: { dataUrl } })}>
                      FIX IN ANALYZE
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mockupsRight">
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Mockup analysis</div>
                  <div className="panelNote">
                    Recommended export size is <b>3000px</b>. These comments explain whether the current source image, crop, and visual character can support that target while still reading in small streaming contexts.
                  </div>
                </div>

                <div className="panelBody">
                  {!mockupInsights ? (
                    <div className="miniHint">Upload or select a cover to generate detailed mockup analysis.</div>
                  ) : (
                    <>
                      <div className="metricsGrid">
                        <div className="metricCard">
                          <div className="metricLabel">Target size</div>
                          <div className="metricValue">{thumbSize}px</div>
                          <div className="metricSub">{thumbSize === RECOMMENDED_PX ? "recommended final square size" : "selected export / working size"}</div>
                        </div>

                        <div className="metricCard">
                          <div className="metricLabel">Source image</div>
                          <div className="metricValue">{imgSize ? `${imgSize.w}×${imgSize.h}` : "—"}</div>
                          <div className="metricSub">uploaded file dimensions</div>
                        </div>

                        <div className="metricCard">
                          <div className="metricLabel">Crop source</div>
                          <div className="metricValue">{cropSource ? `${Math.round(Math.min(cropSource.sw, cropSource.sh))}px` : "—"}</div>
                          <div className="metricSub">minimum source detail remaining inside the crop</div>
                        </div>

                        <div className="metricCard">
                          <div className="metricLabel">Texture / structure</div>
                          <div className="metricValue">
                            {compositionUi ? `${Math.round(compositionUi.textureEnergy)}/${Math.round(compositionUi.structureScore)}` : "—"}
                          </div>
                          <div className="metricSub">texture can increase mud; structure helps identity</div>
                        </div>
                      </div>

                      <div className="detailLine" style={{ marginTop: 14 }}>
                        <b>Overall reading:</b> {mockupInsights.summary}
                      </div>

                      <div className="sectionHead" style={{ marginTop: 18, marginBottom: 10 }}>Main score factors</div>
                      <div className="suggestList">
                        {mockupInsights.cards.map((item) => (
                          <div key={item.title} className="suggestItem">
                            <div className="suggestTitle">
                              {item.title} • {item.tone === "good" ? "strong" : item.tone === "warn" ? "watch" : "risk"}
                            </div>
                            <div className="suggestDetail">{item.detail}</div>
                            <div className="detailLine" style={{ marginTop: 8 }}>Basis: {item.basis}</div>
                          </div>
                        ))}
                      </div>

                      <div className="sectionHead" style={{ marginTop: 18, marginBottom: 10 }}>Most important changes</div>
                      <div className="suggestList">
                        {mockupInsights.priorities.length ? (
                          mockupInsights.priorities.map((item, idx) => (
                            <div key={item} className="suggestItem">
                              <div className="suggestTitle">Priority {idx + 1}</div>
                              <div className="suggestDetail">{item}</div>
                            </div>
                          ))
                        ) : (
                          <div className="suggestItem">
                            <div className="suggestTitle">Priority</div>
                            <div className="suggestDetail">
                              The current mockup setup is broadly stable. Keep 3000px as the final export target and use Analyze to refine the title region if readability still feels weak.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sectionHead" style={{ marginTop: 18, marginBottom: 10 }}>Why these comments are showing</div>
                      <div className="suggestList">
                        {mockupInsights.scoreBasis.map((item) => (
                          <div key={item} className="suggestItem">
                            <div className="suggestDetail">{item}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="panelDark" style={{ marginTop: 25 }}>
                <div className="panelTop">
                  <div className="panelTitle">Genre Mood Lens</div>
                  <div className="panelNote">
                    This is not genre detection. It compares your cover’s color mood to common genre conventions.
                  </div>
                </div>

                <div className="panelBody">
                  <div className="mockControl">
                    <div className="mockLabel">Choose a genre direction</div>
                    <select className="mockSelect" value={genre} onChange={(e) => setGenre(e.currentTarget.value as GenreKey)}>
                      {Object.keys(GENRES).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {palette && stats ? (
                    <>
                      <div className="sectionBlock" style={{ marginTop: 14 }}>
                        <div className="sectionHead">Your cover mood</div>
                        <div className="metaRow">
                          <span className="tag">brightness: {stats.brightnessLabel}</span>
                          <span className="tag">saturation: {stats.saturationLabel}</span>
                          <span className="tag">temperature: {stats.temperatureLabel}</span>
                        </div>

                        <div className="paletteRows">
                          <div className="paletteLine">
                            <span className="miniLabel">Extracted palette</span>
                            <div className="paletteStrip">
                              {palette.image.slice(0, 6).map((c) => (
                                <span key={c} className="chip small" style={{ background: c }} title={c} />
                              ))}
                            </div>
                          </div>

                          <div className="paletteLine">
                            <span className="miniLabel">Region avg</span>
                            <div className="paletteStrip">
                              <span className="chip small" style={{ background: palette.regionAvg }} title={palette.regionAvg} />
                              <span className="tag">{palette.regionAvg}</span>
                            </div>
                          </div>
                        </div>

                        {compatible && (
                          <div className="paletteRows">
                            <div className="paletteLine">
                              <span className="miniLabel">Compatible accents</span>
                              <div className="paletteStrip">
                                <span className="chip small" style={{ background: compatible.complement }} title={compatible.complement} />
                                {compatible.analogous.map((c) => (
                                  <span key={c} className="chip small" style={{ background: c }} title={c} />
                                ))}
                                {compatible.triadic.map((c) => (
                                  <span key={c} className="chip small" style={{ background: c }} title={c} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sectionBlock" style={{ marginTop: 14 }}>
                        <div className="sectionHead">{genreProfile.name} conventions</div>

                        <ul className="mockListBullets">
                          {genreProfile.traits.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>

                        <div className="paletteRows">
                          <div className="paletteLine">
                            <span className="miniLabel">Reference palette</span>
                            <div className="paletteStrip">
                              {genreProfile.palette.map((c) => (
                                <span key={c} className="chip small" style={{ background: c }} title={c} />
                              ))}
                            </div>
                          </div>
                        </div>

                        {match && (
                          <div className="mockMatchRow">
                            <span className={`statusTag ${match.pct >= 55 ? "pass" : "fail"}`}>
                              Alignment: {match.label} • {match.pct}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="sectionBlock" style={{ marginTop: 14 }}>
                        <div className="sectionHead">How this connects to cover design</div>
                        <ul className="mockListBullets">
                          <li>Use this as art direction support for palette and contrast decisions.</li>
                          <li>Use compatible accents for overlays, label strips, and UI-safe highlights.</li>
                          <li>If alignment is low, that can be intentional — but check readability and grid identity carefully.</li>
                        </ul>

                        <div className="mockNextActions">
                          <button className="primaryBtn" onClick={() => navigate("/analyze", { state: { dataUrl } })}>
                            GO TO ANALYZE
                          </button>
                          <button className="ghostBtn" onClick={printSheet}>
                            EXPORT SHEET
                          </button>
                        </div>
                      </div>

                      <div className="miniHint" style={{ marginTop: 12 }}>
                        Want stronger {genre} alignment?
                        <ul className="mockListBullets">
                          {genreProfile.guidance.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="miniHint">Upload/select a cover to compute palette and mood.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={`mxPrintSheet mxPrintOnly ${sheetMode ? "show" : ""}`}>
            <div className="mxPrintHeader">
              <div>
                <div className="mxPrintKicker">COVERCHECK</div>
                <div className="mxPrintTitle">Mockups Evidence Sheet</div>
                <div className="mxPrintMeta">
                  Date: {new Date().toLocaleString()} • Theme: {uiTheme} • Rounded: {rounded ? "on" : "off"} • Overlay:{" "}
                  {showOverlay ? `${Math.round(overlayStrength * 100)}%` : "off"} • Target: {thumbSize}px{thumbSize === RECOMMENDED_PX ? " (recommended)" : ""} • Usual contexts: grid ~96px / playlist ~64px / search ~48px / promo ~256px
                </div>
              </div>
            </div>

            <div className="mxPrintGrid">
              <div className="mxPrintBlock">
                <div className="mxPrintBlockHead">Grid context</div>
                <div className="mxPrintSurface">
                  <img src={gridThumb} alt="thumb 96" />
                  <img src={playlistThumb} alt="thumb 64" />
                  <img src={searchThumb} alt="thumb 48" />
                </div>
                <div className="mxPrintNotes">
                  Notes:
                  <div className="mxPrintLine" />
                  <div className="mxPrintLine" />
                </div>
              </div>

              <div className="mxPrintBlock">
                <div className="mxPrintBlockHead">Playlist row</div>
                <div className="mxPrintSurface">
                  <img src={playlistThumb} alt="playlist thumb" />
                  <div className="mxPrintText">Does it still feel distinct next to text?</div>
                </div>
                <div className="mxPrintNotes">
                  Notes:
                  <div className="mxPrintLine" />
                  <div className="mxPrintLine" />
                </div>
              </div>

              <div className="mxPrintBlock">
                <div className="mxPrintBlockHead">Search / icon</div>
                <div className="mxPrintSurface">
                  <img src={searchThumb} alt="search thumb" />
                  <div className="mxPrintText">If it’s muddy at 48px, improve crop, contrast, or simplify the title zone.</div>
                </div>
                <div className="mxPrintNotes">
                  Notes:
                  <div className="mxPrintLine" />
                  <div className="mxPrintLine" />
                </div>
              </div>

              <div className="mxPrintBlock">
                <div className="mxPrintBlockHead">Genre Mood Lens</div>
                <div className="mxPrintSurface">
                  <div className="mxPrintText">
                    Genre: <b>{genre}</b> • Alignment: <b>{match ? `${match.label} ${match.pct}%` : "—"}</b>
                  </div>
                  <div className="mxPrintPalette">
                    {palette?.image.slice(0, 6).map((c) => (
                      <span key={c} className="mxPrintChip" style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="mxPrintNotes">
                  Notes:
                  <div className="mxPrintLine" />
                  <div className="mxPrintLine" />
                </div>
              </div>
            </div>

            <div className="mxPrintChecklist">
              <div className="mxPrintBlockHead">Checklist</div>
              <ul>
                <li>Thumbnail identity holds at 64px</li>
                <li>Crop still represents concept/mood</li>
                <li>No critical elements risk corners/overlays</li>
                <li>Genre mood direction is intentional</li>
              </ul>
            </div>

            <div className="mxPrintFooter">Exported from CoverCheck • Mockups / Context Preview</div>
          </div>
        </>
      )}
    </div>
  );
}