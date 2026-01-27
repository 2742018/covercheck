import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToDataUrl } from "../lib/storage";
import { computePalette, type NormalizedRect, type PaletteResult } from "../analysis/metrics";

type MockupsState = { dataUrl?: string };

// ---------- helpers ----------
async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
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

  let sw = srcW, sh = srcH, sx = 0, sy = 0;

  if (srcAR > dstAR) {
    sw = Math.round(srcH * dstAR);
    sx = Math.round((srcW - sw) / 2);
  } else {
    sh = Math.round(srcW / dstAR);
    sy = Math.round((srcH - sh) / 2);
  }
  return { sx, sy, sw, sh };
}

async function makeSquareThumb(dataUrl: string, size: number) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const { sx, sy, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight, size, size);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toDataURL("image/png");
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
  return ctx.getImageData(0, 0, w, h);
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
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  // h:0..360, s/l:0..1
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function deriveCompatible(baseHex: string) {
  const rgb = hexToRgb(baseHex);
  if (!rgb) {
    return { complement: "#000000", analogous: ["#000000", "#000000"], triadic: ["#000000", "#000000"] };
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
  // Use regionAvg as stable “summary” color
  const rgb = hexToRgb(pal.regionAvg);
  if (!rgb) {
    return {
      hue: 0, sat: 0, light: 0.5,
      brightnessLabel: "mid",
      saturationLabel: "balanced",
      temperatureLabel: "neutral",
    };
  }
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const brightnessLabel: ColorStats["brightnessLabel"] = l < 0.35 ? "dark" : l > 0.68 ? "light" : "mid";
  const saturationLabel: ColorStats["saturationLabel"] = s < 0.25 ? "muted" : s > 0.58 ? "vivid" : "balanced";

  const temperatureLabel: ColorStats["temperatureLabel"] =
    (h >= 20 && h <= 75) || (h >= 300 && h <= 360) ? "warm" :
    (h >= 150 && h <= 260) ? "cool" : "neutral";

  return { hue: h, sat: s, light: l, brightnessLabel, saturationLabel, temperatureLabel };
}

// ---------- Genre Mood Lens ----------
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
  palette: string[]; // reference colors (not rules)
  traits: string[];  // cover design conventions
  targets: {
    brightness: ColorStats["brightnessLabel"][];
    saturation: ColorStats["saturationLabel"][];
    temperature: ColorStats["temperatureLabel"][];
  };
  guidance: string[]; // “if you want more of this vibe…”
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
    traits: ["Strong contrast", "Bold typography or icon mark", "Street/texture can be high but controlled", "Edge risk is common"],
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
    traits: ["Dark + high-contrast hierarchy", "Dense imagery, but title must survive", "Logos often fail safe-area"],
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
    traits: ["Distinctive concept", "Often muted base + 1 accent", "Asymmetry with safe margins", "Texture allowed"],
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

// ---------- component ----------
export default function MockupsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as MockupsState;

  // NOTE: no persistence (matches your privacy-first approach)
  const [dataUrl, setDataUrl] = React.useState<string | null>(() => state.dataUrl ?? null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // mockup controls
  const [uiTheme, setUiTheme] = React.useState<"dark" | "light">("dark");
  const [rounded, setRounded] = React.useState(true);
  const [showOverlay, setShowOverlay] = React.useState(true);
  const [thumbSize, setThumbSize] = React.useState<48 | 64 | 96 | 128>(64);
  const [distance, setDistance] = React.useState(22); // 0..80 (more = smaller/blurrier)

  // thumbs for crisp mockups
  const [thumb, setThumb] = React.useState<string | null>(null);

  // palette for lens
  const [palette, setPalette] = React.useState<PaletteResult | null>(null);
  const [stats, setStats] = React.useState<ColorStats | null>(null);
  const [genre, setGenre] = React.useState<GenreKey>("Indie");

  const distScale = React.useMemo(() => {
    // 0 -> 1.0, 80 -> ~0.72
    return Math.max(0.72, 1 - distance * 0.0035);
  }, [distance]);

  const distBlur = React.useMemo(() => {
    // 0 -> 0px, 80 -> 2.8px
    return Math.min(3, distance * 0.035);
  }, [distance]);

  React.useEffect(() => {
    if (!dataUrl) {
      setThumb(null);
      setPalette(null);
      setStats(null);
      return;
    }

    let alive = true;
    (async () => {
      setBusy(true);
      setError(null);

      try {
        const t = await makeSquareThumb(dataUrl, thumbSize);
        if (!alive) return;
        setThumb(t);

        const imgData = await buildAnalysisImageData(dataUrl, 1024);
        if (!alive) return;

        const full: NormalizedRect = { x: 0, y: 0, w: 1, h: 1 };
        const pal = computePalette(imgData, full);
        setPalette(pal);
        setStats(statsFromPalette(pal));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process image");
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [dataUrl, thumbSize]);

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const url = await fileToDataUrl(file);
      setDataUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // grid “context” neighbors: use your public /play images if present; fall back to simple SVG covers
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

    // if you have /public/play/01.jpg etc, these will work on GH Pages too because BASE is included
    const pool = Array.from({ length: 11 }, (_, i) => `${BASE}play/${String(i + 1).padStart(2, "0")}.jpg`);
    const out: string[] = [];
    for (let i = 0; i < 11; i++) out.push(pool[i] ?? fallbackSvg(100 + i * 19));
    return out;
  }, [BASE]);

  const genreProfile = GENRES[genre];
  const match = React.useMemo(() => (stats ? scoreMatch(stats, genreProfile) : null), [stats, genreProfile]);

  const compatible = React.useMemo(() => (palette ? deriveCompatible(palette.regionAvg) : null), [palette]);

  const coverRadius = rounded ? 14 : 0;

  return (
    <div className="mockupsWrap">
      <div className="analyzeHeader2">
        <button className="ghostBtn" onClick={() => navigate("/play")}>
          ← BACK
        </button>

        <div className="analyzeTitle">
          <div className="h1">MOCKUPS</div>
          <div className="h2">Preview your cover inside real streaming contexts + check genre mood conventions.</div>
        </div>

        <div className="analyzeActions2">
          <button className="ghostBtn" onClick={() => fileRef.current?.click()} disabled={busy}>
            UPLOAD COVER
          </button>
          <button
            className="primaryBtn"
            disabled={!dataUrl}
            onClick={() => {
              if (!dataUrl) return;
              navigate("/analyze", { state: { dataUrl } });
            }}
          >
            OPEN IN ANALYZE
          </button>

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
      </div>

      {!dataUrl && (
        <div className="emptyState">
          <div className="emptyTitle">No cover selected.</div>
          <div className="emptySub">Upload a cover or click a tile on PLAY, then open MOCKUPS.</div>
          <button className="primaryBtn" onClick={() => fileRef.current?.click()}>
            UPLOAD
          </button>
        </div>
      )}

      {dataUrl && (
        <>
          <div className="panelDark mockControls">
            <div className="panelTop">
              <div className="panelTitle">Controls</div>
              <div className="panelNote">These settings simulate how platforms display artwork in the real world.</div>
            </div>

            <div className="panelBody">
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
                  <div className="mockLabel">Rounded corners</div>
                  <button className={`pillBtn ${rounded ? "on" : ""}`} onClick={() => setRounded((v) => !v)}>
                    {rounded ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="mockControl">
                  <div className="mockLabel">UI overlays</div>
                  <button className={`pillBtn ${showOverlay ? "on" : ""}`} onClick={() => setShowOverlay((v) => !v)}>
                    {showOverlay ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="mockControl">
                  <div className="mockLabel">Thumbnail size</div>
                  <div className="pillRow">
                    {[48, 64, 96, 128].map((s) => (
                      <button
                        key={s}
                        className={`pillBtn ${thumbSize === s ? "on" : ""}`}
                        onClick={() => setThumbSize(s as 48 | 64 | 96 | 128)}
                      >
                        {s}px
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mockControl wide">
                  <div className="mockLabel">Viewing distance (glance simulation)</div>
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
            </div>
          </div>

          <div className="mockupsGrid">
            {/* LEFT: platform mockups */}
            <div className="mockupsLeft">
              {/* GRID */}
              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Streaming grid</div>
                  <div className="panelNote">
                    Your cover competes in a grid. This tests recognizability + legibility at a glance.
                  </div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={
                      {
                        "--mockScale": distScale,
                        "--mockBlur": `${distBlur}px`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="mockGrid">
                      {Array.from({ length: 12 }, (_, i) => {
                        const isCenter = i === 4;
                        const src = isCenter ? (thumb ?? dataUrl) : neighborCovers[i % neighborCovers.length];

                        return (
                          <div key={i} className="mockCell">
                            <div
                              className="mockCover"
                              style={{
                                borderRadius: coverRadius,
                                backgroundImage: `url(${src})`,
                              }}
                            />
                            {showOverlay && (
                              <div className="mockOverlay">
                                <span className="mockPlayIcon">▶</span>
                              </div>
                            )}
                            {isCenter && <div className="mockBadge">YOU</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="miniHint" style={{ marginTop: 12 }}>
                    Tip: if your title disappears here, it will disappear on real platforms. Try Analyze → pick a calmer
                    region, increase contrast, or add a subtle overlay behind the title.
                  </div>
                </div>
              </div>

              {/* PLAYLIST ROW */}
              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Playlist row</div>
                  <div className="panelNote">Simulates small 48–64px covers next to track text.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={
                      {
                        "--mockScale": distScale,
                        "--mockBlur": `${distBlur}px`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="mockList">
                      {Array.from({ length: 6 }, (_, i) => {
                        const src = i === 1 ? (thumb ?? dataUrl) : neighborCovers[(i + 3) % neighborCovers.length];
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
                                {i === 1 ? "Your Track" : `Track ${i + 1}`}
                                {showOverlay && <span className="mockBadgeSmall">E</span>}
                              </div>
                              <div className="mockSubLine">{i === 1 ? "Your Artist" : "Artist Name"}</div>
                            </div>
                            <div className="mockTime">{3 + i}:{(i * 7) % 60}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* NOW PLAYING */}
              <div className={`panelDark mockPanel ${uiTheme === "light" ? "mockLight" : ""}`}>
                <div className="panelTop">
                  <div className="panelTitle">Now playing</div>
                  <div className="panelNote">Simulates a mini player where the cover is small but central.</div>
                </div>

                <div className="panelBody">
                  <div
                    className="mockStage"
                    style={
                      {
                        "--mockScale": distScale,
                        "--mockBlur": `${distBlur}px`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="mockNowPlaying">
                      <div className="mockNPTop">
                        <div className="mockDot" />
                        <div className="mockDot" />
                        <div className="mockDot" />
                      </div>

                      <div className="mockNPBody">
                        <div
                          className="mockCover big"
                          style={{
                            borderRadius: coverRadius,
                            backgroundImage: `url(${thumb ?? dataUrl})`,
                            width: Math.max(160, thumbSize * 2.2),
                            height: Math.max(160, thumbSize * 2.2),
                          }}
                        />
                        <div className="mockNPText">
                          <div className="mockTitleLine">Your Track</div>
                          <div className="mockSubLine">Your Artist</div>
                          {showOverlay && (
                            <div className="mockControlsRow">
                              <button className="pillBtn on" type="button">PLAY</button>
                              <button className="pillBtn" type="button">QUEUE</button>
                              <button className="pillBtn" type="button">SHARE</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {showOverlay && <div className="mockProgress" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: genre mood lens */}
            <div className="mockupsRight">
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Genre Mood Lens</div>
                  <div className="panelNote">
                    This does not “detect genre”. It compares your cover’s color mood to common genre cover conventions.
                  </div>
                </div>

                <div className="panelBody">
                  <div className="mockControl">
                    <div className="mockLabel">Choose a genre direction</div>
                    <select
                      className="mockSelect"
                      value={genre}
                      onChange={(e) => setGenre(e.currentTarget.value as GenreKey)}
                    >
                      {Object.keys(GENRES).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {palette && stats && (
                    <>
                      <div className="sectionBlock" style={{ marginTop: 14 }}>
                        <div className="sectionHead">Your cover mood (from color)</div>

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

                        <div className="miniHint">
                          Typical cover tendencies (guidance, not rules):
                          <ul className="mockListBullets">
                            {genreProfile.traits.map((t) => <li key={t}>{t}</li>)}
                          </ul>
                        </div>

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
                            <span className="statusTag pass">Alignment: {match.label} • {match.pct}%</span>
                          </div>
                        )}
                      </div>

                      <div className="sectionBlock" style={{ marginTop: 14 }}>
                        <div className="sectionHead">How to use this in CoverCheck</div>
                        <ul className="mockListBullets">
                          <li>
                            If this genre direction is your goal, use the “Compatible accents” as safe overlay/type accent options.
                          </li>
                          <li>
                            Go to <b>Analyze</b> and place your region where clutter is lower (calmer background) to improve readability.
                          </li>
                          <li>
                            Use <b>Mockups</b> grid + playlist rows as your real-world check before final export.
                          </li>
                        </ul>

                        <div className="mockNextActions">
                          <button className="primaryBtn" onClick={() => navigate("/analyze", { state: { dataUrl } })}>
                            GO TO ANALYZE
                          </button>
                          <button className="ghostBtn" onClick={() => navigate("/play")}>
                            PICK ANOTHER COVER
                          </button>
                        </div>
                      </div>

                      <div className="miniHint" style={{ marginTop: 12 }}>
                        Want stronger {genre} alignment? Try:
                        <ul className="mockListBullets">
                          {genreProfile.guidance.map((g) => <li key={g}>{g}</li>)}
                        </ul>
                      </div>
                    </>
                  )}

                  {!palette && (
                    <div className="miniHint" style={{ marginTop: 10 }}>
                      Upload/select a cover to compute palette and mood.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
