import type { AudioFeatures } from "../analysis/audioFeatures";
import type { CoverMood } from "../analysis/covermood";

export type MatchResult = {
  score: number;
  label: "Aligned" | "Mixed" | "Mismatch";
  notes: string[];
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scoreLabel(score: number): MatchResult["label"] {
  if (score >= 75) return "Aligned";
  if (score >= 55) return "Mixed";
  return "Mismatch";
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

  const notes: string[] = [];

  if (dBright > 0.22) {
    notes.push(
      cBright < tBright
        ? "Your track reads brighter than the cover. Consider lifting exposure, adding a lighter base, or using a higher-contrast title treatment."
        : "Your cover is brighter than the track’s tone. Consider deeper shadows, darker grading, or a more restrained title treatment."
    );
  }

  if (dSat > 0.22) {
    notes.push(
      cSat < tSat
        ? "The track feels more energetic than the cover palette. Try a stronger accent colour, higher saturation, or bolder visual emphasis."
        : "The cover is very saturated compared with the track’s energy. Try fewer accents, calmer saturation, or less aggressive contrast."
    );
  }

  if (dWarm > 0.22) {
    notes.push(
      cWarm < tWarm
        ? "The audio feels warmer or bass-heavier than the cover. Try warmer accents, warmer grading, or a more grounded tonal direction."
        : "The cover reads warmer than the track. Try cooler accents or a more neutral tonal base."
    );
  }

  if (dComp > 0.22) {
    notes.push(
      cComp < tComp
        ? "The track has more movement than the cover. Consider adding texture, motion cues, layering, or stronger directional composition."
        : "The cover is visually busier than the track. Consider simplifying the background, reducing texture, or adding cleaner separation."
    );
  }

  if (!notes.length) {
    notes.push(
      "Overall alignment looks strong. Next: use Analyze to confirm contrast, clutter, and safe-area performance for the title region."
    );
  }

  return {
    score,
    label: scoreLabel(score),
    notes,
  };
}