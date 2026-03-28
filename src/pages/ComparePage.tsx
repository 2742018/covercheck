
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import {
  computePalette,
  type NormalizedRect,
  type PaletteResult,
} from "../analysis/metrics";
import {
  computeCompositionMetrics,
  type CompositionMetrics,
  type CompositionHighlight,
} from "../analysis/composition";
import {
  evaluatePrintToDigital,
  type PrintDigitalInput,
  type PrintDigitalResult,
  type PrintDigitalFactor,
} from "../lib/printtodigital";
import { Printer } from "lucide-react";

type CompareState = {
  leftDataUrl?: string;
  rightDataUrl?: string;
};

type FocusMode = "split" | "left" | "right";
type AssistMode = "auto" | "manual" | "both";

type AutoCompareSummary = {
  palette: PaletteResult;
  composition: CompositionMetrics;
  natural: { w: number; h: number };
};

type SideKey = "A" | "B";
type CompareDirection = "higher" | "lower" | "similar";

type MetricBreakdown = {
  key: string;
  title: string;
  leftValue: string;
  rightValue: string;
  winner: "A" | "B" | "tie";
  detail: string;
  whyItMatters: string;
};

type CompareInsight = {
  title: string;
  winner: "A" | "B" | "tie";
  detail: string;
  whyItMatters: string;
};

type VersionAction = {
  title: string;
  detail: string;
  priority: number;
};

async function loadFromFile(file: File) {
  return await fileToObjectUrl(file);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function buildAnalysisImageData(dataUrl: string, maxDim = 1024) {
  const img = await loadImage(dataUrl);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;

  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, w, h);

  return {
    imageData: ctx.getImageData(0, 0, w, h),
    natural: { w: w0, h: h0 },
  };
}

function compareNumber(a: number, b: number, threshold = 6): CompareDirection {
  const diff = a - b;
  if (Math.abs(diff) < threshold) return "similar";
  return diff > 0 ? "higher" : "lower";
}

function winnerFromCompare(direction: CompareDirection): "A" | "B" | "tie" {
  if (direction === "higher") return "A";
  if (direction === "lower") return "B";
  return "tie";
}

function pickBetter(
  a: number,
  b: number,
  preference: "higher" | "lower",
  threshold = 4
): "A" | "B" | "tie" {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "tie";
  const diff = a - b;
  if (Math.abs(diff) < threshold) return "tie";
  if (preference === "higher") return diff > 0 ? "A" : "B";
  return diff < 0 ? "A" : "B";
}

function buildAutoComparisonText(
  left: AutoCompareSummary,
  right: AutoCompareSummary
) {
  const out: string[] = [];

  const leftLum = left.composition.lightDark.averageLuminance;
  const rightLum = right.composition.lightDark.averageLuminance;
  const leftTex = left.composition.texture.energy;
  const rightTex = right.composition.texture.energy;
  const leftSym = left.composition.symmetry.score;
  const rightSym = right.composition.symmetry.score;
  const leftWarm = left.composition.colorBalance.warmPct;
  const rightWarm = right.composition.colorBalance.warmPct;
  const leftSatSpread = left.composition.colorBalance.saturationSpread;
  const rightSatSpread = right.composition.colorBalance.saturationSpread;

  const lumCompare = compareNumber(leftLum, rightLum, 5);
  const texCompare = compareNumber(leftTex, rightTex, 6);
  const symCompare = compareNumber(leftSym, rightSym, 6);
  const warmCompare = compareNumber(leftWarm, rightWarm, 8);
  const satCompare = compareNumber(leftSatSpread, rightSatSpread, 8);

  if (lumCompare === "higher") {
    out.push("Version A appears lighter overall, while Version B appears darker.");
  } else if (lumCompare === "lower") {
    out.push("Version B appears lighter overall, while Version A appears darker.");
  } else {
    out.push("Both versions have broadly similar overall brightness.");
  }

  if (texCompare === "higher") {
    out.push("Version A appears more textured or visually busy, while Version B feels calmer.");
  } else if (texCompare === "lower") {
    out.push("Version B appears more textured or visually busy, while Version A feels calmer.");
  } else {
    out.push("Both versions have a similar level of texture and visual complexity.");
  }

  if (symCompare === "higher") {
    out.push("Version A appears more symmetrical or balanced than Version B.");
  } else if (symCompare === "lower") {
    out.push("Version B appears more symmetrical or balanced than Version A.");
  } else {
    out.push("Both versions appear similarly balanced in terms of symmetry.");
  }

  if (warmCompare === "higher") {
    out.push("Version A leans warmer in colour mood, while Version B leans cooler or more neutral.");
  } else if (warmCompare === "lower") {
    out.push("Version B leans warmer in colour mood, while Version A leans cooler or more neutral.");
  } else {
    out.push("Both versions sit in a similar warm/cool colour range.");
  }

  if (satCompare === "higher") {
    out.push("Version A shows a wider saturation spread, which may feel more dynamic or visually varied.");
  } else if (satCompare === "lower") {
    out.push("Version B shows a wider saturation spread, which may feel more dynamic or visually varied.");
  } else {
    out.push("Both versions have a similar level of colour variation.");
  }

  return out;
}

function buildRecommendationText(
  left: AutoCompareSummary,
  right: AutoCompareSummary
) {
  const suggestions: string[] = [];

  const texCompare = compareNumber(
    left.composition.texture.energy,
    right.composition.texture.energy,
    6
  );
  const symCompare = compareNumber(
    left.composition.symmetry.score,
    right.composition.symmetry.score,
    6
  );
  const lumCompare = compareNumber(
    left.composition.lightDark.averageLuminance,
    right.composition.lightDark.averageLuminance,
    5
  );

  if (texCompare === "higher") {
    suggestions.push("Choose Version A if you want a denser, more textured direction. Choose Version B if you want a calmer, cleaner presentation.");
  } else if (texCompare === "lower") {
    suggestions.push("Choose Version B if you want a denser, more textured direction. Choose Version A if you want a calmer, cleaner presentation.");
  }

  if (symCompare === "higher") {
    suggestions.push("Version A may feel more stable or formally balanced, while Version B may feel looser or more expressive.");
  } else if (symCompare === "lower") {
    suggestions.push("Version B may feel more stable or formally balanced, while Version A may feel looser or more expressive.");
  }

  if (lumCompare === "higher") {
    suggestions.push("Version A may read more openly or lightly; Version B may feel heavier or moodier.");
  } else if (lumCompare === "lower") {
    suggestions.push("Version B may read more openly or lightly; Version A may feel heavier or moodier.");
  }

  if (!suggestions.length) {
    suggestions.push("The two versions are fairly close overall, so the final decision may depend more on context, title treatment, and genre fit.");
  }

  return suggestions;
}

function derivePrintDigitalInput(summary: AutoCompareSummary | null): PrintDigitalInput {
  if (!summary) {
    return {
      textDensity: "medium",
      edgeRisk: "medium",
      focalClarity: "medium",
      detailDensity: "medium",
      posterStyle: "balanced",
    };
  }

  const texture = summary.composition.texture.energy;
  const symmetry = summary.composition.symmetry.score;
  const luminance = summary.composition.lightDark.averageLuminance;

  const detailDensity: PrintDigitalInput["detailDensity"] =
    texture >= 67 ? "high" : texture >= 40 ? "medium" : "low";

  const focalClarity: PrintDigitalInput["focalClarity"] =
    symmetry >= 70 ? "high" : symmetry >= 45 ? "medium" : "low";

  const textDensity: PrintDigitalInput["textDensity"] =
    texture >= 70 ? "high" : texture >= 42 ? "medium" : "low";

  const edgeRisk: PrintDigitalInput["edgeRisk"] =
    symmetry < 38 ? "high" : symmetry < 55 ? "medium" : "low";

  const posterStyle: PrintDigitalInput["posterStyle"] =
    texture >= 72 ? "dense" : luminance > 68 || luminance < 32 ? "minimal" : "balanced";

  return {
    textDensity,
    edgeRisk,
    focalClarity,
    detailDensity,
    posterStyle,
  };
}

function buildMetricBreakdown(
  left: AutoCompareSummary,
  right: AutoCompareSummary
): MetricBreakdown[] {
  const leftComp = left.composition;
  const rightComp = right.composition;

  const luminanceWinner = pickBetter(
    Math.abs(leftComp.lightDark.averageLuminance - 50),
    Math.abs(rightComp.lightDark.averageLuminance - 50),
    "lower",
    5
  );

  const textureWinner = pickBetter(
    leftComp.texture.energy,
    rightComp.texture.energy,
    "lower",
    6
  );

  const symmetryWinner = pickBetter(
    leftComp.symmetry.score,
    rightComp.symmetry.score,
    "higher",
    6
  );

  const saturationWinner = pickBetter(
    leftComp.colorBalance.saturationSpread,
    rightComp.colorBalance.saturationSpread,
    "lower",
    8
  );

  const toneSpreadWinner = pickBetter(
    leftComp.lightDark.luminanceSpread,
    rightComp.lightDark.luminanceSpread,
    "lower",
    6
  );

  return [
    {
      key: "luminance",
      title: "Overall tone",
      leftValue: `${leftComp.lightDark.label} • ${leftComp.lightDark.averageLuminance}%`,
      rightValue: `${rightComp.lightDark.label} • ${rightComp.lightDark.averageLuminance}%`,
      winner: luminanceWinner,
      detail:
        luminanceWinner === "tie"
          ? "Both versions sit in a similar overall value range."
          : luminanceWinner === "A"
            ? "Version A sits closer to a middle value range, so it is likely to be more flexible across dark and light viewing contexts."
            : "Version B sits closer to a middle value range, so it is likely to be more flexible across dark and light viewing contexts.",
      whyItMatters:
        "Covers that lean extremely dark or light can be striking, but they also make text value choices more sensitive at small size.",
    },
    {
      key: "texture",
      title: "Surface calmness",
      leftValue: `${leftComp.texture.label} • ${leftComp.texture.energy}/100`,
      rightValue: `${rightComp.texture.label} • ${rightComp.texture.energy}/100`,
      winner: textureWinner,
      detail:
        textureWinner === "tie"
          ? "Both versions carry a similar amount of edge activity."
          : textureWinner === "A"
            ? "Version A gives typography a calmer surface to sit on."
            : "Version B gives typography a calmer surface to sit on.",
      whyItMatters:
        "Lower texture usually makes title and artist regions easier to preserve, especially when the cover is reduced.",
    },
    {
      key: "symmetry",
      title: "Structural balance",
      leftValue: `${leftComp.symmetry.label} • ${leftComp.symmetry.score}/100`,
      rightValue: `${rightComp.symmetry.label} • ${rightComp.symmetry.score}/100`,
      winner: symmetryWinner,
      detail:
        symmetryWinner === "tie"
          ? "Both versions show a similar level of left/right balance."
          : symmetryWinner === "A"
            ? "Version A reads as more formally structured and stable."
            : "Version B reads as more formally structured and stable.",
      whyItMatters:
        "Higher balance often helps a cover feel resolved and easier to scan quickly, while lower balance can feel more expressive or directional.",
    },
    {
      key: "toneSpread",
      title: "Luminance spread",
      leftValue: `${leftComp.lightDark.luminanceSpread}/100`,
      rightValue: `${rightComp.lightDark.luminanceSpread}/100`,
      winner: toneSpreadWinner,
      detail:
        toneSpreadWinner === "tie"
          ? "Both versions show a similar level of tone range."
          : toneSpreadWinner === "A"
            ? "Version A has a tighter tone range, so it may feel more controlled but may need stronger focal separation."
            : "Version B has a tighter tone range, so it may feel more controlled but may need stronger focal separation.",
      whyItMatters:
        "Tone spread affects whether the cover feels flat, dramatic, unified, or unstable before typography is added.",
    },
    {
      key: "saturation",
      title: "Colour spread",
      leftValue: `${leftComp.colorBalance.label} • ${leftComp.colorBalance.saturationSpread}/100`,
      rightValue: `${rightComp.colorBalance.label} • ${rightComp.colorBalance.saturationSpread}/100`,
      winner: saturationWinner,
      detail:
        saturationWinner === "tie"
          ? "Both versions vary colour intensity in a similar way."
          : saturationWinner === "A"
            ? "Version A keeps colour intensity more controlled, which may make hierarchy easier to preserve."
            : "Version B keeps colour intensity more controlled, which may make hierarchy easier to preserve.",
      whyItMatters:
        "A wider saturation spread can feel lively, but it can also split attention and make small-scale communication less stable.",
    },
    {
      key: "warmth",
      title: "Temperature direction",
      leftValue: `${leftComp.colorBalance.warmPct}% warm / ${leftComp.colorBalance.coolPct}% cool`,
      rightValue: `${rightComp.colorBalance.warmPct}% warm / ${rightComp.colorBalance.coolPct}% cool`,
      winner: winnerFromCompare(compareNumber(leftComp.colorBalance.warmPct, rightComp.colorBalance.warmPct, 8)),
      detail:
        compareNumber(leftComp.colorBalance.warmPct, rightComp.colorBalance.warmPct, 8) === "similar"
          ? "Both versions sit in a similar temperature range."
          : compareNumber(leftComp.colorBalance.warmPct, rightComp.colorBalance.warmPct, 8) === "higher"
            ? "Version A leans warmer, while Version B feels cooler or more neutral."
            : "Version B leans warmer, while Version A feels cooler or more neutral.",
      whyItMatters:
        "Temperature shifts can change genre fit, emotional tone, and perceived energy even when the layout stays similar.",
    },
  ];
}

function buildComparisonInsights(
  left: AutoCompareSummary,
  right: AutoCompareSummary,
  leftDigital: PrintDigitalResult,
  rightDigital: PrintDigitalResult
): CompareInsight[] {
  const metrics = buildMetricBreakdown(left, right);
  const digitalWinner =
    leftDigital.score === rightDigital.score
      ? "tie"
      : leftDigital.score > rightDigital.score
        ? "A"
        : "B";

  const summaryWinner = metrics
    .filter((item) => item.winner !== "tie")
    .sort((a, b) => {
      const aWeight = a.key === "texture" || a.key === "symmetry" ? 2 : 1;
      const bWeight = b.key === "texture" || b.key === "symmetry" ? 2 : 1;
      return bWeight - aWeight;
    })
    .slice(0, 3);

  const insights: CompareInsight[] = summaryWinner.map((item) => ({
    title: item.title,
    winner: item.winner,
    detail: item.detail,
    whyItMatters: item.whyItMatters,
  }));

  insights.unshift({
    title: "Digital translation",
    winner: digitalWinner,
    detail:
      digitalWinner === "tie"
        ? "Both versions appear similarly positioned for streaming-scale use."
        : digitalWinner === "A"
          ? "Version A appears more likely to survive the shift from richer full-size viewing to faster digital scanning."
          : "Version B appears more likely to survive the shift from richer full-size viewing to faster digital scanning.",
    whyItMatters:
      "This estimate combines focal clarity, edge risk, text density, detail density, and poster-style dependence.",
  });

  return insights;
}

function buildVersionActions(
  version: SideKey,
  summary: AutoCompareSummary | null,
  digital: PrintDigitalResult
): VersionAction[] {
  const out: VersionAction[] = [];

  if (!summary) return out;

  const add = (title: string, detail: string, priority: number) => {
    if (!out.some((item) => item.title === title)) {
      out.push({ title, detail, priority });
    }
  };

  summary.composition.highlights.forEach((item: CompositionHighlight) => {
    add(item.title, item.detail, item.priority);
  });

  if (digital.primaryConcern) {
    add(
      "Primary digital risk",
      digital.primaryConcern,
      96
    );
  }

  digital.recommendations.slice(0, 3).forEach((item, idx) => {
    add(`Improve next ${idx + 1}`, item, 86 - idx * 6);
  });

  if (summary.composition.texture.energy > 48) {
    add(
      "Reduce texture behind important information",
      `Version ${version} carries high surface activity. If title or artist text is added later, it will need stronger separation than usual.`,
      90
    );
  }

  if (summary.composition.lightDark.label !== "Mid") {
    add(
      "Protect text against global tone",
      `Version ${version} leans ${summary.composition.lightDark.label.toLowerCase()}, so small changes in text value may affect readability quickly.`,
      84
    );
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

function buildDecisionSummary(
  left: AutoCompareSummary,
  right: AutoCompareSummary,
  leftDigital: PrintDigitalResult,
  rightDigital: PrintDigitalResult
) {
  const textureWinner = pickBetter(
    left.composition.texture.energy,
    right.composition.texture.energy,
    "lower",
    6
  );
  const symmetryWinner = pickBetter(
    left.composition.symmetry.score,
    right.composition.symmetry.score,
    "higher",
    6
  );
  const digitalWinner =
    leftDigital.score === rightDigital.score
      ? "tie"
      : leftDigital.score > rightDigital.score
        ? "A"
        : "B";

  if (digitalWinner !== "tie") {
    return digitalWinner === "A"
      ? "Version A currently looks more dependable for streaming-style presentation."
      : "Version B currently looks more dependable for streaming-style presentation.";
  }

  if (textureWinner !== "tie" && symmetryWinner !== "tie" && textureWinner === symmetryWinner) {
    return textureWinner === "A"
      ? "Version A looks calmer and more structurally resolved overall."
      : "Version B looks calmer and more structurally resolved overall.";
  }

  return "The comparison is fairly close, so the final choice should lean on release mood, title treatment, and how the chosen version performs in Analyze.";
}

function renderWinnerTag(winner: "A" | "B" | "tie") {
  if (winner === "tie") return "Close";
  return `Version ${winner}`;
}

function toneClassFromWinner(winner: "A" | "B" | "tie") {
  return winner === "tie" ? "" : "pass";
}

function SummaryCard({
  title,
  value,
  note,
  tone = "",
}: {
  title: string;
  value: string;
  note: string;
  tone?: "" | "pass" | "fail";
}) {
  return (
    <div className="miniCard">
      <div className="miniLabel">{title}</div>
      <div className="readyTop" style={{ marginBottom: 8 }}>
        <span className={`statusTag ${tone}`}>{value}</span>
      </div>
      <div className="detailLine">{note}</div>
    </div>
  );
}

function VersionSummaryPanel({
  label,
  summary,
  digital,
  notes,
}: {
  label: SideKey;
  summary: AutoCompareSummary | null;
  digital: PrintDigitalResult;
  notes?: string;
}) {
  if (!summary) {
    return (
      <div className="miniCard">
        <div className="miniLabel">Version {label}</div>
        <div className="miniHint">No image loaded.</div>
      </div>
    );
  }

  return (
    <div className="miniCard">
      <div className="miniLabel">Version {label} reading</div>
      <div className="detailLine" style={{ marginTop: 6 }}>
        <b>{summary.composition.summary.headline}</b>
      </div>
      <div className="detailLine" style={{ marginTop: 10 }}>
        {summary.composition.summary.guidance}
      </div>

      <div className="metaRow" style={{ marginTop: 12 }}>
        <span className="tag">{summary.natural.w}×{summary.natural.h}</span>
        <span className="tag">{summary.composition.lightDark.label}</span>
        <span className="tag">texture {summary.composition.texture.energy}/100</span>
        <span className="tag">symmetry {summary.composition.symmetry.score}/100</span>
      </div>

      <div className="paletteRows" style={{ marginTop: 12 }}>
        <div className="paletteLine">
          <span className="miniLabel">Palette</span>
          <div className="paletteStrip">
            {summary.palette.image.slice(0, 6).map((c) => (
              <span key={`${label}-${c}`} className="chip small" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      </div>

      <div className="sectionHead" style={{ marginTop: 14 }}>Most important highlights</div>
      <div className="suggestList">
        {summary.composition.highlights.slice(0, 3).map((item) => (
          <div key={`${label}-${item.key}`} className="suggestItem">
            <div className="suggestTitle">{item.title}</div>
            <div className="suggestDetail">{item.detail}</div>
          </div>
        ))}
      </div>

      <div className="sectionHead" style={{ marginTop: 14 }}>Digital translation</div>
      <div className="detailLine">
        <b>{digital.label}</b> • {digital.score}/100 — {digital.summary}
      </div>

      {notes?.trim() ? (
        <>
          <div className="sectionHead" style={{ marginTop: 14 }}>Manual note</div>
          <div className="detailLine">{notes}</div>
        </>
      ) : null}
    </div>
  );
}

export default function ComparePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as CompareState;

  const [leftDataUrl, setLeftDataUrl] = React.useState<string | null>(
    state.leftDataUrl ?? null
  );
  const [rightDataUrl, setRightDataUrl] = React.useState<string | null>(
    state.rightDataUrl ?? null
  );

  const [syncZoom, setSyncZoom] = React.useState(true);
  const [leftZoom, setLeftZoom] = React.useState(1);
  const [rightZoom, setRightZoom] = React.useState(1);

  const [showGrid, setShowGrid] = React.useState(false);
  const [showLabels, setShowLabels] = React.useState(true);
  const [focusMode, setFocusMode] = React.useState<FocusMode>("split");
  const [assistMode, setAssistMode] = React.useState<AssistMode>("both");

  const [notesA, setNotesA] = React.useState("");
  const [notesB, setNotesB] = React.useState("");
  const [finalChoice, setFinalChoice] = React.useState<"" | "A" | "B">("");

  const [leftSummary, setLeftSummary] = React.useState<AutoCompareSummary | null>(null);
  const [rightSummary, setRightSummary] = React.useState<AutoCompareSummary | null>(null);
  const [compareBusy, setCompareBusy] = React.useState(false);
  const [compareError, setCompareError] = React.useState<string | null>(null);

  const leftFileRef = React.useRef<HTMLInputElement | null>(null);
  const rightFileRef = React.useRef<HTMLInputElement | null>(null);

  async function handleUpload(side: "left" | "right", file: File) {
    const url = await loadFromFile(file);
    if (side === "left") setLeftDataUrl(url);
    else setRightDataUrl(url);
  }

  function setZoom(side: "left" | "right", value: number) {
    if (syncZoom) {
      setLeftZoom(value);
      setRightZoom(value);
      return;
    }

    if (side === "left") setLeftZoom(value);
    else setRightZoom(value);
  }

  const hasBoth = Boolean(leftDataUrl && rightDataUrl);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!leftDataUrl && !rightDataUrl) {
        setLeftSummary(null);
        setRightSummary(null);
        setCompareError(null);
        return;
      }

      setCompareBusy(true);
      setCompareError(null);

      try {
        if (leftDataUrl) {
          const leftData = await buildAnalysisImageData(leftDataUrl, 768);
          if (!alive) return;

          const full: NormalizedRect = { x: 0, y: 0, w: 1, h: 1 };
          const leftPalette = computePalette(leftData.imageData, full);
          const leftComp = computeCompositionMetrics(leftData.imageData, {
            sx: 0,
            sy: 0,
            sw: leftData.imageData.width,
            sh: leftData.imageData.height,
          });

          setLeftSummary({
            palette: leftPalette,
            composition: leftComp,
            natural: leftData.natural,
          });
        } else {
          setLeftSummary(null);
        }

        if (rightDataUrl) {
          const rightData = await buildAnalysisImageData(rightDataUrl, 768);
          if (!alive) return;

          const full: NormalizedRect = { x: 0, y: 0, w: 1, h: 1 };
          const rightPalette = computePalette(rightData.imageData, full);
          const rightComp = computeCompositionMetrics(rightData.imageData, {
            sx: 0,
            sy: 0,
            sw: rightData.imageData.width,
            sh: rightData.imageData.height,
          });

          setRightSummary({
            palette: rightPalette,
            composition: rightComp,
            natural: rightData.natural,
          });
        } else {
          setRightSummary(null);
        }
      } catch (e) {
        if (!alive) return;
        setCompareError(
          e instanceof Error ? e.message : "Failed to compare images"
        );
      } finally {
        if (alive) setCompareBusy(false);
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [leftDataUrl, rightDataUrl]);

  const autoLines =
    leftSummary && rightSummary ? buildAutoComparisonText(leftSummary, rightSummary) : [];
  const recommendationLines =
    leftSummary && rightSummary ? buildRecommendationText(leftSummary, rightSummary) : [];

  const leftPrintDigital = React.useMemo(
    () => evaluatePrintToDigital(derivePrintDigitalInput(leftSummary)),
    [leftSummary]
  );

  const rightPrintDigital = React.useMemo(
    () => evaluatePrintToDigital(derivePrintDigitalInput(rightSummary)),
    [rightSummary]
  );

  const printDigitalWinner =
    leftPrintDigital.score === rightPrintDigital.score
      ? "tie"
      : leftPrintDigital.score > rightPrintDigital.score
        ? "A"
        : "B";

  const metricBreakdown = React.useMemo(
    () => (leftSummary && rightSummary ? buildMetricBreakdown(leftSummary, rightSummary) : []),
    [leftSummary, rightSummary]
  );

  const comparisonInsights = React.useMemo(
    () =>
      leftSummary && rightSummary
        ? buildComparisonInsights(leftSummary, rightSummary, leftPrintDigital, rightPrintDigital)
        : [],
    [leftSummary, rightSummary, leftPrintDigital, rightPrintDigital]
  );

  const versionAActions = React.useMemo(
    () => buildVersionActions("A", leftSummary, leftPrintDigital),
    [leftSummary, leftPrintDigital]
  );

  const versionBActions = React.useMemo(
    () => buildVersionActions("B", rightSummary, rightPrintDigital),
    [rightSummary, rightPrintDigital]
  );

  const decisionSummary = React.useMemo(
    () =>
      leftSummary && rightSummary
        ? buildDecisionSummary(leftSummary, rightSummary, leftPrintDigital, rightPrintDigital)
        : "Load two versions to generate a clearer comparison reading.",
    [leftSummary, rightSummary, leftPrintDigital, rightPrintDigital]
  );

  return (
    <div className="analyzeWrap compareWrap">
      <div className="mockHero analyzeHero compareHero">
        <div className="mockHeroTop">
          <button className="ghostBtn" onClick={() => navigate(-1)}>
            ← BACK
          </button>

          <div className="mockHeroActions">
            <button className="ghostBtn" onClick={() => leftFileRef.current?.click()}>
              UPLOAD A
            </button>
            <button className="ghostBtn" onClick={() => rightFileRef.current?.click()}>
              UPLOAD B
            </button>
            <button
              className="primaryBtn"
              onClick={() => window.print()}
              disabled={!leftDataUrl && !rightDataUrl}
            >
              <Printer size={16} /> PRINT / SAVE PDF
            </button>
          </div>
        </div>

        <div className="testKicker">Design Evaluation</div>
        <div className="testTitle">Comparison Mode</div>
        <div className="testLead">
          Compare two covers, two revisions, or two design directions side-by-side.
          This page is designed to help you judge not only which version looks better,
          but which one communicates more clearly, translates more reliably, and gives
          you a stronger basis for further refinement.
        </div>

        <div className="compareHeroBullets">
          <div className="mockBullet">
            <div className="mockBulletHead">Why it matters</div>
            <div className="mockBulletText">
              Small changes in crop, colour balance, complexity, or symmetry can make
              one version feel much stronger once it enters digital release contexts.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">What this page now does</div>
            <div className="mockBulletText">
              It compares both versions in more detail, highlights the most important differences,
              and suggests which direction currently looks more dependable.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">How to use it</div>
            <div className="mockBulletText">
              Compare visually first, then use the auto analysis to explain why one version feels
              calmer, stronger, more balanced, or more digitally robust.
            </div>
          </div>
        </div>

        <hr className="mockRule" />

        <input
          ref={leftFileRef}
          className="hiddenFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload("left", f);
            e.currentTarget.value = "";
          }}
        />

        <input
          ref={rightFileRef}
          className="hiddenFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload("right", f);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="panelDark" style={{ marginTop: 16 }}>
        <div className="panelTop">
          <div className="panelTitle">How to use this page</div>
          <div className="panelNote">
            A clearer workflow for comparison, interpretation, and final selection.
          </div>
        </div>

        <div className="panelBody">
          <div className="suggestList">
            <div className="suggestItem">
              <div className="suggestTitle">1. Load two versions</div>
              <div className="suggestDetail">
                Compare before/after edits, alternate covers, or two different art directions.
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">2. Inspect the visual difference</div>
              <div className="suggestDetail">
                Use split or focus mode to look for changes in hierarchy, texture, tone, and overall balance before reading the automated interpretation.
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">3. Read what the metrics are pointing to</div>
              <div className="suggestDetail">
                The analysis below explains what is different, why it matters, and which version is currently calmer, more structured, or more likely to hold up digitally.
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">4. Decide and refine</div>
              <div className="suggestDetail">
                Mark a preferred direction, then move it into Analyze for region-level testing and more specific readability checks.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panelDark" style={{ marginTop: 25 }}>
        <div className="panelTop">
          <div className="panelTitle">Compare controls</div>
          <div className="panelNote">
            Switch layout focus, align zoom, and choose how much support you want from the page.
          </div>
        </div>

        <div className="panelBody">
          <div className="compareControlsGrid">
            <div className="compareControlBlock">
              <div className="miniLabel">View mode</div>
              <div className="pillRow">
                <button
                  className={`pillBtn ${focusMode === "split" ? "on" : ""}`}
                  onClick={() => setFocusMode("split")}
                >
                  SPLIT
                </button>
                <button
                  className={`pillBtn ${focusMode === "left" ? "on" : ""}`}
                  onClick={() => setFocusMode("left")}
                >
                  A FOCUS
                </button>
                <button
                  className={`pillBtn ${focusMode === "right" ? "on" : ""}`}
                  onClick={() => setFocusMode("right")}
                >
                  B FOCUS
                </button>
              </div>
            </div>

            <div className="compareControlBlock">
              <div className="miniLabel">Layout + alignment</div>
              <div className="pillRow">
                <button
                  className={`pillBtn ${syncZoom ? "on" : ""}`}
                  onClick={() => setSyncZoom((v) => !v)}
                >
                  SYNC ZOOM
                </button>
                <button
                  className={`pillBtn ${showGrid ? "on" : ""}`}
                  onClick={() => setShowGrid((v) => !v)}
                >
                  GRID
                </button>
                <button
                  className={`pillBtn ${showLabels ? "on" : ""}`}
                  onClick={() => setShowLabels((v) => !v)}
                >
                  LABELS
                </button>
              </div>
            </div>

            <div className="compareControlBlock">
              <div className="miniLabel">Support mode</div>
              <div className="pillRow">
                <button
                  className={`pillBtn ${assistMode === "auto" ? "on" : ""}`}
                  onClick={() => setAssistMode("auto")}
                >
                  AUTO
                </button>
                <button
                  className={`pillBtn ${assistMode === "manual" ? "on" : ""}`}
                  onClick={() => setAssistMode("manual")}
                >
                  MANUAL
                </button>
                <button
                  className={`pillBtn ${assistMode === "both" ? "on" : ""}`}
                  onClick={() => setAssistMode("both")}
                >
                  BOTH
                </button>
              </div>
            </div>

            <div className="compareControlBlock">
              <div className="miniLabel">Quick state</div>
              <div className="metaRow">
                <span className="tag">A: {leftDataUrl ? "loaded" : "empty"}</span>
                <span className="tag">B: {rightDataUrl ? "loaded" : "empty"}</span>
                <span className="tag">{syncZoom ? "zoom linked" : "zoom separate"}</span>
                <span className="tag">{hasBoth ? "ready to compare" : "waiting for both"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`compareGrid compareMode-${focusMode}`} style={{ marginTop: 16 }}>
        <div className="panelDark comparePanel">
          <div className="panelTop">
            <div>
              <div className="panelTitle">Version A</div>
              <div className="panelNote">Original, baseline, or first design direction.</div>
            </div>
            <div className="metaRow">
              <button className="ghostBtn small" onClick={() => leftFileRef.current?.click()}>
                REPLACE
              </button>
            </div>
          </div>

          <div className="panelBody">
            {leftDataUrl ? (
              <>
                <div className={`compareStage ${showGrid ? "showGrid" : ""}`}>
                  {showLabels && <div className="compareBadge">A</div>}
                  <img
                    className="compareImg"
                    src={leftDataUrl}
                    alt="Comparison left"
                    style={{ transform: `scale(${leftZoom})` }}
                  />
                </div>

                <div className="zoomControl compareZoom">
                  <span className="zoomLabel">ZOOM A</span>
                  <input
                    className="range"
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.01}
                    value={leftZoom}
                    onChange={(e) => setZoom("left", parseFloat(e.target.value))}
                  />
                  <span className="tag">{Math.round(leftZoom * 100)}%</span>
                </div>

                {(assistMode === "manual" || assistMode === "both") && (
                  <div className="compareNotesBlock">
                    <div className="sectionHead">Observations for A</div>
                    <textarea
                      className="compareTextarea"
                      value={notesA}
                      onChange={(e) => setNotesA(e.currentTarget.value)}
                      placeholder="Example: stronger mood, but less calm overall. Crop feels denser and more dramatic..."
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="miniHint">Upload an image for Version A.</div>
            )}
          </div>
        </div>

        <div className="panelDark comparePanel">
          <div className="panelTop">
            <div>
              <div className="panelTitle">Version B</div>
              <div className="panelNote">Alternative, revision, or preferred direction.</div>
            </div>
            <div className="metaRow">
              <button className="ghostBtn small" onClick={() => rightFileRef.current?.click()}>
                REPLACE
              </button>
            </div>
          </div>

          <div className="panelBody">
            {rightDataUrl ? (
              <>
                <div className={`compareStage ${showGrid ? "showGrid" : ""}`}>
                  {showLabels && <div className="compareBadge">B</div>}
                  <img
                    className="compareImg"
                    src={rightDataUrl}
                    alt="Comparison right"
                    style={{ transform: `scale(${rightZoom})` }}
                  />
                </div>

                <div className="zoomControl compareZoom">
                  <span className="zoomLabel">ZOOM B</span>
                  <input
                    className="range"
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.01}
                    value={rightZoom}
                    onChange={(e) => setZoom("right", parseFloat(e.target.value))}
                  />
                  <span className="tag">{Math.round(rightZoom * 100)}%</span>
                </div>

                {(assistMode === "manual" || assistMode === "both") && (
                  <div className="compareNotesBlock">
                    <div className="sectionHead">Observations for B</div>
                    <textarea
                      className="compareTextarea"
                      value={notesB}
                      onChange={(e) => setNotesB(e.currentTarget.value)}
                      placeholder="Example: cleaner structure, calmer palette, and feels more resolved overall..."
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="miniHint">Upload an image for Version B.</div>
            )}
          </div>
        </div>
      </div>

      {(assistMode === "auto" || assistMode === "both") && (
        <>
          <div className="panelDark" style={{ marginTop: 16 }}>
            <div className="panelTop">
              <div className="panelTitle">Comparison at a glance</div>
              <div className="panelNote">
                The strongest differences and current overall reading from the automatic comparison.
              </div>
            </div>

            <div className="panelBody">
              {compareBusy ? (
                <div className="miniHint">Comparing images…</div>
              ) : compareError ? (
                <div className="errorLine">{compareError}</div>
              ) : !leftSummary || !rightSummary ? (
                <div className="miniHint">
                  Upload both versions to generate a fuller automatic reading.
                </div>
              ) : (
                <>
                  <div className="reportGrid">
                    <SummaryCard
                      title="Current overall decision"
                      value={printDigitalWinner === "tie" ? "Close" : `Version ${printDigitalWinner}`}
                      note={decisionSummary}
                      tone={printDigitalWinner === "tie" ? "" : "pass"}
                    />
                    <SummaryCard
                      title="Calmer surface"
                      value={renderWinnerTag(pickBetter(leftSummary.composition.texture.energy, rightSummary.composition.texture.energy, "lower", 6))}
                      note="Lower texture usually gives title and artist information a steadier surface to sit on."
                      tone={toneClassFromWinner(pickBetter(leftSummary.composition.texture.energy, rightSummary.composition.texture.energy, "lower", 6))}
                    />
                    <SummaryCard
                      title="Stronger structure"
                      value={renderWinnerTag(pickBetter(leftSummary.composition.symmetry.score, rightSummary.composition.symmetry.score, "higher", 6))}
                      note="Higher balance often helps a cover feel more resolved and easier to scan quickly."
                      tone={toneClassFromWinner(pickBetter(leftSummary.composition.symmetry.score, rightSummary.composition.symmetry.score, "higher", 6))}
                    />
                    <SummaryCard
                      title="More digital-ready"
                      value={printDigitalWinner === "tie" ? "Close" : `Version ${printDigitalWinner}`}
                      note="This estimate combines focal clarity, edge risk, detail density, and print-style dependence."
                      tone={printDigitalWinner === "tie" ? "" : "pass"}
                    />
                  </div>

                  <div className="compareInsightsList" style={{ marginTop: 16 }}>
                    <div className="sectionHead">Most important differences</div>
                    <div className="suggestList">
                      {comparisonInsights.map((item) => (
                        <div key={`${item.title}-${item.winner}`} className="suggestItem">
                          <div className="suggestTitle">
                            {item.title} • {renderWinnerTag(item.winner)}
                          </div>
                          <div className="suggestDetail">
                            <div className="sLine">{item.detail}</div>
                            <div className="sLine">
                              <b>Why it matters:</b> {item.whyItMatters}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="compareInsightsList" style={{ marginTop: 16 }}>
                    <div className="sectionHead">Quick interpretation</div>
                    <div className="suggestList">
                      {autoLines.map((line) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestDetail">{line}</div>
                        </div>
                      ))}
                      {recommendationLines.map((line) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestDetail">
                            <b>Decision support:</b> {line}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="panelDark" style={{ marginTop: 16 }}>
            <div className="panelTop">
              <div className="panelTitle">Metric-by-metric breakdown</div>
              <div className="panelNote">
                What each difference means, which version is leading, and why that matters for cover communication.
              </div>
            </div>

            <div className="panelBody">
              {!leftSummary || !rightSummary ? (
                <div className="miniHint">
                  Upload both versions to compare their main composition signals.
                </div>
              ) : (
                <div className="suggestList">
                  {metricBreakdown.map((item) => (
                    <div key={item.key} className="suggestItem">
                      <div className="suggestTitle">
                        {item.title} • {renderWinnerTag(item.winner)}
                      </div>
                      <div className="suggestDetail">
                        <div className="sLine">
                          <b>Version A:</b> {item.leftValue}
                        </div>
                        <div className="sLine">
                          <b>Version B:</b> {item.rightValue}
                        </div>
                        <div className="sLine">
                          <b>Reading:</b> {item.detail}
                        </div>
                        <div className="sLine">
                          <b>Why it matters:</b> {item.whyItMatters}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="reportGrid" style={{ marginTop: 16 }}>
            <VersionSummaryPanel
              label="A"
              summary={leftSummary}
              digital={leftPrintDigital}
              notes={assistMode === "both" ? notesA : ""}
            />
            <VersionSummaryPanel
              label="B"
              summary={rightSummary}
              digital={rightPrintDigital}
              notes={assistMode === "both" ? notesB : ""}
            />
          </div>
        </>
      )}

      <div className="panelDark" style={{ marginTop: 16 }}>
        <div className="panelTop">
          <div className="panelTitle">Print-to-digital check</div>
          <div className="panelNote">
            Estimates how likely each version is to survive the shift from richer print-style layouts
            to smaller, faster, streaming-scale digital contexts.
          </div>
        </div>

        <div className="panelBody">
          <div className="reportGrid">
            <div className="miniCard">
              <div className="miniLabel">Version A digital translation</div>
              <div className="readyTop" style={{ marginBottom: 10 }}>
                <span className={`statusTag ${leftPrintDigital.label === "Strong" ? "pass" : leftPrintDigital.label === "Fragile" ? "fail" : ""}`}>
                  {leftPrintDigital.label.toUpperCase()} • {leftPrintDigital.score}/100
                </span>
              </div>
              <div className="detailLine">{leftPrintDigital.summary}</div>

              {leftPrintDigital.strongestAsset ? (
                <div className="detailLine" style={{ marginTop: 10 }}>
                  <b>Strongest carry-over:</b> {leftPrintDigital.strongestAsset}
                </div>
              ) : null}

              {leftPrintDigital.primaryConcern ? (
                <div className="detailLine" style={{ marginTop: 10 }}>
                  <b>Main risk:</b> {leftPrintDigital.primaryConcern}
                </div>
              ) : null}

              <div className="sectionHead" style={{ marginTop: 12 }}>Main score factors</div>
              <div className="suggestList">
                {leftPrintDigital.factors.map((item: PrintDigitalFactor) => (
                  <div key={`A-${item.key}`} className="suggestItem">
                    <div className="suggestTitle">
                      {item.title} • {item.level}
                    </div>
                    <div className="suggestDetail">
                      <div className="sLine">{item.reason}</div>
                      <div className="sLine">
                        <b>Impact:</b> {item.impact > 0 ? `−${item.impact} points` : "No penalty"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="miniCard">
              <div className="miniLabel">Version B digital translation</div>
              <div className="readyTop" style={{ marginBottom: 10 }}>
                <span className={`statusTag ${rightPrintDigital.label === "Strong" ? "pass" : rightPrintDigital.label === "Fragile" ? "fail" : ""}`}>
                  {rightPrintDigital.label.toUpperCase()} • {rightPrintDigital.score}/100
                </span>
              </div>
              <div className="detailLine">{rightPrintDigital.summary}</div>

              {rightPrintDigital.strongestAsset ? (
                <div className="detailLine" style={{ marginTop: 10 }}>
                  <b>Strongest carry-over:</b> {rightPrintDigital.strongestAsset}
                </div>
              ) : null}

              {rightPrintDigital.primaryConcern ? (
                <div className="detailLine" style={{ marginTop: 10 }}>
                  <b>Main risk:</b> {rightPrintDigital.primaryConcern}
                </div>
              ) : null}

              <div className="sectionHead" style={{ marginTop: 12 }}>Main score factors</div>
              <div className="suggestList">
                {rightPrintDigital.factors.map((item: PrintDigitalFactor) => (
                  <div key={`B-${item.key}`} className="suggestItem">
                    <div className="suggestTitle">
                      {item.title} • {item.level}
                    </div>
                    <div className="suggestDetail">
                      <div className="sLine">{item.reason}</div>
                      <div className="sLine">
                        <b>Impact:</b> {item.impact > 0 ? `−${item.impact} points` : "No penalty"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="compareDecisionBlock" style={{ marginTop: 16 }}>
            <div className="miniLabel">Automatic reading</div>
            <div className="detailLine">{decisionSummary}</div>

            <div className="reportGrid" style={{ marginTop: 14 }}>
              <div className="miniCard">
                <div className="miniLabel">What to preserve</div>
                <ul className="compareBulletList">
                  {(printDigitalWinner === "A" ? leftPrintDigital.strengths : printDigitalWinner === "B" ? rightPrintDigital.strengths : leftPrintDigital.strengths).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="miniCard">
                <div className="miniLabel">What to improve next</div>
                <ul className="compareBulletList">
                  {(printDigitalWinner === "A" ? leftPrintDigital.recommendations : printDigitalWinner === "B" ? rightPrintDigital.recommendations : leftPrintDigital.recommendations).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="reportGrid" style={{ marginTop: 14 }}>
              <div className="miniCard">
                <div className="miniLabel">Version A priority changes</div>
                <div className="suggestList">
                  {versionAActions.map((item) => (
                    <div key={`A-action-${item.title}`} className="suggestItem">
                      <div className="suggestTitle">{item.title}</div>
                      <div className="suggestDetail">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="miniCard">
                <div className="miniLabel">Version B priority changes</div>
                <div className="suggestList">
                  {versionBActions.map((item) => (
                    <div key={`B-action-${item.title}`} className="suggestItem">
                      <div className="suggestTitle">{item.title}</div>
                      <div className="suggestDetail">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="reportGrid" style={{ marginTop: 16 }}>
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Quick comparison prompts</div>
            <div className="panelNote">
              Use these for structured reflection, user testing, or dissertation write-up.
            </div>
          </div>

          <div className="panelBody">
            <div className="mxChecklist">
              <div className="mxCheckItem">
                <div className="mxCheckHead">Thumbnail identity</div>
                <div className="mxCheckText">
                  Which version remains more distinctive at small size?
                </div>
              </div>

              <div className="mxCheckItem">
                <div className="mxCheckHead">Readability expectation</div>
                <div className="mxCheckText">
                  Which version appears more likely to preserve title and artist clarity once typography is added?
                </div>
              </div>

              <div className="mxCheckItem">
                <div className="mxCheckHead">Mood / genre fit</div>
                <div className="mxCheckText">
                  Which version communicates the intended tone more clearly, and which one feels closer to the release identity you want?
                </div>
              </div>

              <div className="mxCheckItem">
                <div className="mxCheckHead">Visual hierarchy</div>
                <div className="mxCheckText">
                  Which version gives a clearer focal point, steadier structure, and calmer surface for future typography?
                </div>
              </div>

              <div className="mxCheckItem">
                <div className="mxCheckHead">Digital translation</div>
                <div className="mxCheckText">
                  Which version is less dependent on print-like viewing and more likely to survive as a streaming thumbnail?
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Decision panel</div>
            <div className="panelNote">
              Record a final choice and the reasoning behind it.
            </div>
          </div>

          <div className="panelBody">
            <div className="compareDecisionBlock">
              <div className="miniLabel">Preferred version</div>
              <div className="pillRow">
                <button
                  className={`pillBtn ${finalChoice === "A" ? "on" : ""}`}
                  onClick={() => setFinalChoice("A")}
                >
                  CHOOSE A
                </button>
                <button
                  className={`pillBtn ${finalChoice === "B" ? "on" : ""}`}
                  onClick={() => setFinalChoice("B")}
                >
                  CHOOSE B
                </button>
              </div>

              <div className="metaRow" style={{ marginTop: 12 }}>
                <span className="tag">
                  final: {finalChoice ? `Version ${finalChoice}` : "not selected"}
                </span>
                <span className="tag">
                  comparison: {hasBoth ? "complete" : "waiting for both images"}
                </span>
                <span className="tag">support: {assistMode}</span>
              </div>

              <div className="detailLine" style={{ marginTop: 14 }}>
                Recommended use: capture this page as evidence, then explain the final
                selection in terms of readability, distinctiveness, mood fit,
                print-to-digital translation, structural balance, and overall release readiness.
              </div>
            </div>

            <div className="readyActions" style={{ marginTop: 18 }}>
              <button
                className="primaryBtn"
                onClick={() =>
                  navigate("/analyze", {
                    state: {
                      dataUrl: finalChoice === "B" ? rightDataUrl : leftDataUrl,
                    },
                  })
                }
                disabled={
                  !finalChoice ||
                  (finalChoice === "A" && !leftDataUrl) ||
                  (finalChoice === "B" && !rightDataUrl)
                }
              >
                OPEN CHOSEN IN ANALYZE
              </button>

              <button className="ghostBtn" onClick={() => window.print()}>
                <Printer size={16} /> PRINT COMPARISON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
