import { useNavigate } from "react-router-dom";
import { readLocal } from "../lib/storage";

const REPORT_KEY = "covercheck.report.v1";

export default function ReportPage() {
  const navigate = useNavigate();
  const report = readLocal<any>(REPORT_KEY, null);

  if (!report) {
    return (
      <div className="reportWrap">
        <div className="emptyState">
          <div className="emptyTitle">No report saved yet</div>
          <div className="emptySub">
            Go to Analyze → draw a region → wait for scores → click Generate Report.
          </div>
          <button className="primaryBtn" onClick={() => navigate("/analyze")}>
            GO TO ANALYZE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <div>
          <div className="reportTitle">REPORT</div>
          <div className="panelNote">
            Created: {new Date(report.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="reportActions">
          <button className="ghostBtn" onClick={() => navigate("/analyze")}>← BACK</button>
          <button className="primaryBtn" onClick={() => window.print()}>PRINT / SAVE PDF</button>
        </div>
      </div>

      <div className="reportGrid">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Cover</div>
            <div className="panelNote">This is your uploaded cover (local-only).</div>
          </div>
          <div className="panelBody">
            <div className="reportFigure" style={{ aspectRatio: "1 / 1" }}>
              <img src={report.dataUrl} alt="Cover" />
            </div>
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Summary</div>
            <div className="panelNote">Saved metrics and suggestions.</div>
          </div>
          <div className="panelBody">
            <div className="reportTable">
              <div className="row">
                <div className="k">Image</div>
                <div className="v">
                  {report.imageSize?.w}×{report.imageSize?.h}
                </div>
              </div>
              <div className="row">
                <div className="k">View</div>
                <div className="v">{String(report.viewMode).toUpperCase()}</div>
              </div>
              <div className="row">
                <div className="k">Contrast</div>
                <div className="v">{report.regionMetrics?.contrastRatio?.toFixed?.(2) ?? "—"}</div>
              </div>
              <div className="row">
                <div className="k">Clutter</div>
                <div className="v">{Math.round(report.regionMetrics?.clutterScore ?? 0)}/100</div>
              </div>
              <div className="row">
                <div className="k">Safe Area</div>
                <div className="v">{report.safeMargin?.score?.toFixed?.(0) ?? "—"}/100</div>
              </div>
            </div>

            <div className="reportSuggestions">
              <div className="panelTitle" style={{ marginBottom: 10 }}>Suggestions</div>
              <div className="suggestList">
                {(report.suggestions ?? []).map((s: any, i: number) => (
                  <div key={i} className="suggestItem">
                    <div className="suggestTitle">{s.title}</div>
                    <div className="suggestDetail">
                      <div className="sLine"><b>Why:</b> {s.why}</div>
                      <div className="sLine"><b>Try:</b> {s.try}</div>
                      {s.target ? <div className="sLine"><b>Target:</b> {s.target}</div> : null}
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
