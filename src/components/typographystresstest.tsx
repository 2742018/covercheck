import React from "react";
import type { NormalizedRect, PaletteResult, RegionMetrics } from "../analysis/metrics";
import type { TypographyStressSnapshot } from "../lib/report";

type TypographyStressTestProps = {
  dataUrl: string | null;
  viewMode: "crop" | "full";
  cropPos: { x: number; y: number };
  zoom: number;
  region: NormalizedRect | null;
  palette: PaletteResult | null;
  regionMetrics: RegionMetrics | null;
  onEvaluationChange?: (snapshot: TypographyStressSnapshot | null) => void;
};

type SampleSize = 64 | 96 | 128 | 256;
type WeightMode = 400 | 500 | 600 | 700 | 800 | 900;
type AlignMode = "left" | "center" | "right";
type OverlayMode = "none" | "soft" | "strong" | "gradient" | "glass";
type CaseMode = "title" | "upper" | "sentence" | "lower";
type FontKey =
  | "inter"
  | "grotesk"
  | "serif"
  | "display"
  | "editorial"
  | "mono";

type Preset = {
  id: string;
  label: string;
  font: FontKey;
  weight: WeightMode;
  overlay: OverlayMode;
  align: AlignMode;
  tracking: number;
  titleScale: number;
  artistScale: number;
};

type RenderState = {
  size: number;
  font: FontKey;
  weight: WeightMode;
  align: AlignMode;
  overlay: OverlayMode;
  caseMode: CaseMode;
  titleText: string;
  artistText: string;
  tracking: number;
  titleScale: number;
  artistScale: number;
  blockX: number;
  blockY: number;
  blockWidth: number;
  titleLift: number;
  artistGap: number;
  titleItalic: boolean;
  artistCaps: boolean;
  region: NormalizedRect | null;
  textColor: string;
};

type EnhancedRegionMetrics = RegionMetrics &
  Partial<{
    uniformityScore: number;
    averageLuminance: number;
    luminanceSpread: number;
    toneLabel: "Dark" | "Mid-tone" | "Light";
    areaPct: number;
    pixelWidth: number;
    pixelHeight: number;
    p10Luminance: number;
    p90Luminance: number;
    edgeMean: number;
  }>;

type StressFactor = {
  key: string;
  label: string;
  value: string;
  effect: number;
  basis: string;
};

type StressSuggestion = {
  key: string;
  title: string;
  detail: string;
  tryLine: string;
  priority: number;
};

type StressEvaluation = {
  score: number;
  label: "Strong" | "Usable" | "Risky" | "Weak";
  summary: string;
  basis: string;
  factors: StressFactor[];
  suggestions: StressSuggestion[];
};

const FONT_OPTIONS: Record<
  FontKey,
  {
    label: string;
    family: string;
    vibe: string;
  }
> = {
  inter: {
    label: "Inter",
    family:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    vibe: "neutral / streaming-safe",
  },
  grotesk: {
    label: "Space Grotesk",
    family: '"Space Grotesk", "Arial Narrow", Arial, sans-serif',
    vibe: "modern / punchy",
  },
  serif: {
    label: "DM Serif",
    family: '"DM Serif Display", Georgia, Cambria, "Times New Roman", serif',
    vibe: "cinematic / dramatic",
  },
  display: {
    label: "Bebas Neue",
    family: '"Bebas Neue", Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    vibe: "poster / loud",
  },
  editorial: {
    label: "Playfair",
    family: '"Playfair Display", Georgia, Cambria, serif',
    vibe: "editorial / elegant",
  },
  mono: {
    label: "JetBrains Mono",
    family: '"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace',
    vibe: "technical / cold",
  },
};

const PRESETS: Preset[] = [
  {
    id: "clean-pop",
    label: "Clean pop",
    font: "inter",
    weight: 800,
    overlay: "soft",
    align: "left",
    tracking: 0.015,
    titleScale: 0.16,
    artistScale: 0.48,
  },
  {
    id: "loud-rap",
    label: "Loud rap",
    font: "display",
    weight: 900,
    overlay: "strong",
    align: "center",
    tracking: 0.03,
    titleScale: 0.18,
    artistScale: 0.42,
  },
  {
    id: "indie-editorial",
    label: "Indie editorial",
    font: "editorial",
    weight: 700,
    overlay: "glass",
    align: "center",
    tracking: 0.01,
    titleScale: 0.15,
    artistScale: 0.46,
  },
  {
    id: "alt-modern",
    label: "Alt modern",
    font: "grotesk",
    weight: 700,
    overlay: "gradient",
    align: "left",
    tracking: 0.02,
    titleScale: 0.155,
    artistScale: 0.47,
  },
  {
    id: "ambient-minimal",
    label: "Ambient minimal",
    font: "mono",
    weight: 500,
    overlay: "none",
    align: "left",
    tracking: 0.022,
    titleScale: 0.13,
    artistScale: 0.42,
  },
];

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function clamp01(v: number) {
  return clamp(v, 0, 1);
}

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

function coverCropWithPosZoom(
  srcW: number,
  srcH: number,
  posX01: number,
  posY01: number,
  zoom: number
) {
  const base = coverCrop(srcW, srcH, 1, 1);
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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function toTitleCase(text: string) {
  return text.replace(/\w\S*/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

function applyCase(text: string, mode: CaseMode) {
  if (mode === "upper") return text.toUpperCase();
  if (mode === "lower") return text.toLowerCase();
  if (mode === "title") return toTitleCase(text);
  return text;
}

function getOverlayModeLabel(mode: OverlayMode) {
  if (mode === "soft") return "soft";
  if (mode === "strong") return "strong";
  if (mode === "gradient") return "gradient";
  if (mode === "glass") return "glass";
  return "none";
}

function deriveTextColor(palette: PaletteResult | null) {
  return palette?.text.primary ?? "#ffffff";
}

function getOverlayFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  blockHeightPx: number,
  mode: OverlayMode
) {
  if (mode === "none") return null;
  if (mode === "soft") return "rgba(0,0,0,0.28)";
  if (mode === "strong") return "rgba(0,0,0,0.50)";
  if (mode === "glass") return "rgba(18,18,18,0.34)";

  const gradient = ctx.createLinearGradient(x, y, x, y + blockHeightPx);
  gradient.addColorStop(0, "rgba(0,0,0,0.08)");
  gradient.addColorStop(0.5, "rgba(0,0,0,0.34)");
  gradient.addColorStop(1, "rgba(0,0,0,0.56)");
  return gradient;
}

function measureTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  trackingPx: number
) {
  if (!text) return 0;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += ctx.measureText(text[i]).width;
    if (i < text.length - 1) width += trackingPx;
  }
  return width;
}

function drawTrackedText(args: {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  align: AlignMode;
  trackingPx: number;
}) {
  const { ctx, text, x, y, align, trackingPx } = args;
  if (!text) return;

  const totalWidth = measureTrackedText(ctx, text, trackingPx);
  let cursorX = x;

  if (align === "center") cursorX = x - totalWidth / 2;
  if (align === "right") cursorX = x - totalWidth;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + (i < text.length - 1 ? trackingPx : 0);
  }
}

function pushUniqueSuggestion(list: StressSuggestion[], item: StressSuggestion) {
  if (!list.some((existing) => existing.key === item.key)) {
    list.push(item);
  }
}

function addFactor(list: StressFactor[], factor: StressFactor) {
  const existing = list.find((item) => item.key === factor.key);
  if (!existing) {
    list.push(factor);
  }
}

function buildStressEvaluation(args: {
  sampleSize: number;
  weight: number;
  tracking: number;
  overlay: OverlayMode;
  regionMetrics: RegionMetrics | null;
  region: NormalizedRect | null;
  font: FontKey;
  titleScale: number;
  blockWidth: number;
  align: AlignMode;
}) {
  const {
    sampleSize,
    weight,
    tracking,
    overlay,
    regionMetrics,
    region,
    font,
    titleScale,
    blockWidth,
    align,
  } = args;

  const rm = (regionMetrics as EnhancedRegionMetrics | null) ?? null;
  const factors: StressFactor[] = [];
  const suggestions: StressSuggestion[] = [];
  let score = 50;

  const apply = (
    key: string,
    label: string,
    value: string,
    effect: number,
    basis: string
  ) => {
    score += effect;
    addFactor(factors, { key, label, value, effect, basis });
  };

  if (sampleSize <= 64) {
    apply(
      "sample",
      "Sample size",
      `${sampleSize}px`,
      -8,
      "64px is the harshest thumbnail test, so even decent styles can fail here first."
    );
  } else if (sampleSize <= 96) {
    apply(
      "sample",
      "Sample size",
      `${sampleSize}px`,
      -3,
      "96px still reflects strong thumbnail pressure, but it is slightly more forgiving than 64px."
    );
  } else if (sampleSize <= 128) {
    apply(
      "sample",
      "Sample size",
      `${sampleSize}px`,
      4,
      "128px is a useful mid-size test for browsing grids and playlists."
    );
  } else {
    apply(
      "sample",
      "Sample size",
      `${sampleSize}px`,
      9,
      "256px is a generous test size, so hierarchy becomes easier to preserve."
    );
  }

  if (weight >= 800) {
    apply("weight", "Title weight", `${weight}`, 8, "Heavier title weight usually survives downscaling better.");
  } else if (weight >= 700) {
    apply("weight", "Title weight", `${weight}`, 4, "This is a healthy display weight for most thumbnail contexts.");
  } else if (weight >= 600) {
    apply("weight", "Title weight", `${weight}`, 0, "Medium weight can work, but it depends more on contrast and calmness.");
  } else {
    apply("weight", "Title weight", `${weight}`, -7, "Lighter title weights often break sooner when the artwork is reduced.");
  }

  if (tracking < 0.005) {
    apply("tracking", "Tracking", `${tracking.toFixed(3)}em`, -4, "Tight letter spacing can close counters and weaken small-size clarity.");
  } else if (tracking <= 0.03) {
    apply("tracking", "Tracking", `${tracking.toFixed(3)}em`, 3, "Moderate spacing usually helps scanning without destroying word shape.");
  } else if (tracking <= 0.04) {
    apply("tracking", "Tracking", `${tracking.toFixed(3)}em`, 0, "Wide spacing can still work, but the title starts to feel more fragile as words spread out.");
  } else {
    apply("tracking", "Tracking", `${tracking.toFixed(3)}em`, -4, "Very wide tracking can separate letters so much that word shape weakens.");
  }

  if (overlay === "none") {
    apply("overlay", "Overlay", "none", -5, "Without an overlay, the title depends entirely on the image for separation.");
  } else if (overlay === "soft") {
    apply("overlay", "Overlay", "soft", 4, "A soft overlay gives separation without making the text block feel too heavy.");
  } else if (overlay === "strong") {
    apply("overlay", "Overlay", "strong", 8, "A strong overlay creates the most direct tonal separation for type.");
  } else if (overlay === "gradient") {
    apply("overlay", "Overlay", "gradient", 6, "A gradient can stabilise the text zone while preserving more of the artwork underneath.");
  } else {
    apply("overlay", "Overlay", "glass", 5, "Glass styling adds separation with less weight than a solid panel.");
  }

  if (titleScale >= 0.17) {
    apply("title-scale", "Title scale", `${Math.round(titleScale * 100)}%`, 7, "The title takes up enough vertical space to stay visible sooner.");
  } else if (titleScale >= 0.145) {
    apply("title-scale", "Title scale", `${Math.round(titleScale * 100)}%`, 3, "The title scale is workable, but still depends on a stable background.");
  } else {
    apply("title-scale", "Title scale", `${Math.round(titleScale * 100)}%`, -8, "A conservative headline scale often disappears first under thumbnail pressure.");
  }

  if (blockWidth < 0.5) {
    apply("block-width", "Text block width", blockWidth.toFixed(2), -4, "A narrow text block can look refined, but it reduces flexibility for headline layout.");
  } else if (blockWidth > 0.9) {
    apply("block-width", "Text block width", blockWidth.toFixed(2), -1, "A very wide block can flatten hierarchy if everything stretches across the whole region.");
  } else {
    apply("block-width", "Text block width", blockWidth.toFixed(2), 2, "The current width gives the text room without forcing it across the whole selected area.");
  }

  if (align === "center") {
    apply("align", "Alignment", "center", 1, "Center alignment can feel poster-like, but it depends more on strong hierarchy.");
  } else {
    apply("align", "Alignment", align, 2, "Edge-aligned text usually scans more quickly in small interfaces.");
  }

  if (font === "display" && sampleSize <= 96) {
    apply("font", "Font style", FONT_OPTIONS[font].label, 3, "The display face is bold enough to survive aggressive reduction reasonably well.");
  } else if ((font === "serif" || font === "editorial") && sampleSize <= 96) {
    apply("font", "Font style", FONT_OPTIONS[font].label, -3, "Editorial and serif styles often need more contrast support when reduced.");
  } else if (font === "mono" && sampleSize <= 64) {
    apply("font", "Font style", FONT_OPTIONS[font].label, -4, "Monospaced styles tend to need more size to breathe at thumbnail scale.");
  } else {
    apply("font", "Font style", FONT_OPTIONS[font].label, 1, `The ${FONT_OPTIONS[font].vibe} direction is workable in the current setup.`);
  }

  if (rm) {
    if (rm.contrastRatio >= 7) {
      apply(
        "contrast",
        "Region contrast",
        `${rm.contrastRatio.toFixed(2)}×`,
        14,
        "The selected region has strong tonal separation, so the text has a stable base to work from."
      );
    } else if (rm.contrastRatio >= 4.5) {
      apply(
        "contrast",
        "Region contrast",
        `${rm.contrastRatio.toFixed(2)}×`,
        7,
        "Contrast is safely above the preferred small-text threshold."
      );
    } else if (rm.contrastRatio >= 3) {
      apply(
        "contrast",
        "Region contrast",
        `${rm.contrastRatio.toFixed(2)}×`,
        -5,
        "Contrast is only moderate, so styling decisions have to carry more of the load."
      );
    } else {
      apply(
        "contrast",
        "Region contrast",
        `${rm.contrastRatio.toFixed(2)}×`,
        -16,
        "Contrast is low, so the image is not giving the title enough tonal separation."
      );
    }

    if (rm.clutterScore >= 75) {
      apply(
        "clutter",
        "Background calmness",
        `${Math.round(rm.clutterScore)}/100`,
        10,
        "The selected region is calm enough that texture is unlikely to compete strongly with letterforms."
      );
    } else if (rm.clutterScore >= 60) {
      apply(
        "clutter",
        "Background calmness",
        `${Math.round(rm.clutterScore)}/100`,
        4,
        "There is some detail behind the type, but it remains manageable."
      );
    } else if (rm.clutterScore >= 45) {
      apply(
        "clutter",
        "Background calmness",
        `${Math.round(rm.clutterScore)}/100`,
        -6,
        "Texture is beginning to compete with the title zone."
      );
    } else {
      apply(
        "clutter",
        "Background calmness",
        `${Math.round(rm.clutterScore)}/100`,
        -14,
        "The title region is busy enough that letter edges will struggle to stay clean."
      );
    }

    if (typeof rm.uniformityScore === "number") {
      if (rm.uniformityScore >= 75) {
        apply(
          "uniformity",
          "Tone stability",
          `${Math.round(rm.uniformityScore)}/100`,
          7,
          "Tone stays fairly even across the selected box, so the same text treatment can hold together more reliably."
        );
      } else if (rm.uniformityScore >= 55) {
        apply(
          "uniformity",
          "Tone stability",
          `${Math.round(rm.uniformityScore)}/100`,
          2,
          "Tone is mixed but still manageable inside the selected region."
        );
      } else {
        apply(
          "uniformity",
          "Tone stability",
          `${Math.round(rm.uniformityScore)}/100`,
          -7,
          "The region swings between lighter and darker patches, so the same style may not hold consistently across the whole box."
        );
      }
    }
  }

  if (region) {
    const area = region.w * region.h;
    if (area < 0.035 && sampleSize <= 96) {
      apply("region-size", "Selected region size", `${Math.round(area * 100)}%`, -9, "The highlighted box is physically small, so the headline has less room to survive downscaling.");
    } else if (area < 0.05) {
      apply("region-size", "Selected region size", `${Math.round(area * 100)}%`, -3, "The selected region is compact, so scale choices matter more.");
    } else {
      apply("region-size", "Selected region size", `${Math.round(area * 100)}%`, 3, "The box gives the typography a reasonable amount of space to work in.");
    }
  }

  if (rm && rm.contrastRatio < 4.5) {
    pushUniqueSuggestion(suggestions, {
      key: "contrast",
      title: "Increase tonal separation first",
      detail: `The score is being dragged down most clearly by contrast at ${rm.contrastRatio.toFixed(2)}×, so styling changes alone will only help so much.`,
      tryLine: "Move the text to a lighter or darker patch, or add a stronger panel / gradient so the title sits on a more stable value split.",
      priority: 100,
    });
  }

  if (rm && rm.clutterScore < 60) {
    pushUniqueSuggestion(suggestions, {
      key: "clutter",
      title: "Calm the background behind the title",
      detail: `Background calmness is only ${Math.round(rm.clutterScore)}/100, which means texture is likely competing directly with the letterforms.`,
      tryLine: "Use a calmer placement, blur or darken the title patch, or introduce an overlay so the text is not sitting directly on busy detail.",
      priority: 96,
    });
  }

  if (rm && typeof rm.uniformityScore === "number" && rm.uniformityScore < 55) {
    pushUniqueSuggestion(suggestions, {
      key: "uniformity",
      title: "Make the text zone more tonally stable",
      detail: `Tone stability is ${Math.round(rm.uniformityScore)}/100, so one part of the title block is likely landing on a different brightness band than another.`,
      tryLine: "Tighten the region, shift the text block within it, or use a treatment that can survive both the lightest and darkest parts of the selected area.",
      priority: 90,
    });
  }

  if ((sampleSize <= 96 && titleScale < 0.145) || weight < 700) {
    pushUniqueSuggestion(suggestions, {
      key: "headline-scale",
      title: "Give the headline more authority",
      detail: "The current title system is fairly conservative for a reduced-size interface, so it risks becoming decorative instead of readable.",
      tryLine: "Increase title scale, increase weight, or reduce supporting text pressure so the title becomes the first readable layer.",
      priority: 88,
    });
  }

  if (overlay === "none" && rm && (rm.contrastRatio < 4.5 || rm.clutterScore < 60)) {
    pushUniqueSuggestion(suggestions, {
      key: "overlay",
      title: "Let the image do less of the work",
      detail: "Because there is no overlay, every readability problem has to be solved by the image alone.",
      tryLine: "Try soft, gradient, or glass overlay mode before changing fonts. It often fixes the real problem faster than typography tweaks do.",
      priority: 84,
    });
  }

  if (tracking > 0.04 || tracking < 0.005) {
    pushUniqueSuggestion(suggestions, {
      key: "tracking",
      title: "Normalise the letter spacing",
      detail: `Tracking at ${tracking.toFixed(3)}em is pushing the word shape away from its safest range.`,
      tryLine: "Aim for a moderate spacing range so letters stay readable without turning into isolated shapes.",
      priority: 72,
    });
  }

  if (blockWidth < 0.5) {
    pushUniqueSuggestion(suggestions, {
      key: "block-width",
      title: "Give the text block a little more room",
      detail: "The current width looks refined, but it reduces your options once the headline gets longer or the thumbnail gets smaller.",
      tryLine: "Increase block width slightly so the title can breathe before you enlarge the type again.",
      priority: 66,
    });
  }

  if (!suggestions.length) {
    pushUniqueSuggestion(suggestions, {
      key: "positive",
      title: "This setup is already solving the main problems",
      detail: "The current combination of scale, weight, separation, and region quality is holding together well.",
      tryLine: "Use the controls to explore style changes, but keep the same basic contrast relationship and text-region discipline.",
      priority: 40,
    });
  }

  score = clamp(Math.round(score), 0, 100);
  const label: StressEvaluation["label"] =
    score >= 82 ? "Strong" : score >= 64 ? "Usable" : score >= 44 ? "Risky" : "Weak";

  const summary =
    label === "Strong"
      ? "The current text system should survive most streaming-style reductions without major help."
      : label === "Usable"
      ? "The setup is workable, but it still depends on the image remaining calm and separated."
      : label === "Risky"
      ? "The type can work at larger sizes, but thumbnail pressure is exposing real weaknesses."
      : "The current treatment is likely to fail under reduction unless the text region becomes more stable.";

  const basis =
    "This score combines typography choices with measured region conditions. It is based on sample size, title scale, weight, tracking, overlay, region contrast, background calmness, tone stability, and selected-region size.";

  return {
    score,
    label,
    summary,
    basis,
    factors: factors.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)),
    suggestions: suggestions.sort((a, b) => b.priority - a.priority).slice(0, 4),
  } satisfies StressEvaluation;
}

function applyPreset(
  preset: Preset,
  setFont: (v: FontKey) => void,
  setWeight: (v: WeightMode) => void,
  setOverlay: (v: OverlayMode) => void,
  setAlign: (v: AlignMode) => void,
  setTracking: (v: number) => void,
  setTitleScale: (v: number) => void,
  setArtistScale: (v: number) => void
) {
  setFont(preset.font);
  setWeight(preset.weight);
  setOverlay(preset.overlay);
  setAlign(preset.align);
  setTracking(preset.tracking);
  setTitleScale(preset.titleScale);
  setArtistScale(preset.artistScale);
}

function buildPreviewCanvas(args: {
  img: HTMLImageElement;
  sampleSize: number;
  viewMode: "crop" | "full";
  cropPos: { x: number; y: number };
  zoom: number;
  renderState: RenderState;
}) {
  const { img, sampleSize, viewMode, cropPos, zoom, renderState } = args;
  const out = document.createElement("canvas");
  out.width = sampleSize;
  out.height = sampleSize;

  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (viewMode === "crop") {
    const crop = coverCropWithPosZoom(
      img.naturalWidth,
      img.naturalHeight,
      cropPos.x,
      cropPos.y,
      zoom
    );
    sx = crop.sx;
    sy = crop.sy;
    sw = crop.sw;
    sh = crop.sh;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);

  if (renderState.region) {
    const rx = renderState.region.x * sampleSize;
    const ry = renderState.region.y * sampleSize;
    const rw = renderState.region.w * sampleSize;
    const rh = renderState.region.h * sampleSize;

    const title = applyCase(renderState.titleText, renderState.caseMode);
    const artist = applyCase(
      renderState.artistText,
      renderState.artistCaps
        ? "upper"
        : renderState.caseMode === "upper"
        ? "upper"
        : "sentence"
    );

    const fontDef = FONT_OPTIONS[renderState.font];
    const titleFont = Math.max(10, sampleSize * renderState.titleScale);
    const artistFont = Math.max(8, titleFont * renderState.artistScale);
    const trackingPx = renderState.tracking * sampleSize;

    const blockWidthPx = rw * renderState.blockWidth;
    const blockX = rx + (rw - blockWidthPx) * renderState.blockX;
    const blockHeightPx = Math.min(rh * 0.78, titleFont + artistFont + sampleSize * 0.09);
    const blockY = ry + (rh - blockHeightPx) * renderState.blockY;

    const titleY = blockY + blockHeightPx * 0.46 + titleFont * renderState.titleLift;
    const artistY = titleY + titleFont * renderState.artistGap;

    const textAnchorX =
      renderState.align === "left"
        ? blockX + blockWidthPx * 0.08
        : renderState.align === "right"
        ? blockX + blockWidthPx * 0.92
        : blockX + blockWidthPx / 2;

    const overlayFill = getOverlayFill(
      ctx,
      blockX,
      blockY,
      blockHeightPx,
      renderState.overlay
    );

    if (overlayFill) {
      ctx.save();
      if (renderState.overlay === "glass") {
        ctx.fillStyle = overlayFill;
        ctx.fillRect(blockX, blockY, blockWidthPx, blockHeightPx);
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        ctx.strokeRect(blockX + 0.5, blockY + 0.5, blockWidthPx - 1, blockHeightPx - 1);
      } else {
        ctx.fillStyle = overlayFill;
        ctx.fillRect(blockX, blockY, blockWidthPx, blockHeightPx);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = renderState.textColor;
    ctx.shadowColor = "rgba(0,0,0,0.26)";
    ctx.shadowBlur = renderState.overlay === "none" ? 2 : 1;

    ctx.font = `${renderState.titleItalic ? "italic " : ""}${renderState.weight} ${titleFont}px ${fontDef.family}`;
    drawTrackedText({
      ctx,
      text: title,
      x: textAnchorX,
      y: titleY,
      align: renderState.align,
      trackingPx,
    });

    ctx.font = `${Math.max(400, renderState.weight - 200)} ${artistFont}px ${fontDef.family}`;
    drawTrackedText({
      ctx,
      text: artist,
      x: textAnchorX,
      y: artistY,
      align: renderState.align,
      trackingPx: trackingPx * 0.7,
    });

    ctx.strokeStyle = "rgba(255,196,0,0.95)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(blockX, blockY, blockWidthPx, blockHeightPx);
    ctx.restore();
  }

  return out.toDataURL("image/png");
}

export default function TypographyStressTest({
  dataUrl,
  viewMode,
  cropPos,
  zoom,
  region,
  palette,
  regionMetrics,
  onEvaluationChange,
}: TypographyStressTestProps) {
  const [sampleSize, setSampleSize] = React.useState<SampleSize>(96);
  const [font, setFont] = React.useState<FontKey>("inter");
  const [weight, setWeight] = React.useState<WeightMode>(700);
  const [tracking, setTracking] = React.useState(0.015);
  const [align, setAlign] = React.useState<AlignMode>("left");
  const [overlay, setOverlay] = React.useState<OverlayMode>("soft");
  const [caseMode, setCaseMode] = React.useState<CaseMode>("title");
  const [titleText, setTitleText] = React.useState("YOUR TITLE");
  const [artistText, setArtistText] = React.useState("Artist Name");
  const [titleScale, setTitleScale] = React.useState(0.155);
  const [artistScale, setArtistScale] = React.useState(0.47);
  const [blockX, setBlockX] = React.useState(0.14);
  const [blockY, setBlockY] = React.useState(0.52);
  const [blockWidth, setBlockWidth] = React.useState(0.8);
  const [titleLift, setTitleLift] = React.useState(0);
  const [artistGap, setArtistGap] = React.useState(0.72);
  const [titleItalic, setTitleItalic] = React.useState(false);
  const [artistCaps, setArtistCaps] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [styleControlsOpen, setStyleControlsOpen] = React.useState(true);
  const [textPlacementOpen, setTextPlacementOpen] = React.useState(true);

  const textColor = deriveTextColor(palette);
  const fontMeta = FONT_OPTIONS[font];
  const rm = (regionMetrics as EnhancedRegionMetrics | null) ?? null;

  const renderState = React.useMemo<RenderState>(
    () => ({
      size: sampleSize,
      font,
      weight,
      align,
      overlay,
      caseMode,
      titleText,
      artistText,
      tracking,
      titleScale,
      artistScale,
      blockX,
      blockY,
      blockWidth,
      titleLift,
      artistGap,
      titleItalic,
      artistCaps,
      region,
      textColor,
    }),
    [
      sampleSize,
      font,
      weight,
      align,
      overlay,
      caseMode,
      titleText,
      artistText,
      tracking,
      titleScale,
      artistScale,
      blockX,
      blockY,
      blockWidth,
      titleLift,
      artistGap,
      titleItalic,
      artistCaps,
      region,
      textColor,
    ]
  );

  const evaluation = React.useMemo(
    () =>
      buildStressEvaluation({
        sampleSize,
        weight,
        tracking,
        overlay,
        regionMetrics,
        region,
        font,
        titleScale,
        blockWidth,
        align,
      }),
    [
      sampleSize,
      weight,
      tracking,
      overlay,
      regionMetrics,
      region,
      font,
      titleScale,
      blockWidth,
      align,
    ]
  );


const typographySnapshot = React.useMemo<TypographyStressSnapshot | null>(() => {
  if (!dataUrl || !region) return null;

  return {
    score: evaluation.score,
    label: evaluation.label,
    summary: evaluation.summary,
    basis: evaluation.basis,
    sampleSize,
    controls: {
      font,
      fontLabel: fontMeta.label,
      fontVibe: fontMeta.vibe,
      weight,
      tracking,
      align,
      overlay: getOverlayModeLabel(overlay),
      caseMode,
      titleText,
      artistText,
      titleScale,
      artistScale,
      blockX,
      blockY,
      blockWidth,
      titleLift,
      artistGap,
      titleItalic,
      artistCaps,
      textColor,
    },
    regionContext: rm
      ? {
          contrastRatio:
            typeof rm.contrastRatio === "number" ? rm.contrastRatio : undefined,
          clutterScore:
            typeof rm.clutterScore === "number" ? rm.clutterScore : undefined,
          uniformityScore:
            typeof rm.uniformityScore === "number" ? rm.uniformityScore : undefined,
          toneLabel: typeof rm.toneLabel === "string" ? rm.toneLabel : undefined,
          areaPct: typeof rm.areaPct === "number" ? rm.areaPct : undefined,
        }
      : null,
    factors: evaluation.factors.map((factor) => ({ ...factor })),
    suggestions: evaluation.suggestions.map((item) => ({ ...item })),
  };
}, [
  dataUrl,
  region,
  evaluation,
  sampleSize,
  font,
  fontMeta.label,
  fontMeta.vibe,
  weight,
  tracking,
  align,
  overlay,
  caseMode,
  titleText,
  artistText,
  titleScale,
  artistScale,
  blockX,
  blockY,
  blockWidth,
  titleLift,
  artistGap,
  titleItalic,
  artistCaps,
  textColor,
  rm,
]);

React.useEffect(() => {
  onEvaluationChange?.(typographySnapshot);
}, [onEvaluationChange, typographySnapshot]);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!dataUrl) {
        setPreviewUrl(null);
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const img = await loadImage(dataUrl);
        if (!alive) return;

        const mainPreview = buildPreviewCanvas({
          img,
          sampleSize,
          viewMode,
          cropPos,
          zoom,
          renderState,
        });

        setPreviewUrl(mainPreview);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to generate stress preview");
      } finally {
        if (alive) setBusy(false);
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [dataUrl, sampleSize, viewMode, cropPos.x, cropPos.y, zoom, renderState]);

  const controlRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 12,
    alignItems: "center",
  };

  const compactCardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.025)",
    borderRadius: 16,
    padding: 12,
  };

  const collapsibleHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  };

  const toggleButtonStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "inherit",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
  };

  return (
    <div className="panelDark typoStressPanel">
      <div className="panelTop">
        <div className="panelTitle">Typography stress test</div>
        <div className="panelNote">
          This preview redraws your current artwork at small platform-style sizes and places a
          simulated title system inside the highlighted region. It is designed to explain why a
          headline survives or fails, not just show an isolated mockup.
        </div>
      </div>

      <div className="panelBody">
        {!dataUrl ? (
          <div className="miniHint">Upload an image to begin typography stress testing.</div>
        ) : !region ? (
          <div className="analysisSections">
            <div className="sectionBlock">
              <div className="sectionHead">How this tool works</div>
              <div className="twoCol">
                <div className="miniCard">
                  <div className="miniLabel">What the highlighted box means here</div>
                  <div className="miniSub">
                    The yellow box is the text test region. The preview places title and artist text
                    inside that area so the score reflects the real image patch your typography has to
                    survive on.
                  </div>
                </div>
                <div className="miniCard">
                  <div className="miniLabel">What to do next</div>
                  <div className="miniSub">
                    First draw the region around the actual title / artist zone. Then use the preview
                    to test whether different text systems still hold together once the cover is reduced.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="analysisSections" style={{ marginBottom: 16 }}>
              <div className="sectionBlock">
                <div className="sectionHead">What you are testing</div>
                <div className="twoCol">
                  <div className="miniCard">
                    <div className="miniLabel">Preview logic</div>
                    <div className="miniSub">
                      The mockup redraws the artwork at {sampleSize}px and applies your current title
                      system inside the selected region. The dashed inner box is the live text block.
                    </div>
                  </div>
                  <div className="miniCard">
                    <div className="miniLabel">Why the score changes</div>
                    <div className="miniSub">
                      The score is based on size, weight, tracking, overlay, region contrast,
                      background calmness, tone stability, and how much room the highlighted box gives
                      the typography.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="suggestList" style={{ marginBottom: 16 }}>
              <div className="suggestItem">
                <div className="suggestTitle">Quick presets</div>
                <div className="suggestDetail" style={{ display: "grid", gap: 10 }}>
                  <div className="pillRow" style={{ flexWrap: "wrap" }}>
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`pillBtn ${activePreset === preset.id ? "on" : ""}`}
                        onClick={() => {
                          setActivePreset(preset.id);
                          applyPreset(
                            preset,
                            setFont,
                            setWeight,
                            setOverlay,
                            setAlign,
                            setTracking,
                            setTitleScale,
                            setArtistScale
                          );
                        }}
                        title={preset.label}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="detailLine" style={{ marginTop: 0 }}>
                    Start with a preset to establish a clear direction, then tune the controls below
                    while watching which factors move the score most.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(360px, 520px) minmax(0, 1fr)",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div className="miniCard" style={{ minWidth: 0 }}>
                <div className="miniLabel">Simulated preview</div>
                <div
                  className="typoStressPreviewBox"
                  style={{ maxWidth: 430, margin: "0 auto", aspectRatio: "1 / 1" }}
                >
                  {busy ? (
                    <div className="miniHint">Generating preview…</div>
                  ) : error ? (
                    <div className="errorLine">{error}</div>
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Typography stress preview"
                      className="typoStressPreviewImg"
                    />
                  ) : (
                    <div className="miniHint">No preview available.</div>
                  )}
                </div>
                <div className="detailLine" style={{ marginTop: 12 }}>
                  Yellow outline = selected text region. Dashed outline = current text block inside
                  that region.
                </div>
              </div>

              <div className="miniCard" style={{ minWidth: 0 }}>
                <div className="miniLabel">Stress result</div>
                <div className="readyTop" style={{ marginBottom: 12 }}>
                  <span
                    className={`statusTag ${
                      evaluation.label === "Strong"
                        ? "pass"
                        : evaluation.label === "Weak"
                        ? "fail"
                        : ""
                    }`}
                  >
                    {evaluation.label.toUpperCase()} • {evaluation.score}/100
                  </span>
                </div>

                <div className="detailLine" style={{ marginTop: 0, marginBottom: 12 }}>
                  {evaluation.summary}
                </div>

                <div className="reportTable">
                  <div className="row">
                    <div className="k">Font</div>
                    <div className="v">
                      {fontMeta.label} <span style={{ opacity: 0.65 }}>• {fontMeta.vibe}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="k">Sample</div>
                    <div className="v">{sampleSize}px</div>
                  </div>
                  <div className="row">
                    <div className="k">Title scale</div>
                    <div className="v">{Math.round(titleScale * 100)}%</div>
                  </div>
                  <div className="row">
                    <div className="k">Weight</div>
                    <div className="v">{weight}</div>
                  </div>
                  <div className="row">
                    <div className="k">Overlay</div>
                    <div className="v">{getOverlayModeLabel(overlay)}</div>
                  </div>
                  <div className="row">
                    <div className="k">Suggested text</div>
                    <div className="v">{textColor}</div>
                  </div>
                  {rm && (
                    <>
                      <div className="row">
                        <div className="k">Region contrast</div>
                        <div className="v">{rm.contrastRatio.toFixed(2)}×</div>
                      </div>
                      <div className="row">
                        <div className="k">Background calmness</div>
                        <div className="v">{Math.round(rm.clutterScore)}/100</div>
                      </div>
                      {typeof rm.uniformityScore === "number" && (
                        <div className="row">
                          <div className="k">Tone stability</div>
                          <div className="v">{Math.round(rm.uniformityScore)}/100</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <div style={compactCardStyle}>
                    <div className="miniLabel" style={{ padding: 0, marginBottom: 8 }}>
                      How this score is built
                    </div>
                    <div className="miniSub">{evaluation.basis}</div>
                  </div>

                  <div style={compactCardStyle}>
                    <div className="miniLabel" style={{ padding: 0, marginBottom: 8 }}>
                      Region context
                    </div>
                    <div className="miniSub">
                      {rm?.toneLabel
                        ? `${rm.toneLabel} text zone.`
                        : "Text zone selected."}{" "}
                      {rm?.areaPct
                        ? `The region covers ${rm.areaPct.toFixed(1)}% of the artwork.`
                        : "The region size is being factored into the score."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 16,
                marginTop: 16,
              }}
            >
              <div className="miniCard" style={{ minWidth: 0 }}>
                <div style={collapsibleHeaderStyle}>
                  <div className="miniLabel" style={{ padding: 0, margin: 0 }}>Style controls</div>
                  <button
                    type="button"
                    style={toggleButtonStyle}
                    onClick={() => setStyleControlsOpen((v) => !v)}
                    aria-expanded={styleControlsOpen}
                  >
                    {styleControlsOpen ? "Collapse" : "Expand"}
                  </button>
                </div>

                {styleControlsOpen ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Size</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        {[64, 96, 128, 256].map((sizeValue) => (
                          <button
                            key={sizeValue}
                            type="button"
                            className={`pillBtn ${sampleSize === sizeValue ? "on" : ""}`}
                            onClick={() => setSampleSize(sizeValue as SampleSize)}
                          >
                            {sizeValue}px
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Font</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        {(Object.keys(FONT_OPTIONS) as FontKey[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            className={`pillBtn ${font === key ? "on" : ""}`}
                            onClick={() => {
                              setFont(key);
                              setActivePreset(null);
                            }}
                            title={FONT_OPTIONS[key].vibe}
                          >
                            {FONT_OPTIONS[key].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Weight</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        {[400, 500, 600, 700, 800, 900].map((weightValue) => (
                          <button
                            key={weightValue}
                            type="button"
                            className={`pillBtn ${weight === weightValue ? "on" : ""}`}
                            onClick={() => {
                              setWeight(weightValue as WeightMode);
                              setActivePreset(null);
                            }}
                          >
                            {weightValue}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Align</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        {(["left", "center", "right"] as AlignMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            className={`pillBtn ${align === mode ? "on" : ""}`}
                            onClick={() => setAlign(mode)}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Overlay</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        {(["none", "soft", "strong", "gradient", "glass"] as OverlayMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            className={`pillBtn ${overlay === mode ? "on" : ""}`}
                            onClick={() => setOverlay(mode)}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Case</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        {(["title", "upper", "sentence", "lower"] as CaseMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            className={`pillBtn ${caseMode === mode ? "on" : ""}`}
                            onClick={() => setCaseMode(mode)}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={controlRowStyle}>
                      <div className="miniLabel" style={{ padding: 0 }}>Flavor</div>
                      <div className="pillRow" style={{ flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={`pillBtn ${titleItalic ? "on" : ""}`}
                          onClick={() => setTitleItalic((v) => !v)}
                        >
                          TITLE ITALIC
                        </button>
                        <button
                          type="button"
                          className={`pillBtn ${artistCaps ? "on" : ""}`}
                          onClick={() => setArtistCaps((v) => !v)}
                        >
                          ARTIST CAPS
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="miniSub">
                    Open this panel to adjust sample size, font, weight, alignment, overlay, casing,
                    and emphasis choices.
                  </div>
                )}
              </div>

              <div className="miniCard" style={{ minWidth: 0 }}>
                <div style={collapsibleHeaderStyle}>
                  <div className="miniLabel" style={{ padding: 0, margin: 0 }}>Text + placement</div>
                  <button
                    type="button"
                    style={toggleButtonStyle}
                    onClick={() => setTextPlacementOpen((v) => !v)}
                    aria-expanded={textPlacementOpen}
                  >
                    {textPlacementOpen ? "Collapse" : "Expand"}
                  </button>
                </div>

                {textPlacementOpen ? (
                  <>
                    <div className="typoStressTextInputs" style={{ marginTop: 0 }}>
                      <div className="typoStressInputBlock">
                        <div className="miniLabel" style={{ padding: 0 }}>Title text</div>
                        <input
                          className="typoStressInput"
                          value={titleText}
                          onChange={(e) => setTitleText(e.currentTarget.value)}
                          placeholder="YOUR TITLE"
                        />
                      </div>

                      <div className="typoStressInputBlock">
                        <div className="miniLabel" style={{ padding: 0 }}>Artist text</div>
                        <input
                          className="typoStressInput"
                          value={artistText}
                          onChange={(e) => setArtistText(e.currentTarget.value)}
                          placeholder="Artist Name"
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                      <div style={compactCardStyle}>
                        <div className="miniLabel" style={{ padding: 0, marginBottom: 10 }}>Type scaling</div>
                        <div className="mockRangeRow">
                          <span className="zoomLabel">TITLE</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={0.1}
                            max={0.22}
                            step={0.005}
                            value={titleScale}
                            onChange={(e) => setTitleScale(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{titleScale.toFixed(3)}</span>
                        </div>
                        <div className="detailLine" style={{ marginTop: 8 }}>
                          Larger title scale improves survival, but only if the region remains calm enough
                          to support it.
                        </div>
                        <div className="mockRangeRow" style={{ marginTop: 10 }}>
                          <span className="zoomLabel">ARTIST</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={0.32}
                            max={0.7}
                            step={0.01}
                            value={artistScale}
                            onChange={(e) => setArtistScale(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{artistScale.toFixed(2)}</span>
                        </div>
                        <div className="mockRangeRow" style={{ marginTop: 10 }}>
                          <span className="zoomLabel">TRACKING</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={-0.01}
                            max={0.06}
                            step={0.001}
                            value={tracking}
                            onChange={(e) => setTracking(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{tracking.toFixed(3)}em</span>
                        </div>
                      </div>

                      <div style={compactCardStyle}>
                        <div className="miniLabel" style={{ padding: 0, marginBottom: 10 }}>Placement inside region</div>
                        <div className="mockRangeRow">
                          <span className="zoomLabel">X</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={blockX}
                            onChange={(e) => setBlockX(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{blockX.toFixed(2)}</span>
                        </div>
                        <div className="mockRangeRow" style={{ marginTop: 10 }}>
                          <span className="zoomLabel">Y</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={blockY}
                            onChange={(e) => setBlockY(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{blockY.toFixed(2)}</span>
                        </div>
                        <div className="mockRangeRow" style={{ marginTop: 10 }}>
                          <span className="zoomLabel">WIDTH</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={0.35}
                            max={1}
                            step={0.01}
                            value={blockWidth}
                            onChange={(e) => setBlockWidth(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{blockWidth.toFixed(2)}</span>
                        </div>
                        <div className="mockRangeRow" style={{ marginTop: 10 }}>
                          <span className="zoomLabel">TITLE Y</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={-0.35}
                            max={0.35}
                            step={0.01}
                            value={titleLift}
                            onChange={(e) => setTitleLift(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{titleLift.toFixed(2)}</span>
                        </div>
                        <div className="mockRangeRow" style={{ marginTop: 10 }}>
                          <span className="zoomLabel">GAP</span>
                          <input
                            className="mockRange"
                            type="range"
                            min={0.45}
                            max={1.2}
                            step={0.01}
                            value={artistGap}
                            onChange={(e) => setArtistGap(parseFloat(e.currentTarget.value))}
                          />
                          <span className="tag">{artistGap.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="miniSub">
                    Open this panel to edit the title text, artist text, scaling, tracking, and
                    placement inside the selected region.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 16,
                marginTop: 16,
              }}
            >
              <div className="miniCard" style={{ minWidth: 0 }}>
                <div className="miniLabel">Main score factors</div>
                <div className="suggestList" style={{ marginTop: 10 }}>
                  {evaluation.factors.slice(0, 6).map((factor) => (
                    <div className="suggestItem" key={factor.key}>
                      <div className="suggestTitle">
                        {factor.label} <span style={{ opacity: 0.65 }}>• {factor.value}</span>
                      </div>
                      <div className="suggestDetail">
                        <div className="sLine">
                          <b>Impact:</b> {factor.effect >= 0 ? "+" : ""}
                          {factor.effect}
                        </div>
                        <div className="sLine">
                          <b>Why it matters:</b> {factor.basis}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="miniCard" style={{ minWidth: 0 }}>
                <div className="miniLabel">Most important changes</div>
                <div className="suggestList" style={{ marginTop: 10 }}>
                  {evaluation.suggestions.map((item) => (
                    <div className="suggestItem" key={item.key}>
                      <div className="suggestTitle">{item.title}</div>
                      <div className="suggestDetail">
                        <div className="sLine">{item.detail}</div>
                        <div className="sLine">
                          <b>Try:</b> {item.tryLine}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="detailLine" style={{ marginTop: 14 }}>
              This test is deliberately practical rather than typographically exhaustive. It is meant
              to explain the main pressures on a streaming-style headline system and point to the most
              important adjustments first.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
