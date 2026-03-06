import { useNavigate } from "react-router-dom";
import { loadReportFromSession } from "../lib/reportStore";

type ViewMode = "crop" | "full";

type ReportData = {
  createdAt: string;
  dataUrl: string;
  imageSize: { w: number; h: number };
  viewMode: ViewMode;
  region: { x: number; y: number; w: number; h: number };
  mappedRegion: { x: number; y: number; w: number; h: number };
  regionMetrics: {
    contrastRatio: number;
    clutterScore: number;
    contrastScore?: number;
  };
  safeMargin: {
    score: number;
    pass: boolean;
    outsidePct: number;
  };
  palette: {
    regionAvg: string;
    region: string[];
    image: string[];
    text: {
      primary: string;
      primaryRatio: number;
      secondary: string;
      secondaryRatio: number;
      accent: string;
      accentRatio: number;
    };
  };
  composition: {
    lightDark: {
      averageLuminance: number;
      label: string;
      warning?: string;
    };
    colorBalance: {
      warmPct: number;
      coolPct: number;
      saturationSpread: number;
      dominantWeight: number;
      label: string;
    };
    symmetry: {
      score: number;
      label: string;
    };
    texture: {
      energy: number;
      label: string;
    };
    organicTechnical: {
      score: number;
      label: string;
    };
  };
  thumb64: {
    contrastRatio: number;
    clutterScore: number;
    regionMinPx: number;
    pass: boolean;
    note: string;
  } | null;
  release: {
    overallPass: boolean;
    score: number;
    checks: Array<{
      id: string;
      label: string;
      pass: boolean;
      value: string;
      target: string;
      why: string;
      fix?: string;
    }>;
    nextChanges: string[];
  };
  suggestions: Array<{
    title: string;
    why: string;
    try: string;
    target?: string;
  }>;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function ReportPage() {
  const navigate = useNavigate();

  const store = loadReportFromSession<ReportData, "report" | "ready" | string>();
  const report = store?.report ?? null;
  const finalAction = store?.meta ?? null;

  console.log("[ReportPage] store", store);

  if (!report) {
    return (
      <div className="reportWrap">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">REPORT</div>
            <div className="panelNote">
              No report data found. This can happen after a refresh because reports are only kept in memory.
            </div>
          </div>
          <div className="panelBody">
            <button className="primaryBtn" onClick={() => navigate("/analyze")}>
              BACK TO ANALYZE
            </button>
          </div>
        </div>
      </div>
    );
  }

  const actionLabel =
    finalAction === "ready"
      ? "Release-readiness report"
      : finalAction === "report"
        ? "Analysis report"
        : "Cover report";

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <button
          className="ghostBtn"
          onClick={() => navigate("/analyze", { state: { dataUrl: report.dataUrl } })}
        >
          ← BACK
        </button>

        <div className="reportTitle">REPORT</div>

        <div className="reportActions">
          <button className="ghostBtn" onClick={() => window.print()}>
            PRINT / SAVE PDF
          </button>
        </div>
      </div>

      <div className="panelDark">
        <div className="panelTop">
          <div className="panelTitle">Report overview</div>
          <div className="panelNote">
            {actionLabel} generated on {formatDate(report.createdAt)}.
          </div>
        </div>
        <div className="panelBody">
          <div className="metaRow">
            <span className="tag">
              image: {report.imageSize.w}×{report.imageSize.h}
            </span>
            <span className="tag">view: {report.viewMode.toUpperCase()}</span>
            <span className="tag">
              region: {Math.round(report.region.w * 100)}% × {Math.round(report.region.h * 100)}%
            </span>
            <span className={`statusTag ${report.release.overallPass ? "pass" : "fail"}`}>
              {report.release.overallPass ? "READY TO UPLOAD" : "NOT READY"} • {report.release.score}/100
            </span>
          </div>
        </div>
      </div>

      <div className="panelDark" style={{ marginTop: 16 }}>
        <div className="panelTop">
          <div className="panelTitle">Release readiness</div>
          <div className="panelNote">
            Final pass/fail decision for the current cover region.
          </div>
        </div>
        <div className="panelBody">
          <div className="readyTop">
            <span className={`statusTag ${report.release.overallPass ? "pass" : "fail"}`}>
              {report.release.overallPass ? "READY TO UPLOAD" : "NOT READY"} • {report.release.score}/100
            </span>
          </div>

          <div className="readyList">
            {report.release.checks.map((c) => (
              <div key={c.id} className="readyRow">
                <div>
                  <div className="readyLabel">{c.label}</div>
                  <div className="readyMeta">
                    <b>Value:</b> {c.value} • <b>Target:</b> {c.target}
                  </div>
                  <div className="readyMeta">{c.why}</div>
                </div>
                <span className={`statusTag ${c.pass ? "pass" : "fail"}`}>
                  {c.pass ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>

          {!report.release.overallPass && report.release.nextChanges.length > 0 && (
            <div className="readyFixes">
              <div className="sectionHead">What to change next</div>
              <ul className="readyFixList">
                {report.release.nextChanges.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="reportGrid" style={{ marginTop: 16 }}>
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Cover snapshot</div>
            <div className="panelNote">Your uploaded cover.</div>
          </div>
          <div className="panelBody">
            <div className="reportFigure">
              <img src={report.dataUrl} alt="Cover report" />
            </div>

            <div className="reportTable" style={{ marginTop: 16 }}>
              <div className="row">
                <div className="k">Created</div>
                <div className="v">{formatDate(report.createdAt)}</div>
              </div>
              <div className="row">
                <div className="k">Mode</div>
                <div className="v">{report.viewMode}</div>
              </div>
              <div className="row">
                <div className="k">Image size</div>
                <div className="v">
                  {report.imageSize.w}×{report.imageSize.h}
                </div>
              </div>
              <div className="row">
                <div className="k">Region avg color</div>
                <div className="v">{report.palette.regionAvg}</div>
              </div>
              <div className="row">
                <div className="k">Best text color</div>
                <div className="v">
                  {report.palette.text.primary} • {report.palette.text.primaryRatio.toFixed(2)}×
                </div>
              </div>
              <div className="row">
                <div className="k">Alt text color</div>
                <div className="v">
                  {report.palette.text.secondary} • {report.palette.text.secondaryRatio.toFixed(2)}×
                </div>
              </div>
              <div className="row">
                <div className="k">Accent color</div>
                <div className="v">
                  {report.palette.text.accent} • {report.palette.text.accentRatio.toFixed(2)}×
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Summary</div>
            <div className="panelNote">Metrics used to support the final decision.</div>
          </div>
          <div className="panelBody">
            <div className="reportTable">
              <div className="row">
                <div className="k">Contrast</div>
                <div className="v">{report.regionMetrics.contrastRatio.toFixed(2)}</div>
              </div>
              <div className="row">
                <div className="k">Clutter</div>
                <div className="v">{Math.round(report.regionMetrics.clutterScore)}/100</div>
              </div>
              <div className="row">
                <div className="k">Safe area</div>
                <div className="v">
                  {Math.round(report.safeMargin.score)}/100 • {report.safeMargin.pass ? "PASS" : "FAIL"}
                </div>
              </div>
              <div className="row">
                <div className="k">Outside safe area</div>
                <div className="v">{Math.round(report.safeMargin.outsidePct)}%</div>
              </div>
              <div className="row">
                <div className="k">64px check</div>
                <div className="v">
                  {report.thumb64
                    ? `${report.thumb64.pass ? "PASS" : "FAIL"} • C ${report.thumb64.contrastRatio.toFixed(
                        2
                      )} • K ${Math.round(report.thumb64.clutterScore)} • ${Math.round(
                        report.thumb64.regionMinPx
                      )}px`
                    : "Not available"}
                </div>
              </div>
              <div className="row">
                <div className="k">Light / dark</div>
                <div className="v">{report.composition.lightDark.label}</div>
              </div>
              <div className="row">
                <div className="k">Colour balance</div>
                <div className="v">{report.composition.colorBalance.label}</div>
              </div>
              <div className="row">
                <div className="k">Symmetry</div>
                <div className="v">
                  {report.composition.symmetry.label} • {report.composition.symmetry.score}/100
                </div>
              </div>
              <div className="row">
                <div className="k">Texture</div>
                <div className="v">
                  {report.composition.texture.label} • {report.composition.texture.energy}/100
                </div>
              </div>
              <div className="row">
                <div className="k">Organic / technical</div>
                <div className="v">
                  {report.composition.organicTechnical.label} • {report.composition.organicTechnical.score}/100
                </div>
              </div>
            </div>

            {report.composition.lightDark.warning && (
              <div className="detailLine" style={{ marginTop: 12 }}>
                {report.composition.lightDark.warning}
              </div>
            )}

            <div className="reportSuggestions">
              <div className="sectionHead">Suggestions</div>
              <div className="suggestList">
                {report.suggestions.map((s, i) => (
                  <div key={`${s.title}-${i}`} className="suggestItem">
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
          </div>
        </div>
      </div>
    </div>
  );
}