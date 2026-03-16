import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import {
  computePalette,
  computeRegionMetrics,
  computeSafeMargin,
  type NormalizedRect,
  type PaletteResult,
  type RegionMetrics,
  type SafeMarginResult,
} from "../analysis/metrics";
import {
  computeCompositionMetrics,
  type CompositionMetrics,
} from "../analysis/composition";
import {
  computeReleaseReadiness,
  type ReleaseReadiness,
  type Thumb64Snapshot,
} from "../lib/release";
import { saveReportToSession } from "../lib/reportStore";
import type { ReportData, Suggestion, ViewMode } from "../lib/report";
import TypographyStressTest from "../components/typographystresstest";

type AnalyzeState = {
  dataUrl?: string;
  uploadedDataUrl?: string | null;
};

type Handle = "nw" | "ne" | "sw" | "se";
type DragMode = "idle" | "new" | "move" | "resize";

type CropPosition = { x: number; y: number };

function TopProgress({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      role="status"
      aria-live="polite"
    >
      <progress
        style={{
          width: "100%",
          height: 3,
          display: "block",
        }}
      />
      <div
        style={{
          width: "fit-content",
          margin: "10px auto 0",
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.10)",
          fontSize: 12,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function clamp01(v: number) {
  return clamp(v, 0, 1);
}

function clampRect(r: NormalizedRect, minSize = 0.02): NormalizedRect {
  const w = Math.max(minSize, Math.min(1, r.w));
  const h = Math.max(minSize, Math.min(1, r.h));

  let x = clamp01(r.x);
  let y = clamp01(r.y);

  if (x + w > 1) x = 1 - w;
  if (y + h > 1) y = 1 - h;

  return { x: clamp01(x), y: clamp01(y), w, h };
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs work";
  return "Poor";
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
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

function computeContainRect(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  const x = (boxW - w) / 2;
  const y = (boxH - h) / 2;
  return { x, y, w, h };
}

function rectContains(r: NormalizedRect, nx: number, ny: number) {
  return nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h;
}

function handleHitTest(r: NormalizedRect, nx: number, ny: number): Handle | null {
  const corners: Array<[Handle, number, number]> = [
    ["nw", r.x, r.y],
    ["ne", r.x + r.w, r.y],
    ["sw", r.x, r.y + r.h],
    ["se", r.x + r.w, r.y + r.h],
  ];

  const hitRadius = Math.max(0.02, Math.min(0.045, Math.min(r.w, r.h) * 0.33));

  for (const [handle, cx, cy] of corners) {
    const dx = nx - cx;
    const dy = ny - cy;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) return handle;
  }

  return null;
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

function ensureSourceCanvas(imageData: ImageData) {
  const c = document.createElement("canvas");
  c.width = imageData.width;
  c.height = imageData.height;

  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.putImageData(imageData, 0, 0);
  return c;
}

function mapCropRegionToImageRectWithCrop(
  imageData: ImageData,
  regionInCrop01: NormalizedRect,
  cropPos: CropPosition,
  zoom: number
): NormalizedRect {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const { sx, sy, sw, sh } = coverCropWithPosZoom(srcW, srcH, cropPos.x, cropPos.y, zoom);

  const x = (sx + regionInCrop01.x * sw) / srcW;
  const y = (sy + regionInCrop01.y * sh) / srcH;
  const w = (regionInCrop01.w * sw) / srcW;
  const h = (regionInCrop01.h * sh) / srcH;

  return clampRect({ x, y, w, h }, 0.0005);
}

async function imageDataToJpegDataUrl(
  imageData: ImageData,
  quality = 0.9
): Promise<string | null> {
  const c = document.createElement("canvas");
  c.width = imageData.width;
  c.height = imageData.height;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    c.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve(typeof reader.result === "string" ? reader.result : null);
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

function buildThumb64Snapshot(
  sourceCanvas: HTMLCanvasElement,
  cropPos: CropPosition,
  zoom: number,
  regionInCrop: NormalizedRect
): Thumb64Snapshot {
  const size = 64;
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;

  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      size: 64,
      contrastRatio: 0,
      clutterScore: 0,
      regionMinPx: 0,
      pass: false,
      note: "64px check could not be generated.",
    };
  }

  const { sx, sy, sw, sh } = coverCropWithPosZoom(
    sourceCanvas.width,
    sourceCanvas.height,
    cropPos.x,
    cropPos.y,
    zoom
  );

  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, size, size);

  const thumbData = ctx.getImageData(0, 0, size, size);
  const regionMetrics = computeRegionMetrics(thumbData, regionInCrop);
  const regionMinPx = Math.min(regionInCrop.w * size, regionInCrop.h * size);

  const pass =
    regionMetrics.contrastRatio >= 3 &&
    regionMetrics.clutterScore >= 55 &&
    regionMinPx >= 10;

  return {
    size: 64,
    contrastRatio: regionMetrics.contrastRatio,
    clutterScore: regionMetrics.clutterScore,
    regionMinPx,
    pass,
    note: pass
      ? "Selected region remains readable at 64px."
      : "Increase type contrast, reduce background texture, or enlarge the title area for tiny thumbnails.",
  };
}

function buildSuggestions(args: {
  region: NormalizedRect;
  regionMetrics: RegionMetrics;
  safe: SafeMarginResult;
  palette: PaletteResult;
  composition: CompositionMetrics;
  thumb64: Thumb64Snapshot | null;
  viewMode: ViewMode;
}): Suggestion[] {
  const { region, regionMetrics: rm, safe, palette, composition, thumb64, viewMode } = args;
  const out: Suggestion[] = [];
  const area = region.w * region.h;

  if (!safe.pass) {
    out.push({
      title: "Move text inward",
      why: `${safe.outsidePct.toFixed(0)}% of your region falls outside the safe area.`,
      try: "Shift title/artist toward the centre so important information stays inside the dashed guide.",
      target: "Safe score ≥ 95/100",
    });
  }

  if (area < 0.04) {
    out.push({
      title: "Increase title area",
      why: "Very small title regions disappear quickly in 64–128px thumbnails.",
      try: "Reserve more space for the title/artist block or use a larger/bolder type treatment.",
      target: "Region should feel substantial at thumbnail scale",
    });
  }

  if (rm.contrastRatio < 3) {
    out.push({
      title: "Contrast is too low",
      why: `Estimated contrast is ${rm.contrastRatio.toFixed(2)}.`,
      try: `Use the recommended text colour (${palette.text.primary}) and add a 20–40% overlay behind text.`,
      target: "≥ 4.5 small text, ≥ 3.0 large text",
    });
  } else if (rm.contrastRatio < 4.5) {
    out.push({
      title: "Contrast is borderline",
      why: `Estimated contrast is ${rm.contrastRatio.toFixed(2)}.`,
      try: "Try a gradient strip, stronger font weight, or a more separated text colour.",
      target: "≥ 4.5 preferred",
    });
  }

  if (rm.clutterScore < 60) {
    out.push({
      title: "Background is too busy behind text",
      why: "Texture/detail behind letters reduces readability even when contrast is acceptable.",
      try: "Move text to a calmer area, blur/simplify behind it, or add a panel shape behind the type.",
      target: "Clutter ≥ 60/100",
    });
  }

  if (thumb64 && !thumb64.pass && viewMode === "crop") {
    out.push({
      title: "64px check still fails",
      why: `Tiny check: contrast ${thumb64.contrastRatio.toFixed(2)}, clutter ${Math.round(
        thumb64.clutterScore
      )}, region size ${Math.round(thumb64.regionMinPx)}px.`,
      try: "Increase type size/weight, reduce background texture, or choose a cleaner square crop.",
      target: "Readable at 64px",
    });
  }

  if (composition.lightDark.label === "Dark") {
    out.push({
      title: "Very dark overall image",
      why: "Dark covers can crush detail and subtle type in dark-mode UIs.",
      try: "Use a lighter text/overlay combination and increase tonal separation in the title zone.",
    });
  } else if (composition.lightDark.label === "Light") {
    out.push({
      title: "Very light overall image",
      why: "Light covers can wash out pale typography or weak focal points.",
      try: "Use a darker text tone or slightly deepen the title region with an overlay.",
    });
  }

  out.push({
    title: "Use palette-compatible accents",
    why: `Region-average colour is ${palette.regionAvg}.`,
    try: `Try accent ${palette.text.accent} or use the palette as overlay/highlight options.`,
  });

  return out.slice(0, 10);
}

export default function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AnalyzeState;

  const initialUploadedDataUrl =
    state.uploadedDataUrl ?? (state.dataUrl?.startsWith("blob:") ? state.dataUrl : null);

  const [dataUrl, setDataUrl] = useState<string | null>(state.dataUrl ?? null);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(initialUploadedDataUrl);

  const [viewMode, setViewMode] = useState<ViewMode>("crop");
  const [region, setRegion] = useState<NormalizedRect | null>(null);
  const [cropPos, setCropPos] = useState<CropPosition>({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1);
  const [panCrop, setPanCrop] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [showSafe, setShowSafe] = useState(true);

  const [regionMetrics, setRegionMetrics] = useState<RegionMetrics | null>(null);
  const [safeMargin, setSafeMargin] = useState<SafeMarginResult | null>(null);
  const [palette, setPalette] = useState<PaletteResult | null>(null);
  const [composition, setComposition] = useState<CompositionMetrics | null>(null);
  const [thumb64, setThumb64] = useState<Thumb64Snapshot | null>(null);
  const [release, setRelease] = useState<ReleaseReadiness | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [navPending, startNavTransition] = useTransition();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);

  const analysisRef = useRef<ImageData | null>(null);
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const regionRef = useRef<NormalizedRect | null>(region);
  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  const dragRef = useRef<{
    mode: DragMode;
    handle: Handle | null;
    startNx: number;
    startNy: number;
    baseRect: NormalizedRect | null;
  }>({
    mode: "idle",
    handle: null,
    startNx: 0,
    startNy: 0,
    baseRect: null,
  });

  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    basePos: { x: 0.5, y: 0.5 },
  });

  const safeInset = 0.08;
  const hasRegion = Boolean(region);
  const hasAnalysis = Boolean(
    region && regionMetrics && safeMargin && palette && composition && release
  );

  const progressLabel = useMemo(() => {
    if (isGeneratingReport || navPending) return "Generating report…";
    if (busy) return "Processing image…";
    if (pendingAnalysis) return "Updating analysis…";
    if (region && !hasAnalysis) return "Analyzing region…";
    return "";
  }, [busy, hasAnalysis, isGeneratingReport, navPending, pendingAnalysis, region]);

  const showProgress = progressLabel.length > 0;

  const imgStyle = useMemo(() => {
    if (viewMode !== "crop") return undefined;

    return {
      objectPosition: `${cropPos.x * 100}% ${cropPos.y * 100}%`,
      transform: `scale(${zoom})`,
      transformOrigin: "center",
    } as const;
  }, [viewMode, cropPos.x, cropPos.y, zoom]);

  const releaseBadgeText = release
    ? release.overallPass
      ? `READY • ${release.score}/100`
      : `NOT READY • ${release.score}/100`
    : "NO READINESS YET";

  const setRegionBoth = useCallback((next: NormalizedRect | null) => {
    regionRef.current = next;
    setRegion(next);
  }, []);

  const clearAnalysisOnly = useCallback(() => {
    setRegionMetrics(null);
    setSafeMargin(null);
    setPalette(null);
    setThumb64(null);
    setRelease(null);
    setSuggestions([]);
  }, []);

  const resetForNewImage = useCallback(() => {
    setViewMode("crop");
    setCropPos({ x: 0.5, y: 0.5 });
    setZoom(1);
    setPanCrop(false);
    setRegionBoth(null);
    clearAnalysisOnly();
    setComposition(null);
    setImgSize(null);
    analysisRef.current = null;
    srcCanvasRef.current = null;
  }, [clearAnalysisOnly, setRegionBoth]);

  const redraw = useCallback(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const r = host.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(r.width));
    const cssH = Math.max(1, Math.round(r.height));
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const drawRect =
      viewMode === "crop" || !imgSize
        ? { x: 0, y: 0, w: cssW, h: cssH }
        : computeContainRect(imgSize.w, imgSize.h, cssW, cssH);

    ctx.save();
    ctx.strokeStyle = "rgba(245,245,245,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(drawRect.x + 0.5, drawRect.y + 0.5, drawRect.w - 1, drawRect.h - 1);
    ctx.restore();

    if (showSafe) {
      const mx = drawRect.x + drawRect.w * safeInset;
      const my = drawRect.y + drawRect.h * safeInset;
      const mw = drawRect.w * (1 - safeInset * 2);
      const mh = drawRect.h * (1 - safeInset * 2);
      const fail = safeMargin ? !safeMargin.pass : false;

      ctx.save();
      ctx.strokeStyle = fail ? "rgba(255,120,120,0.55)" : "rgba(245,245,245,0.14)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
      ctx.restore();
    }

    const rgn = regionRef.current;
    if (!rgn) return;

    const x = drawRect.x + rgn.x * drawRect.w;
    const y = drawRect.y + rgn.y * drawRect.h;
    const w = rgn.w * drawRect.w;
    const h = rgn.h * drawRect.h;

    ctx.save();
    ctx.fillStyle = "rgba(255,196,0,0.10)";
    ctx.strokeStyle = "rgba(255,196,0,0.95)";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    const drawHandle = (hx: number, hy: number) => {
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.strokeStyle = "rgba(255,196,0,0.95)";
      ctx.lineWidth = 2;
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawHandle(x, y);
    drawHandle(x + w, y);
    drawHandle(x, y + h);
    drawHandle(x + w, y + h);
    ctx.restore();
  }, [imgSize, safeMargin, showSafe, viewMode]);

  const computeCompositionNow = useCallback(() => {
    const imageData = analysisRef.current;
    if (!imageData) {
      setComposition(null);
      return;
    }

    const cropRect =
      viewMode === "crop"
        ? coverCropWithPosZoom(imageData.width, imageData.height, cropPos.x, cropPos.y, zoom)
        : { sx: 0, sy: 0, sw: imageData.width, sh: imageData.height };

    setComposition(computeCompositionMetrics(imageData, cropRect));
  }, [cropPos.x, cropPos.y, viewMode, zoom]);

  const computeAllNow = useCallback(
    (nextRegion: NormalizedRect | null) => {
      const imageData = analysisRef.current;
      const srcCanvas = srcCanvasRef.current;

      computeCompositionNow();

      if (!imageData || !srcCanvas || !imgSize || !dataUrl || !nextRegion) {
        clearAnalysisOnly();
        return;
      }

      const mapped =
        viewMode === "crop"
          ? mapCropRegionToImageRectWithCrop(imageData, nextRegion, cropPos, zoom)
          : nextRegion;

      const rm = computeRegionMetrics(imageData, mapped);
      const sm = computeSafeMargin(nextRegion, safeInset);
      const pal = computePalette(imageData, mapped);

      const cropRect =
        viewMode === "crop"
          ? coverCropWithPosZoom(imageData.width, imageData.height, cropPos.x, cropPos.y, zoom)
          : { sx: 0, sy: 0, sw: imageData.width, sh: imageData.height };

      const comp = computeCompositionMetrics(imageData, cropRect);
      const t64 =
        viewMode === "crop"
          ? buildThumb64Snapshot(srcCanvas, cropPos, zoom, nextRegion)
          : null;

      const rel = computeReleaseReadiness({
        region: nextRegion,
        regionMetrics: rm,
        safe: sm,
        thumb64: t64,
      });

      const sug = buildSuggestions({
        region: nextRegion,
        regionMetrics: rm,
        safe: sm,
        palette: pal,
        composition: comp,
        thumb64: t64,
        viewMode,
      });

      setComposition(comp);
      setRegionMetrics(rm);
      setSafeMargin(sm);
      setPalette(pal);
      setThumb64(t64);
      setRelease(rel);
      setSuggestions(sug);
    },
    [clearAnalysisOnly, computeCompositionNow, cropPos, dataUrl, imgSize, viewMode, zoom]
  );

  const buildReportCore = useCallback((): ReportData | null => {
    const currentRegion = regionRef.current;
    const imageData = analysisRef.current;

    if (
      !dataUrl ||
      !imgSize ||
      !currentRegion ||
      !imageData ||
      !regionMetrics ||
      !safeMargin ||
      !palette ||
      !composition ||
      !release
    ) {
      return null;
    }

    const mapped =
      viewMode === "crop"
        ? mapCropRegionToImageRectWithCrop(imageData, currentRegion, cropPos, zoom)
        : currentRegion;

    return {
      createdAt: new Date().toISOString(),
      dataUrl,
      imageSize: imgSize,
      viewMode,
      region: currentRegion,
      mappedRegion: mapped,
      regionMetrics,
      safeMargin,
      palette,
      composition,
      thumb64,
      release,
      suggestions,
      changes: null,
    };
  }, [
    composition,
    cropPos,
    dataUrl,
    imgSize,
    palette,
    regionMetrics,
    release,
    safeMargin,
    suggestions,
    thumb64,
    viewMode,
    zoom,
  ]);

  const goToReport = useCallback(
    (finalAction: "report" | "ready") => {
      setIsGeneratingReport(true);

      requestAnimationFrame(() => {
        void (async () => {
          try {
            const core = buildReportCore();
            if (!core) {
              setIsGeneratingReport(false);
              return;
            }

            let finalReport = core;

            if (core.dataUrl.startsWith("blob:") && analysisRef.current) {
              const snap = await imageDataToJpegDataUrl(analysisRef.current, 0.9);
              if (snap && snap.length < 4_000_000) {
                finalReport = { ...core, dataUrl: snap };
              }
            }

            saveReportToSession(finalReport, finalAction);
            startNavTransition(() => navigate("/report"));
          } catch (err) {
            console.error("[AnalyzePage] goToReport failed", err);
            setIsGeneratingReport(false);
          }
        })();
      });
    },
    [buildReportCore, navigate, startNavTransition]
  );

  const endDragAndScore = useCallback(() => {
    setPendingAnalysis(true);

    dragRef.current = {
      mode: "idle",
      handle: null,
      startNx: 0,
      startNy: 0,
      baseRect: null,
    };

    requestAnimationFrame(() => {
      redraw();
      computeAllNow(regionRef.current);
      setPendingAnalysis(false);
    });
  }, [computeAllNow, redraw]);

  const goBackToPlay = useCallback(() => {
    navigate("/play", {
      state: { uploadedDataUrl },
    });
  }, [navigate, uploadedDataUrl]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw, region, viewMode, showSafe]);

  useEffect(() => {
    if (!dataUrl) return;

    let alive = true;

    void (async () => {
      setBusy(true);
      setError(null);

      try {
        const analysis = await buildAnalysisImageData(dataUrl, 640);
        if (!alive) return;

        analysisRef.current = analysis.imageData;
        srcCanvasRef.current = ensureSourceCanvas(analysis.imageData);
        setImgSize({ w: analysis.natural.w, h: analysis.natural.h });

        setComposition(
          computeCompositionMetrics(analysis.imageData, {
            sx: 0,
            sy: 0,
            sw: analysis.imageData.width,
            sh: analysis.imageData.height,
          })
        );
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
  }, [dataUrl]);

  useEffect(() => {
    setPendingAnalysis(true);

    const t = window.setTimeout(() => {
      computeCompositionNow();
      if (regionRef.current) computeAllNow(regionRef.current);
      setPendingAnalysis(false);
    }, 250);

    return () => {
      window.clearTimeout(t);
      setPendingAnalysis(false);
    };
  }, [computeAllNow, computeCompositionNow, cropPos.x, cropPos.y, viewMode, zoom]);

  const pointerToNormalized = useCallback(
    (clientX: number, clientY: number) => {
      const host = hostRef.current;
      if (!host) return null;

      const r = host.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;

      if (viewMode === "crop") {
        return { nx: clamp01(px / r.width), ny: clamp01(py / r.height), inside: true };
      }

      if (!imgSize) return null;

      const contain = computeContainRect(imgSize.w, imgSize.h, r.width, r.height);
      const cx = px - contain.x;
      const cy = py - contain.y;
      const inside = cx >= 0 && cy >= 0 && cx <= contain.w && cy <= contain.h;

      return {
        nx: clamp01(cx / contain.w),
        ny: clamp01(cy / contain.h),
        inside,
      };
    },
    [imgSize, viewMode]
  );

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const p = pointerToNormalized(e.clientX, e.clientY);
    if (!p || !p.inside) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    if (viewMode === "crop" && panCrop) {
      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        basePos: { ...cropPos },
      };
      return;
    }

    const current = regionRef.current;
    if (current) {
      const hit = handleHitTest(current, p.nx, p.ny);
      if (hit) {
        dragRef.current = {
          mode: "resize",
          handle: hit,
          startNx: p.nx,
          startNy: p.ny,
          baseRect: current,
        };
        return;
      }

      if (rectContains(current, p.nx, p.ny)) {
        dragRef.current = {
          mode: "move",
          handle: null,
          startNx: p.nx,
          startNy: p.ny,
          baseRect: current,
        };
        return;
      }
    }

    dragRef.current = {
      mode: "new",
      handle: null,
      startNx: p.nx,
      startNy: p.ny,
      baseRect: null,
    };

    setRegionBoth({ x: p.nx, y: p.ny, w: 0.02, h: 0.02 });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (panRef.current.active && viewMode === "crop" && imgSize) {
      const host = hostRef.current;
      if (!host) return;

      const r = host.getBoundingClientRect();
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;

      const { sw, sh } = coverCropWithPosZoom(
        imgSize.w,
        imgSize.h,
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
      return;
    }

    const dr = dragRef.current;
    if (dr.mode === "idle") return;

    const p = pointerToNormalized(e.clientX, e.clientY);
    if (!p) return;

    e.preventDefault();

    if (dr.mode === "new") {
      const x = Math.min(dr.startNx, p.nx);
      const y = Math.min(dr.startNy, p.ny);
      const w = Math.max(0.02, Math.abs(p.nx - dr.startNx));
      const h = Math.max(0.02, Math.abs(p.ny - dr.startNy));

      setRegionBoth(clampRect({ x, y, w, h }, 0.02));
      requestAnimationFrame(redraw);
      return;
    }

    if (dr.mode === "move" && dr.baseRect) {
      const dx = p.nx - dr.startNx;
      const dy = p.ny - dr.startNy;

      setRegionBoth(
        clampRect(
          {
            x: dr.baseRect.x + dx,
            y: dr.baseRect.y + dy,
            w: dr.baseRect.w,
            h: dr.baseRect.h,
          },
          0.02
        )
      );

      requestAnimationFrame(redraw);
      return;
    }

    if (dr.mode === "resize" && dr.baseRect && dr.handle) {
      const base = dr.baseRect;
      const minSize = 0.02;

      let x1 = base.x;
      let y1 = base.y;
      let x2 = base.x + base.w;
      let y2 = base.y + base.h;

      if (dr.handle === "nw") {
        x1 = p.nx;
        y1 = p.ny;
      } else if (dr.handle === "ne") {
        x2 = p.nx;
        y1 = p.ny;
      } else if (dr.handle === "sw") {
        x1 = p.nx;
        y2 = p.ny;
      } else {
        x2 = p.nx;
        y2 = p.ny;
      }

      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.max(minSize, Math.abs(x2 - x1));
      const h = Math.max(minSize, Math.abs(y2 - y1));

      setRegionBoth(clampRect({ x, y, w, h }, minSize));
      requestAnimationFrame(redraw);
    }
  }

  function onPointerUp() {
    panRef.current.active = false;
    endDragAndScore();
  }

  function onPointerCancel() {
    panRef.current.active = false;
    endDragAndScore();
  }

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);

    try {
      const url = await fileToObjectUrl(file);
      setDataUrl(url);
      setUploadedDataUrl(url);
      resetForNewImage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="analyzeWrap">
      <TopProgress active={showProgress} label={progressLabel} />

      <div className="mockHero analyzeHero">
        <div className="mockHeroTop">
          <button
            type="button"
            className="ghostBtn"
            onClick={goBackToPlay}
            disabled={navPending}
          >
            ← BACK
          </button>

          <div className="mockHeroActions">
            <button
              type="button"
              className="ghostBtn"
              onClick={() => fileRef.current?.click()}
              disabled={busy || navPending}
            >
              UPLOAD NEW
            </button>

            <button
              type="button"
              className="ghostBtn"
              onClick={() => {
                setRegionBoth(null);
                clearAnalysisOnly();
                requestAnimationFrame(redraw);
              }}
              disabled={!hasRegion || busy || navPending}
            >
              CLEAR REGION
            </button>

            <button
              type="button"
              className="primaryBtn"
              disabled={!hasAnalysis || isGeneratingReport || navPending}
              onClick={() => goToReport("report")}
            >
              {isGeneratingReport || navPending ? "GENERATING…" : "GENERATE REPORT"}
            </button>
          </div>
        </div>

        <div className="testKicker">COVERCHECK</div>
        <div className="testTitle">Analyze</div>
        <div className="testLead">
          Draw a region for title/artist, review readability + composition, then use
          Release Readiness as your final decision.
        </div>

        <hr className="mockRule" />

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

      {!dataUrl && (
        <div className="emptyState">
          <div className="emptyTitle">No cover uploaded yet.</div>
          <div className="emptySub">
            Upload a cover or start from PLAY, then use Analyze to test readability and
            composition.
          </div>
          <button
            type="button"
            className="primaryBtn"
            onClick={() => fileRef.current?.click()}
            disabled={busy || navPending}
          >
            UPLOAD COVER
          </button>
        </div>
      )}

      {dataUrl && (
        <>
          <div className="analyzeWorkspace">
            <div className="analyzeLeft">
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Cover + region</div>
                  <div className="panelNote">
                    {viewMode === "crop"
                      ? "Crop view simulates square streaming thumbnails. Use PAN CROP to choose the most realistic square framing."
                      : "Full view shows the entire image using contain."}
                  </div>
                </div>

                <div
                  ref={hostRef}
                  className={`mediaStage ${viewMode === "crop" ? "crop" : "full"} ${
                    panCrop ? "isPanning" : ""
                  }`}
                  style={
                    viewMode === "full" && imgSize
                      ? { aspectRatio: `${imgSize.w} / ${imgSize.h}` }
                      : undefined
                  }
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                >
                  <img
                    className={`mediaImg ${viewMode === "crop" ? "crop" : "full"}`}
                    src={dataUrl}
                    alt="Uploaded cover"
                    draggable={false}
                    style={imgStyle}
                  />
                  <canvas ref={canvasRef} className="overlayCanvas" />
                </div>

                <div className="imageToolbar">
                  <div className="toolbarRow">
                    <button
                      type="button"
                      className={`pillBtn ${viewMode === "crop" ? "on" : ""}`}
                      onClick={() => {
                        setViewMode("crop");
                        setPanCrop(false);
                        setRegionBoth(null);
                        clearAnalysisOnly();
                      }}
                      disabled={busy || navPending}
                    >
                      CROP VIEW
                    </button>

                    <button
                      type="button"
                      className={`pillBtn ${viewMode === "full" ? "on" : ""}`}
                      onClick={() => {
                        setViewMode("full");
                        setPanCrop(false);
                        setRegionBoth(null);
                        clearAnalysisOnly();
                      }}
                      disabled={busy || navPending}
                    >
                      FULL VIEW
                    </button>

                    <button
                      type="button"
                      className={`pillBtn ${showSafe ? "on" : ""}`}
                      onClick={() => setShowSafe((v) => !v)}
                      disabled={busy || navPending}
                    >
                      SAFE AREA
                    </button>

                    <button
                      type="button"
                      className={`pillBtn ${panCrop ? "on" : ""}`}
                      onClick={() => setPanCrop((v) => !v)}
                      title="Turn on to drag the crop. Turn off to draw the text region."
                      disabled={busy || navPending}
                    >
                      PAN CROP
                    </button>
                  </div>

                  <div className="toolbarRow">
                    <div className="zoomControl">
                      <span className="zoomLabel">ZOOM</span>
                      <input
                        className="range"
                        type="range"
                        min={1}
                        max={2.5}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        disabled={viewMode !== "crop" || busy || navPending}
                      />
                      <button
                        type="button"
                        className="ghostBtn"
                        onClick={() => {
                          setCropPos({ x: 0.5, y: 0.5 });
                          setZoom(1);
                        }}
                        disabled={viewMode !== "crop" || busy || navPending}
                      >
                        RESET CROP
                      </button>
                    </div>
                  </div>

                  <div className="metaRow">
                    {imgSize && (
                      <span className="tag">
                        {imgSize.w}×{imgSize.h}
                      </span>
                    )}
                    <span className="tag">view: {viewMode.toUpperCase()}</span>
                    {region ? (
                      <span className="tag">
                        region: {Math.round(region.w * 100)}% × {Math.round(region.h * 100)}%
                      </span>
                    ) : (
                      <span className="tag">region: none</span>
                    )}
                    <span className={`statusTag ${release?.overallPass ? "pass" : "fail"}`}>
                      {releaseBadgeText}
                    </span>
                  </div>

                  {error && <div className="errorLine">{error}</div>}
                </div>
              </div>

              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Composition</div>
                  <div className="panelNote">
                    A composition layer to complement readability. These five metrics
                    describe overall character: light/dark, colour balance, symmetry,
                    texture, and organic vs technical shape language.
                  </div>
                </div>

                <div className="panelBody">
                  {!composition ? (
                    <div className="miniHint">Composition will appear after the image loads.</div>
                  ) : (
                    <div className="compGrid compGridBig">
                      <div className="miniCard">
                        <div className="miniLabel">Light vs dark</div>
                        <div className="miniValue">{composition.lightDark.label}</div>
                        <div className="miniSub">
                          Average luminance: {composition.lightDark.averageLuminance}/100
                        </div>
                        {composition.lightDark.warning && (
                          <div className="detailLine">{composition.lightDark.warning}</div>
                        )}
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Colour balance</div>
                        <div className="miniValue">{composition.colorBalance.label}</div>
                        <div className="miniSub">
                          Warm {composition.colorBalance.warmPct}% • Cool {composition.colorBalance.coolPct}% • Saturation spread {composition.colorBalance.saturationSpread}/100
                        </div>
                        <div className="detailLine">
                          Dominant colour weight: {composition.colorBalance.dominantWeight}/100
                        </div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Symmetry vs asymmetry</div>
                        <div className="miniValue">{composition.symmetry.label}</div>
                        <div className="miniSub">
                          Vertical mirror similarity: {composition.symmetry.score}/100
                        </div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Texture / complexity</div>
                        <div className="miniValue">{composition.texture.label}</div>
                        <div className="miniSub">
                          Texture energy: {composition.texture.energy}/100
                        </div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Organic vs technical</div>
                        <div className="miniValue">{composition.organicTechnical.label}</div>
                        <div className="miniSub">
                          Structure score: {composition.organicTechnical.score}/100
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="analyzeRight">
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Region analysis</div>
                  <div className="panelNote">
                    Core album-cover checks for the selected title/artist region:
                    readability, placement risk, and palette guidance.
                  </div>
                </div>

                <div className="panelBody">
                  {!region || !regionMetrics || !safeMargin || !palette ? (
                    <div className="miniHint">Draw a region to analyze the title/artist area.</div>
                  ) : (
                    <div className="analysisSections">
                      <div className="sectionBlock">
                        <div className="sectionHead">Readability</div>

                        <div className="metricsGrid">
                          <div className="metricCard">
                            <div className="metricLabel">Contrast</div>
                            <div className="metricValue">
                              {regionMetrics.contrastRatio.toFixed(2)}
                            </div>
                            <div className="metricSub">
                              {scoreLabel(regionMetrics.contrastScore)} • target ≥ 4.5 small / ≥ 3.0 large
                            </div>
                          </div>

                          <div className="metricCard">
                            <div className="metricLabel">Clutter</div>
                            <div className="metricValue">
                              {Math.round(regionMetrics.clutterScore)}
                            </div>
                            <div className="metricSub">
                              {scoreLabel(regionMetrics.clutterScore)} • target ≥ 60/100
                            </div>
                          </div>
                        </div>

                        <div className="detailLine">
                          Contrast estimates separation between text and background. Clutter
                          estimates how much background detail competes with letterforms.
                        </div>
                      </div>

                      <div className="sectionBlock">
                        <div className="sectionHead">Placement</div>

                        <div className="twoCol">
                          <div className="miniCard">
                            <div className="miniLabel">Safe area score</div>
                            <div className="miniValue">{safeMargin.score.toFixed(0)}/100</div>
                            <div className="miniSub">
                              {safeMargin.pass ? "PASS" : "FAIL"} • {safeMargin.outsidePct.toFixed(0)}% outside
                            </div>
                          </div>

                          <div className="miniCard">
                            <div className="miniLabel">Why it matters</div>
                            <div className="miniSub">
                              Platforms crop artwork, round corners, and add UI overlays. Edge
                              text is the first thing to fail.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="sectionBlock">
                        <div className="sectionHead">Colour guidance</div>

                        <div className="chipRow">
                          <div className="chipMeta">
                            <div className="miniLabel">Region avg</div>
                            <div className="chip" style={{ background: palette.regionAvg }} />
                            <div className="miniSub">{palette.regionAvg}</div>
                          </div>

                          <div className="chipMeta">
                            <div className="miniLabel">Best text</div>
                            <div className="chip" style={{ background: palette.text.primary }} />
                            <div className="miniSub">
                              {palette.text.primary} • {palette.text.primaryRatio.toFixed(2)}×
                            </div>
                          </div>

                          <div className="chipMeta">
                            <div className="miniLabel">Alt text</div>
                            <div className="chip" style={{ background: palette.text.secondary }} />
                            <div className="miniSub">
                              {palette.text.secondary} • {palette.text.secondaryRatio.toFixed(2)}×
                            </div>
                          </div>

                          <div className="chipMeta">
                            <div className="miniLabel">Accent</div>
                            <div className="chip" style={{ background: palette.text.accent }} />
                            <div className="miniSub">
                              {palette.text.accent} • {palette.text.accentRatio.toFixed(2)}×
                            </div>
                          </div>
                        </div>

                        <div className="paletteRows">
                          <div className="paletteLine">
                            <span className="miniLabel">Region palette</span>
                            <div className="paletteStrip">
                              {palette.region.map((c) => (
                                <span key={c} className="chip small" style={{ background: c }} />
                              ))}
                            </div>
                          </div>

                          <div className="paletteLine">
                            <span className="miniLabel">Image palette</span>
                            <div className="paletteStrip">
                              {palette.image.map((c) => (
                                <span key={c} className="chip small" style={{ background: c }} />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="detailLine">
                          Use the best text chip for maximum separation, then build
                          accents/overlays around that palette rather than guessing.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Release readiness</div>
                  <div className="panelNote">
                    Final decision using explicit thresholds: contrast, safe area, clutter,
                    and a 64px check.
                  </div>
                </div>

                <div className="panelBody">
                  {!release ? (
                    <div className="miniHint">Draw a region to compute release readiness.</div>
                  ) : (
                    <>
                      <div className="readyTop">
                        <span className={`statusTag ${release.overallPass ? "pass" : "fail"}`}>
                          {release.overallPass ? "READY TO UPLOAD" : "NOT READY"} • {release.score}/100
                        </span>
                      </div>

                      <div className="readyList">
                        {release.checks.map((c) => (
                          <div key={c.id} className="readyRow">
                            <div>
                              <div className="readyLabel">{c.label}</div>
                              <div className="readyMeta">
                                <b>Value:</b> {c.value} • <b>Target:</b> {c.target}
                              </div>
                              <div className="readyMeta">{c.why}</div>
                            </div>
                            <span className={`statusTag ${c.pass ? "pass" : "fail"}`}>
                              {c.pass ? "PASS" : "FAIL"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {!release.overallPass && (
                        <div className="readyFixes">
                          <div className="sectionHead">What to change next</div>
                          <ul className="readyFixList">
                            {release.nextChanges.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="readyActions">
                        <button
                          type="button"
                          className="primaryBtn"
                          onClick={() => goToReport("report")}
                          disabled={!hasAnalysis || isGeneratingReport || navPending}
                        >
                          {isGeneratingReport || navPending ? "GENERATING…" : "GENERATE REPORT"}
                        </button>
                        <button
                          type="button"
                          className="ghostBtn"
                          onClick={() =>
                            navigate("/mockups", {
                              state: { dataUrl, uploadedDataUrl },
                            })
                          }
                          disabled={busy || navPending}
                        >
                          OPEN MOCKUPS
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Suggestions</div>
                  <div className="panelNote">
                    Plain-language actions based on region + crop + composition.
                  </div>
                </div>

                <div className="panelBody">
                  {!suggestions.length ? (
                    <div className="miniHint">Select a region to generate more detailed guidance.</div>
                  ) : (
                    <div className="suggestList">
                      {suggestions.map((s, i) => (
                        <div key={`${s.title}-${i}`} className="suggestItem">
                          <div className="suggestTitle">{s.title}</div>
                          <div className="suggestDetail">
                            <div className="sLine">
                              <b>Why:</b> {s.why}
                            </div>
                            <div className="sLine">
                              <b>Try:</b> {s.try}
                            </div>
                            {s.target && (
                              <div className="sLine">
                                <b>Target:</b> {s.target}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="typoStressPanel">
            <TypographyStressTest
              dataUrl={dataUrl}
              viewMode={viewMode}
              cropPos={cropPos}
              zoom={zoom}
              region={region}
              palette={palette}
              regionMetrics={regionMetrics}
            />
          </div>
        </>
      )}
    </div>
  );
}
