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
};