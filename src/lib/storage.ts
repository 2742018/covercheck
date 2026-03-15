export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function isBlobUrl(url: string | null): url is string {
  return Boolean(url && url.startsWith("blob:"));
}


const objectUrlRefs = new Map<string, number>();

export function fileToObjectUrl(file: File): string {
  const url = URL.createObjectURL(file);
  objectUrlRefs.set(url, 1);
  return url;
}

/**
 * Optional: call when reusing the same blob URL in multiple places.
 */
export function retainObjectUrl(url: string | null): void {
  if (!isBlobUrl(url)) return;
  objectUrlRefs.set(url, (objectUrlRefs.get(url) ?? 0) + 1);
}

/**
 * Optional: call when you're done with a blob URL.
 * This revokes only when the refcount hits 0.
 */
export function releaseObjectUrl(url: string | null): void {
  if (!isBlobUrl(url)) return;

  const cur = objectUrlRefs.get(url);
  if (cur === undefined) {
    // Unknown URL: don't revoke blindly (avoids breaking report images).
    return;
  }

  const next = cur - 1;
  if (next <= 0) {
    objectUrlRefs.delete(url);
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    return;
  }

  objectUrlRefs.set(url, next);
}

/**
 * Legacy name used in your project.
 * Keep this export so existing imports keep working.
 */
export function revokeObjectUrl(url: string | null): void {
  releaseObjectUrl(url);
}

/**
 * Debug / emergency: revoke everything we created.
 */
export function revokeAllObjectUrls(): void {
  for (const url of objectUrlRefs.keys()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
  objectUrlRefs.clear();
}