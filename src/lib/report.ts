import type {
  NormalizedRect,
  PaletteResult,
  RegionMetrics,
  SafeMarginResult,
} from "../analysis/metrics";
import type { CompositionMetrics } from "../analysis/composition";
import type {
  ReleaseChangeSet,
  ReleaseReadiness,
  Thumb64Snapshot,
} from "./release";

export type ViewMode = "crop" | "full";

export type Suggestion = {
  title: string;
  why: string;
  try: string;
  target?: string;
};

export type ReportAction = "report" | "ready" | string;


export type TypographyStressFactor = {
  key: string;
  label: string;
  value: string;
  effect: number;
  basis: string;
};

export type TypographyStressSuggestion = {
  key: string;
  title: string;
  detail: string;
  tryLine: string;
  priority: number;
};

export type TypographyStressSnapshot = {
  score: number;
  label: "Strong" | "Usable" | "Risky" | "Weak";
  summary: string;
  basis: string;
  sampleSize: number;
  controls: {
    font: string;
    fontLabel: string;
    fontVibe: string;
    weight: number;
    tracking: number;
    align: string;
    overlay: string;
    caseMode: string;
    titleText: string;
    artistText: string;
    titleScale: number;
    artistScale: number;
    blockX: number;
    blockY: number;
    blockWidth: number;
    titleLift: number;
    artistGap: number;
    titleItalic: boolean;
    artistCaps: boolean;
    textColor: string;
  };
  regionContext?: {
    contrastRatio?: number;
    clutterScore?: number;
    uniformityScore?: number;
    toneLabel?: string;
    areaPct?: number;
  } | null;
  factors: TypographyStressFactor[];
  suggestions: TypographyStressSuggestion[];
};

export type ReportData = {
  createdAt: string;

  dataUrl: string;

  imageSize: { w: number; h: number };
  viewMode: ViewMode;

  region: NormalizedRect;

  mappedRegion: NormalizedRect;

  regionMetrics: RegionMetrics;
  safeMargin: SafeMarginResult;
  palette: PaletteResult;

  composition: CompositionMetrics;

  thumb64: Thumb64Snapshot | null;

  release: ReleaseReadiness;

  suggestions: Suggestion[];

  changes: ReleaseChangeSet | null;

  typography?: TypographyStressSnapshot | null;
};