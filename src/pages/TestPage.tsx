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
  title: string;
  prompt: string;
  options: Option[];
};

const Z: Scores = { minimal: 0, bold: 0, photo: 0, experimental: 0 };

const QUESTIONS: Question[] = [
  {
    id: "type-weight",
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
        readability: 0.60,
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
    id: "bg-busyness",
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
        readability: 0.60,
        cropRisk: 0.32,
      },
      {
        label: "Busy / graphic",
        detail: "Patterns, collage, heavy texture.",
        scores: { minimal: 0, bold: 1, photo: 0, experimental: 3 },
        readability: 0.40,
        cropRisk: 0.55,
      },
    ],
  },
  {
    id: "contrast",
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
        readability: 0.50,
        cropRisk: 0.35,
      },
      {
        label: "Ambiguity is OK",
        detail: "Legibility is secondary to concept.",
        scores: { minimal: 0, bold: 0, photo: 0, experimental: 3 },
        readability: 0.32,
        cropRisk: 0.50,
      },
    ],
  },
  {
    id: "placement",
    title: "Title placement",
    prompt: "Where do you naturally place the title/artist?",
    options: [
      {
        label: "Centered safe zone",
        detail: "Away from edges; survives crop + UI overlays.",
        scores: { minimal: 3, bold: 2, photo: 1, experimental: 0 },
        readability: 0.90,
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
        cropRisk: 0.50,
      },
    ],
  },
  {
    id: "overlay",
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
        readability: 0.50,
        cropRisk: 0.42,
      },
    ],
  },
  {
    id: "color-approach",
    title: "Color approach",
    prompt: "How do you like choosing type/accent colors?",
    options: [
      {
        label: "Neutral palette",
        detail: "Grays/black/white; quiet luxury.",
        scores: { minimal: 3, bold: 1, photo: 1, experimental: 0 },
        readability: 0.80,
        cropRisk: 0.20,
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
        cropRisk: 0.30,
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
    id: "logo-density",
    title: "Info density",
    prompt: "How much “extra info” do you want on the cover?",
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
    id: "platform",
    title: "Platform priority",
    prompt: "Which matters more for this project?",
    options: [
      {
        label: "Streaming thumbnails",
        detail: "64–128px performance is critical.",
        scores: { minimal: 2, bold: 3, photo: 0, experimental: 0 },
        readability: 0.92,
        cropRisk: 0.20,
      },
      {
        label: "Balanced",
        detail: "Works for streaming + social + posters.",
        scores: { minimal: 3, bold: 2, photo: 2, experimental: 0 },
        readability: 0.80,
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
        readability: 0.50,
        cropRisk: 0.42,
      },
    ],
  },
  {
    id: "goal",
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
    strengths: ["Clear structure and spacing", "Usually passes safe-area checks", "Often reads well at small sizes"],
    watchouts: ["Can look too quiet in crowded feeds", "Low-contrast choices can still fail"],
    tips: [
      "Target contrast ≥ 4.5 in your title region",
      "Use the safe-area guide as a boundary for all critical text",
      "Use a single controlled accent from the palette (labels, badges, UI)",
    ],
    nextInTool: [
      "On Analyze: draw a title/artist box and aim for Safe score ≥ 95",
      "Toggle THUMBS and check 128px + 64px readability",
      "If contrast is borderline, try “Best text” + add a subtle overlay behind type",
    ],
  },
  bold: {
    name: "Bold / Contrast-led",
    subtitle: "Legibility-first decisions for strong thumbnail performance.",
    strengths: ["High survivability at 64–128px", "Clear contrast decisions", "Robust across crops/platforms"],
    watchouts: ["Can overpower artwork", "Too many accents can look noisy"],
    tips: [
      "If the background is busy, add a soft overlay behind the title",
      "Use the suggested Best text chip to maximize contrast",
      "Re-check clutter: move type away from high-detail textures",
    ],
    nextInTool: [
      "On Analyze: keep clutter ≥ 60/100 in the text region (move box if needed)",
      "Use SAFE AREA toggle and avoid corners for small type/logos",
      "Generate Report for documentation once you’ve passed Contrast + Safe",
    ],
  },
  photo: {
    name: "Photographic / Mood-led",
    subtitle: "Image-first decisions with type harmonized to artwork.",
    strengths: ["Strong mood and storytelling", "Premium when placed carefully", "Natural color harmony"],
    watchouts: ["Type can fight background clutter", "Edge placements often fail crops/safe-area"],
    tips: [
      "Pick the calmest region (lower clutter) for type placement",
      "Use subtle gradients instead of solid blocks",
      "Avoid small type near corners/edges",
    ],
    nextInTool: [
      "On Analyze: move the region until clutter improves, then re-check contrast",
      "Try FULL VIEW for composition, then return to CROP VIEW for realism",
      "Use compatible palette suggestions (analogous/triadic) for accents without breaking mood",
    ],
  },
  experimental: {
    name: "Experimental / Texture-led",
    subtitle: "Distinctive concepts, trading some clarity for character.",
    strengths: ["Memorable and unique", "Conceptually strong", "Great for print-like covers"],
    watchouts: ["High risk at tiny thumbnails", "Safe-area and clutter failures are common"],
    tips: [
      "Use safe-area lines aggressively for critical text",
      "If contrast is low, add a 20–40% overlay behind key type",
      "Test at 64px; if unreadable, simplify behind text or increase weight",
    ],
    nextInTool: [
      "On Analyze: treat 64px as the pass/fail gate and iterate until readable",
      "Keep critical text inside SAFE AREA even if the design breaks rules elsewhere",
      "Use Generate Report to document tradeoffs (concept vs readability) for your dissertation",
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

export default function TestPage() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

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
    const breakdown = PROFILE_ORDER.map((k) => ({
      key: k,
      value: totals[k],
      pct: (totals[k] / max) * 100,
    }));

    return { totals, top, runnerUp, readability, cropRisk, breakdown };
  }, [answers]);

  const profile = PROFILE_COPY[computed.top];
  const runnerUpName = PROFILE_COPY[computed.runnerUp].name;

  function resetAll() {
    setAnswers({});
    setShowResults(false);
  }

  return (
    <div className="analyzeWrap testPage">
      {/* HERO (no big “box” — just content over your gradient) */}
      <div className="testHero">
        <div className="testHeroTop">
          <button className="ghostBtn" onClick={() => navigate("/play")}>
            ← BACK
          </button>

          <div className="testHeroTools">
            <span className={`statusTag ${allAnswered ? "pass" : "fail"}`}>
              {answeredCount}/{totalCount} • {progress}%
            </span>
            <button className="ghostBtn" onClick={resetAll}>
              RESET
            </button>
          </div>
        </div>

        <div className="testKicker">COVERCHECK</div>
        <h1 className="testTitle">Test</h1>
        <p className="testLead">
          This is a short design-tendency quiz that helps you interpret CoverCheck’s metrics (contrast, clutter, safe-area
          risk). Your result doesn’t “judge” design — it highlights likely strengths, tradeoffs, and what to focus on in
          the Analyze tool.
        </p>
        <div className="testRule" />
      </div>

      {/* STACKED PANELS with consistent spacing */}
      <div className="testStack">
        {/* 1) Explanation */}
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">How it works & why it helps</div>
            <div className="panelNote">Answer all questions. Results unlock only when the quiz is complete.</div>
          </div>

          <div className="panelBody">
            <div className="twoCol">
              <div className="sectionBlock">
                <div className="sectionHead">How it works</div>
                <ul className="testList">
                  <li>You answer {totalCount} questions about type, contrast, placement, and color strategy.</li>
                  <li>We estimate a profile: Minimal / Bold / Photographic / Experimental.</li>
                  <li>We also estimate two tendencies: thumbnail readability and crop/safe-area risk.</li>
                </ul>
              </div>

              <div className="sectionBlock">
                <div className="sectionHead">How to use it on Analyze</div>
                <ul className="testList">
                  <li>Draw a region around the title/artist area and check Contrast + Clutter targets.</li>
                  <li>Turn on SAFE AREA to avoid edge clipping (rounded corners + overlays).</li>
                  <li>Use THUMBS (256/128/64) as the reality check.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 2) Quiz */}
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Questions</div>
            <div className="panelNote">Pick one option per question. You must answer all to unlock results.</div>
          </div>

          <div className="panelBody">
            <div className="testQuestionsGrid">
              {QUESTIONS.map((q, qi) => {
                const selected = answers[q.id];
                return (
                  <div key={q.id} className="testQuestion sectionBlock">
                    <div className="sectionHead">
                      Q{qi + 1} — {q.title}
                    </div>

                    <div className="detailLine testPrompt">{q.prompt}</div>

                    <div className="testOptionRow">
                      {q.options.map((opt, oi) => {
                        const on = selected === oi;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            className={`pillBtn ${on ? "on" : ""}`}
                            onClick={() => {
                              setAnswers((a) => ({ ...a, [q.id]: oi }));
                              setShowResults(false);
                            }}
                            title={opt.detail}
                          >
                            {opt.label}
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
                <span className="tag">{allAnswered ? "ready" : "complete to unlock"}</span>
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

        {/* 3) Results */}
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Results</div>
            <div className="panelNote">{showResults && allAnswered ? "Based on your answers." : "Locked until complete."}</div>
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
                <div className="sectionBlock">
                  <div className="sectionHead">Your profile</div>
                  <div className="testResultTitle">{profile.name}</div>
                  <div className="miniSub" style={{ marginTop: 8 }}>
                    {profile.subtitle}
                  </div>
                  <div className="miniHint" style={{ marginTop: 10 }}>
                    Secondary tendency: <b>{runnerUpName}</b>
                  </div>
                </div>

                <div className="twoCol">
                  <div className="miniCard">
                    <div className="miniLabel">Thumbnail readability</div>
                    <div className="miniValue">{computed.readability}/100</div>
                    <div className="miniSub">Higher tends to survive 64–128px better.</div>
                  </div>

                  <div className="miniCard">
                    <div className="miniLabel">Crop / safe-area risk</div>
                    <div className="miniValue">{computed.cropRisk}/100</div>
                    <div className="miniSub">Higher means edge placements often fail crops.</div>
                  </div>
                </div>

                <div className="sectionBlock">
                  <div className="sectionHead">Score breakdown</div>
                  <div className="testBreakdown">
                    {computed.breakdown.map((b) => (
                      <div key={b.key} className="testBarRow">
                        <div className="testBarLabel">{PROFILE_COPY[b.key].name}</div>
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

                <div className="sectionBlock">
                  <div className="sectionHead">Tips (based on your profile)</div>
                  <ul className="testList">
                    {profile.tips.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
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
