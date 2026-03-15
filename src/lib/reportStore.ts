// File: src/lib/reportStore.ts
import { useSyncExternalStore } from "react";

type StoredPayloadV3 = {
  v: 3;
  savedAt: number;
  report: unknown;
  meta: unknown;
};

const STORAGE_KEY = "covercheck.report.session.v3";

let _hasReport = false;
let _report: unknown = null;
let _meta: unknown = null;

// ✅ snapshot is a primitive version counter (stable)
let _version = 0;

const listeners = new Set<() => void>();

function emit() {
  _version += 1;
  for (const fn of listeners) fn();
}

function canUseSessionStorage(): boolean {
  try {
    const k = "__cc_storage_test__";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function writeToSessionStorage(payload: StoredPayloadV3) {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function readFromSessionStorage(): StoredPayloadV3 | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredPayloadV3>;
    if (parsed?.v !== 3) return null;
    if (typeof parsed.savedAt !== "number") return null;

    return {
      v: 3,
      savedAt: parsed.savedAt,
      report: parsed.report ?? null,
      meta: parsed.meta ?? null,
    };
  } catch {
    return null;
  }
}

function hydrateIfNeeded() {
  if (_hasReport) return;

  const payload = readFromSessionStorage();
  if (!payload) return;

  _hasReport = true;
  _report = payload.report;
  _meta = payload.meta;
}

export function saveReportToSession(report: unknown, meta?: unknown) {
  _hasReport = true;
  _report = report;
  _meta = meta ?? null;

  writeToSessionStorage({
    v: 3,
    savedAt: Date.now(),
    report: _report,
    meta: _meta,
  });

  emit();
}

export function loadReportFromSession<TReport = unknown, TMeta = unknown>() {
  hydrateIfNeeded();
  if (!_hasReport) return null;
  return { report: _report as TReport, meta: _meta as TMeta };
}

export function clearReportFromSession() {
  _hasReport = false;
  _report = null;
  _meta = null;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshotVersion() {
  hydrateIfNeeded();
  return _version; // ✅ primitive + stable
}

export function useReportFromSession<TReport = unknown, TMeta = unknown>() {
  useSyncExternalStore(subscribe, getSnapshotVersion, getSnapshotVersion);
  hydrateIfNeeded();

  return {
    report: (_hasReport ? (_report as TReport) : null) as TReport | null,
    meta: (_hasReport ? (_meta as TMeta) : null) as TMeta | null,
  };
}