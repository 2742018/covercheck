import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToDataUrl } from "../lib/storage";
import {
  computePalette,
  computeRegionMetrics,
  computeSafeMargin,
  type NormalizedRect,
  type PaletteResult,
  type RegionMetrics,
  type SafeMarginResult,
} from "../analysis/metrics";

type AnalyzeState = { dataUrl?: string };

type ViewMode = "crop" | "full";
type Handle = "nw" | "ne" | "sw" | "se";
type DragMode = "idle" | "new" | "move" | "resize";

type Suggestion = { title: string; why: string; try: string; target?: string };

type ReportData = {
  createdAt: string;
  dataUrl: string;
  imageSize: { w: number; h: number };
  viewMode: ViewMode;
  region: NormalizedRect;
  mappedRegion: NormalizedRect;
  regionMetrics: RegionMetrics;
  safeMargin: SafeMarginResult;
  palette: PaletteResult;
  suggestions: Suggestion[];
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function clamp01(v: number) {
  return clamp(v, 0, 1);
}
function clampRect(r: NormalizedRect, minSize = 0.02): NormalizedRect {
  let x = clamp01(r.x);
  let y = clamp01(r.y);
  let w = Math.max(minSize, Math.min(1, r.w));
  let h = Math.max(minSize, Math.min(1, r.h));
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
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** Center-crop rect from src into dst aspect ratio (object-fit: cover). */
function coverCrop(srcW: number, srcH: number, dstW: number, dstH: number) {
  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;

  let sw = srcW,
    sh = srcH,
    sx = 0,
    sy = 0;

  if (srcAR > dstAR) {
    sw = Math.round(srcH * dstAR);
    sx = Math.round((srcW - sw) / 2);
  } else {
    sh = Math.round(srcW / dstAR);
    sy = Math.round((srcH - sh) / 2);
  }
  return { sx, sy, sw, sh };
}

/** Cover crop with user-adjusted crop position (0..1) + zoom (>=1). */
function coverCropWithPosZoom(srcW: number, srcH: number, dstW: number, dstH: number, posX01: number, posY01: number, zoom: number) {
  const base = coverCrop(srcW, srcH, dstW, dstH);
  const sw = Math.max(1, base.sw / zoom);
  const sh = Math.max(1, base.sh / zoom);

  const maxX = Math.max(0, srcW - sw);
  const maxY = Math.max(0, srcH - sh);

  const sx = Math.round(maxX * clamp01(posX01));
  const sy = Math.round(maxY * clamp01(posY01));

  return { sx, sy, sw: Math.round(sw), sh: Math.round(sh) };
}

/** Contain rect (object-fit: contain) */
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
  for (const [h, cx, cy] of corners) {
    const dx = nx - cx;
    const dy = ny - cy;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) return h;
  }
  return null;
}

/** Build thumbs that match the current CROP position. */
async function makeThumbs(dataUrl: string, sizes: number[], cropPos: { x: number; y: number }, zoom: number) {
  const img = await loadImage(dataUrl);
  const thumbs: Record<string, string> = {};

  for (const s of sizes) {
    const canvas = document.createElement("canvas");
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    const { sx, sy, sw, sh } = coverCropWithPosZoom(img.naturalWidth, img.naturalHeight, 1, 1, cropPos.x, cropPos.y, zoom);
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
  return { imageData: ctx.getImageData(0, 0, w, h), natural: { w: w0, h: h0 } };
}

/** Map region from CROP VIEW square (0..1) into real image normalized (0..1), accounting for cropPos+zoom. */
function mapCropRegionToImageRectWithCrop(imageData: ImageData, regionInCrop01: NormalizedRect, cropPos: { x: number; y: number }, zoom: number): NormalizedRect {
  const srcW = imageData.width;
  const srcH = imageData.height;

  const { sx, sy, sw, sh } = coverCropWithPosZoom(srcW, srcH, 1, 1, cropPos.x, cropPos.y, zoom);

  const x = (sx + regionInCrop01.x * sw) / srcW;
  const y = (sy + regionInCrop01.y * sh) / srcH;
  const w = (regionInCrop01.w * sw) / srcW;
  const h = (regionInCrop01.h * sh) / srcH;

  return clampRect({ x, y, w, h }, 0.0005);
}

function buildSuggestions(region: NormalizedRect, rm: RegionMetrics, safe: SafeMarginResult, palette: PaletteResult): Suggestion[] {
  const out: Suggestion[] = [];
  const area = region.w * region.h;

  if (!safe.pass) {
    out.push({
      title: "Move text inward (crop risk)",
      why: `${safe.outsidePct.toFixed(0)}% of your region is outside the safe area.`,
      try: "Shift title/artist toward the center. Keep critical text inside the dashed safe box.",
      target: "Safe score ≥ 95%",
    });
  } else {
    out.push({
      title: "Placement is safe",
      why: "Your selected region stays inside the safe area.",
      try: "Keep small type/logos inside this box too (rounded corners + UI overlays can clip edges).",
    });
  }

  if (area < 0.04) {
    out.push({
      title: "Region is very small for tiny thumbnails",
      why: "Small type disappears quickly at 64–128px.",
      try: "Increase size/weight or reserve more space for the title area.",
      target: "Title area typically ≥ ~20% width",
    });
  }

  if (rm.contrastRatio < 3) {
    out.push({
      title: "Contrast is very low",
      why: `Estimated contrast ≈ ${rm.contrastRatio.toFixed(2)}.`,
      try: `Use “Best text” (${palette.text.primary}) + add a 20–40% overlay behind text. Add 1–2px stroke if needed.`,
      target: "Contrast ≥ 4.5 (best), ≥ 3.0 (large text)",
    });
  } else if (rm.contrastRatio < 4.5) {
    out.push({
      title: "Contrast is borderline",
      why: `Estimated contrast ≈ ${rm.contrastRatio.toFixed(2)}.`,
      try: "Try a subtle gradient overlay behind the title, or increase font weight one step.",
      target: "Contrast ≥ 4.5",
    });
  } else {
    out.push({
      title: "Contrast is strong",
      why: `Estimated contrast ≈ ${rm.contrastRatio.toFixed(2)}.`,
      try: "Sanity-check at 128px.",
    });
  }

  if (rm.clutterScore < 40) {
    out.push({
      title: "Background is busy behind text",
      why: "High edge density means letters fight with texture/detail.",
      try: "Move text to a calmer area, blur/simplify behind it, or add a panel shape behind the title.",
      target: "Clutter ≥ 60/100",
    });
  } else if (rm.clutterScore < 60) {
    out.push({
      title: "Some clutter behind text",
      why: "May read at 256px but fail at 64px.",
      try: "Add a soft overlay or move text to a quieter zone.",
      target: "Clutter ≥ 60/100",
    });
  } else {
    out.push({
      title: "Clutter looks manageable",
      why: "The region is relatively clean.",
      try: "Still check at 64px for tiny-detail noise.",
    });
  }

  out.push({
    title: "Use compatible accents",
    why: `These are generated from your region-average color (${palette.regionAvg}).`,
    try: `Try complement ${palette.compatible.complement}, or analogous ${palette.compatible.analogous.join(", ")} for highlights.`,
    target: "Accents should stay readable vs background",
  });

  return out.slice(0, 10);
}

export default function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as AnalyzeState;

  // No persistence: leaving/reloading clears.
  const [dataUrl, setDataUrl] = useState<string | null>(() => state.dataUrl ?? null);

  const [viewMode, setViewMode] = useState<ViewMode>("crop");
  const [region, setRegion] = useState<NormalizedRect | null>(null);

  // Crop controls (only used in crop view)
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 }); // 0..1
  const [zoom, setZoom] = useState<number>(1); // >=1
  const [panCrop, setPanCrop] = useState<boolean>(false);

  const regionRef = useRef<NormalizedRect | null>(region);
  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSafe, setShowSafe] = useState(true);
  const [showThumbs, setShowThumbs] = useState(false);

  const [regionMetrics, setRegionMetrics] = useState<RegionMetrics | null>(null);
  const [safeMargin, setSafeMargin] = useState<SafeMarginResult | null>(null);
  const [palette, setPalette] = useState<PaletteResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const analysisRef = useRef<ImageData | null>(null);
  const reportRef = useRef<ReportData | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const dragRef = useRef<{
    mode: DragMode;
    handle: Handle | null;
    startNx: number;
    startNy: number;
    baseRect: NormalizedRect | null;
  }>({ mode: "idle", handle: null, startNx: 0, startNy: 0, baseRect: null });

  const panRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    basePos: { x: number; y: number };
  }>({ active: false, startX: 0, startY: 0, basePos: { x: 0.5, y: 0.5 } });

  const safeInset = 0.08;

  const hasRegion = Boolean(region);
  const hasAnalysis = Boolean(region && regionMetrics && safeMargin && palette);
  const reportReady = Boolean(reportRef.current && hasAnalysis);

  const imgStyle = useMemo(() => {
    if (viewMode !== "crop") return undefined;
    return {
      objectPosition: `${cropPos.x * 100}% ${cropPos.y * 100}%`,
      transform: `scale(${zoom})`,
      transformOrigin: "center",
    } as const;
  }, [viewMode, cropPos, zoom]);

  // Load image and analysis buffers
  useEffect(() => {
    if (!dataUrl) return;

    let alive = true;
    (async () => {
      setBusy(true);
      setError(null);
      setRegionMetrics(null);
      setSafeMargin(null);
      setPalette(null);
      setSuggestions([]);
      reportRef.current = null;

      try {
        const analysis = await buildAnalysisImageData(dataUrl, 1024);
        if (!alive) return;

        analysisRef.current = analysis.imageData;
        setImgSize({ w: analysis.natural.w, h: analysis.natural.h });

        // thumbs depend on crop controls
        const res = await makeThumbs(dataUrl, [256, 128, 64], cropPos, zoom);
        if (!alive) return;
        setThumbs(res.thumbs);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to process image");
      } finally {
        if (alive) setBusy(false);
        requestAnimationFrame(() => redraw());
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl]);

  // Rebuild thumbs + recompute analysis when crop changes
  useEffect(() => {
    if (!dataUrl) return;
    (async () => {
      try {
        const res = await makeThumbs(dataUrl, [256, 128, 64], cropPos, zoom);
        setThumbs(res.thumbs);
      } catch {
        /* ignore */
      }
    })();

    if (regionRef.current) computeAllNow(regionRef.current);
    requestAnimationFrame(() => redraw());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropPos.x, cropPos.y, zoom]);

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

    // border of image area
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
      ctx.strokeStyle = fail ? "rgba(255,120,120,0.55)" : "rgba(245,245,245,0.12)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
      ctx.setLineDash([]);
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

    const dot = (hx: number, hy: number) => {
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.strokeStyle = "rgba(255,196,0,0.95)";
      ctx.lineWidth = 2;
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    dot(x, y);
    dot(x + w, y);
    dot(x, y + h);
    dot(x + w, y + h);

    ctx.restore();
  }, [imgSize, showSafe, safeMargin, viewMode]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw, region, showSafe, viewMode]);

  function pointerToNormalized(clientX: number, clientY: number) {
    const host = hostRef.current;
    if (!host) return null;

    const r = host.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;

    if (viewMode === "crop") {
      const nx = clamp01(px / r.width);
      const ny = clamp01(py / r.height);
      return { nx, ny, inside: true, px, py, w: r.width, h: r.height };
    }

    if (!imgSize) return null;

    const contain = computeContainRect(imgSize.w, imgSize.h, r.width, r.height);
    const cx = px - contain.x;
    const cy = py - contain.y;

    const inside = cx >= 0 && cy >= 0 && cx <= contain.w && cy <= contain.h;
    const nx = clamp01(cx / contain.w);
    const ny = clamp01(cy / contain.h);
    return { nx, ny, inside, px, py, w: r.width, h: r.height };
  }

  function setRegionBoth(next: NormalizedRect | null) {
    regionRef.current = next;
    setRegion(next);
  }

  function computeAllNow(nextRegion: NormalizedRect | null) {
    const imageData = analysisRef.current;
    if (!imageData || !nextRegion || !imgSize || !dataUrl) {
      setRegionMetrics(null);
      setSafeMargin(null);
      setPalette(null);
      setSuggestions([]);
      reportRef.current = null;
      return;
    }

    const mapped =
      viewMode === "crop"
        ? mapCropRegionToImageRectWithCrop(imageData, nextRegion, cropPos, zoom)
        : nextRegion;

    const rm = computeRegionMetrics(imageData, mapped);
    const sm = computeSafeMargin(nextRegion, safeInset);
    const pal = computePalette(imageData, mapped);
    const sug = buildSuggestions(nextRegion, rm, sm, pal);

    setRegionMetrics(rm);
    setSafeMargin(sm);
    setPalette(pal);
    setSuggestions(sug);

    reportRef.current = {
      createdAt: new Date().toISOString(),
      dataUrl,
      imageSize: imgSize,
      viewMode,
      region: nextRegion,
      mappedRegion: mapped,
      regionMetrics: rm,
      safeMargin: sm,
      palette: pal,
      suggestions: sug,
    };
  }

  function endDragAndScore() {
    dragRef.current = { mode: "idle", handle: null, startNx: 0, startNy: 0, baseRect: null };
    requestAnimationFrame(() => redraw());
    computeAllNow(regionRef.current);
  }

  function onPointerDown(e: any) {
    const p = pointerToNormalized(e.clientX, e.clientY);
    if (!p || !p.inside) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    // PAN MODE (only crop view)
    if (viewMode === "crop" && panCrop) {
      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        basePos: { ...cropPos },
      };
      return;
    }

    // REGION MODE
    const current = regionRef.current;
    if (current) {
      const hit = handleHitTest(current, p.nx, p.ny);
      if (hit) {
        dragRef.current = { mode: "resize", handle: hit, startNx: p.nx, startNy: p.ny, baseRect: current };
        return;
      }
      if (rectContains(current, p.nx, p.ny)) {
        dragRef.current = { mode: "move", handle: null, startNx: p.nx, startNy: p.ny, baseRect: current };
        return;
      }
    }

    dragRef.current = { mode: "new", handle: null, startNx: p.nx, startNy: p.ny, baseRect: null };
    setRegionBoth({ x: p.nx, y: p.ny, w: 0.02, h: 0.02 });
  }

  function onPointerMove(e: any) {
    // PAN
    if (panRef.current.active && viewMode === "crop" && analysisRef.current) {
      const host = hostRef.current;
      if (!host) return;

      const r = host.getBoundingClientRect();
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;

      const srcW = analysisRef.current.width;
      const srcH = analysisRef.current.height;

      const { sw, sh } = coverCropWithPosZoom(srcW, srcH, 1, 1, panRef.current.basePos.x, panRef.current.basePos.y, zoom);

      const maxX = Math.max(1, srcW - sw);
      const maxY = Math.max(1, srcH - sh);

      const deltaPosX = -(dx * (sw / r.width)) / maxX;
      const deltaPosY = -(dy * (sh / r.height)) / maxY;

      setCropPos({
        x: clamp01(panRef.current.basePos.x + deltaPosX),
        y: clamp01(panRef.current.basePos.y + deltaPosY),
      });

      return;
    }

    // REGION DRAG
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
      requestAnimationFrame(() => redraw());
      return;
    }

    if (dr.mode === "move" && dr.baseRect) {
      const dx = p.nx - dr.startNx;
      const dy = p.ny - dr.startNy;
      setRegionBoth(clampRect({ x: dr.baseRect.x + dx, y: dr.baseRect.y + dy, w: dr.baseRect.w, h: dr.baseRect.h }, 0.02));
      requestAnimationFrame(() => redraw());
      return;
    }

    if (dr.mode === "resize" && dr.baseRect && dr.handle) {
      const base = dr.baseRect;
      const minSize = 0.02;

      let x1 = base.x;
      let y1 = base.y;
      let x2 = base.x + base.w;
      let y2 = base.y + base.h;

      if (dr.handle === "nw") { x1 = p.nx; y1 = p.ny; }
      else if (dr.handle === "ne") { x2 = p.nx; y1 = p.ny; }
      else if (dr.handle === "sw") { x1 = p.nx; y2 = p.ny; }
      else { x2 = p.nx; y2 = p.ny; }

      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.max(minSize, Math.abs(x2 - x1));
      const h = Math.max(minSize, Math.abs(y2 - y1));

      setRegionBoth(clampRect({ x, y, w, h }, minSize));
      requestAnimationFrame(() => redraw());
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
      const url = await fileToDataUrl(file);
      setDataUrl(url);

      // reset
      setViewMode("crop");
      setCropPos({ x: 0.5, y: 0.5 });
      setZoom(1);
      setPanCrop(false);

      setRegionBoth(null);
      setRegionMetrics(null);
      setSafeMargin(null);
      setPalette(null);
      setSuggestions([]);
      setThumbs({});
      reportRef.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="analyzeWrap">
      <div className="analyzeHeader2">
        <button className="ghostBtn" onClick={() => navigate("/play")}>← BACK</button>

        <div className="analyzeTitle">
          <div className="h1">ANALYZE</div>
          <div className="h2">Draw a box on the cover to analyze readability. Use PAN CROP to reposition the square crop.</div>
        </div>

        <div />
      </div>

      {!dataUrl && (
        <div className="emptyState">
          <div className="emptyTitle">No cover uploaded yet.</div>
          <div className="emptySub">Go to PLAY and click the empty slot, or upload here.</div>
          <button className="primaryBtn" onClick={() => fileRef.current?.click()}>UPLOAD COVER</button>

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
      )}

      {dataUrl && (
        <div className="analyzeGrid2">
          {/* LEFT: image + toolbar */}
          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Cover + Region</div>
              <div className="panelNote">
                {viewMode === "crop" ? "CROP VIEW = square streaming crop. Use PAN CROP to pick the best area." : "FULL VIEW = full image (contain)."}
              </div>
            </div>

            <div
              ref={hostRef}
              className={`mediaStage ${viewMode === "crop" ? "crop" : "full"} ${panCrop ? "isPanning" : ""}`}
              style={viewMode === "full" && imgSize ? { aspectRatio: `${imgSize.w} / ${imgSize.h}` } : undefined}
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

            {/* Toolbar BELOW image */}
            <div className="imageToolbar">
              <div className="toolbarRow">
                <button className="ghostBtn" onClick={() => fileRef.current?.click()} disabled={busy}>UPLOAD NEW</button>

                <button
                  className="ghostBtn"
                  onClick={() => {
                    setRegionBoth(null);
                    setRegionMetrics(null);
                    setSafeMargin(null);
                    setPalette(null);
                    setSuggestions([]);
                    reportRef.current = null;
                    requestAnimationFrame(() => redraw());
                  }}
                  disabled={!hasRegion}
                >
                  CLEAR REGION
                </button>

                <button
                  className="primaryBtn"
                  disabled={!reportReady}
                  onClick={() => {
                    const report = reportRef.current;
                    if (!report) return;
                    navigate("/report", { state: { report } });
                  }}
                >
                  GENERATE REPORT
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

              <div className="toolbarRow">
                <button
                  className={`pillBtn ${viewMode === "crop" ? "on" : ""}`}
                  onClick={() => {
                    setViewMode("crop");
                    setRegionBoth(null);
                    setRegionMetrics(null);
                    setSafeMargin(null);
                    setPalette(null);
                    setSuggestions([]);
                    reportRef.current = null;
                    requestAnimationFrame(() => redraw());
                  }}
                >
                  CROP VIEW
                </button>

                <button
                  className={`pillBtn ${viewMode === "full" ? "on" : ""}`}
                  onClick={() => {
                    setViewMode("full");
                    setPanCrop(false);
                    setRegionBoth(null);
                    setRegionMetrics(null);
                    setSafeMargin(null);
                    setPalette(null);
                    setSuggestions([]);
                    reportRef.current = null;
                    requestAnimationFrame(() => redraw());
                  }}
                >
                  FULL VIEW
                </button>

                <button className={`pillBtn ${showSafe ? "on" : ""}`} onClick={() => setShowSafe((v) => !v)}>
                  SAFE AREA
                </button>

                <button className={`pillBtn ${showThumbs ? "on" : ""}`} onClick={() => setShowThumbs((v) => !v)}>
                  THUMBS
                </button>

                <button
                  className={`pillBtn ${panCrop ? "on" : ""}`}
                  onClick={() => setPanCrop((v) => !v)}
                  title="Toggle drag-to-pan crop (disables region drawing while on)"
                >
                  PAN CROP
                </button>

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
                    disabled={viewMode !== "crop"}
                  />
                  <button
                    className="ghostBtn"
                    onClick={() => {
                      setCropPos({ x: 0.5, y: 0.5 });
                      setZoom(1);
                    }}
                    disabled={viewMode !== "crop"}
                  >
                    RESET CROP
                  </button>
                </div>
              </div>

              <div className="metaRow">
                {imgSize && <span className="tag">{imgSize.w}×{imgSize.h}</span>}
                <span className="tag">view: {viewMode.toUpperCase()}</span>
                {region ? (
                  <span className="tag">region: {Math.round(region.w * 100)}% × {Math.round(region.h * 100)}%</span>
                ) : (
                  <span className="tag">region: none</span>
                )}
                {safeMargin && (
                  <span className={`statusTag ${safeMargin.pass ? "pass" : "fail"}`}>
                    SAFE {safeMargin.pass ? "PASS" : "FAIL"} • {safeMargin.score.toFixed(0)}/100
                  </span>
                )}
              </div>

              {error && <div className="errorLine">{error}</div>}
            </div>
          </div>

          {/* RIGHT: analysis */}
          <div className="sideStack">
            <div className="panelDark">
              <div className="panelTop">
                <div className="panelTitle">Analysis</div>
                <div className="panelNote">Draw a region to compute metrics + palette.</div>
              </div>

              <div className="panelBody">
                {!hasRegion && <div className="miniHint">Tip: turn PAN CROP off to draw/move/resize a region.</div>}

                {hasAnalysis && regionMetrics && safeMargin && palette && (
                  <div className="analysisSections">
                    <div className="sectionBlock">
                      <div className="sectionHead">Readability</div>
                      <div className="metricsGrid">
                        <div className="metricCard">
                          <div className="metricLabel">Contrast</div>
                          <div className="metricValue">{regionMetrics.contrastRatio.toFixed(2)}</div>
                          <div className="metricSub">{scoreLabel(regionMetrics.contrastScore)} • target ≥ 4.5</div>
                        </div>
                        <div className="metricCard">
                          <div className="metricLabel">Clutter</div>
                          <div className="metricValue">{Math.round(regionMetrics.clutterScore)}</div>
                          <div className="metricSub">{scoreLabel(regionMetrics.clutterScore)} • target ≥ 60/100</div>
                        </div>
                      </div>
                      <div className="detailLine">
                        Contrast uses luminance spread inside the region. Clutter uses edge density (texture/busyness).
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
                          <div className="miniLabel">Meaning</div>
                          <div className="miniSub">Failing = too close to edges (likely clipped by UI / rounded corners).</div>
                        </div>
                      </div>
                    </div>

                    <div className="sectionBlock">
                      <div className="sectionHead">Color</div>

                      <div className="chipRow">
                        <div className="chipMeta">
                          <div className="miniLabel">Region avg</div>
                          <div className="chip" style={{ background: palette.regionAvg }} title={palette.regionAvg} />
                          <div className="miniSub">{palette.regionAvg}</div>
                        </div>

                        <div className="chipMeta">
                          <div className="miniLabel">Best text</div>
                          <div className="chip" style={{ background: palette.text.primary }} title={palette.text.primary} />
                          <div className="miniSub">
                            {palette.text.primary} • {palette.text.primaryRatio.toFixed(2)}×
                          </div>
                        </div>

                        <div className="chipMeta">
                          <div className="miniLabel">Alt text</div>
                          <div className="chip" style={{ background: palette.text.secondary }} title={palette.text.secondary} />
                          <div className="miniSub">
                            {palette.text.secondary} • {palette.text.secondaryRatio.toFixed(2)}×
                          </div>
                        </div>

                        <div className="chipMeta">
                          <div className="miniLabel">Accent</div>
                          <div className="chip" style={{ background: palette.text.accent }} title={palette.text.accent} />
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
                              <span key={c} className="chip small" style={{ background: c }} title={c} />
                            ))}
                          </div>
                        </div>

                        <div className="paletteLine">
                          <span className="miniLabel">Image palette</span>
                          <div className="paletteStrip">
                            {palette.image.map((c) => (
                              <span key={c} className="chip small" style={{ background: c }} title={c} />
                            ))}
                          </div>
                        </div>

                        <div className="paletteLine">
                          <span className="miniLabel">Complement</span>
                          <div className="paletteStrip">
                            <span className="chip small" style={{ background: palette.compatible.complement }} title={palette.compatible.complement} />
                          </div>
                        </div>

                        <div className="paletteLine">
                          <span className="miniLabel">Analogous</span>
                          <div className="paletteStrip">
                            {palette.compatible.analogous.map((c) => (
                              <span key={c} className="chip small" style={{ background: c }} title={c} />
                            ))}
                          </div>
                        </div>

                        <div className="paletteLine">
                          <span className="miniLabel">Triadic</span>
                          <div className="paletteStrip">
                            {palette.compatible.triadic.map((c) => (
                              <span key={c} className="chip small" style={{ background: c }} title={c} />
                            ))}
                          </div>
                        </div>

                        <div className="paletteLine">
                          <span className="miniLabel">Tints / Shades</span>
                          <div className="paletteStrip">
                            {palette.compatible.tints.map((c) => (
                              <span key={c} className="chip small" style={{ background: c }} title={c} />
                            ))}
                            {palette.compatible.shades.map((c) => (
                              <span key={c} className="chip small" style={{ background: c }} title={c} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="detailLine">
                        Compatible colors are generated from your region-average hue (complement/analogous/triadic).
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="panelDark">
              <div className="panelTop">
                <div className="panelTitle">Suggestions</div>
                <div className="panelNote">Why + what to do + target.</div>
              </div>

              <div className="panelBody">
                {!hasAnalysis ? (
                  <div className="miniHint">Select a region to generate detailed suggestions.</div>
                ) : (
                  <div className="suggestList">
                    {suggestions.map((s, i) => (
                      <div key={i} className="suggestItem">
                        <div className="suggestTitle">{s.title}</div>
                        <div className="suggestDetail">
                          <div className="sLine"><b>Why:</b> {s.why}</div>
                          <div className="sLine"><b>Try:</b> {s.try}</div>
                          {s.target && <div className="sLine"><b>Target:</b> {s.target}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showThumbs && (
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Tiny previews</div>
                  <div className="panelNote">Matches your current crop.</div>
                </div>

                <div className="thumbRowWrap">
                  {(["256", "128", "64"] as const).map((k) => (
                    <div className="thumbMini" key={k}>
                      <div className="thumbMiniLabel">{k}px</div>
                      <div className="thumbMiniBody">
                        {thumbs[k] ? <img src={thumbs[k]} alt={`${k}px`} /> : <div className="thumbEmptyDark">—</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
