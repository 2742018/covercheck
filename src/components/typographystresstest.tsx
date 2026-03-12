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

type SampleSize = 64 | 128 | 256;
type WeightMode = 500 | 700 | 900;
type AlignMode = "left" | "center";
type OverlayMode = "none" | "soft" | "strong";
type CaseMode = "title" | "upper" | "sentence";

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

function estimateStressScore(args: {
  size: number;
  weight: number;
  tracking: number;
  overlay: OverlayMode;
  regionMetrics: RegionMetrics | null;
  region: NormalizedRect | null;
}) {
  const { size, weight, tracking, overlay, regionMetrics, region } = args;

  let score = 50;

  if (size >= 256) score += 18;
  else if (size >= 128) score += 10;
  else score -= 6;

  if (weight >= 900) score += 14;
  else if (weight >= 700) score += 8;
  else score += 1;

  if (tracking >= 0.03) score += 8;
  else if (tracking >= 0.015) score += 4;
  else if (tracking < 0) score -= 5;

  if (overlay === "soft") score += 8;
  if (overlay === "strong") score += 14;

  if (regionMetrics) {
    if (regionMetrics.contrastRatio >= 4.5) score += 16;
    else if (regionMetrics.contrastRatio >= 3) score += 8;
    else score -= 16;

    if (regionMetrics.clutterScore >= 70) score += 14;
    else if (regionMetrics.clutterScore >= 60) score += 8;
    else if (regionMetrics.clutterScore < 45) score -= 14;
    else score -= 6;
  }

  if (region) {
    const area = region.w * region.h;
    if (area < 0.035 && size <= 64) score -= 10;
    else if (area < 0.05 && size <= 128) score -= 5;
  }

  score = clamp(Math.round(score), 0, 100);

  const label =
    score >= 80 ? "Strong" : score >= 60 ? "Usable" : score >= 40 ? "Risky" : "Weak";

  return { score, label };
}

function buildStressNotes(args: {
  size: number;
  weight: number;
  tracking: number;
  overlay: OverlayMode;
  regionMetrics: RegionMetrics | null;
}) {
  const { size, weight, tracking, overlay, regionMetrics } = args;
  const lines: string[] = [];

  if (size <= 64) {
    lines.push("64px is the hardest reading condition and best reflects thumbnail pressure.");
  } else if (size <= 128) {
    lines.push("128px is a useful mid-scale check for playlist and grid contexts.");
  } else {
    lines.push("256px is more forgiving and helps judge hierarchy, not just survival.");
  }

  if (weight < 700) {
    lines.push("A heavier title weight may improve resilience at small sizes.");
  }

  if (tracking < 0.01) {
    lines.push("Slightly wider tracking may improve small-size clarity.");
  } else if (tracking > 0.035) {
    lines.push("Very wide tracking can reduce word-shape cohesion if overused.");
  }

  if (overlay === "none") {
    lines.push("No overlay means the title depends entirely on the image for separation.");
  } else if (overlay === "soft") {
    lines.push("A soft overlay helps create separation without overpowering the artwork.");
  } else {
    lines.push("A strong overlay improves survival, but check that it still feels visually integrated.");
  }

  if (regionMetrics) {
    if (regionMetrics.contrastRatio < 3) {
      lines.push("The measured contrast is low, so typography may fail regardless of weight changes.");
    } else if (regionMetrics.contrastRatio < 4.5) {
      lines.push("Contrast is only moderate, so type styling decisions matter more.");
    }

    if (regionMetrics.clutterScore < 60) {
      lines.push("The title area is visually busy, so stronger separation is likely needed.");
    }
  }

  return lines;
}

function applyCase(text: string, mode: CaseMode) {
  if (mode === "upper") return text.toUpperCase();
  if (mode === "sentence") return text;
  return text;
}

function getOverlayBackground(mode: OverlayMode) {
  if (mode === "soft") return "rgba(0,0,0,0.28)";
  if (mode === "strong") return "rgba(0,0,0,0.48)";
  return "transparent";
}

function deriveTextColor(palette: PaletteResult | null) {
  return palette?.text.primary ?? "#ffffff";
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
  const [sampleSize, setSampleSize] = React.useState<SampleSize>(64);
  const [weight, setWeight] = React.useState<WeightMode>(700);
  const [tracking, setTracking] = React.useState(0.015);
  const [align, setAlign] = React.useState<AlignMode>("left");
  const [overlay, setOverlay] = React.useState<OverlayMode>("soft");
  const [caseMode, setCaseMode] = React.useState<CaseMode>("title");
  const [titleText, setTitleText] = React.useState("YOUR TITLE");
  const [artistText, setArtistText] = React.useState("Artist Name");

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const textColor = deriveTextColor(palette);

  const stress = React.useMemo(
    () =>
      estimateStressScore({
        size: sampleSize,
        weight,
        tracking,
        overlay,
        regionMetrics,
        region,
      }),
    [sampleSize, weight, tracking, overlay, regionMetrics, region]
  );

  const notes = React.useMemo(
    () =>
      buildStressNotes({
        size: sampleSize,
        weight,
        tracking,
        overlay,
        regionMetrics,
      }),
    [sampleSize, weight, tracking, overlay, regionMetrics]
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

        if (region) {
          const rx = region.x * sampleSize;
          const ry = region.y * sampleSize;
          const rw = region.w * sampleSize;
          const rh = region.h * sampleSize;

          const title = applyCase(titleText, caseMode);
          const artist = applyCase(
            artistText,
            caseMode === "upper" ? "upper" : "sentence"
          );

          const titleFont = Math.max(
            10,
            sampleSize * (sampleSize <= 64 ? 0.16 : sampleSize <= 128 ? 0.15 : 0.14)
          );
          const artistFont = Math.max(8, titleFont * 0.45);
          const padX = rw * 0.06;

          ctx.save();
          ctx.textAlign = align;
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = textColor;

          const x = align === "center" ? rx + rw / 2 : rx + padX;
          const titleY = ry + rh * 0.52;
          const artistY = titleY + titleFont * 0.72;

          if (overlay !== "none") {
            const boxPad = sampleSize <= 64 ? 3 : 5;
            ctx.fillStyle = getOverlayBackground(overlay);
            ctx.fillRect(
              rx + 1,
              ry + rh * 0.18,
              rw - 2,
              Math.min(rh * 0.62, titleFont + artistFont + boxPad * 3)
            );
          }

          ctx.fillStyle = textColor;
          ctx.shadowColor = "rgba(0,0,0,0.22)";
          ctx.shadowBlur = overlay === "none" ? 2 : 1;

          ctx.font = `${weight} ${titleFont}px Inter, Arial, sans-serif`;
          ctx.fillText(title, x, titleY, rw - padX * 2);

          ctx.font = `${Math.max(500, weight - 200)} ${artistFont}px Inter, Arial, sans-serif`;
          ctx.fillText(artist, x, artistY, rw - padX * 2);

          ctx.strokeStyle = "rgba(255,196,0,0.95)";
          ctx.lineWidth = 1.25;
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.restore();
        }

        setPreviewUrl(out.toDataURL("image/png"));
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
  }, [
    dataUrl,
    sampleSize,
    viewMode,
    cropPos.x,
    cropPos.y,
    zoom,
    region,
    titleText,
    artistText,
    weight,
    tracking,
    align,
    overlay,
    caseMode,
    textColor,
  ]);

  return (
    <div className="panelDark typoStressPanel">
      <div className="panelTop">
        <div className="panelTitle">Typography stress test</div>
        <div className="panelNote">
          Simulate title and artist text in the selected region at thumbnail sizes.
          This helps test whether your type treatment survives beyond the raw image metrics.
        </div>
      </div>

      <div className="panelBody">
        {!dataUrl ? (
          <div className="miniHint">Upload an image to begin typography stress testing.</div>
        ) : !region ? (
          <div className="miniHint">
            Draw a title/artist region first. The stress test uses that region as the simulated text area.
          </div>
        ) : (
          <>
            <div className="typoStressControls">
              <div className="typoStressControlCard">
                <div className="miniLabel">Sample size</div>
                <div className="pillRow">
                  {[64, 128, 256].map((s) => (
                    <button
                      key={s}
                      className={`pillBtn ${sampleSize === s ? "on" : ""}`}
                      onClick={() => setSampleSize(s as SampleSize)}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="typoStressControlCard">
                <div className="miniLabel">Weight</div>
                <div className="pillRow">
                  {[500, 700, 900].map((w) => (
                    <button
                      key={w}
                      className={`pillBtn ${weight === w ? "on" : ""}`}
                      onClick={() => setWeight(w as WeightMode)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="typoStressControlCard">
                <div className="miniLabel">Alignment</div>
                <div className="pillRow">
                  <button
                    className={`pillBtn ${align === "left" ? "on" : ""}`}
                    onClick={() => setAlign("left")}
                  >
                    LEFT
                  </button>
                  <button
                    className={`pillBtn ${align === "center" ? "on" : ""}`}
                    onClick={() => setAlign("center")}
                  >
                    CENTER
                  </button>
                </div>
              </div>

              <div className="typoStressControlCard">
                <div className="miniLabel">Overlay</div>
                <div className="pillRow">
                  {(["none", "soft", "strong"] as OverlayMode[]).map((m) => (
                    <button
                      key={m}
                      className={`pillBtn ${overlay === m ? "on" : ""}`}
                      onClick={() => setOverlay(m)}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="typoStressControlCard">
                <div className="miniLabel">Case</div>
                <div className="pillRow">
                  {(["title", "upper", "sentence"] as CaseMode[]).map((m) => (
                    <button
                      key={m}
                      className={`pillBtn ${caseMode === m ? "on" : ""}`}
                      onClick={() => setCaseMode(m)}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="typoStressControlCard wide">
                <div className="miniLabel">Tracking</div>
                <div className="mockRangeRow">
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
            </div>

            <div className="typoStressTextInputs">
              <div className="typoStressInputBlock">
                <div className="miniLabel">Title text</div>
                <input
                  className="typoStressInput"
                  value={titleText}
                  onChange={(e) => setTitleText(e.currentTarget.value)}
                  placeholder="YOUR TITLE"
                />
              </div>

              <div className="typoStressInputBlock">
                <div className="miniLabel">Artist text</div>
                <input
                  className="typoStressInput"
                  value={artistText}
                  onChange={(e) => setArtistText(e.currentTarget.value)}
                  placeholder="Artist Name"
                />
              </div>
            </div>

            <div className="typoStressPreviewGrid">
              <div className="miniCard">
                <div className="miniLabel">Simulated preview</div>
                <div className="typoStressPreviewBox">
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

              <div className="miniCard">
                <div className="miniLabel">Stress result</div>
                <div className="readyTop" style={{ marginBottom: 10 }}>
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
                    <div className="k">Size</div>
                    <div className="v">{sampleSize}px</div>
                  </div>
                  <div className="row">
                    <div className="k">Weight</div>
                    <div className="v">{weight}</div>
                  </div>
                  <div className="row">
                    <div className="k">Tracking</div>
                    <div className="v">{tracking.toFixed(3)}em</div>
                  </div>
                  <div className="row">
                    <div className="k">Overlay</div>
                    <div className="v">{overlay}</div>
                  </div>
                  <div className="row">
                    <div className="k">Suggested text</div>
                    <div className="v">{textColor}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="suggestList" style={{ marginTop: 16 }}>
              {notes.map((line) => (
                <div key={line} className="suggestItem">
                  <div className="suggestTitle">Stress note</div>
                  <div className="suggestDetail">
                    <div className="sLine">{line}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="detailLine" style={{ marginTop: 14 }}>
              This check is intentionally practical rather than typographically exhaustive:
              it helps test whether a plausible title treatment survives inside the selected
              region under streaming-scale pressure.
            </div>
          </>
        )}
      </div>
    </div>
  );
}