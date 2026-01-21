import { useLocation, useNavigate } from "react-router-dom";

type NormalizedRect = { x: number; y: number; w: number; h: number };

type RegionMetrics = {
  contrastRatio: number;
  contrastScore: number;
  clutterScore: number;
};

type SafeMarginResult = {
  score: number;
  pass: boolean;
  outsidePct: number;
};

type PaletteResult = {
  regionAvg: string;
  region: string[];
  image: string[];
  text: {
    primary: string;
    secondary: string;
    accent: string;
    primaryRatio: number;
    secondaryRatio: number;
    accentRatio: number;
  };
  compatible: {
    complement: string;
    analogous: string[];
    triadic: string[];
    splitComplement: string[];
    tints: string[];
    shades: string[];
  };
};

type Suggestion = { title: string; why: string; try: string; target?: string };

type ReportData = {
  createdAt: string;
  dataUrl: string;
  imageSize: { w: number; h: number };
  viewMode: "crop" | "full";
  region: NormalizedRect;
  mappedRegion: NormalizedRect;
  regionMetrics: RegionMetrics;
  safeMargin: SafeMarginResult;
  palette: PaletteResult;
  suggestions: Suggestion[];
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isReportData(v: unknown): v is ReportData {
  if (!isObj(v)) return false;
  if (typeof v.dataUrl !== "string") return false;
  if (!isObj(v.imageSize)) return false;
  if (typeof v.imageSize.w !== "number" || typeof v.imageSize.h !== "number") return false;
  if (!isObj(v.regionMetrics) || typeof v.regionMetrics.contrastRatio !== "number") return false;
  if (!isObj(v.safeMargin) || typeof v.safeMargin.score !== "number") return false;
  if (!isObj(v.palette) || typeof v.palette.regionAvg !== "string") return false;
  if (!Array.isArray(v.suggestions)) return false;
  return true;
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation() as unknown as { state?: { report?: unknown } };

  const reportRaw = location.state?.report;
  const report = isReportData(reportRaw) ? reportRaw : null;

  if (!report) {
    return (
      <div className="reportWrap">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Report</div>
            <div className="panelNote">No report data found.</div>
          </div>
          <div className="panelBody">
            <div className="miniHint">
              Go back to Analyze → draw a region → click <b>GENERATE REPORT</b>.
            </div>
            <button className="primaryBtn" onClick={() => navigate("/analyze")}>
              BACK TO ANALYZE
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { regionMetrics, safeMargin, palette } = report;

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <div>
          <div className="reportTitle">REPORT</div>
          <div className="subtle">Created: {fmtDate(report.createdAt)}</div>
        </div>

        <div className="reportActions">
          <button className="ghostBtn" onClick={() => navigate("/analyze")}>
            ← BACK
          </button>
          <button className="primaryBtn" onClick={() => window.print()}>
            PRINT / SAVE PDF
          </button>
        </div>
      </div>

      <div className="reportGrid">
        {/* LEFT: figure */}
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Cover</div>
            <div className="panelNote">This report is generated from your current analysis.</div>
          </div>

          <div className="panelBody">
            <div className="reportFigure" style={{ aspectRatio: "1 / 1" }}>
              <img src={report.dataUrl} alt="Uploaded cover" />
            </div>
          </div>
        </div>

        {/* RIGHT: summary */}
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Summary</div>
            <div className="panelNote">Key metrics + configuration used.</div>
          </div>

          <div className="panelBody">
            <div className="reportTable">
              <div className="row">
                <div className="k">Image</div>
                <div className="v">
                  {report.imageSize.w}×{report.imageSize.h}
                </div>
              </div>

              <div className="row">
                <div className="k">View mode</div>
                <div className="v">{report.viewMode.toUpperCase()}</div>
              </div>

              <div className="row">
                <div className="k">Region</div>
                <div className="v">
                  x {pct(report.region.x)}, y {pct(report.region.y)}, w {pct(report.region.w)}, h {pct(report.region.h)}
                </div>
              </div>

              <div className="row">
                <div className="k">Contrast</div>
                <div className="v">{regionMetrics.contrastRatio.toFixed(2)} (target ≥ 4.5)</div>
              </div>

              <div className="row">
                <div className="k">Clutter</div>
                <div className="v">{Math.round(regionMetrics.clutterScore)}/100 (target ≥ 60)</div>
              </div>

              <div className="row">
                <div className="k">Safe area</div>
                <div className="v">
                  {safeMargin.pass ? "PASS" : "FAIL"} • {safeMargin.score.toFixed(0)}/100 •{" "}
                  {safeMargin.outsidePct.toFixed(0)}% outside
                </div>
              </div>
            </div>

            {/* Palette */}
            <div className="reportSuggestions">
              <div className="sectionHead">Color palette</div>

              <div className="chipRow">
                <div className="chipMeta">
                  <div className="miniLabel">Region avg</div>
                  <span className="chip" style={{ background: palette.regionAvg }} title={palette.regionAvg} />
                  <div className="miniSub">{palette.regionAvg}</div>
                </div>

                <div className="chipMeta">
                  <div className="miniLabel">Best text</div>
                  <span className="chip" style={{ background: palette.text.primary }} title={palette.text.primary} />
                  <div className="miniSub">
                    {palette.text.primary} • {palette.text.primaryRatio.toFixed(2)}×
                  </div>
                </div>

                <div className="chipMeta">
                  <div className="miniLabel">Alt text</div>
                  <span className="chip" style={{ background: palette.text.secondary }} title={palette.text.secondary} />
                  <div className="miniSub">
                    {palette.text.secondary} • {palette.text.secondaryRatio.toFixed(2)}×
                  </div>
                </div>

                <div className="chipMeta">
                  <div className="miniLabel">Accent</div>
                  <span className="chip" style={{ background: palette.text.accent }} title={palette.text.accent} />
                  <div className="miniSub">
                    {palette.text.accent} • {palette.text.accentRatio.toFixed(2)}×
                  </div>
                </div>
              </div>

              <div className="paletteRows">
                <div className="paletteLine">
                  <span className="miniLabel">Region palette</span>
                  <div className="paletteStrip">
                    {palette.region.map((c) => (
                      <span key={c} className="chip small" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>

                <div className="paletteLine">
                  <span className="miniLabel">Image palette</span>
                  <div className="paletteStrip">
                    {palette.image.map((c) => (
                      <span key={c} className="chip small" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>

                <div className="paletteLine">
                  <span className="miniLabel">Complement</span>
                  <div className="paletteStrip">
                    <span
                      className="chip small"
                      style={{ background: palette.compatible.complement }}
                      title={palette.compatible.complement}
                    />
                  </div>
                </div>

                <div className="paletteLine">
                  <span className="miniLabel">Analogous</span>
                  <div className="paletteStrip">
                    {palette.compatible.analogous.map((c) => (
                      <span key={c} className="chip small" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>

                <div className="paletteLine">
                  <span className="miniLabel">Triadic</span>
                  <div className="paletteStrip">
                    {palette.compatible.triadic.map((c) => (
                      <span key={c} className="chip small" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>

                <div className="paletteLine">
                  <span className="miniLabel">Tints / Shades</span>
                  <div className="paletteStrip">
                    {palette.compatible.tints.map((c) => (
                      <span key={c} className="chip small" style={{ background: c }} title={c} />
                    ))}
                    {palette.compatible.shades.map((c) => (
                      <span key={c} className="chip small" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="reportSuggestions">
              <div className="sectionHead">Suggestions</div>
              <div className="suggestList">
                {report.suggestions.map((s, i) => (
                  <div key={i} className="suggestItem">
                    <div className="suggestTitle">{s.title}</div>
                    <div className="suggestDetail">
                      <div className="sLine">
                        <b>Why:</b> {s.why}
                      </div>
                      <div className="sLine">
                        <b>Try:</b> {s.try}
                      </div>
                      {s.target && (
                        <div className="sLine">
                          <b>Target:</b> {s.target}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="detailLine">
              Tip: Use your browser print dialog → “Save as PDF” to export.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}