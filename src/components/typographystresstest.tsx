import React from "react";
import type { NormalizedRect, PaletteResult, RegionMetrics } from "../analysis/metrics";

type TypographyStressTestProps = {
  dataUrl: string | null;
  viewMode: "crop" | "full";
  cropPos: { x: number; y: number };
  zoom: number;
  region: NormalizedRect | null;
  palette: PaletteResult | null;
  regionMetrics: RegionMetrics | null;
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
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
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

function estimateStressScore(args: {
  sampleSize: number;
  weight: number;
  tracking: number;
  overlay: OverlayMode;
  regionMetrics: RegionMetrics | null;
  region: NormalizedRect | null;
  font: FontKey;
  titleScale: number;
}) {
  const { sampleSize, weight, tracking, overlay, regionMetrics, region, font, titleScale } = args;

  let score = 48;

  if (sampleSize >= 256) score += 16;
  else if (sampleSize >= 128) score += 10;
  else if (sampleSize >= 96) score += 4;
  else score -= 6;

  if (weight >= 900) score += 14;
  else if (weight >= 700) score += 9;
  else if (weight >= 600) score += 5;
  else score += 1;

  if (tracking >= 0.03) score += 6;
  else if (tracking >= 0.015) score += 3;
  else if (tracking < 0) score -= 6;

  if (overlay === "soft") score += 6;
  if (overlay === "strong") score += 12;
  if (overlay === "gradient") score += 9;
  if (overlay === "glass") score += 7;

  if (font === "display" && sampleSize <= 96) score += 4;
  if (font === "mono" && sampleSize <= 64) score -= 3;
  if ((font === "serif" || font === "editorial") && sampleSize <= 64) score -= 4;

  if (titleScale >= 0.17) score += 6;
  else if (titleScale < 0.13 && sampleSize <= 96) score -= 8;

  if (regionMetrics) {
    if (regionMetrics.contrastRatio >= 4.5) score += 16;
    else if (regionMetrics.contrastRatio >= 3) score += 7;
    else score -= 16;

    if (regionMetrics.clutterScore >= 70) score += 14;
    else if (regionMetrics.clutterScore >= 60) score += 8;
    else if (regionMetrics.clutterScore < 45) score -= 14;
    else score -= 6;
  }

  if (region) {
    const area = region.w * region.h;
    if (area < 0.035 && sampleSize <= 64) score -= 10;
    else if (area < 0.05 && sampleSize <= 128) score -= 5;
  }

  score = clamp(Math.round(score), 0, 100);

  const label =
    score >= 82 ? "Strong" : score >= 64 ? "Usable" : score >= 44 ? "Risky" : "Weak";

  return { score, label };
}

function buildStressNotes(args: {
  sampleSize: number;
  weight: number;
  tracking: number;
  overlay: OverlayMode;
  regionMetrics: RegionMetrics | null;
  font: FontKey;
  titleScale: number;
  blockWidth: number;
}) {
  const { sampleSize, weight, tracking, overlay, regionMetrics, font, titleScale, blockWidth } = args;
  const lines: string[] = [];

  if (sampleSize <= 64) {
    lines.push("64px is the hardest reading condition and best reflects thumbnail pressure.");
  } else if (sampleSize <= 128) {
    lines.push("128px is a useful mid-scale check for playlist and grid contexts.");
  } else {
    lines.push("256px is forgiving and helps judge hierarchy, not just survival.");
  }

  if (weight < 700) lines.push("A heavier title weight may improve survival at smaller sizes.");
  if (tracking < 0.01) lines.push("Slightly wider tracking may improve small-size clarity.");
  if (tracking > 0.035) lines.push("Very wide tracking can weaken word-shape cohesion if pushed too far.");
  if (titleScale < 0.13) lines.push("The title scale is conservative. Try a bigger headline for stronger scanning.");
  if (blockWidth < 0.55) lines.push("A narrow text block looks refined, but it can force awkward line pressure at tiny sizes.");

  if (overlay === "none") {
    lines.push("No overlay means the title depends entirely on the image for separation.");
  } else if (overlay === "glass") {
    lines.push("Glass overlay adds separation with less visual heaviness than a solid panel.");
  } else if (overlay === "gradient") {
    lines.push("Gradient overlay can preserve artwork while still anchoring the text block.");
  }

  if (font === "display") lines.push("Display faces feel loud and fast, but check letter spacing carefully on short titles.");
  if (font === "editorial" || font === "serif") lines.push("Serif styles can feel premium, but they usually need stronger contrast support.");
  if (font === "mono") lines.push("Monospaced styles feel intentional and cold, but they may need more size to breathe.");

  if (regionMetrics) {
    if (regionMetrics.contrastRatio < 3) {
      lines.push("Measured contrast is low, so typography may fail regardless of weight changes.");
    } else if (regionMetrics.contrastRatio < 4.5) {
      lines.push("Contrast is only moderate, so type styling decisions matter more than usual.");
    }

    if (regionMetrics.clutterScore < 60) {
      lines.push("The title area is visually busy, so stronger separation or a calmer placement is likely needed.");
    }
  }

  return lines;
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
      renderState.artistCaps ? "upper" : renderState.caseMode === "upper" ? "upper" : "sentence"
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

  const textColor = deriveTextColor(palette);
  const fontMeta = FONT_OPTIONS[font];

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

  const stress = React.useMemo(
    () =>
      estimateStressScore({
        sampleSize,
        weight,
        tracking,
        overlay,
        regionMetrics,
        region,
        font,
        titleScale,
      }),
    [sampleSize, weight, tracking, overlay, regionMetrics, region, font, titleScale]
  );

  const notes = React.useMemo(
    () =>
      buildStressNotes({
        sampleSize,
        weight,
        tracking,
        overlay,
        regionMetrics,
        font,
        titleScale,
        blockWidth,
      }),
    [sampleSize, weight, tracking, overlay, regionMetrics, font, titleScale, blockWidth]
  );

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


  return (
    <div className="panelDark typoStressPanel">
      <div className="panelTop">
        <div className="panelTitle">Typography stress test</div>
        <div className="panelNote">
          Simulate headline treatments inside your selected title zone. This version adds
          richer font styles, direct position control, wider size tuning, and faster preset exploration.
        </div>
      </div>

      <div className="panelBody">
        {!dataUrl ? (
          <div className="miniHint">Upload an image to begin typography stress testing.</div>
        ) : !region ? (
          <div className="miniHint">
            Draw a title/artist region first. The stress test uses that region as the text placement area.
          </div>
        ) : (
          <>
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
                    Try presets to explore different cover personalities quickly, then fine-tune below.
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
              </div>

              <div className="miniCard" style={{ minWidth: 0 }}>
                <div className="miniLabel">Stress result</div>
                <div className="readyTop" style={{ marginBottom: 12 }}>
                  <span
                    className={`statusTag ${
                      stress.label === "Strong"
                        ? "pass"
                        : stress.label === "Weak"
                        ? "fail"
                        : ""
                    }`}
                  >
                    {stress.label.toUpperCase()} • {stress.score}/100
                  </span>
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
                  <div className="row">
                    <div className="k">Placement</div>
                    <div className="v">
                      X {blockX.toFixed(2)} • Y {blockY.toFixed(2)} • Width {blockWidth.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <div style={compactCardStyle}>
                    <div className="miniLabel" style={{ padding: 0, marginBottom: 8 }}>
                      Current style
                    </div>
                    <div className="miniSub">
                      {fontMeta.vibe}. {align} aligned, {getOverlayModeLabel(overlay)} overlay,
                      tracking {tracking.toFixed(3)}em.
                    </div>
                  </div>

                  <div style={compactCardStyle}>
                    <div className="miniLabel" style={{ padding: 0, marginBottom: 8 }}>
                      Quick read
                    </div>
                    <div className="miniSub">
                      {stress.label === "Strong"
                        ? "This setup should survive most thumbnail contexts well."
                        : stress.label === "Usable"
                        ? "This setup is workable, but it still depends on image calmness and contrast."
                        : stress.label === "Risky"
                        ? "This setup may break at smaller sizes without stronger separation."
                        : "This setup is likely to fail under thumbnail pressure without major adjustment."}
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
                <div className="miniLabel">Style controls</div>
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
              </div>

              <div className="miniCard" style={{ minWidth: 0 }}>
                <div className="miniLabel">Text + placement</div>
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
              </div>
            </div>

            <div className="suggestList" style={{ marginTop: 16 }}>
              {notes.map((line, idx) => (
                <div key={`${idx}-${line}`} className="suggestItem">
                  <div className="suggestTitle">Stress note</div>
                  <div className="suggestDetail">
                    <div className="sLine">{line}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="detailLine" style={{ marginTop: 14 }}>
              This tool is intentionally practical rather than typographically exhaustive. It helps you test
              whether a believable headline system can survive inside the selected region under streaming-scale pressure.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

