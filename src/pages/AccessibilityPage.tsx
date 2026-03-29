import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import {
  type PaletteSwatch,
  type SimSummary,
  type VisionMode,
  buildAccessibilityAnalysis,
  getModeDescription,
  getModeLabel,
  makeSimulatedImage,
} from "../lib/accessibility";
import { Printer } from "lucide-react";

type AccessibilityState = {
  dataUrl?: string;
};

async function loadFromFile(file: File) {
  return await fileToObjectUrl(file);
}

function toneForScore(score: number | null) {
  if (score == null) return "default";
  if (score >= 76) return "good";
  if (score >= 52) return "warn";
  return "bad";
}

function labelForDifference(diff: number) {
  if (Math.abs(diff) < 6) return "stable";
  return diff > 0 ? "higher" : "lower";
}

export default function AccessibilityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AccessibilityState;

  const [dataUrl, setDataUrl] = React.useState<string | null>(state.dataUrl ?? null);
  const [mode, setMode] = React.useState<VisionMode>("deuteranopia");
  const [showSplit, setShowSplit] = React.useState(true);
  const [showPalette, setShowPalette] = React.useState(true);
  const [showAnalysis, setShowAnalysis] = React.useState(true);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [simulatedUrl, setSimulatedUrl] = React.useState<string | null>(null);
  const [originalPalette, setOriginalPalette] = React.useState<PaletteSwatch[]>([]);
  const [simulatedPalette, setSimulatedPalette] = React.useState<PaletteSwatch[]>([]);
  const [originalSummary, setOriginalSummary] = React.useState<SimSummary | null>(null);
  const [simulatedSummary, setSimulatedSummary] = React.useState<SimSummary | null>(null);

  const fileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!dataUrl) {
        setSimulatedUrl(null);
        setOriginalPalette([]);
        setSimulatedPalette([]);
        setOriginalSummary(null);
        setSimulatedSummary(null);
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const original = await makeSimulatedImage(dataUrl, "original");
        if (!alive) return;

        const simulated = await makeSimulatedImage(dataUrl, mode);
        if (!alive) return;

        setOriginalPalette(original.palette);
        setSimulatedPalette(simulated.palette);
        setOriginalSummary(original.summary);
        setSimulatedSummary(simulated.summary);
        setSimulatedUrl(simulated.dataUrl);
      } catch (e) {
        if (!alive) return;
        setError(
          e instanceof Error ? e.message : "Failed to generate accessibility preview"
        );
      } finally {
        if (alive) setBusy(false);
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [dataUrl, mode]);

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);

    try {
      const url = await loadFromFile(file);
      setDataUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const analysis = React.useMemo(
    () => buildAccessibilityAnalysis(originalSummary, simulatedSummary, mode),
    [originalSummary, simulatedSummary, mode]
  );

  const brightnessDiff =
    originalSummary && simulatedSummary
      ? simulatedSummary.averageBrightness - originalSummary.averageBrightness
      : null;
  const spreadDiff =
    originalSummary && simulatedSummary
      ? simulatedSummary.paletteSpread - originalSummary.paletteSpread
      : null;
  const dominanceDiff =
    originalSummary && simulatedSummary
      ? simulatedSummary.dominantStrength - originalSummary.dominantStrength
      : null;

  return (
    <div className="analyzeWrap accessibilityWrap">
      <div className="mockHero analyzeHero accessibilityHero">
        <div className="mockHeroTop accessibilityHeroTop">
          <button className="ghostBtn" onClick={() => navigate(-1)}>
            ← BACK
          </button>

          <div className="accessibilityHeroActions">
            <button className="ghostBtn" onClick={() => fileRef.current?.click()}>
              UPLOAD COVER
            </button>
            <button
              className="ghostBtn"
              onClick={() => navigate("/analyze", { state: { dataUrl } })}
              disabled={!dataUrl}
            >
              OPEN IN ANALYZE
            </button>
            <button
              className="ghostBtn"
              onClick={() => navigate("/compare", { state: { leftDataUrl: dataUrl } })}
              disabled={!dataUrl}
            >
              OPEN IN COMPARE
            </button>
            <button
              className="primaryBtn"
              onClick={() => window.print()}
              disabled={!dataUrl}
            >
              <Printer size={16} /> PRINT / SAVE PDF
            </button>
          </div>
        </div>

        <div className="testKicker">Colour Simulation</div>
        <div className="testTitle">Accessibility</div>
        <div className="testLead">
          Preview how your cover may appear under common colour-vision deficiency
          simulations. This page is not judging whether the artwork is good or bad — it
          is checking whether hierarchy, emphasis, and key distinctions still hold once
          colour cues become less dependable.
        </div>

        <div className="compareHeroBullets accessibilityIntroGrid">
          <div className="mockBullet">
            <div className="mockBulletHead">Why it matters</div>
            <div className="mockBulletText">
              Covers that depend too heavily on hue difference alone can flatten quickly
              when colour distinction changes.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">What this page checks</div>
            <div className="mockBulletText">
              It compares original and simulated palette behaviour, then explains which
              differences are most likely to affect readability and focal clarity.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">How to use it</div>
            <div className="mockBulletText">
              Treat this as a quick accessibility-aware filter, then move into Analyze or
              Mockups if the simulation suggests weak separation or flattened emphasis.
            </div>
          </div>
        </div>

        <hr className="mockRule" />

        <input
          ref={fileRef}
          className="hiddenFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="panelDark" style={{ marginTop: 16 }}>
        <div className="panelTop">
          <div className="panelTitle">How to use this page</div>
          <div className="panelNote">A simple accessibility-aware review workflow.</div>
        </div>

        <div className="panelBody">
          <div className="suggestList">
            <div className="suggestItem">
              <div className="suggestTitle">1. Load a cover</div>
              <div className="suggestDetail">
                <div className="sLine">
                  Start with your current artwork or open this page after working elsewhere in CoverCheck.
                </div>
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">2. Change simulation mode</div>
              <div className="suggestDetail">
                <div className="sLine">
                  Switch between protanopia, deuteranopia, tritanopia, and achromatopsia to see whether your cover depends on one fragile colour relationship.
                </div>
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">3. Read the explanation, not just the preview</div>
              <div className="suggestDetail">
                <div className="sLine">
                  The page explains what each value means, what changed, and why the comments are appearing.
                </div>
              </div>
            </div>

            <div className="suggestItem">
              <div className="suggestTitle">4. Fix hierarchy elsewhere if needed</div>
              <div className="suggestDetail">
                <div className="sLine">
                  If separation weakens here, improve the title zone, contrast, or focal structure in Analyze and then confirm it again in Mockups.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!dataUrl && (
        <div className="emptyState">
          <div className="emptyTitle">No cover selected.</div>
          <div className="emptySub">
            Upload a cover or open this page from another part of CoverCheck to preview
            accessibility-focused colour simulations.
          </div>
          <button className="primaryBtn" onClick={() => fileRef.current?.click()}>
            UPLOAD COVER
          </button>
        </div>
      )}

      {dataUrl && (
        <>
          <div className="panelDark" style={{ marginTop: 16 }}>
            <div className="panelTop">
              <div className="panelTitle">Simulator controls</div>
              <div className="panelNote">
                Choose a simulation mode, switch display options, and show or hide the
                analysis layer.
              </div>
            </div>

            <div className="panelBody">
              <div className="accessibilityControlsGrid">
                <div className="accessibilityControlBlock">
                  <div className="miniLabel">Simulation mode</div>
                  <div className="accessibilityPills">
                    {(
                      ["deuteranopia", "protanopia", "tritanopia", "achromatopsia"] as VisionMode[]
                    ).map((m) => (
                      <button
                        key={m}
                        className={`pillBtn ${mode === m ? "on" : ""}`}
                        onClick={() => setMode(m)}
                      >
                        {getModeLabel(m).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="accessibilityControlBlock">
                  <div className="miniLabel">Display options</div>
                  <div className="accessibilityPills">
                    <button
                      className={`pillBtn ${showSplit ? "on" : ""}`}
                      onClick={() => setShowSplit((v) => !v)}
                    >
                      SPLIT VIEW
                    </button>
                    <button
                      className={`pillBtn ${showPalette ? "on" : ""}`}
                      onClick={() => setShowPalette((v) => !v)}
                    >
                      PALETTES
                    </button>
                    <button
                      className={`pillBtn ${showAnalysis ? "on" : ""}`}
                      onClick={() => setShowAnalysis((v) => !v)}
                    >
                      DETAIL ANALYSIS
                    </button>
                  </div>
                </div>

                <div className="accessibilityControlBlock">
                  <div className="miniLabel">Current mode</div>
                  <div className="detailLine">
                    <b>{getModeLabel(mode)}</b> — {getModeDescription(mode)}
                  </div>
                </div>
              </div>

              {error && (
                <div className="errorLine" style={{ marginTop: 12 }}>
                  {error}
                </div>
              )}
              {busy && (
                <div className="miniHint" style={{ marginTop: 12 }}>
                  Generating preview…
                </div>
              )}
            </div>
          </div>

          {analysis && showAnalysis && (
            <div className="reportGrid" style={{ marginTop: 16 }}>
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Analysis at a glance</div>
                  <div className="panelNote">
                    A quick reading of how stable the cover remains under the selected simulation.
                  </div>
                </div>

                <div className="panelBody">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div className="miniCard">
                      <div className="miniLabel">Accessibility stability</div>
                      <div className="readyTop" style={{ marginBottom: 8 }}>
                        <span className={`statusTag ${toneForScore(analysis.score) === "good" ? "pass" : toneForScore(analysis.score) === "bad" ? "fail" : ""}`}>
                          {analysis.label.toUpperCase()} • {analysis.score}/100
                        </span>
                      </div>
                      <div className="miniSub">{analysis.summary}</div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Brightness shift</div>
                      <div className="miniValue">
                        {brightnessDiff == null ? "—" : `${brightnessDiff > 0 ? "+" : ""}${brightnessDiff}`}
                      </div>
                      <div className="miniSub">
                        {brightnessDiff == null ? "Not available" : `Overall image becomes ${labelForDifference(brightnessDiff)} in brightness.`}
                      </div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Palette spread change</div>
                      <div className="miniValue">
                        {spreadDiff == null ? "—" : `${spreadDiff > 0 ? "+" : ""}${spreadDiff}`}
                      </div>
                      <div className="miniSub">Negative values usually mean weaker colour separation.</div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Dominant tone change</div>
                      <div className="miniValue">
                        {dominanceDiff == null ? "—" : `${dominanceDiff > 0 ? "+" : ""}${dominanceDiff}`}
                      </div>
                      <div className="miniSub">Positive values usually mean a flatter overall tonal reading.</div>
                    </div>
                  </div>

                  <div className="detailLine" style={{ marginTop: 14 }}>
                    <b>Mode reading:</b> {analysis.modeNote}
                  </div>
                </div>
              </div>

              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Why these comments are showing</div>
                  <div className="panelNote">
                    The analysis explains the main triggers behind the current accessibility reading.
                  </div>
                </div>

                <div className="panelBody">
                  <div className="suggestList">
                    {analysis.triggerNotes.map((line) => (
                      <div key={line} className="suggestItem">
                        <div className="suggestDetail">
                          <div className="sLine">{line}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            className={`compareGrid ${showSplit ? "" : "compareMode-left"}`}
            style={{ marginTop: 16 }}
          >
            <div className="panelDark comparePanel">
              <div className="panelTop">
                <div>
                  <div className="panelTitle">Original</div>
                  <div className="panelNote">Your cover without simulation.</div>
                </div>
              </div>

              <div className="panelBody">
                <div className="compareStage">
                  <div className="compareBadge">ORIGINAL</div>
                  <img className="compareImg" src={dataUrl} alt="Original cover" />
                </div>

                {originalSummary && (
                  <div className="accessibilitySummaryGrid">
                    <div className="miniCard">
                      <div className="miniLabel">Brightness</div>
                      <div className="miniValue">{originalSummary.brightnessLabel}</div>
                      <div className="miniSub">{originalSummary.averageBrightness}/100</div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Palette spread</div>
                      <div className="miniValue">{originalSummary.paletteSpread}</div>
                      <div className="miniSub">Higher spread usually means stronger tonal separation.</div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Dominant tone</div>
                      <div className="miniValue">{originalSummary.dominantStrength}</div>
                      <div className="miniSub">Higher values usually mean a flatter dominant tonal mass.</div>
                    </div>
                  </div>
                )}

                {showPalette && (
                  <div className="accessibilityPaletteBlock">
                    <div className="sectionHead">Original palette snapshot</div>
                    <div className="paletteStrip">
                      {originalPalette.map((c) => (
                        <span
                          key={c.hex}
                          className="chip small"
                          style={{ background: c.hex }}
                          title={c.hex}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showSplit && (
              <div className="panelDark comparePanel">
                <div className="panelTop">
                  <div>
                    <div className="panelTitle">{getModeLabel(mode)} preview</div>
                    <div className="panelNote">{getModeDescription(mode)}</div>
                  </div>
                </div>

                <div className="panelBody">
                  <div className="compareStage">
                    <div className="compareBadge">{getModeLabel(mode).toUpperCase()}</div>
                    {simulatedUrl ? (
                      <img
                        className="compareImg"
                        src={simulatedUrl}
                        alt={`${mode} simulated cover`}
                      />
                    ) : (
                      <div className="miniHint">Simulation preview unavailable.</div>
                    )}
                  </div>

                  {simulatedSummary && (
                    <div className="accessibilitySummaryGrid">
                      <div className="miniCard">
                        <div className="miniLabel">Brightness</div>
                        <div className="miniValue">{simulatedSummary.brightnessLabel}</div>
                        <div className="miniSub">{simulatedSummary.averageBrightness}/100</div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Palette spread</div>
                        <div className="miniValue">{simulatedSummary.paletteSpread}</div>
                        <div className="miniSub">Lower spread suggests weaker separation after simulation.</div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Dominant tone</div>
                        <div className="miniValue">{simulatedSummary.dominantStrength}</div>
                        <div className="miniSub">Higher values suggest a flatter simulated tonal reading.</div>
                      </div>
                    </div>
                  )}

                  {showPalette && (
                    <div className="accessibilityPaletteBlock">
                      <div className="sectionHead">Simulated palette snapshot</div>
                      <div className="paletteStrip">
                        {simulatedPalette.map((c) => (
                          <span
                            key={c.hex}
                            className="chip small"
                            style={{ background: c.hex }}
                            title={c.hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {showAnalysis && analysis && (
            <>
              <div className="panelDark" style={{ marginTop: 16 }}>
                <div className="panelTop">
                  <div className="panelTitle">Main analysis factors</div>
                  <div className="panelNote">
                    The most important changes, ranked by how strongly they affect accessibility reading.
                  </div>
                </div>

                <div className="panelBody">
                  <div className="suggestList">
                    {analysis.factors.map((factor) => (
                      <div key={factor.key} className="suggestItem">
                        <div className="suggestTitle">{factor.title}</div>
                        <div className="suggestDetail">
                          <div className="sLine">{factor.detail}</div>
                          <div className="sLine"><b>Basis:</b> {factor.basis}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panelDark" style={{ marginTop: 16 }}>
                <div className="panelTop">
                  <div className="panelTitle">What each value means</div>
                  <div className="panelNote">
                    A more detailed explanation of the values used to build the accessibility comments.
                  </div>
                </div>

                <div className="panelBody">
                  <div className="suggestList">
                    {analysis.metricRows.map((row) => (
                      <div key={row.key} className="suggestItem">
                        <div className="suggestTitle">{row.title}</div>
                        <div className="suggestDetail">
                          <div className="sLine">
                            <b>Original:</b> {row.originalValue} • <b>Simulated:</b> {row.simulatedValue} • <b>Change:</b> {row.delta}
                          </div>
                          <div className="sLine"><b>Meaning:</b> {row.meaning}</div>
                          <div className="sLine"><b>Basis:</b> {row.basis}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="reportGrid" style={{ marginTop: 16 }}>
                <div className="panelDark">
                  <div className="panelTop">
                    <div className="panelTitle">Most important fixes</div>
                    <div className="panelNote">
                      Prioritised actions if the simulation reveals weaker distinction or hierarchy.
                    </div>
                  </div>

                  <div className="panelBody">
                    <div className="suggestList">
                      {analysis.actions.map((line, idx) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestTitle">Priority {idx + 1}</div>
                          <div className="suggestDetail">
                            <div className="sLine">{line}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="panelDark">
                  <div className="panelTop">
                    <div className="panelTitle">What to check next</div>
                    <div className="panelNote">
                      Use these prompts to confirm whether the cover still communicates beyond colour alone.
                    </div>
                  </div>

                  <div className="panelBody">
                    <div className="mxChecklist">
                      <div className="mxCheckItem">
                        <div className="mxCheckHead">Title / artist emphasis</div>
                        <div className="mxCheckText">
                          Does the main information still feel clearly separated from the background even if colour contrast weakens?
                        </div>
                      </div>

                      <div className="mxCheckItem">
                        <div className="mxCheckHead">Palette separation</div>
                        <div className="mxCheckText">
                          Do previously distinct colours collapse into a similar tone, or do they remain separately readable?
                        </div>
                      </div>

                      <div className="mxCheckItem">
                        <div className="mxCheckHead">Hierarchy</div>
                        <div className="mxCheckText">
                          Does the focal point still stand out, or does the cover flatten into one overall mass?
                        </div>
                      </div>

                      <div className="mxCheckItem">
                        <div className="mxCheckHead">Identity</div>
                        <div className="mxCheckText">
                          Does the cover remain recognizable and intentional once colour distinction becomes less reliable?
                        </div>
                      </div>
                    </div>

                    <div className="readyActions" style={{ marginTop: 18 }}>
                      <button
                        className="primaryBtn"
                        onClick={() => navigate("/analyze", { state: { dataUrl } })}
                      >
                        OPEN IN ANALYZE
                      </button>
                      <button
                        className="ghostBtn"
                        onClick={() => navigate("/compare", { state: { leftDataUrl: dataUrl } })}
                      >
                        OPEN IN COMPARE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
