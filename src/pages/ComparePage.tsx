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
} from "../analysis/composition";
import {
  evaluatePrintToDigital,
  type PrintDigitalInput,
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

function compareNumber(a: number, b: number, threshold = 6) {
  const diff = a - b;
  if (Math.abs(diff) < threshold) return "similar";
  return diff > 0 ? "higher" : "lower";
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
          Use this page for structured evaluation, iteration evidence, final selection,
          and print-to-digital decision support.
        </div>

        <div className="compareHeroBullets">
          <div className="mockBullet">
            <div className="mockBulletHead">Why it matters</div>
            <div className="mockBulletText">
              Small changes in crop, colour balance, complexity, or symmetry can make
              one version feel noticeably stronger than another.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">What to do here</div>
            <div className="mockBulletText">
              Compare versions visually, use the automatic overview, and add your own
              notes only if you want to.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">Added digital check</div>
            <div className="mockBulletText">
              This page now also estimates whether each version feels more print-first
              or better suited to streaming-scale digital presentation.
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
            A simple workflow for comparison, reflection, and final selection.
          </div>
        </div>

        <div className="panelBody">
          <div className="suggestList">
            <div className="suggestItem">
              <div className="suggestTitle">1. Load two versions</div>
              <div className="suggestDetail">
                <div className="sLine">
                  Compare before/after edits, alternate covers, or different art directions.
                </div>
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">2. Choose your support mode</div>
              <div className="suggestDetail">
                <div className="sLine">
                  Use auto mode for guided insights, manual mode for your own notes, or both for a more complete evaluation.
                </div>
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">3. Check print-to-digital translation</div>
              <div className="suggestDetail">
                <div className="sLine">
                  Look at which version feels less dependent on edge detail, fine text, or dense poster-like viewing conditions.
                </div>
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">4. Choose a direction</div>
              <div className="suggestDetail">
                <div className="sLine">
                  Mark a preferred version, then continue refining it in Analyze.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panelDark" style={{ marginTop: 25 }}>
        <div className="panelTop">
          <div className="panelTitle">Compare controls</div>
          <div className="panelNote">
            Switch layout focus, align zoom, and choose how much support you want from
            the page.
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
                <span className="tag">
                  {syncZoom ? "zoom linked" : "zoom separate"}
                </span>
                <span className="tag">
                  {hasBoth ? "ready to compare" : "waiting for both"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`compareGrid compareMode-${focusMode}`}
        style={{ marginTop: 16 }}
      >
        <div className="panelDark comparePanel">
          <div className="panelTop">
            <div>
              <div className="panelTitle">Version A</div>
              <div className="panelNote">
                Original, baseline, or first design direction.
              </div>
            </div>
            <div className="metaRow">
              <button
                className="ghostBtn small"
                onClick={() => leftFileRef.current?.click()}
              >
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
              <div className="panelNote">
                Alternative, revision, or preferred direction.
              </div>
            </div>
            <div className="metaRow">
              <button
                className="ghostBtn small"
                onClick={() => rightFileRef.current?.click()}
              >
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
        <div className="panelDark" style={{ marginTop: 16 }}>
          <div className="panelTop">
            <div className="panelTitle">Auto comparison overview</div>
            <div className="panelNote">
              Prefer not to type your own reflections? This section gives a quick,
              automatic comparison of the two images.
            </div>
          </div>

          <div className="panelBody">
            {compareBusy ? (
              <div className="miniHint">Comparing images…</div>
            ) : compareError ? (
              <div className="errorLine">{compareError}</div>
            ) : !leftSummary && !rightSummary ? (
              <div className="miniHint">
                Upload one or two images to generate automatic comparison insights.
              </div>
            ) : (
              <>
                <div className="reportGrid">
                  <div className="miniCard">
                    <div className="miniLabel">Version A summary</div>
                    {leftSummary ? (
                      <>
                        <div className="miniSub">
                          Light / dark: {leftSummary.composition.lightDark.label}
                        </div>
                        <div className="miniSub">
                          Colour balance: {leftSummary.composition.colorBalance.label}
                        </div>
                        <div className="miniSub">
                          Symmetry: {leftSummary.composition.symmetry.label}
                        </div>
                        <div className="miniSub">
                          Texture: {leftSummary.composition.texture.label}
                        </div>
                        <div className="miniSub">
                          Organic / technical: {leftSummary.composition.organicTechnical.label}
                        </div>
                      </>
                    ) : (
                      <div className="miniHint">No image loaded.</div>
                    )}
                  </div>

                  <div className="miniCard">
                    <div className="miniLabel">Version B summary</div>
                    {rightSummary ? (
                      <>
                        <div className="miniSub">
                          Light / dark: {rightSummary.composition.lightDark.label}
                        </div>
                        <div className="miniSub">
                          Colour balance: {rightSummary.composition.colorBalance.label}
                        </div>
                        <div className="miniSub">
                          Symmetry: {rightSummary.composition.symmetry.label}
                        </div>
                        <div className="miniSub">
                          Texture: {rightSummary.composition.texture.label}
                        </div>
                        <div className="miniSub">
                          Organic / technical: {rightSummary.composition.organicTechnical.label}
                        </div>
                      </>
                    ) : (
                      <div className="miniHint">No image loaded.</div>
                    )}
                  </div>
                </div>

                {leftSummary && rightSummary && (
                  <>
                    <div className="compareInsightsList" style={{ marginTop: 16 }}>
                      <div className="sectionHead">Key differences</div>

                      {autoLines.map((line) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestDetail">
                            <div className="sLine">{line}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="compareInsightsList" style={{ marginTop: 16 }}>
                      <div className="sectionHead">Suggested interpretation</div>

                      {recommendationLines.map((line) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestDetail">
                            <div className="sLine">{line}</div>
                          </div>
                        </div>
                      ))}

                      <div className="detailLine" style={{ marginTop: 12 }}>
                        Use these observations as a starting point, then decide which
                        version better fits your intended release mood, visual identity,
                        and overall direction.
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
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

              <div className="sectionHead" style={{ marginTop: 12 }}>Risks</div>
              <ul className="compareBulletList">
                {leftPrintDigital.risks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="miniCard">
              <div className="miniLabel">Version B digital translation</div>
              <div className="readyTop" style={{ marginBottom: 10 }}>
                <span className={`statusTag ${rightPrintDigital.label === "Strong" ? "pass" : rightPrintDigital.label === "Fragile" ? "fail" : ""}`}>
                  {rightPrintDigital.label.toUpperCase()} • {rightPrintDigital.score}/100
                </span>
              </div>
              <div className="detailLine">{rightPrintDigital.summary}</div>

              <div className="sectionHead" style={{ marginTop: 12 }}>Risks</div>
              <ul className="compareBulletList">
                {rightPrintDigital.risks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="compareDecisionBlock" style={{ marginTop: 16 }}>
            <div className="miniLabel">Automatic reading</div>
            <div className="detailLine">
              {printDigitalWinner === "tie"
                ? "Both versions appear similarly positioned for print-to-digital translation, so the final choice may depend more on mood, readability, and identity."
                : `Version ${printDigitalWinner} appears more likely to translate cleanly into digital streaming contexts based on this structural estimate.`}
            </div>

            <div className="reportGrid" style={{ marginTop: 14 }}>
              <div className="miniCard">
                <div className="miniLabel">What to preserve</div>
                <ul className="compareBulletList">
                  {(printDigitalWinner === "A" ? leftPrintDigital.strengths : rightPrintDigital.strengths).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="miniCard">
                <div className="miniLabel">What to improve next</div>
                <ul className="compareBulletList">
                  {(printDigitalWinner === "A" ? leftPrintDigital.recommendations : rightPrintDigital.recommendations).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
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
                  Which version appears more likely to preserve title/artist clarity?
                </div>
              </div>

              <div className="mxCheckItem">
                <div className="mxCheckHead">Mood / genre fit</div>
                <div className="mxCheckText">
                  Which version communicates the intended tone more clearly?
                </div>
              </div>

              <div className="mxCheckItem">
                <div className="mxCheckHead">Visual hierarchy</div>
                <div className="mxCheckText">
                  Which version gives a clearer focal point and stronger structure?
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
                print-to-digital translation, and overall release readiness.
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