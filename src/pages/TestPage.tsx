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
  options: Option[];
};

const Z: Scores = { minimal: 0, bold: 0, photo: 0, experimental: 0 };

const QUESTIONS: Question[] = [
  {
    id: "type-weight",
    category: "Typography",
    title: "Typography weight",
    prompt: "When the cover is tiny (64–128px), how should the title feel?",
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
    prompt: "Your natural preference for title size on a cover:",
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
    prompt: "How do you prefer letter spacing in title treatments?",
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
    prompt: "Behind the title area, what background do you prefer?",
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
    prompt: "How should the title separate from its background?",
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
    prompt: "Where do you naturally place the title/artist?",
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
    prompt: "Would you use an overlay behind text for readability?",
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
    prompt: "How do you like choosing type/accent colors?",
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
    prompt: "What should visually dominate first?",
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
    prompt: "How much extra information do you want on the cover?",
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
    prompt: "How do you feel about empty space around type?",
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
    prompt: "How should the composition feel structurally?",
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
    prompt: "Which matters more for this project?",
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
    prompt: "What matters most for the title/artist area?",
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
    prompt: "When refining a cover, how do you usually work?",
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
  }
> = {
  minimal: {
    name: "Minimal / Typographic",
    subtitle: "Calm hierarchy, controlled spacing, predictable readability.",
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

    return { totals, top, runnerUp, readability, cropRisk, breakdown };
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

        <div className="testKicker"> Design Interpretation</div>
        <h1 className="testTitle">Test</h1>
        <p className="testLead">
          This design-tendency quiz helps interpret your likely strengths and tradeoffs
          before using Analyze. It does not judge good or bad design — it helps explain
          whether your instincts lean toward clarity, mood, structure, or experimentation.
        </p>

        <div className="testHeroStats">
          <div className="miniCard">
            <div className="miniLabel">Questions</div>
            <div className="miniValue">{totalCount}</div>
            <div className="miniSub">Expanded for more varied outcomes</div>
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
              Answer all questions to reveal a richer design profile and practical next steps.
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
                <div className="sectionHead">Why it matters</div>
                <ul className="testList">
                  <li>Some cover instincts naturally support thumbnail performance.</li>
                  <li>Others are stronger for mood, texture, or concept, but need more correction later.</li>
                  <li>This helps you interpret Analyze results as design tradeoffs, not just “fail/pass” numbers.</li>
                </ul>
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
              Pick one option per question. Hover or read the selected detail for nuance.
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
                      <div className="sectionHead">
                        Q{absoluteIndex + 1} — {q.title}
                      </div>
                      <span className="tag">{q.category}</span>
                    </div>

                    <div className="detailLine testPrompt">{q.prompt}</div>

                    <div className="testOptionGrid">
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
                            <div className="testOptionLabel">{opt.label}</div>
                            <div className="testOptionDetail">{opt.detail}</div>
                          </button>
                        );
                      })}
                    </div>

                    {selected !== undefined && (
                      <div className="miniHint testSelected">
                        <b>Selected:</b> {q.options[selected].detail}
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
                ? "Your profile, blended tendency, and suggested next steps."
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
                        A higher readability tendency suggests your instincts already support small-size performance.
                      </li>
                      <li>
                        A higher crop-risk tendency suggests you should check safe area and edge placement earlier.
                      </li>
                      <li>
                        A mixed profile usually means your best work comes from balancing clarity with concept, not choosing one extreme.
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