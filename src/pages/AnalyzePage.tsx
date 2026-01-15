// =========================================================
// FILE: src/pages/AnalyzePage.tsx  (REPLACE ENTIRE FILE)
// Adds: mouse-wheel zoom at cursor (Crop View), + MOVE CROP drag pan
// =========================================================
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToDataUrl, readLocal, writeLocal } from "../lib/storage";
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

const LS_KEY = "covercheck.analyze.v6";
const REPORT_KEY = "covercheck.report.v1";

type ViewMode = "crop" | "full";
type Handle = "nw" | "ne" | "sw" | "se";
type DragMode = "idle" | "new" | "move" | "resize";

type Suggestion = { title: string; why: string; try: string; target?: string };
type CropState = { cx: number; cy: number; zoom: number };

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
  crop: CropState;
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

async function makeThumbs(objectUrl: string, sizes: number[]) {
  const img = await loadImage(objectUrl);
  const thumbs: Record<string, string> = {};

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const side = Math.min(W, H);
  const sx0 = Math.round((W - side) / 2);
  const sy0 = Math.round((H - side) / 2);

  for (const s of sizes) {
    const canvas = document.createElement("canvas");
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.drawImage(img, sx0, sy0, side, side, 0, 0, s, s);
    thumbs[String(s)] = canvas.toDataURL("image/png");
  }

  return { thumbs, w: W, h: H };
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
  return { imageData: ctx.getImageData(0, 0, w, h) };
}

function clampCropToImage(imgW: number, imgH: number, crop: CropState): CropState {
  const zoom = clamp(crop.zoom, 1, 4);
  const side = Math.min(imgW, imgH) / zoom;
  const half = side / 2;

  let cxPix = crop.cx * imgW;
  let cyPix = crop.cy * imgH;

  cxPix = clamp(cxPix, half, imgW - half);
  cyPix = clamp(cyPix, half, imgH - half);

  return { cx: cxPix / imgW, cy: cyPix / imgH, zoom };
}

function mapCropRegionToImageRect(imageData: ImageData, regionInCrop01: NormalizedRect, crop: CropState): NormalizedRect {
  const W = imageData.width;
  const H = imageData.height;

  const safeCrop = clampCropToImage(W, H, crop);

  const baseSide = Math.min(W, H);
  const side = baseSide / safeCrop.zoom;

  const cx = safeCrop.cx * W;
  const cy = safeCrop.cy * H;

  const x0 = cx - side / 2;
  const y0 = cy - side / 2;

  const x1 = (x0 + regionInCrop01.x * side) / W;
  const y1 = (y0 + regionInCrop01.y * side) / H;
  const x2 = (x0 + (regionInCrop01.x + regionInCrop01.w) * side) / W;
  const y2 = (y0 + (regionInCrop01.y + regionInCrop01.h) * side) / H;

  return clampRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, 0.0005);
}

function buildSuggestions(region: NormalizedRect, rm: RegionMetrics, safe: SafeMarginResult, palette: PaletteResult): Suggestion[] {
  const out: Suggestion[] = [];
  const area = region.w * region.h;

  if (!safe.pass) {
    out.push({
      title: "Move text inward (crop risk)",
      why: `${safe.outsidePct.toFixed(0)}% of your region is outside the safe area.`,
      try: "Move title/artist toward the center. Keep critical text inside the dashed safe box.",
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
      try: "Add a subtle gradient overlay behind the title, or increase font weight one step.",
      target: "Contrast ≥ 4.5",
    });
  } else {
    out.push({
      title: "Contrast is strong",
      why: `Estimated contrast ≈ ${rm.contrastRatio.toFixed(2)}.`,
      try: "Next: crop safety + clutter (busy backgrounds still kill readability).",
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
      try: "Sanity-check your type at 128px.",
    });
  }

  out.push({
    title: "Use recommended text color",
    why: `Best text chip maximizes contrast vs region average (${palette.regionAvg}).`,
    try: `Try ${palette.text.primary} for main text. Accent: ${palette.text.accent}.`,
    target: "Contrast ≥ 4.5",
  });

  return out.slice(0, 10);
}

export default function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as AnalyzeState;

  const [dataUrl, setDataUrl] = React.useState<string | null>(() => {
    const saved = readLocal<{ dataUrl: string | null }>(LS_KEY, { dataUrl: null });
    return state.dataUrl ?? saved.dataUrl ?? null;
  });

  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const saved = readLocal<{ viewMode?: ViewMode }>(LS_KEY, { viewMode: "crop" });
    return saved.viewMode ?? "crop";
  });

  const [crop, setCrop] = React.useState<CropState>(() => {
    const saved = readLocal<{ crop?: CropState }>(LS_KEY, { crop: { cx: 0.5, cy: 0.5, zoom: 1 } });
    return saved.crop ?? { cx: 0.5, cy: 0.5, zoom: 1 };
  });

  const [moveCrop, setMoveCrop] = React.useState(false);

  const [region, setRegion] = React.useState<NormalizedRect | null>(() => {
    const saved = readLocal<{ region: NormalizedRect | null }>(LS_KEY, { region: null });
    return saved.region ?? null;
  });

  const regionRef = React.useRef<NormalizedRect | null>(region);
  React.useEffect(() => {
    regionRef.current = region;
  }, [region]);

  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [showSafe, setShowSafe] = React.useState(true);
  const [showThumbs, setShowThumbs] = React.useState(false);

  const [regionMetrics, setRegionMetrics] = React.useState<RegionMetrics | null>(null);
  const [safeMargin, setSafeMargin] = React.useState<SafeMarginResult | null>(null);
  const [palette, setPalette] = React.useState<PaletteResult | null>(null);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);

  const analysisRef = React.useRef<ImageData | null>(null);

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const dragRef = React.useRef<{
    mode: DragMode;
    handle: Handle | null;
    startNx: number;
    startNy: number;
    baseRect: NormalizedRect | null;
  }>({ mode: "idle", handle: null, startNx: 0, startNy: 0, baseRect: null });

  const panRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startCrop: CropState;
    hostSize: number;
  }>({ active: false, startX: 0, startY: 0, startCrop: { cx: 0.5, cy: 0.5, zoom: 1 }, hostSize: 1 });

  React.useEffect(() => {
    writeLocal(LS_KEY, { dataUrl, region, viewMode, crop });
  }, [dataUrl, region, viewMode, crop]);

  React.useEffect(() => {
    if (!dataUrl) return;

    let alive = true;
    (async () => {
      setBusy(true);
      setError(null);
      setRegionMetrics(null);
      setSafeMargin(null);
      setPalette(null);
      setSuggestions([]);

      try {
        const res = await makeThumbs(dataUrl, [256, 128, 64]);
        if (!alive) return;
        setThumbs(res.thumbs);
        setImgSize({ w: res.w, h: res.h });

        const analysis = await buildAnalysisImageData(dataUrl, 1024);
        if (!alive) return;
        analysisRef.current = analysis.imageData;

        setCrop((c) => clampCropToImage(res.w, res.h, c));
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

  const safeInset = 0.08;

  const redraw = React.useCallback(() => {
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

  React.useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  React.useEffect(() => {
    redraw();
  }, [redraw, region, showSafe, viewMode, crop]);

  function pointerToNormalized(clientX: number, clientY: number) {
    const host = hostRef.current;
    if (!host) return null;

    const r = host.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;

    if (viewMode === "crop") {
      const nx = clamp01(px / r.width);
      const ny = clamp01(py / r.height);
      return { nx, ny, inside: true, px, py, size: r.width };
    }

    if (!imgSize) return null;

    const contain = computeContainRect(imgSize.w, imgSize.h, r.width, r.height);
    const cx = px - contain.x;
    const cy = py - contain.y;

    const inside = cx >= 0 && cy >= 0 && cx <= contain.w && cy <= contain.h;
    const nx = clamp01(cx / contain.w);
    const ny = clamp01(cy / contain.h);
    return { nx, ny, inside, px, py, size: contain.w };
  }

  function setRegionBoth(next: NormalizedRect | null) {
    regionRef.current = next;
    setRegion(next);
  }

  function computeAllNow(nextRegion: NormalizedRect | null) {
    if (!analysisRef.current || !nextRegion || !imgSize || !dataUrl) {
      setRegionMetrics(null);
      setSafeMargin(null);
      setPalette(null);
      setSuggestions([]);
      return;
    }

    const mapped =
      viewMode === "crop"
        ? mapCropRegionToImageRect(analysisRef.current, nextRegion, crop)
        : nextRegion;

    const rm = computeRegionMetrics(analysisRef.current, mapped);
    const sm = computeSafeMargin(nextRegion, safeInset);
    const pal = computePalette(analysisRef.current, mapped);
    const sug = buildSuggestions(nextRegion, rm, sm, pal);

    setRegionMetrics(rm);
    setSafeMargin(sm);
    setPalette(pal);
    setSuggestions(sug);

    const report: ReportData = {
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
      crop,
    };
    writeLocal(REPORT_KEY, report);
  }

  React.useEffect(() => {
    if (!regionRef.current) return;
    computeAllNow(regionRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop.cx, crop.cy, crop.zoom, viewMode]);

  function endDragAndScore() {
    dragRef.current = { mode: "idle", handle: null, startNx: 0, startNy: 0, baseRect: null };
    panRef.current.active = false;
    requestAnimationFrame(() => redraw());
    computeAllNow(regionRef.current);
  }

  function onPointerDown(e: React.PointerEvent) {
    const host = hostRef.current;
    if (!host) return;

    const p = pointerToNormalized(e.clientX, e.clientY);
    if (!p || !p.inside) return;

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (viewMode === "crop" && moveCrop && imgSize) {
      const r = host.getBoundingClientRect();
      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: crop,
        hostSize: Math.max(1, r.width),
      };
      return;
    }

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

  function onPointerMove(e: React.PointerEvent) {
    const host = hostRef.current;
    if (!host) return;

    if (viewMode === "crop" && moveCrop && imgSize && panRef.current.active) {
      e.preventDefault();

      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;

      const W = imgSize.w;
      const H = imgSize.h;
      const baseSide = Math.min(W, H);
      const side = baseSide / panRef.current.startCrop.zoom;

      const pxToImg = side / panRef.current.hostSize;

      const cxPix = panRef.current.startCrop.cx * W + (-dx) * pxToImg;
      const cyPix = panRef.current.startCrop.cy * H + (-dy) * pxToImg;

      const next = clampCropToImage(W, H, {
        cx: cxPix / W,
        cy: cyPix / H,
        zoom: panRef.current.startCrop.zoom,
      });

      setCrop(next);
      requestAnimationFrame(() => redraw());
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

  function onPointerUp() { endDragAndScore(); }
  function onPointerCancel() { endDragAndScore(); }

  function onWheel(e: React.WheelEvent) {
    if (viewMode !== "crop" || !imgSize) return;

    e.preventDefault();

    const host = hostRef.current;
    if (!host) return;

    const r = host.getBoundingClientRect();
    const hostSize = Math.max(1, r.width);
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;

    const u = clamp01(px / hostSize);
    const v = clamp01(py / hostSize);

    const W = imgSize.w;
    const H = imgSize.h;

    const safeCrop = clampCropToImage(W, H, crop);
    const baseSide = Math.min(W, H);

    // Cursor image point under current crop
    const side = baseSide / safeCrop.zoom;
    const cx = safeCrop.cx * W;
    const cy = safeCrop.cy * H;
    const x0 = cx - side / 2;
    const y0 = cy - side / 2;

    const ix = x0 + u * side;
    const iy = y0 + v * side;

    // Exponential zoom feels good for trackpad + mouse
    const zoom2 = clamp(safeCrop.zoom * Math.exp(-e.deltaY * 0.0015), 1, 4);
    const side2 = baseSide / zoom2;

    // Keep ix/iy at the same cursor u/v after zoom
    const x0b = ix - u * side2;
    const y0b = iy - v * side2;

    const cx2 = (x0b + side2 / 2) / W;
    const cy2 = (y0b + side2 / 2) / H;

    setCrop(clampCropToImage(W, H, { cx: cx2, cy: cy2, zoom: zoom2 }));
  }

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const url = await fileToDataUrl(file);
      setDataUrl(url);
      setRegionBoth(null);
      setRegionMetrics(null);
      setSafeMargin(null);
      setPalette(null);
      setSuggestions([]);
      setThumbs({});
      setMoveCrop(false);
      setViewMode("crop");
      setCrop({ cx: 0.5, cy: 0.5, zoom: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const hasRegion = Boolean(region);
  const hasAnalysis = Boolean(region && regionMetrics && safeMargin && palette);

  function cropLayerStyle(): React.CSSProperties {
    if (!dataUrl || !imgSize) return {};
    const host = hostRef.current;
    const hostSize = host ? host.getBoundingClientRect().width : 600;

    const W = imgSize.w;
    const H = imgSize.h;
    const safeCrop = clampCropToImage(W, H, crop);

    const baseSide = Math.min(W, H);
    const scale = (hostSize * safeCrop.zoom) / baseSide;

    const scaledW = W * scale;
    const scaledH = H * scale;

    const cxPix = safeCrop.cx * W;
    const cyPix = safeCrop.cy * H;

    const posX = hostSize / 2 - cxPix * scale;
    const posY = hostSize / 2 - cyPix * scale;

    return {
      backgroundImage: `url(${dataUrl})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${scaledW}px ${scaledH}px`,
      backgroundPosition: `${posX}px ${posY}px`,
    };
  }

  return (
    <div className="analyzeWrap">
      <div className="analyzeHeader2">
        <button className="ghostBtn" onClick={() => navigate("/play")}>← BACK</button>

        <div className="analyzeTitle">
          <div className="h1">ANALYZE</div>
          <div className="h2">
            {viewMode === "crop" ? "Crop is editable: wheel to zoom, MOVE CROP to drag." : "Full view: draw region where text sits."}
          </div>
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
          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Cover + Region</div>
              <div className="panelNote">
                Draw a region for title/artist. In CROP VIEW: use wheel to zoom, toggle MOVE CROP to drag.
              </div>
            </div>

            <div
              ref={hostRef}
              className={`mediaStage ${viewMode === "crop" && moveCrop ? "isPanning" : ""}`}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
            >
              {viewMode === "crop" ? (
                <div className="cropLayer" style={cropLayerStyle()} aria-hidden="true" />
              ) : (
                <img
                  className="mediaImg"
                  src={dataUrl}
                  alt="Uploaded cover"
                  draggable={false}
                  style={{ objectFit: "contain" }}
                />
              )}
              <canvas ref={canvasRef} className="overlayCanvas" />
            </div>

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
                    requestAnimationFrame(() => redraw());
                  }}
                  disabled={!hasRegion}
                >
                  CLEAR REGION
                </button>
                <button className="primaryBtn" disabled={!hasAnalysis} onClick={() => navigate("/report")}>
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
                    setMoveCrop(false);
                    requestAnimationFrame(() => redraw());
                  }}
                >
                  CROP VIEW
                </button>
                <button
                  className={`pillBtn ${viewMode === "full" ? "on" : ""}`}
                  onClick={() => {
                    setViewMode("full");
                    setRegionBoth(null);
                    setMoveCrop(false);
                    requestAnimationFrame(() => redraw());
                  }}
                >
                  FULL VIEW
                </button>

                <button
                  className={`pillBtn ${moveCrop ? "on" : ""}`}
                  onClick={() => setMoveCrop((v) => !v)}
                  disabled={viewMode !== "crop"}
                  title="Drag to reposition crop"
                >
                  MOVE CROP
                </button>

                <button className={`pillBtn ${showSafe ? "on" : ""}`} onClick={() => setShowSafe((v) => !v)}>SAFE AREA</button>
                <button className={`pillBtn ${showThumbs ? "on" : ""}`} onClick={() => setShowThumbs((v) => !v)}>THUMBS</button>

                {viewMode === "crop" && (
                  <div className="zoomControl">
                    <span className="zoomLabel">ZOOM</span>
                    <input
                      className="range"
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={crop.zoom}
                      onChange={(e) => {
                        if (!imgSize) return;
                        setCrop(clampCropToImage(imgSize.w, imgSize.h, { ...crop, zoom: Number(e.target.value) }));
                      }}
                    />
                    <button
                      className="pillBtn"
                      onClick={() => {
                        if (!imgSize) return;
                        setCrop(clampCropToImage(imgSize.w, imgSize.h, { cx: 0.5, cy: 0.5, zoom: 1 }));
                      }}
                      title="Reset crop"
                    >
                      RESET
                    </button>
                  </div>
                )}
              </div>

              <div className="metaRow">
                {imgSize && <span className="tag">{imgSize.w}×{imgSize.h}</span>}
                <span className="tag">view: {viewMode.toUpperCase()}</span>
                {viewMode === "crop" && <span className="tag">crop: {crop.zoom.toFixed(2)}×</span>}
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

          <div className="sideStack">
            <div className="panelDark">
              <div className="panelTop">
                <div className="panelTitle">Analysis</div>
                <div className="panelNote">Targets + meaning (clear + academic-friendly).</div>
              </div>

              <div className="panelBody">
                {!hasRegion && (
                  <div className="miniHint">
                    Tip: in CROP VIEW, wheel to zoom. Toggle <b>MOVE CROP</b> to drag the crop before drawing region.
                  </div>
                )}

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
                        Contrast is estimated from luminance spread inside the region. Clutter is estimated from edge density.
                      </div>
                    </div>

                    <div className="sectionBlock">
                      <div className="sectionHead">Placement</div>
                      <div className="twoCol">
                        <div className="miniCard">
                          <div className="miniLabel">Safe area score</div>
                          <div className="miniValue">{safeMargin.score.toFixed(0)}/100</div>
                          <div className="miniSub">{safeMargin.pass ? "PASS" : "FAIL"} • {safeMargin.outsidePct.toFixed(0)}% outside</div>
                        </div>
                        <div className="miniCard">
                          <div className="miniLabel">Meaning</div>
                          <div className="miniSub">Failing = too close to edges (likely clip/cramp on platforms).</div>
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
                          <div className="miniSub">{palette.text.primary} • {palette.text.primaryRatio.toFixed(2)}×</div>
                        </div>
                        <div className="chipMeta">
                          <div className="miniLabel">Alt text</div>
                          <div className="chip" style={{ background: palette.text.secondary }} title={palette.text.secondary} />
                          <div className="miniSub">{palette.text.secondary} • {palette.text.secondaryRatio.toFixed(2)}×</div>
                        </div>
                        <div className="chipMeta">
                          <div className="miniLabel">Accent</div>
                          <div className="chip" style={{ background: palette.text.accent }} title={palette.text.accent} />
                          <div className="miniSub">{palette.text.accent} • {palette.text.accentRatio.toFixed(2)}×</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="panelDark">
              <div className="panelTop">
                <div className="panelTitle">Suggestions</div>
                <div className="panelNote">Why + what to do + target (more informative).</div>
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
                  <div className="panelNote">Optional sanity-check (square crops).</div>
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