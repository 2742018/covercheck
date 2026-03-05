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
      warning: string;
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
      fix: string;
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

export default function ReportPage() {
  const navigate = useNavigate();
  const report = loadReportFromSession<ReportData>();

  if (!report) {
    return (
      <div className="reportWrap">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">No report available</div>
            <div className="panelNote">
              Generate a report from Analyze first.
            </div>
          </div>
          <div className="panelBody">
            <button className="primaryBtn" onClick={() => navigate("/analyze")}>
              GO TO ANALYZE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <button className="ghostBtn" onClick={() => navigate("/analyze", { state: { dataUrl: report.dataUrl } })}>
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

          {!report.release.overallPass && (
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
                <div className="v">{Math.round(report.safeMargin.score)}/100</div>
              </div>
              <div className="row">
                <div className="k">64px check</div>
                <div className="v">
                  {report.thumb64
                    ? `${report.thumb64.pass ? "PASS" : "FAIL"} • C ${report.thumb64.contrastRatio.toFixed(2)} • K ${Math.round(report.thumb64.clutterScore)}`
                    : "Not available"}
                </div>
              </div>
              <div className="row">
                <div className="k">Light / dark</div>
                <div className="v">{report.composition.lightDark.label}</div>
              </div>
              <div className="row">
                <div className="k">Symmetry</div>
                <div className="v">{report.composition.symmetry.label} • {report.composition.symmetry.score}/100</div>
              </div>
              <div className="row">
                <div className="k">Texture</div>
                <div className="v">{report.composition.texture.label} • {report.composition.texture.energy}/100</div>
              </div>
              <div className="row">
                <div className="k">Organic / technical</div>
                <div className="v">{report.composition.organicTechnical.label} • {report.composition.organicTechnical.score}/100</div>
              </div>
            </div>

            <div className="reportSuggestions">
              <div className="sectionHead">Suggestions</div>
              <div className="suggestList">
                {report.suggestions.map((s, i) => (
                  <div key={i} className="suggestItem">
                    <div className="suggestTitle">{s.title}</div>
                    <div className="suggestDetail">
                      <div className="sLine"><b>Why:</b> {s.why}</div>
                      <div className="sLine"><b>Try:</b> {s.try}</div>
                      {s.target && <div className="sLine"><b>Target:</b> {s.target}</div>}
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
