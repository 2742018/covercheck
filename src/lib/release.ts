import type { NormalizedRect, RegionMetrics, SafeMarginResult } from "../analysis/metrics";

export type ReleaseCheckId = "contrast" | "safeArea" | "clutter" | "thumb64";

export type Thumb64Snapshot = {
  size: 64;
  contrastRatio: number;
  clutterScore: number;
  regionMinPx: number;
  pass: boolean;
  note: string;
};

export type ReleaseCheck = {
  id: ReleaseCheckId;
  label: string;
  pass: boolean;
  value: string;
  target: string;
  why: string;
  fix: string;
};

export type ReleaseReadiness = {
  overallPass: boolean;
  score: number; // 0..100
  checks: ReleaseCheck[];
  nextChanges: string[]; // fail-only, short actionable list
};

export type ReleaseSummary = {
  contrastRatio: number;
  clutterScore: number;
  safeScore: number;
  thumbContrast: number | null;
  thumbClutter: number | null;
  thumbMinPx: number | null;
};

export type ReleaseChangeSet = {
  items: Array<{ label: string; from: number; to: number; delta: number }>;
};

const SESSION_KEY = "covercheck.release.summary.v1";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isLargeTextRegion(region: NormalizedRect) {
  // heuristic: taller region = likely larger/bolder typography
  return region.h >= 0.22;
}

export function computeReleaseReadiness(args: {
  region: NormalizedRect;
  regionMetrics: RegionMetrics;
  safe: SafeMarginResult;
  thumb64: Thumb64Snapshot | null;
}): ReleaseReadiness {
  const { region, regionMetrics: rm, safe, thumb64 } = args;

  const largeText = isLargeTextRegion(region);
  const contrastTarget = largeText ? 3.0 : 4.5;
  const contrastPass = rm.contrastRatio >= contrastTarget;

  const safePass = safe.score >= 95;
  const clutterPass = rm.clutterScore >= 60;

  const thumbPass = Boolean(thumb64?.pass);

  const checks: ReleaseCheck[] = [
    {
      id: "contrast",
      label: "Contrast",
      pass: contrastPass,
      value: `≈ ${round2(rm.contrastRatio)}`,
      target: largeText ? "≥ 3.0 (large/bold text)" : "≥ 4.5 (small text)",
      why: "Low contrast makes the title/artist disappear in small thumbnails, especially on mobile and dark UI.",
      fix: "Use the suggested text color + add a 20–40% overlay behind the title region (or a subtle gradient strip).",
    },
    {
      id: "safeArea",
      label: "Safe area",
      pass: safePass,
      value: `${Math.round(safe.score)}/100`,
      target: "≥ 95/100",
      why: "Platforms crop/round corners and overlay UI; edge content is the most likely to be clipped.",
      fix: "Move critical text inward (stay inside the dashed safe guide). Avoid corners for small logos.",
    },
    {
      id: "clutter",
      label: "Clutter",
      pass: clutterPass,
      value: `${Math.round(rm.clutterScore)}/100`,
      target: "≥ 60/100",
      why: "Busy texture behind letters reduces legibility even when contrast is technically acceptable.",
      fix: "Relocate text to a calmer area, blur/simplify behind it, or add a panel/overlay shape behind type.",
    },
    {
      id: "thumb64",
      label: "64px thumbnail",
      pass: thumbPass,
      value: thumb64
        ? `C ${round2(thumb64.contrastRatio)} • K ${Math.round(thumb64.clutterScore)} • ${Math.round(thumb64.regionMinPx)}px`
        : "—",
      target: "Readable at 64px",
      why: "This is a common smallest size in grids/lists. If it fails at 64px, it will fail in the wild.",
      fix: thumb64
        ? thumb64.note
        : "Switch to CROP VIEW and draw a region; we test the selected region at 64px.",
    },
  ];

  const passedCount = checks.filter((c) => c.pass).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const overallPass = passedCount === checks.length;

  const nextChanges = checks
    .filter((c) => !c.pass)
    .map((c) => `${c.label}: ${c.fix}`);

  return { overallPass, score, checks, nextChanges };
}

export function buildReleaseSummary(args: {
  regionMetrics: RegionMetrics;
  safe: SafeMarginResult;
  thumb64: Thumb64Snapshot | null;
}): ReleaseSummary {
  return {
    contrastRatio: round2(args.regionMetrics.contrastRatio),
    clutterScore: Math.round(args.regionMetrics.clutterScore),
    safeScore: Math.round(args.safe.score),
    thumbContrast: args.thumb64 ? round2(args.thumb64.contrastRatio) : null,
    thumbClutter: args.thumb64 ? Math.round(args.thumb64.clutterScore) : null,
    thumbMinPx: args.thumb64 ? Math.round(args.thumb64.regionMinPx) : null,
  };
}

export function computeSessionChanges(next: ReleaseSummary): ReleaseChangeSet | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const prev: ReleaseSummary | null = raw ? (JSON.parse(raw) as ReleaseSummary) : null;

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));

    if (!prev) return null;

    const items: ReleaseChangeSet["items"] = [];

    const add = (label: string, from: number | null, to: number | null) => {
      if (from === null || to === null) return;
      const delta = Math.round((to - from) * 100) / 100;
      if (delta === 0) return;
      items.push({ label, from, to, delta });
    };

    add("Contrast", prev.contrastRatio, next.contrastRatio);
    add("Clutter", prev.clutterScore, next.clutterScore);
    add("Safe score", prev.safeScore, next.safeScore);
    add("64px contrast", prev.thumbContrast, next.thumbContrast);
    add("64px clutter", prev.thumbClutter, next.thumbClutter);

    return items.length ? { items } : null;
  } catch {
    return null;
  }
}