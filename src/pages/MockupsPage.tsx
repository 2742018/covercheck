import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import { computePalette, type NormalizedRect, type PaletteResult } from "../analysis/metrics";
import { computeCompositionMetrics, type CompositionMetrics } from "../analysis/composition";

type MockupsState = { dataUrl?: string };

type UiTheme = "dark" | "light";
type ThumbSize = 48 | 64 | 96 | 128;

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

  const [thumbSize, setThumbSize] = React.useState<ThumbSize>(64);
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

  const userThumb = thumbs[String(thumbSize)] || thumbs["64"] || dataUrl || "";

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

        const res = await makeSquareThumbs(dataUrl, [512, 256, 128, 96, 64, 48], cropPos, zoom);
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
  }, [dataUrl, cropPos.x, cropPos.y, zoom]);

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

        <div className="testKicker">COVERCHECK</div>
        <h1 className="testTitle">Mockups / Context Preview</h1>
        <p className="testLead">
          This page simulates how your cover is actually encountered on streaming platforms:
          small grid tiles, playlist rows, and UI overlays. It’s the real-world check after Analyze.
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
                Use <b>PAN CROP</b> to reposition what the streaming square crop shows. This drives all previews below.
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
                      <span className="tag">thumb {thumbSize}px</span>
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
                      <div className="mockLabel">Thumbnail size</div>
                      <div className="pillRow">
                        {[48, 64, 96, 128].map((s) => (
                          <button
                            key={s}
                            className={`pillBtn ${thumbSize === s ? "on" : ""}`}
                            onClick={() => setThumbSize(s as ThumbSize)}
                          >
                            {s}px
                          </button>
                        ))}
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
                        const src = isCenter ? userThumb : neighborCovers[i % neighborCovers.length];

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
                    If your cover becomes muddy here, use Analyze to increase contrast in the title region or reduce texture behind type.
                  </div>
                </div>
              </div>

              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Playlist row</div>
                  <div className="panelNote">Common view: 48–64px covers next to track text.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={{ ["--mockScale" as any]: distScale, ["--mockBlur" as any]: `${distBlur}px` }}
                  >
                    <div className="mockList">
                      {Array.from({ length: 6 }, (_, i) => {
                        const isYou = i === 1;
                        const src = isYou ? userThumb : neighborCovers[(i + 3) % neighborCovers.length];

                        return (
                          <div key={i} className="mockRow">
                            <div
                              className="mockCover tiny"
                              style={{
                                borderRadius: coverRadius,
                                backgroundImage: `url(${src})`,
                                width: thumbSize,
                                height: thumbSize,
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
                </div>
              </div>

              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Search results</div>
                  <div className="panelNote">Even smaller thumbnails. Covers must stay distinctive as an icon.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={{ ["--mockScale" as any]: distScale, ["--mockBlur" as any]: `${distBlur}px` }}
                  >
                    <div className="mockSearch">
                      {Array.from({ length: 5 }, (_, i) => {
                        const isYou = i === 2;
                        const src = isYou ? userThumb : neighborCovers[(i + 7) % neighborCovers.length];

                        return (
                          <div key={i} className="mockSearchRow">
                            <div
                              className="mockCover tiny"
                              style={{
                                borderRadius: coverRadius,
                                backgroundImage: `url(${src})`,
                                width: 48,
                                height: 48,
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
                </div>
              </div>

              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Share / promo tile</div>
                  <div className="panelNote">Editorial framing for socials. Checks whether cover still feels on-brand.</div>
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
                        style={{ borderRadius: coverRadius, backgroundImage: `url(${thumbs["256"] || userThumb})` }}
                      />
                      {showOverlay && <div className="mockOverlay soft" style={{ opacity: overlayStrength * 0.35 }} />}
                    </div>

                    <div className="mockShareText">
                      <div className="mockTitleLine">Your Album</div>
                      <div className="mockSubLine">Your Artist</div>
                      <div className="miniHint" style={{ marginTop: 8 }}>
                        If the crop changes the meaning, reposition it with PAN CROP.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Quick checklist</div>
                  <div className="panelNote">Use as short evaluation evidence.</div>
                </div>
                <div className="panelBody">
                  <div className="mxChecklist">
                    <div className="mxCheckItem">
                      <div className="mxCheckHead">Thumbnail identity</div>
                      <div className="mxCheckText">At 64px, does it still feel unique and not muddy?</div>
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
                  {showOverlay ? `${Math.round(overlayStrength * 100)}%` : "off"} • Thumb: {thumbSize}px
                </div>
              </div>
            </div>

            <div className="mxPrintGrid">
              <div className="mxPrintBlock">
                <div className="mxPrintBlockHead">Grid context</div>
                <div className="mxPrintSurface">
                  <img src={thumbs["96"] || userThumb} alt="thumb 96" />
                  <img src={thumbs["64"] || userThumb} alt="thumb 64" />
                  <img src={thumbs["48"] || userThumb} alt="thumb 48" />
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
                  <img src={thumbs[String(thumbSize)] || userThumb} alt="playlist thumb" />
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
                  <img src={thumbs["48"] || userThumb} alt="search thumb" />
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