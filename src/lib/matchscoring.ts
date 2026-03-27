import type { AudioFeatures } from "../analysis/audioFeatures";
import type { CoverMood } from "../analysis/covermood";

export type MatchDimensionKey =
  | "brightness"
  | "saturation"
  | "warmth"
  | "complexity";

export type MatchDimension = {
  key: MatchDimensionKey;
  title: string;
  weight: number;
  audioDriverLabel: string;
  coverDriverLabel: string;
  audioDriverValue: number;
  coverValue: number;
  targetValue: number;
  difference: number;
  status: "aligned" | "watch" | "mismatch";
  whyItMatters: string;
  basis: string;
  suggestion: string;
};

export type MatchResult = {
  score: number;
  label: "Aligned" | "Mixed" | "Mismatch";
  notes: string[];
  summary: string;
  strongestMatch: string | null;
  biggestGap: string | null;
  dimensions: MatchDimension[];
  strengths: string[];
  cautions: string[];
  scoreBasis: string[];
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scoreLabel(score: number): MatchResult["label"] {
  if (score >= 75) return "Aligned";
  if (score >= 55) return "Mixed";
  return "Mismatch";
}

function dimensionStatus(difference: number): MatchDimension["status"] {
  if (difference <= 0.12) return "aligned";
  if (difference <= 0.24) return "watch";
  return "mismatch";
}

function pct(value: number) {
  return Math.round(value * 100);
}

export function computeMatch(audio: AudioFeatures, cover: CoverMood): MatchResult {
  const aEnergy = audio.energy;
  const aBright = audio.brightness;
  const aBass = audio.bass;
  const aDyn = audio.dynamics;

  const cBright = cover.brightness;
  const cSat = cover.saturation;
  const cWarm = cover.warmth;
  const cComp = cover.complexity;

  const tBright = clamp01(0.25 + 0.6 * aBright + 0.2 * aEnergy);
  const tSat = clamp01(0.15 + 0.7 * aEnergy);
  const tWarm = clamp01(0.25 + 0.6 * aBass - 0.25 * aBright);
  const tComp = clamp01(0.15 + 0.55 * aEnergy + 0.35 * aDyn);

  const dBright = Math.abs(cBright - tBright);
  const dSat = Math.abs(cSat - tSat);
  const dWarm = Math.abs(cWarm - tWarm);
  const dComp = Math.abs(cComp - tComp);

  const weighted = 0.32 * dBright + 0.26 * dSat + 0.22 * dWarm + 0.2 * dComp;
  const score = Math.round(100 - weighted * 100);

  const dimensions: MatchDimension[] = [
    {
      key: "brightness",
      title: "Brightness balance",
      weight: 0.32,
      audioDriverLabel: "audio brightness + energy",
      coverDriverLabel: "cover brightness",
      audioDriverValue: clamp01((aBright + aEnergy) / 2),
      coverValue: cBright,
      targetValue: tBright,
      difference: dBright,
      status: dimensionStatus(dBright),
      whyItMatters:
        "This checks whether the cover feels as light, open, or shadow-heavy as the track sounds.",
      basis:
        "The target rises when the track has more high-frequency presence and overall intensity. The cover value comes from average image luminance.",
      suggestion:
        cBright < tBright
          ? "The track reads brighter than the cover. Consider lifting exposure, using a lighter base image, or improving title contrast so the visual tone opens up."
          : "The cover reads brighter than the track. Consider a darker grade, deeper shadow structure, or a calmer title treatment so the image feels less weightless."
    },
    {
      key: "saturation",
      title: "Colour energy",
      weight: 0.26,
      audioDriverLabel: "audio energy",
      coverDriverLabel: "cover saturation",
      audioDriverValue: aEnergy,
      coverValue: cSat,
      targetValue: tSat,
      difference: dSat,
      status: dimensionStatus(dSat),
      whyItMatters:
        "This tests whether the palette carries the same level of visual intensity as the track’s energy.",
      basis:
        "The target increases with audio energy. The cover value comes from average HSV saturation across the image.",
      suggestion:
        cSat < tSat
          ? "The track feels more energetic than the palette. Try a stronger accent colour, bolder saturation, or one clearer high-energy focal area."
          : "The palette is more intense than the track suggests. Try fewer accents, calmer saturation, or less aggressive colour separation."
    },
    {
      key: "warmth",
      title: "Warm / cool direction",
      weight: 0.22,
      audioDriverLabel: "bass presence vs brightness",
      coverDriverLabel: "cover warmth",
      audioDriverValue: clamp01((aBass + (1 - aBright)) / 2),
      coverValue: cWarm,
      targetValue: tWarm,
      difference: dWarm,
      status: dimensionStatus(dWarm),
      whyItMatters:
        "This compares whether the track’s low-end weight and tonal feel are supported by warmer or cooler colour choices.",
      basis:
        "Bass pushes the target warmer, while high-frequency brightness pulls it cooler. The cover value reflects how often the image leans toward red/orange hues.",
      suggestion:
        cWarm < tWarm
          ? "The audio feels warmer or more grounded than the cover. Try warmer accents, warmer grading, or more earthy tonal anchors."
          : "The cover reads warmer than the track. Try cooler accents, more neutral grading, or less amber-heavy colour correction."
    },
    {
      key: "complexity",
      title: "Movement and visual density",
      weight: 0.2,
      audioDriverLabel: "energy + dynamics",
      coverDriverLabel: "cover complexity",
      audioDriverValue: clamp01((aEnergy + aDyn) / 2),
      coverValue: cComp,
      targetValue: tComp,
      difference: dComp,
      status: dimensionStatus(dComp),
      whyItMatters:
        "This checks whether the cover feels as busy, layered, or controlled as the music feels in motion.",
      basis:
        "The target rises with audio energy and dynamic peaks. The cover value is a luminance-edge proxy for visual busyness.",
      suggestion:
        cComp < tComp
          ? "The track has more movement than the cover. Consider layering, texture, motion cues, or stronger directional composition."
          : "The cover is visually busier than the track. Consider simplifying the background, removing unnecessary texture, or keeping one calmer title zone."
    },
  ];

  const sortedByGap = [...dimensions].sort((a, b) => b.difference - a.difference);
  const sortedByFit = [...dimensions].sort((a, b) => a.difference - b.difference);

  const strengths = sortedByFit
    .filter((item) => item.status === "aligned")
    .slice(0, 2)
    .map(
      (item) =>
        `${item.title} is close to the track target (${pct(item.coverValue)} cover vs ${pct(item.targetValue)} target).`
    );

  const cautions = sortedByGap
    .filter((item) => item.status !== "aligned")
    .slice(0, 3)
    .map((item) => item.suggestion);

  const notes = cautions.length
    ? cautions
    : [
        "Overall alignment looks strong. Next: use Analyze to confirm contrast, clutter, and safe-area performance for the title region.",
      ];

  const strongestMatch = sortedByFit[0]
    ? `${sortedByFit[0].title} is the closest fit.`
    : null;
  const biggestGap = sortedByGap[0]
    ? `${sortedByGap[0].title} is the biggest mismatch.`
    : null;

  const summary =
    score >= 75
      ? "The visual direction broadly supports the track. The remaining job is to refine readability and polish rather than rethink the whole mood."
      : score >= 55
      ? "Some parts of the visual language fit the track, but one or two dimensions are pulling in a different direction."
      : "The cover and track are sending noticeably different signals. The biggest gains will come from adjusting mood before fine-tuning typography.";

  return {
    score,
    label: scoreLabel(score),
    notes,
    summary,
    strongestMatch,
    biggestGap,
    dimensions,
    strengths,
    cautions,
    scoreBasis: [
      "Brightness target is driven by audio brightness and overall energy.",
      "Colour energy target is driven by track energy.",
      "Warm/cool target is driven by bass weight versus high-frequency brightness.",
      "Movement target is driven by audio energy plus dynamics, then compared with cover edge density.",
    ],
  };
}
