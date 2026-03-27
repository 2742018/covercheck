import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ProfileKey = "minimal" | "bold" | "photo" | "experimental";
type Scores = Record<ProfileKey, number>;

type Option = {
  label: string;
  detail: string;
  scores: Scores;
  readability: number; // 0..1
  cropRisk: number; // 0..1
};

type Question = {
  id: string;
  category: string;
  title: string;
  prompt: string;
  whatItTests: string;
  whyItMatters: string;
  options: Option[];
};

const Z: Scores = { minimal: 0, bold: 0, photo: 0, experimental: 0 };

const QUESTIONS: Question[] = [
  {
    id: "type-weight",
    category: "Typography",
    title: "Typography weight",
    prompt: "When the cover appears very small, how heavy or light should the title feel at first glance?",
    whatItTests:
      "This checks whether your instinct favors quiet, restrained lettering or thicker, more assertive type that survives thumbnail viewing.",
    whyItMatters:
      "In Analyze, heavier type often survives low contrast and busy imagery more easily, while lighter type usually needs calmer backgrounds and stronger spacing discipline.",
    options: [
      {
        label: "Clean + restrained",
        detail: "Light/regular weight, lots of breathing room.",
        scores: { minimal: 3, bold: 0, photo: 1, experimental: 0 },
        readability: 0.65,
        cropRisk: 0.25,
      },
      {
        label: "Bold + assertive",
        detail: "Thicker weight so it survives small thumbnails.",
        scores: { minimal: 0, bold: 3, photo: 0, experimental: 1 },
        readability: 0.92,
        cropRisk: 0.18,
      },
      {
        label: "Integrated into image",
        detail: "Type feels embedded into the photo/artwork.",
        scores: { minimal: 0, bold: 1, photo: 3, experimental: 1 },
        readability: 0.6,
        cropRisk: 0.35,
      },
      {
        label: "Expressive / distorted",
        detail: "Warped, textured, expressive letterforms.",
        scores: { minimal: 0, bold: 1, photo: 0, experimental: 3 },
        readability: 0.45,
        cropRisk: 0.48,
      },
    ],
  },
  {
    id: "type-size",
    category: "Typography",
    title: "Type scale",
    prompt: "How large do you naturally want the title to be compared with the rest of the cover?",
    whatItTests:
      "This measures whether your hierarchy instinct is subtle, balanced, headline-led, or concept-driven.",
    whyItMatters:
      "In Analyze, type scale affects readability, region dominance, and whether the title continues to lead once the image is reduced to streaming size.",
    options: [
      {
        label: "Small + subtle",
        detail: "It’s there, but it doesn’t dominate.",
        scores: { minimal: 3, bold: 0, photo: 2, experimental: 0 },
        readability: 0.55,
        cropRisk: 0.22,
      },
      {
        label: "Medium, balanced",
        detail: "Readable while still letting artwork lead.",
        scores: { minimal: 3, bold: 2, photo: 2, experimental: 0 },
        readability: 0.78,
        cropRisk: 0.22,
      },
      {
        label: "Large + headline",
        detail: "The title must win at thumbnail size.",
        scores: { minimal: 1, bold: 3, photo: 0, experimental: 1 },
        readability: 0.92,
        cropRisk: 0.25,
      },
      {
        label: "Variable / reactive",
        detail: "Size depends on concept; can be surprising.",
        scores: { minimal: 0, bold: 1, photo: 1, experimental: 3 },
        readability: 0.62,
        cropRisk: 0.35,
      },
    ],
  },
  {
    id: "tracking",
    category: "Typography",
    title: "Letter spacing",
    prompt: "How do you prefer letter spacing to behave in title treatments?",
    whatItTests:
      "This looks at whether your typography taste favors compact density, neutral control, elegant openness, or expressive irregular spacing.",
    whyItMatters:
      "In Analyze, spacing affects word-shape clarity, perceived calmness, and whether text still feels stable when viewed at 64–128px.",
    options: [
      {
        label: "Tight + compact",
        detail: "Dense, compact word shapes.",
        scores: { minimal: 1, bold: 2, photo: 1, experimental: 1 },
        readability: 0.72,
        cropRisk: 0.28,
      },
      {
        label: "Balanced",
        detail: "Controlled spacing without feeling stiff.",
        scores: { minimal: 3, bold: 2, photo: 2, experimental: 0 },
        readability: 0.82,
        cropRisk: 0.2,
      },
      {
        label: "Wide + airy",
        detail: "Spaced out, premium, elegant.",
        scores: { minimal: 3, bold: 0, photo: 1, experimental: 1 },
        readability: 0.7,
        cropRisk: 0.26,
      },
      {
        label: "Unusual / variable",
        detail: "Spacing becomes part of the concept.",
        scores: { minimal: 0, bold: 0, photo: 1, experimental: 3 },
        readability: 0.5,
        cropRisk: 0.38,
      },
    ],
  },
  {
    id: "bg-busyness",
    category: "Readability",
    title: "Background detail",
    prompt: "What kind of background do you usually want behind the title area?",
    whatItTests:
      "This checks how much visual texture you are comfortable asking type to sit on top of.",
    whyItMatters:
      "In Analyze, busy backgrounds usually reduce contrast stability and increase clutter in the highlighted text box, which can make type feel fragile even if it looks good at full size.",
    options: [
      {
        label: "Very calm",
        detail: "Flat/soft gradient/minimal texture.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.95,
        cropRisk: 0.18,
      },
      {
        label: "Moderate texture",
        detail: "Some detail but still readable.",
        scores: { minimal: 1, bold: 2, photo: 2, experimental: 1 },
        readability: 0.78,
        cropRisk: 0.28,
      },
      {
        label: "Photographic detail",
        detail: "Real scenes/lighting/subjects.",
        scores: { minimal: 0, bold: 1, photo: 3, experimental: 1 },
        readability: 0.6,
        cropRisk: 0.32,
      },
      {
        label: "Busy / graphic",
        detail: "Patterns, collage, heavy texture.",
        scores: { minimal: 0, bold: 1, photo: 0, experimental: 3 },
        readability: 0.4,
        cropRisk: 0.55,
      },
    ],
  },
  {
    id: "contrast",
    category: "Readability",
    title: "Contrast preference",
    prompt: "How strongly should the title separate from whatever sits behind it?",
    whatItTests:
      "This measures whether you instinctively prioritize strong separation, balanced harmony, mood-led subtlety, or concept over clarity.",
    whyItMatters:
      "In Analyze, contrast is one of the clearest indicators of whether title and artist text will still communicate once the cover is reduced or seen quickly in a feed.",
    options: [
      {
        label: "High contrast always",
        detail: "Strong separation (white/black or bold overlay).",
        scores: { minimal: 1, bold: 3, photo: 1, experimental: 0 },
        readability: 0.95,
        cropRisk: 0.18,
      },
      {
        label: "Balanced contrast",
        detail: "Readable, but not screaming.",
        scores: { minimal: 3, bold: 2, photo: 2, experimental: 0 },
        readability: 0.82,
        cropRisk: 0.22,
      },
      {
        label: "Moody / subtle",
        detail: "Lower contrast; vibe > clarity.",
        scores: { minimal: 1, bold: 0, photo: 3, experimental: 1 },
        readability: 0.5,
        cropRisk: 0.35,
      },
      {
        label: "Ambiguity is OK",
        detail: "Legibility is secondary to concept.",
        scores: { minimal: 0, bold: 0, photo: 0, experimental: 3 },
        readability: 0.32,
        cropRisk: 0.5,
      },
    ],
  },
  {
    id: "placement",
    category: "Placement",
    title: "Title placement",
    prompt: "Where do you most naturally want to place the title and artist on the cover?",
    whatItTests:
      "This looks at your instinct for safe centered placement versus edge-led, asymmetrical, or image-reactive placement.",
    whyItMatters:
      "In Analyze, the highlighted box is checked against safe-area and edge risk. Placement choices that feel exciting at full size can become vulnerable to crops, UI overlays, or thumbnail compression.",
    options: [
      {
        label: "Centered safe zone",
        detail: "Away from edges; survives crop + UI overlays.",
        scores: { minimal: 3, bold: 2, photo: 1, experimental: 0 },
        readability: 0.9,
        cropRisk: 0.12,
      },
      {
        label: "Top / bottom band",
        detail: "Classic poster layout; needs safe margins.",
        scores: { minimal: 2, bold: 2, photo: 1, experimental: 1 },
        readability: 0.75,
        cropRisk: 0.32,
      },
      {
        label: "Near an edge",
        detail: "Tension + asymmetry; risky for crops.",
        scores: { minimal: 0, bold: 2, photo: 1, experimental: 2 },
        readability: 0.55,
        cropRisk: 0.55,
      },
      {
        label: "Wherever feels right",
        detail: "Responds to image; could be anywhere.",
        scores: { minimal: 0, bold: 1, photo: 2, experimental: 3 },
        readability: 0.52,
        cropRisk: 0.5,
      },
    ],
  },
  {
    id: "overlay",
    category: "Readability",
    title: "Overlay strategy",
    prompt: "Would you use a panel, gradient, or fade behind text to protect readability?",
    whatItTests:
      "This checks how willing you are to use deliberate support behind text rather than expecting the image alone to carry readability.",
    whyItMatters:
      "In Analyze, overlays often become the simplest fix when clutter is high or contrast is unstable inside the selected text region.",
    options: [
      {
        label: "Yes, clean panel",
        detail: "Solid/blur panel behind text.",
        scores: { minimal: 3, bold: 2, photo: 0, experimental: 0 },
        readability: 0.95,
        cropRisk: 0.18,
      },
      {
        label: "Yes, gradient fade",
        detail: "Soft vignette or gradient strip.",
        scores: { minimal: 2, bold: 2, photo: 2, experimental: 0 },
        readability: 0.86,
        cropRisk: 0.22,
      },
      {
        label: "Sometimes",
        detail: "Only if needed on busy images.",
        scores: { minimal: 1, bold: 1, photo: 2, experimental: 1 },
        readability: 0.72,
        cropRisk: 0.28,
      },
      {
        label: "No overlays",
        detail: "Type must live directly on the image.",
        scores: { minimal: 0, bold: 1, photo: 2, experimental: 2 },
        readability: 0.5,
        cropRisk: 0.42,
      },
    ],
  },
  {
    id: "color-approach",
    category: "Colour",
    title: "Color approach",
    prompt: "How do you usually choose title or accent colours for a cover?",
    whatItTests:
      "This checks whether your palette instinct is neutral, accent-led, image-led, or intentionally unexpected.",
    whyItMatters:
      "In Analyze, colour choices affect tone separation, contrast, and whether the title region feels calm, sharp, harmonious, or unstable.",
    options: [
      {
        label: "Neutral palette",
        detail: "Grays/black/white; quiet luxury.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.8,
        cropRisk: 0.2,
      },
      {
        label: "One strong accent",
        detail: "Single bright accent + simple base.",
        scores: { minimal: 1, bold: 3, photo: 0, experimental: 1 },
        readability: 0.86,
        cropRisk: 0.25,
      },
      {
        label: "Pulled from image",
        detail: "Let artwork decide; harmonize.",
        scores: { minimal: 1, bold: 1, photo: 3, experimental: 1 },
        readability: 0.66,
        cropRisk: 0.3,
      },
      {
        label: "Unexpected combos",
        detail: "Triadic/clashing/experimental palettes.",
        scores: { minimal: 0, bold: 1, photo: 0, experimental: 3 },
        readability: 0.55,
        cropRisk: 0.35,
      },
    ],
  },
  {
    id: "dominance",
    category: "Composition",
    title: "Image vs type dominance",
    prompt: "What should visually dominate first when someone encounters the cover?",
    whatItTests:
      "This measures whether your hierarchy instinct places the title, the artwork, or a shifting concept at the front of the composition.",
    whyItMatters:
      "In Analyze, dominance relates to whether the title region is doing enough work, or whether the image is so strong that the information becomes secondary.",
    options: [
      {
        label: "Type first",
        detail: "The name/title should hit first.",
        scores: { minimal: 1, bold: 3, photo: 0, experimental: 0 },
        readability: 0.93,
        cropRisk: 0.2,
      },
      {
        label: "Balanced hierarchy",
        detail: "Image and title work together.",
        scores: { minimal: 3, bold: 2, photo: 2, experimental: 0 },
        readability: 0.82,
        cropRisk: 0.22,
      },
      {
        label: "Image first",
        detail: "Artwork leads; text supports.",
        scores: { minimal: 0, bold: 0, photo: 3, experimental: 1 },
        readability: 0.62,
        cropRisk: 0.31,
      },
      {
        label: "Unpredictable",
        detail: "The dominant element changes by concept.",
        scores: { minimal: 0, bold: 1, photo: 1, experimental: 3 },
        readability: 0.56,
        cropRisk: 0.36,
      },
    ],
  },
  {
    id: "logo-density",
    category: "Information",
    title: "Info density",
    prompt: "How much extra information do you like placing on the cover beyond title and artist?",
    whatItTests:
      "This checks your tolerance for sparse versus dense information systems.",
    whyItMatters:
      "In Analyze, extra marks, lines, stickers, credits, and texture can push a layout from clear to crowded, especially when everything collapses into thumbnail scale.",
    options: [
      {
        label: "Just essentials",
        detail: "Title + artist only.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.88,
        cropRisk: 0.18,
      },
      {
        label: "A few details",
        detail: "Maybe label mark / small tagline.",
        scores: { minimal: 2, bold: 2, photo: 2, experimental: 0 },
        readability: 0.76,
        cropRisk: 0.28,
      },
      {
        label: "Dense / poster-like",
        detail: "Multiple lines, credits, texture, stamps.",
        scores: { minimal: 0, bold: 2, photo: 1, experimental: 2 },
        readability: 0.55,
        cropRisk: 0.42,
      },
      {
        label: "Rules can be broken",
        detail: "Information can be part of the concept.",
        scores: { minimal: 0, bold: 0, photo: 1, experimental: 3 },
        readability: 0.48,
        cropRisk: 0.45,
      },
    ],
  },
  {
    id: "negative-space",
    category: "Composition",
    title: "Negative space",
    prompt: "How much empty space do you want around the type area?",
    whatItTests:
      "This looks at whether you prefer open compositions, balanced spacing, tight energy, or intentional crowding.",
    whyItMatters:
      "In Analyze, negative space influences clutter, calmness, and whether the title region has enough room to read as a clear unit.",
    options: [
      {
        label: "A lot of space",
        detail: "Airy, premium, controlled.",
        scores: { minimal: 3, bold: 1, photo: 2, experimental: 0 },
        readability: 0.82,
        cropRisk: 0.18,
      },
      {
        label: "Some space",
        detail: "Balanced composition.",
        scores: { minimal: 2, bold: 2, photo: 2, experimental: 0 },
        readability: 0.78,
        cropRisk: 0.22,
      },
      {
        label: "Tight composition",
        detail: "Everything feels close and energetic.",
        scores: { minimal: 0, bold: 2, photo: 1, experimental: 2 },
        readability: 0.62,
        cropRisk: 0.38,
      },
      {
        label: "Crowded by design",
        detail: "Density is part of the aesthetic.",
        scores: { minimal: 0, bold: 1, photo: 0, experimental: 3 },
        readability: 0.52,
        cropRisk: 0.45,
      },
    ],
  },
  {
    id: "symmetry",
    category: "Composition",
    title: "Balance preference",
    prompt: "How stable or unstable should the overall composition feel?",
    whatItTests:
      "This checks whether you prefer orderly symmetry, controlled balance, purposeful asymmetry, or disruptive imbalance.",
    whyItMatters:
      "In Analyze, structural balance affects how calm or tense the composition feels, and whether the title region appears intentionally placed or visually unsettled.",
    options: [
      {
        label: "Orderly + symmetrical",
        detail: "Stability and balance matter.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.8,
        cropRisk: 0.2,
      },
      {
        label: "Mostly balanced",
        detail: "A bit of movement, but still controlled.",
        scores: { minimal: 2, bold: 2, photo: 2, experimental: 0 },
        readability: 0.78,
        cropRisk: 0.24,
      },
      {
        label: "Purposefully off-balance",
        detail: "Asymmetry adds tension.",
        scores: { minimal: 0, bold: 2, photo: 1, experimental: 2 },
        readability: 0.6,
        cropRisk: 0.36,
      },
      {
        label: "Unstable / disruptive",
        detail: "Imbalance is part of the expression.",
        scores: { minimal: 0, bold: 0, photo: 0, experimental: 3 },
        readability: 0.46,
        cropRisk: 0.4,
      },
    ],
  },
  {
    id: "platform",
    category: "Context",
    title: "Platform priority",
    prompt: "Which context matters most when judging whether the cover is successful?",
    whatItTests:
      "This checks whether you prioritize streaming thumbnails, balanced multi-use performance, image-first presentation, or concept over platform clarity.",
    whyItMatters:
      "In Analyze, context changes the threshold for what counts as good enough. A cover that works for print or large posters can still struggle badly in a small streaming grid.",
    options: [
      {
        label: "Streaming thumbnails",
        detail: "64–128px performance is critical.",
        scores: { minimal: 2, bold: 3, photo: 0, experimental: 0 },
        readability: 0.92,
        cropRisk: 0.2,
      },
      {
        label: "Balanced",
        detail: "Works for streaming + social + posters.",
        scores: { minimal: 3, bold: 2, photo: 2, experimental: 0 },
        readability: 0.8,
        cropRisk: 0.26,
      },
      {
        label: "Artwork-first",
        detail: "The image mood matters most.",
        scores: { minimal: 0, bold: 0, photo: 3, experimental: 1 },
        readability: 0.62,
        cropRisk: 0.34,
      },
      {
        label: "Concept-first",
        detail: "Experimental outcomes > universal readability.",
        scores: { minimal: 0, bold: 0, photo: 0, experimental: 3 },
        readability: 0.5,
        cropRisk: 0.42,
      },
    ],
  },
  {
    id: "goal",
    category: "Goal",
    title: "Primary goal",
    prompt: "What matters most to you in the title and artist area of a cover?",
    whatItTests:
      "This checks your underlying design goal: instant clarity, repeatable system, mood and storytelling, or experimentation.",
    whyItMatters:
      "In Analyze, your strongest goal shapes how you interpret the same metrics. A contrast warning can be a major problem for a clarity-led design but a deliberate tradeoff for a concept-led one.",
    options: [
      {
        label: "Instant legibility",
        detail: "Readable even at tiny sizes.",
        scores: { minimal: 2, bold: 3, photo: 0, experimental: 0 },
        readability: 0.95,
        cropRisk: 0.15,
      },
      {
        label: "Brand consistency",
        detail: "Repeatable system across releases.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.82,
        cropRisk: 0.22,
      },
      {
        label: "Mood + storytelling",
        detail: "Vibe leads; type supports.",
        scores: { minimal: 0, bold: 1, photo: 3, experimental: 1 },
        readability: 0.62,
        cropRisk: 0.32,
      },
      {
        label: "Concept + experimentation",
        detail: "Risk is acceptable if it’s interesting.",
        scores: { minimal: 0, bold: 0, photo: 0, experimental: 3 },
        readability: 0.45,
        cropRisk: 0.45,
      },
    ],
  },
  {
    id: "iteration-style",
    category: "Process",
    title: "Iteration style",
    prompt: "When refining a cover, what kind of process feels most natural to you?",
    whatItTests:
      "This checks whether your workflow leans toward controlled systems, performance tuning, image-led adjustment, or broad experimentation.",
    whyItMatters:
      "In Analyze, your iteration style affects what suggestions will feel most useful. Some people want one precise fix; others need the tool to show tradeoffs between multiple directions.",
    options: [
      {
        label: "Tight system",
        detail: "Small controlled refinements.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.82,
        cropRisk: 0.2,
      },
      {
        label: "Performance-focused",
        detail: "Push what reads best in context.",
        scores: { minimal: 1, bold: 3, photo: 0, experimental: 0 },
        readability: 0.9,
        cropRisk: 0.18,
      },
      {
        label: "Image-led",
        detail: "Let the artwork dictate the adjustment.",
        scores: { minimal: 0, bold: 0, photo: 3, experimental: 1 },
        readability: 0.64,
        cropRisk: 0.3,
      },
      {
        label: "Try wild alternatives",
        detail: "Explore surprising directions before deciding.",
        scores: { minimal: 0, bold: 0, photo: 1, experimental: 3 },
        readability: 0.52,
        cropRisk: 0.36,
      },
    ],
  },
];

const PROFILE_COPY: Record<
  ProfileKey,
  {
    name: string;
    subtitle: string;
    strengths: string[];
    watchouts: string[];
    tips: string[];
    nextInTool: string[];
    detailedRead: string;
  }
> = {
  minimal: {
    name: "Minimal / Typographic",
    subtitle: "Calm hierarchy, controlled spacing, predictable readability.",
    detailedRead:
      "Your answers suggest you trust spacing, restraint, and orderly hierarchy. You are more likely to create covers that feel controlled and readable, but they can become too quiet if contrast or emphasis is not strong enough.",
    strengths: [
      "Clear structure and spacing",
      "Usually passes safe-area checks",
      "Often reads well at small sizes",
    ],
    watchouts: [
      "Can look too quiet in crowded feeds",
      "Low-contrast choices can still fail",
    ],
    tips: [
      "Target contrast ≥ 4.5 in your title region",
      "Use the safe-area guide as a boundary for all critical text",
      "Use a single controlled accent from the palette",
    ],
    nextInTool: [
      "On Analyze: draw a title/artist box and aim for Safe score ≥ 95",
      "Use the typography stress test for 64px and 128px checks",
      "If contrast is borderline, try Best text + a subtle overlay behind type",
    ],
  },
  bold: {
    name: "Bold / Contrast-led",
    subtitle: "Legibility-first decisions for strong thumbnail performance.",
    detailedRead:
      "Your answers suggest you naturally prioritize strong separation and clear hierarchy. You are more likely to produce covers that survive streaming-size viewing, though the main risk is overpowering the artwork or making the system feel visually loud.",
    strengths: [
      "High survivability at 64–128px",
      "Clear contrast decisions",
      "Robust across crops/platforms",
    ],
    watchouts: [
      "Can overpower artwork",
      "Too many accents can look noisy",
    ],
    tips: [
      "If the background is busy, add a soft overlay behind the title",
      "Use the suggested Best text chip to maximize contrast",
      "Re-check clutter: move type away from high-detail textures",
    ],
    nextInTool: [
      "On Analyze: keep clutter ≥ 60/100 in the text region",
      "Use SAFE AREA and avoid corners for small type/logos",
      "Generate Report once Contrast + Safe Area are stable",
    ],
  },
  photo: {
    name: "Photographic / Mood-led",
    subtitle: "Image-first decisions with type harmonized to artwork.",
    detailedRead:
      "Your answers suggest you value atmosphere, storytelling, and colour harmony. You are more likely to build covers where the image leads and the type supports, which can feel premium but often needs careful protection against clutter and weak separation.",
    strengths: [
      "Strong mood and storytelling",
      "Premium when placed carefully",
      "Natural color harmony",
    ],
    watchouts: [
      "Type can fight background clutter",
      "Edge placements often fail crops/safe-area",
    ],
    tips: [
      "Pick the calmest region for type placement",
      "Use subtle gradients instead of solid blocks",
      "Avoid small type near corners/edges",
    ],
    nextInTool: [
      "On Analyze: move the region until clutter improves, then re-check contrast",
      "Try FULL VIEW for composition, then return to CROP VIEW for realism",
      "Use Mockups to see whether mood still survives at small sizes",
    ],
  },
  experimental: {
    name: "Experimental / Texture-led",
    subtitle: "Distinctive concepts, trading some clarity for character.",
    detailedRead:
      "Your answers suggest you are comfortable taking visual risks when the concept deserves it. You are more likely to create memorable covers with strong character, but they will usually need more checking around readability, safe area, and thumbnail performance.",
    strengths: [
      "Memorable and unique",
      "Conceptually strong",
      "Great for print-like covers",
    ],
    watchouts: [
      "High risk at tiny thumbnails",
      "Safe-area and clutter failures are common",
    ],
    tips: [
      "Use safe-area lines aggressively for critical text",
      "If contrast is low, add a 20–40% overlay behind key type",
      "Test at 64px; if unreadable, simplify behind text or increase weight",
    ],
    nextInTool: [
      "On Analyze: treat 64px as the pass/fail gate",
      "Keep critical text inside SAFE AREA even if the design breaks rules elsewhere",
      "Use Compare to document concept vs readability tradeoffs",
    ],
  },
};

const PROFILE_ORDER: ProfileKey[] = ["minimal", "bold", "photo", "experimental"];

function addScores(a: Scores, b: Scores): Scores {
  return {
    minimal: a.minimal + b.minimal,
    bold: a.bold + b.bold,
    photo: a.photo + b.photo,
    experimental: a.experimental + b.experimental,
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

function riskLabel(n: number) {
  if (n >= 75) return "High";
  if (n >= 55) return "Moderate";
  return "Low";
}

function readabilityLabel(n: number) {
  if (n >= 85) return "Strong";
  if (n >= 65) return "Usable";
  if (n >= 45) return "Fragile";
  return "Weak";
}

function profileTone(key: ProfileKey) {
  switch (key) {
    case "minimal":
      return "clear systems, restraint, and quiet hierarchy";
    case "bold":
      return "strong contrast, visible hierarchy, and thumbnail performance";
    case "photo":
      return "mood, imagery, and color harmony";
    case "experimental":
      return "concept, texture, and visual risk";
    default:
      return "balanced design choices";
  }
}

export default function TestPage() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(QUESTIONS.map((q) => q.category)))],
    []
  );

  const filteredQuestions = useMemo(() => {
    if (activeCategory === "All") return QUESTIONS;
    return QUESTIONS.filter((q) => q.category === activeCategory);
  }, [activeCategory]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = QUESTIONS.length;
  const allAnswered = answeredCount === totalCount;
  const progress = Math.round((answeredCount / totalCount) * 100);

  const computed = useMemo(() => {
    let totals: Scores = { ...Z };
    let r = 0;
    let c = 0;
    let count = 0;

    for (const q of QUESTIONS) {
      const idx = answers[q.id];
      if (idx === undefined) continue;
      const opt = q.options[idx];
      totals = addScores(totals, opt.scores);
      r += opt.readability;
      c += opt.cropRisk;
      count += 1;
    }

    const readability = Math.round(clamp01(count ? r / count : 0) * 100);
    const cropRisk = Math.round(clamp01(count ? c / count : 0) * 100);

    const entries = Object.entries(totals) as Array<[ProfileKey, number]>;
    entries.sort((a, b) => b[1] - a[1]);

    const top: ProfileKey = entries[0]?.[0] ?? "minimal";
    const runnerUp: ProfileKey = entries[1]?.[0] ?? "bold";

    const max = Math.max(1, ...PROFILE_ORDER.map((k) => totals[k]));
    const totalScore = PROFILE_ORDER.reduce((sum, k) => sum + totals[k], 0) || 1;

    const breakdown = PROFILE_ORDER.map((k) => ({
      key: k,
      value: totals[k],
      pct: (totals[k] / max) * 100,
      share: Math.round((totals[k] / totalScore) * 100),
    }));

    const answeredItems = QUESTIONS.filter((q) => answers[q.id] !== undefined).map((q) => ({
      question: q,
      option: q.options[answers[q.id]],
    }));

    const strongestReadability = [...answeredItems]
      .sort((a, b) => b.option.readability - a.option.readability)
      .slice(0, 3);

    const strongestRisk = [...answeredItems]
      .sort((a, b) => b.option.cropRisk - a.option.cropRisk)
      .slice(0, 3);

    return {
      totals,
      top,
      runnerUp,
      readability,
      cropRisk,
      breakdown,
      strongestReadability,
      strongestRisk,
    };
  }, [answers]);

  const profile = PROFILE_COPY[computed.top];
  const runnerUpName = PROFILE_COPY[computed.runnerUp].name;
  const blendText = `${PROFILE_COPY[computed.top].name} + ${runnerUpName}`;

  function resetAll() {
    setAnswers({});
    setShowResults(false);
    setActiveCategory("All");
  }

  function unansweredInCategory(category: string) {
    const qs = category === "All" ? QUESTIONS : QUESTIONS.filter((q) => q.category === category);
    return qs.filter((q) => answers[q.id] === undefined).length;
  }

  return (
    <div className="analyzeWrap testPage">
      <div className="testHero">
        <div className="testHeroTop">
          <button className="ghostBtn" onClick={() => navigate("/play")}>
            ← BACK
          </button>

          <div className="testHeroTools">
            <span className={`statusTag ${allAnswered ? "pass" : ""}`}>
              {answeredCount}/{totalCount} • {progress}%
            </span>
            <button className="ghostBtn" onClick={resetAll}>
              RESET
            </button>
          </div>
        </div>

        <div className="testKicker">Design Interpretation</div>
        <h1 className="testTitle">Test</h1>
        <p className="testLead">
          This design-tendency quiz helps interpret your likely strengths and tradeoffs
          before using Analyze. It does not decide whether your design taste is right or
          wrong. Instead, it explains what your answers suggest about readability,
          thumbnail performance, crop safety, mood, and experimentation.
        </p>

        <div className="testHeroStats">
          <div className="miniCard">
            <div className="miniLabel">Questions</div>
            <div className="miniValue">{totalCount}</div>
            <div className="miniSub">Expanded prompts with clearer guidance</div>
          </div>
          <div className="miniCard">
            <div className="miniLabel">Progress</div>
            <div className="miniValue">{progress}%</div>
            <div className="miniSub">{answeredCount} answered</div>
          </div>
          <div className="miniCard">
            <div className="miniLabel">Results</div>
            <div className="miniValue">{allAnswered ? "Ready" : "Locked"}</div>
            <div className="miniSub">Unlock after all answers</div>
          </div>
        </div>

        <div className="testRule" />
      </div>

      <div className="testStack">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">How it works</div>
            <div className="panelNote">
              Answer all questions to reveal a richer design profile, likely tradeoffs, and
              practical next steps for Analyze, Compare, and Mockups.
            </div>
          </div>

          <div className="panelBody">
            <div className="twoCol">
              <div className="sectionBlock">
                <div className="sectionHead">What this estimates</div>
                <ul className="testList">
                  <li>Your strongest visual tendency: Minimal, Bold, Photographic, or Experimental.</li>
                  <li>Your likely thumbnail readability tendency.</li>
                  <li>Your likely crop / safe-area risk tendency.</li>
                  <li>Your blended direction, not just a single label.</li>
                </ul>
              </div>

              <div className="sectionBlock">
                <div className="sectionHead">How to answer well</div>
                <ul className="testList">
                  <li>Choose the option that feels most natural to you, not the one that sounds safest.</li>
                  <li>Treat the questions as covering your usual design instinct, not one special case.</li>
                  <li>Use the detailed explanation under each question to understand what is really being measured.</li>
                </ul>
              </div>
            </div>

            <div className="sectionBlock" style={{ marginTop: 14 }}>
              <div className="sectionHead">Why it matters before Analyze</div>
              <div className="detailLine">
                Analyze checks the actual highlighted text region on a cover. This quiz prepares
                you to understand why the tool might praise some choices and challenge others.
                For example, a mood-led answer can still be valid design thinking, but it often
                means you should expect more contrast, clutter, or safe-area warnings later.
              </div>
            </div>

            <div className="testProgressWrap">
              <div className="testProgressBar" aria-label="Quiz progress">
                <div className="testProgressFill" style={{ width: `${progress}%` }} />
              </div>
              <div className="miniHint" style={{ marginTop: 10 }}>
                {answeredCount}/{totalCount} answered
              </div>
            </div>
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Question categories</div>
            <div className="panelNote">
              Filter the view for easier navigation. Results still use all answers across the whole quiz.
            </div>
          </div>

          <div className="panelBody">
            <div className="pillRow">
              {categories.map((category) => {
                const remaining = unansweredInCategory(category);
                return (
                  <button
                    key={category}
                    className={`pillBtn ${activeCategory === category ? "on" : ""}`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                    {category !== "All" ? ` • ${remaining} left` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Questions</div>
            <div className="panelNote">
              Pick one option per question. Each card now explains what the question is testing and why it matters in the main analysis tools.
            </div>
          </div>

          <div className="panelBody">
            <div className="testQuestionsGrid">
              {filteredQuestions.map((q) => {
                const selected = answers[q.id];
                const absoluteIndex = QUESTIONS.findIndex((item) => item.id === q.id);
                return (
                  <div key={q.id} className="testQuestion sectionBlock">
                    <div className="testQuestionTop">
                      <div
                        className="sectionHead"
                        style={{ fontSize: "1.22rem", lineHeight: 1.3, fontWeight: 700 }}
                      >
                        Q{absoluteIndex + 1} — {q.title}
                      </div>
                      <span className="tag">{q.category}</span>
                    </div>

                    <div
                      className="detailLine testPrompt"
                      style={{ fontSize: "1.06rem", lineHeight: 1.65, marginTop: 10 }}
                    >
                      {q.prompt}
                    </div>

                    <div className="twoCol" style={{ marginTop: 14, gap: 12 }}>
                      <div className="sectionBlock" style={{ margin: 0, padding: 14 }}>
                        <div className="sectionHead" style={{ fontSize: "0.92rem" }}>
                          What this question is testing
                        </div>
                        <div className="detailLine" style={{ marginTop: 8 }}>
                          {q.whatItTests}
                        </div>
                      </div>

                      <div className="sectionBlock" style={{ margin: 0, padding: 14 }}>
                        <div className="sectionHead" style={{ fontSize: "0.92rem" }}>
                          Why it matters in Analyze
                        </div>
                        <div className="detailLine" style={{ marginTop: 8 }}>
                          {q.whyItMatters}
                        </div>
                      </div>
                    </div>

                    <div className="testOptionGrid" style={{ marginTop: 16 }}>
                      {q.options.map((opt, oi) => {
                        const on = selected === oi;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            className={`testOptionCard ${on ? "on" : ""}`}
                            onClick={() => {
                              setAnswers((a) => ({ ...a, [q.id]: oi }));
                              setShowResults(false);
                            }}
                          >
                            <div className="testOptionLabel" style={{ fontSize: "1rem", fontWeight: 700 }}>
                              {opt.label}
                            </div>
                            <div className="testOptionDetail" style={{ lineHeight: 1.55 }}>
                              {opt.detail}
                            </div>
                            <div className="miniHint" style={{ marginTop: 10 }}>
                              Readability tendency: <b>{Math.round(opt.readability * 100)}/100</b> • Crop risk tendency:{" "}
                              <b>{Math.round(opt.cropRisk * 100)}/100</b>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selected !== undefined && (
                      <div className="miniHint testSelected" style={{ marginTop: 14, lineHeight: 1.6 }}>
                        <b>Selected:</b> {q.options[selected].detail}
                        <br />
                        <span>
                          This answer will contribute to your overall profile mix, readability tendency, and crop-risk tendency once all answers are combined.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="testFinishBar">
              <div className="metaRow">
                <span className="tag">answered: {answeredCount}/{totalCount}</span>
                <span className="tag">{allAnswered ? "ready to unlock" : "complete all questions"}</span>
              </div>

              <button
                className="primaryBtn"
                disabled={!allAnswered}
                onClick={() => setShowResults(true)}
                title={!allAnswered ? "Answer all questions to unlock results" : "View your profile"}
              >
                VIEW RESULTS
              </button>
            </div>

            {!allAnswered && (
              <div className="miniHint testUnlockHint">
                Results unlock when every question has an answer.
              </div>
            )}
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Results</div>
            <div className="panelNote">
              {showResults && allAnswered
                ? "Your profile, blended tendency, likely strengths, likely risks, and recommended next steps."
                : "Locked until complete."}
            </div>
          </div>

          <div className="panelBody">
            {!showResults || !allAnswered ? (
              <div className="sectionBlock">
                <div className="sectionHead">Locked</div>
                <div className="miniHint">
                  Finish all <b>{totalCount}</b> questions, then click <b>VIEW RESULTS</b>.
                </div>

                <div className="testProgressBar" aria-label="Quiz progress">
                  <div className="testProgressFill" style={{ width: `${progress}%` }} />
                </div>

                <div className="miniHint" style={{ marginTop: 10 }}>
                  {answeredCount}/{totalCount} answered
                </div>

                <div className="testActionsRow">
                  <button className="ghostBtn" onClick={resetAll}>
                    RESET
                  </button>
                  <button className="ghostBtn" onClick={() => navigate("/analyze")}>
                    GO TO ANALYZE
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="testResultHero">
                  <div className="sectionBlock">
                    <div className="sectionHead">Primary profile</div>
                    <div className="testResultTitle">{profile.name}</div>
                    <div className="miniSub" style={{ marginTop: 8 }}>
                      {profile.subtitle}
                    </div>
                    <div className="detailLine" style={{ marginTop: 14, lineHeight: 1.65 }}>
                      {profile.detailedRead}
                    </div>
                    <div className="miniHint" style={{ marginTop: 12 }}>
                      Secondary tendency: <b>{runnerUpName}</b>
                    </div>
                    <div className="miniHint">
                      Blend reading: <b>{blendText}</b>
                    </div>
                  </div>

                  <div className="testResultMetrics">
                    <div className="miniCard">
                      <div className="miniLabel">Thumbnail readability</div>
                      <div className="miniValue">{computed.readability}/100</div>
                      <div className="miniSub">{readabilityLabel(computed.readability)}</div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Crop / safe-area risk</div>
                      <div className="miniValue">{computed.cropRisk}/100</div>
                      <div className="miniSub">{riskLabel(computed.cropRisk)} risk</div>
                    </div>
                  </div>
                </div>

                <div className="twoCol" style={{ marginTop: 16 }}>
                  <div className="sectionBlock">
                    <div className="sectionHead">How to read these results</div>
                    <ul className="testList">
                      <li>A higher readability tendency suggests your instincts already support small-size performance.</li>
                      <li>A higher crop-risk tendency suggests you should check safe area and edge placement earlier.</li>
                      <li>A mixed profile usually means your best work comes from balancing clarity with concept, not choosing one extreme.</li>
                    </ul>
                  </div>

                  <div className="sectionBlock">
                    <div className="sectionHead">Main tendency summary</div>
                    <div className="detailLine" style={{ lineHeight: 1.65 }}>
                      Your dominant pattern points toward <b>{profileTone(computed.top)}</b>. The runner-up profile of <b>{runnerUpName}</b> suggests your work also carries some secondary traits, which is why the result is shown as a blended reading rather than a fixed label.
                    </div>
                  </div>
                </div>

                <div className="sectionBlock">
                  <div className="sectionHead">Profile mix</div>
                  <div className="testBreakdown">
                    {computed.breakdown.map((b) => (
                      <div key={b.key} className="testBarRow">
                        <div className="testBarLabel">
                          {PROFILE_COPY[b.key].name}
                          <span className="testBarShare">{b.share}%</span>
                        </div>
                        <div className="testBarTrack">
                          <div className="testBarFill" style={{ width: pct(b.pct) }} />
                        </div>
                        <div className="testBarValue">{b.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="twoCol">
                  <div className="sectionBlock">
                    <div className="sectionHead">Answers that most support readability</div>
                    <ul className="testList">
                      {computed.strongestReadability.map(({ question, option }) => (
                        <li key={`${question.id}-read`}>
                          <b>{question.title}:</b> {option.label} — {option.detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="sectionBlock">
                    <div className="sectionHead">Answers that may need extra checking</div>
                    <ul className="testList">
                      {computed.strongestRisk.map(({ question, option }) => (
                        <li key={`${question.id}-risk`}>
                          <b>{question.title}:</b> {option.label} — {option.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="twoCol">
                  <div className="sectionBlock">
                    <div className="sectionHead">Strengths</div>
                    <ul className="testList">
                      {profile.strengths.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="sectionBlock">
                    <div className="sectionHead">Watch-outs</div>
                    <ul className="testList">
                      {profile.watchouts.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="twoCol">
                  <div className="sectionBlock">
                    <div className="sectionHead">Profile tips</div>
                    <ul className="testList">
                      {profile.tips.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="sectionBlock">
                    <div className="sectionHead">Interpretation</div>
                    <ul className="testList">
                      <li>
                        A strong readability result does not automatically mean the design is better overall; it means the cover is more likely to survive reduction and quick scanning.
                      </li>
                      <li>
                        A higher risk result does not automatically mean failure; it often indicates a concept-led design that needs more deliberate protection around placement, contrast, or clutter.
                      </li>
                      <li>
                        The most useful next step is to compare your instinct with the actual metrics in Analyze and see where they support or challenge each other.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="sectionBlock">
                  <div className="sectionHead">What to do next in CoverCheck</div>
                  <ul className="testList">
                    {profile.nextInTool.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>

                  <div className="testActionsRow">
                    <button className="primaryBtn" onClick={() => navigate("/analyze")}>
                      GO TO ANALYZE
                    </button>
                    <button className="ghostBtn" onClick={() => navigate("/compare")}>
                      OPEN COMPARE
                    </button>
                    <button className="ghostBtn" onClick={() => navigate("/mockups")}>
                      OPEN MOCKUPS
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}