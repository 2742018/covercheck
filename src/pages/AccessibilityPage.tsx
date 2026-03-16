import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import {
  type PaletteSwatch,
  type SimSummary,
  type VisionMode,
  getModeDescription,
  getModeLabel,
  buildActionSuggestions,
  buildAutoInsights,
  makeSimulatedImage,
} from "../lib/accessibility";
import { Printer } from "lucide-react";

type AccessibilityState = {
  dataUrl?: string;
};

async function loadFromFile(file: File) {
  return await fileToObjectUrl(file);
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

  const insightLines = buildAutoInsights(originalSummary, simulatedSummary, mode);
  const actionLines = buildActionSuggestions(originalSummary, simulatedSummary);

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

        <div className="testKicker"> Colour Simulation</div>
        <div className="testTitle">Accessibility</div>
        <div className="testLead">
          Preview how your cover may appear under common colour-vision deficiency
          simulations. Use this page to check whether important palette distinctions,
          focal emphasis, and visual hierarchy still hold up when colour cues change.
        </div>

        <div className="compareHeroBullets accessibilityIntroGrid">
          <div className="mockBullet">
            <div className="mockBulletHead">Why it matters</div>
            <div className="mockBulletText">
              Strong covers should not depend entirely on fragile hue differences for
              recognition, emphasis, or separation.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">What this page does</div>
            <div className="mockBulletText">
              It simulates common colour-vision conditions, compares palette change,
              and generates an automatic summary of likely accessibility risks.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">How to use it</div>
            <div className="mockBulletText">
              Start here for a quick colour-accessibility check, then move into Analyze
              if the simulation suggests weak separation or hierarchy.
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


            <div className="panelDark">
              <div className="panelTop">
                <div className="panelTitle">How to use this page</div>
                <div className="panelNote">
                  A simple accessibility-aware colour review workflow.
                </div>
              </div>

              <div className="panelBody">
                <div className="suggestList">
                  <div className="suggestItem">
                    <div className="suggestTitle">1. Load a cover</div>
                    <div className="suggestDetail">
                      <div className="sLine">
                        Start with your current cover or open this page after working elsewhere in CoverCheck.
                      </div>
                    </div>
                  </div>

                  <div className="suggestItem">
                    <div className="suggestTitle">2. Change simulation mode</div>
                    <div className="suggestDetail">
                      <div className="sLine">
                        Switch through different colour-vision deficiency simulations and compare how the image changes.
                      </div>
                    </div>
                  </div>

                  <div className="suggestItem">
                    <div className="suggestTitle">3. Read the auto analysis</div>
                    <div className="suggestDetail">
                      <div className="sLine">
                        Use the generated observations to identify whether your cover depends too heavily on colour difference alone.
                      </div>
                    </div>
                  </div>

                  <div className="suggestItem">
                    <div className="suggestTitle">4. Refine elsewhere if needed</div>
                    <div className="suggestDetail">
                      <div className="sLine">
                        Move back into Analyze or Compare if the simulation reveals weak hierarchy or palette collapse.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


      {dataUrl && (
        <>
          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Simulator controls</div>
              <div className="panelNote">
                Choose a simulation mode, switch display options, and show or hide the
                automatic analysis layer.
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
                      AUTO ANALYSIS
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
                      <div className="miniSub">
                        {originalSummary.averageBrightness}/100
                      </div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Palette spread</div>
                      <div className="miniValue">{originalSummary.paletteSpread}</div>
                      <div className="miniSub">more spread = more separation</div>
                    </div>

                    <div className="miniCard">
                      <div className="miniLabel">Dominant tone</div>
                      <div className="miniValue">{originalSummary.dominantStrength}</div>
                      <div className="miniSub">higher = flatter dominance</div>
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
                        <div className="miniSub">
                          {simulatedSummary.averageBrightness}/100
                        </div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Palette spread</div>
                        <div className="miniValue">{simulatedSummary.paletteSpread}</div>
                        <div className="miniSub">separation after simulation</div>
                      </div>

                      <div className="miniCard">
                        <div className="miniLabel">Dominant tone</div>
                        <div className="miniValue">{simulatedSummary.dominantStrength}</div>
                        <div className="miniSub">higher = flatter dominance</div>
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

          {showAnalysis && (
            <div className="reportGrid" style={{ marginTop: 16 }}>
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">Auto-generated analysis</div>
                  <div className="panelNote">
                    A quick interpretation of what changes under the selected simulation.
                  </div>
                </div>

                <div className="panelBody">
                  {!originalSummary || !simulatedSummary ? (
                    <div className="miniHint">
                      Upload a cover to generate automatic accessibility insights.
                    </div>
                  ) : (
                    <div className="suggestList">
                      {insightLines.map((line) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestDetail">
                            <div className="sLine">{line}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">What to do next</div>
                  <div className="panelNote">
                    Suggested directions if the simulation reveals weaker distinction or hierarchy.
                  </div>
                </div>

                <div className="panelBody">
                  {!originalSummary || !simulatedSummary ? (
                    <div className="miniHint">
                      Suggestions will appear once the simulated preview is available.
                    </div>
                  ) : (
                    <div className="suggestList">
                      {actionLines.map((line) => (
                        <div key={line} className="suggestItem">
                          <div className="suggestDetail">
                            <div className="sLine">{line}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
          )}

          <div className="reportGrid" style={{ marginTop: 16 }}>
            <div className="panelDark">
              <div className="panelTop">
                <div className="panelTitle">What to check</div>
                <div className="panelNote">
                  Use these prompts to assess whether visual distinctions still survive.
                </div>
              </div>

              <div className="panelBody">
                <div className="mxChecklist">
                  <div className="mxCheckItem">
                    <div className="mxCheckHead">Title / artist emphasis</div>
                    <div className="mxCheckText">
                      Does the main information still feel clearly separated from the background?
                    </div>
                  </div>

                  <div className="mxCheckItem">
                    <div className="mxCheckHead">Palette separation</div>
                    <div className="mxCheckText">
                      Do previously distinct colours begin to collapse into a similar tone?
                    </div>
                  </div>

                  <div className="mxCheckItem">
                    <div className="mxCheckHead">Hierarchy</div>
                    <div className="mxCheckText">
                      Does the focal point still stand out, or does the cover flatten visually?
                    </div>
                  </div>

                  <div className="mxCheckItem">
                    <div className="mxCheckHead">Identity</div>
                    <div className="mxCheckText">
                      Does the cover still feel recognizable and intentional, even with reduced colour distinction?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}