import { useNavigate } from "react-router-dom";
import { readLocal } from "../lib/storage";
import type { NormalizedRect } from "../analysis/metrics";

const REPORT_KEY = "covercheck.report.v1";

type Suggestion = { title: string; why: string; try: string; target?: string };

type ReportData = {
  createdAt: string;
  dataUrl: string;
  imageSize: { w: number; h: number };
  region: NormalizedRect;
  regionMetrics: { contrastRatio: number; contrastScore: number; clutterScore: number };
  safeMargin: { inset: number; score: number; outsidePct: number; pass: boolean };
  palette: {
    image: string[];
    region: string[];
    regionAvg: string;
    text: { primary: string; primaryRatio: number; secondary: string; secondaryRatio: number; accent: string; accentRatio: number };
  };
  suggestions: Suggestion[];
};

export default function ReportPage() {
  const navigate = useNavigate();
  const report = readLocal<ReportData | null>(REPORT_KEY, null);

  if (!report) {
    return (
      <div className="reportWrap">
        <div className="reportHeader">
          <button className="ghostBtn" onClick={() => navigate("/analyze")}>← BACK</button>
          <div className="reportTitle">REPORT</div>
        </div>
        <div className="panelDark">
          <div className="panelBody">
            <div className="miniHint">No report yet. Go to Analyze, select a region, then click “Generate report”.</div>
          </div>
        </div>
      </div>
    );
  }

  const { dataUrl, imageSize, region, safeMargin, regionMetrics, palette, suggestions } = report;

  const safeX = safeMargin.inset * 100;
  const safeY = safeMargin.inset * 100;
  const safeW = (1 - safeMargin.inset * 2) * 100;
  const safeH = (1 - safeMargin.inset * 2) * 100;

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <button className="ghostBtn" onClick={() => navigate("/analyze")}>← BACK</button>
        <div className="reportTitle">COVERCHECK REPORT</div>
        <div className="reportActions">
        </div>
      </div>

      <div className="reportGrid">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Figure</div>
            <div className="panelNote">Safe area (dashed) + selected region (solid).</div>
          </div>
          <div className="panelBody">
            <div className="reportFigure" style={{ aspectRatio: `${imageSize.w} / ${imageSize.h}` }}>
              <img src={dataUrl} alt="Cover" />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <rect x={safeX} y={safeY} width={safeW} height={safeH} fill="none" stroke="rgba(245,245,245,.55)" strokeDasharray="4 4" strokeWidth="0.6" />
                <rect
                  x={region.x * 100}
                  y={region.y * 100}
                  width={region.w * 100}
                  height={region.h * 100}
                  fill="rgba(255,196,0,.10)"
                  stroke="rgba(255,196,0,.95)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </div>
          <div className="panelBottom">
            <div className="metaRow">
              <span className="tag">{imageSize.w}×{imageSize.h}</span>
              <span className={`statusTag ${safeMargin.pass ? "pass" : "fail"}`}>
                SAFE {safeMargin.pass ? "PASS" : "FAIL"} • {safeMargin.score.toFixed(0)}/100
              </span>
              <span className="tag">Created: {new Date(report.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Summary</div>
            <div className="panelNote">Numbers + targets (print-friendly).</div>
          </div>
          <div className="panelBody">
            <div className="reportTable">
              <div className="row">
                <div className="k">Contrast (region)</div>
                <div className="v">{regionMetrics.contrastRatio.toFixed(2)} (target ≥ 4.5)</div>
              </div>
              <div className="row">
                <div className="k">Clutter (region)</div>
                <div className="v">{Math.round(regionMetrics.clutterScore)} / 100 (target ≥ 60)</div>
              </div>
              <div className="row">
                <div className="k">Safe margin</div>
                <div className="v">{safeMargin.score.toFixed(0)} / 100 • {safeMargin.outsidePct.toFixed(0)}% outside</div>
              </div>
            </div>

            <div className="reportColorBlock">
              <div className="sectionHead">Color</div>
              <div className="chipRow">
                <div className="chipMeta">
                  <div className="miniLabel">Region avg</div>
                  <div className="chip" style={{ background: palette.regionAvg }} />
                  <div className="miniSub">{palette.regionAvg}</div>
                </div>
                <div className="chipMeta">
                  <div className="miniLabel">Best text</div>
                  <div className="chip" style={{ background: palette.text.primary }} />
                  <div className="miniSub">{palette.text.primary} • {palette.text.primaryRatio.toFixed(2)}×</div>
                </div>
                <div className="chipMeta">
                  <div className="miniLabel">Alt text</div>
                  <div className="chip" style={{ background: palette.text.secondary }} />
                  <div className="miniSub">{palette.text.secondary} • {palette.text.secondaryRatio.toFixed(2)}×</div>
                </div>
                <div className="chipMeta">
                  <div className="miniLabel">Accent</div>
                  <div className="chip" style={{ background: palette.text.accent }} />
                  <div className="miniSub">{palette.text.accent} • {palette.text.accentRatio.toFixed(2)}×</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panelBottom">
            <div className="miniHint">Suggestions are below (Why / Try / Target).</div>
          </div>
        </div>
      </div>

      <div className="panelDark reportSuggestions">
        <div className="panelTop">
          <div className="panelTitle">Suggestions</div>
          <div className="panelNote">Actionable fixes (print-ready).</div>
        </div>
        <div className="panelBody">
          <div className="suggestList">
            {suggestions.map((s, i) => (
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
  );
}