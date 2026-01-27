// src/analysis/coverMood.ts
export type CoverMood = {
  brightness: number;   // 0..1
  saturation: number;   // 0..1
  warmth: number;       // 0..1 (warm reds/oranges higher)
  complexity: number;   // 0..1 (edge density proxy)
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function rgbToHsv(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export async function imageDataFromDataUrl(dataUrl: string, maxDim = 512) {
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

export function computeCoverMood(imageData: ImageData): CoverMood {
  const { data, width, height } = imageData;

  let sumL = 0;
  let sumS = 0;
  let sumWarm = 0;

  // Luma buffer for edge density
  const luma = new Float32Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; // luminance
    luma[p] = y;
    sumL += y;

    const hsv = rgbToHsv(r, g, b);
    sumS += hsv.s;

    // warmth: peak around 30° (orange/red) and also around 330° (magenta-red)
    const hDeg = hsv.h;
    const dist = Math.min(Math.abs(hDeg - 30), Math.abs(hDeg - 390)); // wrap for reds
    const warm = clamp01(1 - dist / 180);
    sumWarm += warm;
  }

  const n = width * height;
  const brightness = clamp01(sumL / n);
  const saturation = clamp01(sumS / n);
  const warmth = clamp01(sumWarm / n);

  // complexity = edge density proxy
  let edges = 0;
  let total = 0;
  const threshold = 0.22; // tune: higher = fewer edges

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const dx = Math.abs(luma[i + 1] - luma[i - 1]);
      const dy = Math.abs(luma[i + width] - luma[i - width]);
      const mag = dx + dy;
      if (mag > threshold) edges++;
      total++;
    }
  }

  const complexity = clamp01((edges / Math.max(1, total)) * 2.2);

  return { brightness, saturation, warmth, complexity };
}
