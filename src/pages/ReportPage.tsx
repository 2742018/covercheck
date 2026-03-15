
import React, { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearReportFromSession as clearReportFromSessionStore,
  useReportFromSession,
} from "../lib/reportStore";
import type { ReportData } from "../lib/report";

function formatDate(value: unknown) {
  if (typeof value !== "string") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function pct01(n: unknown) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${Math.round(v * 100)}%`;
}

function safeToFixed(n: unknown, digits = 2) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function safeUpper(v: unknown) {
  return typeof v === "string" ? v.toUpperCase() : "—";
}

function SkelLine({ w = "100%" }: { w?: string }) {
  return <div className="skelLine" style={{ width: w }} />;
}
function SkelBox({ h = 240 }: { h?: number }) {
  return <div className="skelBox" style={{ height: h }} />;
}

function ReportSkeleton() {
  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <button className="ghostBtn" disabled>
          ← BACK
        </button>
        <div className="reportTitle">REPORT</div>
        <div className="reportActions">
          <button className="ghostBtn" disabled>
            PRINT / SAVE PDF
          </button>
        </div>
      </div>

      <div className="panelDark">
        <div className="panelTop">
          <div className="panelTitle">Loading report…</div>
          <div className="panelNote">
            <SkelLine w="72%" />
          </div>
        </div>
        <div className="panelBody">
          <div className="metaRow">
            <span className="tag skelTag" />
            <span className="tag skelTag" />
            <span className="tag skelTag" />
            <span className="tag skelTagWide" />
          </div>
        </div>
      </div>

      <div className="panelDark" style={{ marginTop: 16 }}>
        <div className="panelTop">
          <div className="panelTitle">Release readiness</div>
          <div className="panelNote">
            <SkelLine w="64%" />
          </div>
        </div>
        <div className="panelBody">
          <SkelLine w="40%" />
          <div style={{ height: 10 }} />
          <SkelLine w="92%" />
        </div>
      </div>

      <div className="reportGrid" style={{ marginTop: 16 }}>
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Cover snapshot</div>
            <div className="panelNote">
              <SkelLine w="55%" />
            </div>
          </div>
          <div className="panelBody">
            <SkelBox h={320} />
          </div>
        </div>

        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Summary</div>
            <div className="panelNote">
              <SkelLine w="60%" />
            </div>
          </div>
          <div className="panelBody">
            <SkelLine w="88%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyReport({
  onBack,
  note,
}: {
  onBack: () => void;
  note?: ReactNode;
}) {
  return (
    <div className="reportWrap">
      <div className="panelDark">
        <div className="panelTop">
          <div className="panelTitle">REPORT</div>
          <div className="panelNote">{note ?? "No report data found. Generate a new report from Analyze."}</div>
        </div>
        <div className="panelBody" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="primaryBtn" onClick={onBack}>
            BACK TO ANALYZE
          </button>
          <button
            className="ghostBtn"
            onClick={() => {
              clearReportFromSessionStore();
              onBack();
            }}
            title="Clears the saved report payload for this tab."
          >
            CLEAR SAVED REPORT
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
  style,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="panelDark" style={style}>
      <div className="panelTop">
        <div className="panelTitle">{title}</div>
        {note ? <div className="panelNote">{note}</div> : null}
      </div>
      <div className="panelBody">{children}</div>
    </div>
  );
}

function KeyValueTable({
  rows,
  style,
}: {
  rows: Array<{ k: string; v: ReactNode }>;
  style?: CSSProperties;
}) {
  return (
    <div className="reportTable" style={style}>
      {rows.map((r, idx) => (
        <div key={`${r.k}-${idx}`} className="row">
          <div className="k">{r.k}</div>
          <div className="v">{r.v}</div>
        </div>
      ))}
    </div>
  );
}

function validateReportShape(r: unknown): { ok: boolean; reason?: string } {
  const x = r as any;
  if (!x || typeof x !== "object") return { ok: false, reason: "Report is not an object." };
  if (typeof x.createdAt !== "string") return { ok: false, reason: "Missing createdAt." };
  if (typeof x.dataUrl !== "string") return { ok: false, reason: "Missing dataUrl." };
  if (typeof x.viewMode !== "string") return { ok: false, reason: "Missing viewMode." };
  if (!x.imageSize || typeof x.imageSize.w !== "number" || typeof x.imageSize.h !== "number") {
    return { ok: false, reason: "Missing imageSize." };
  }
  if (!x.region || typeof x.region.w !== "number" || typeof x.region.h !== "number") {
    return { ok: false, reason: "Missing region." };
  }
  if (!x.release || typeof x.release.score !== "number" || !Array.isArray(x.release.checks)) {
    return { ok: false, reason: "Missing release checks." };
  }
  if (!x.palette || !x.palette.text) return { ok: false, reason: "Missing palette." };
  if (!x.composition || !x.composition.lightDark) {
    return { ok: false, reason: "Old report payload (missing composition)." };
  }
  return { ok: true };
}

class ReportErrorBoundary extends React.Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ReportPage] render error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="reportWrap">
          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">REPORT ERROR</div>
              <div className="panelNote">The report UI hit an error and was safely stopped.</div>
            </div>
            <div className="panelBody">
              <div className="detailLine" style={{ whiteSpace: "pre-wrap" }}>
                {this.state.error.message}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  className="primaryBtn"
                  onClick={() => {
                    clearReportFromSessionStore();
                    this.setState({ error: null });
                    this.props.onReset();
                  }}
                >
                  CLEAR REPORT + BACK
                </button>
                <button className="ghostBtn" onClick={() => window.location.reload()}>
                  RELOAD
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReportInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const store = useReportFromSession<ReportData, "report" | "ready" | string>();

  const [stickyReport, setStickyReport] = useState<ReportData | null>(null);
  const [stickyMeta, setStickyMeta] = useState<string | null>(null);

  // Keep a "stable" report once we have a valid one
  useEffect(() => {
    if (!store.report) return;
    const v = validateReportShape(store.report);
    if (!v.ok) return;
    setStickyReport(store.report);
    setStickyMeta(store.meta ?? null);
  }, [store.report, store.meta]);

  const report = store.report ?? stickyReport;
  const finalAction = store.meta ?? stickyMeta;

  const validation = useMemo(() => validateReportShape(report), [report]);

  // ✅ NEVER call hooks conditionally. Auto-clear invalid report here.
  const clearedInvalidRef = useRef(false);
  useEffect(() => {
    if (!report) return;
    if (validation.ok) return;
    if (clearedInvalidRef.current) return;

    clearedInvalidRef.current = true;
    clearReportFromSessionStore();
  }, [report, validation.ok]);

  const [showEmpty, setShowEmpty] = useState(false);
  useEffect(() => {
    setShowEmpty(false);
    const t = window.setTimeout(() => setShowEmpty(true), 650);
    return () => window.clearTimeout(t);
  }, [location.key]);

  const actionLabel = useMemo(() => {
    if (finalAction === "ready") return "Release-readiness report";
    if (finalAction === "report") return "Analysis report";
    return "Cover report";
  }, [finalAction]);

  const [imgBroken, setImgBroken] = useState(false);
  useEffect(() => setImgBroken(false), [report && (report as any).dataUrl]);

  if (!report) {
    if (!showEmpty) return <ReportSkeleton />;
    return <EmptyReport onBack={() => navigate("/analyze")} />;
  }

  if (!validation.ok) {
    return (
      <EmptyReport
        onBack={() => navigate("/analyze")}
        note={
          <>
            Saved report payload is invalid: <b>{validation.reason}</b>
            <div style={{ marginTop: 8, opacity: 0.85 }}>Generate a new report from Analyze.</div>
          </>
        }
      />
    );
  }

  const r = report as ReportData;

  const blobWarning = r.dataUrl.startsWith("blob:")
    ? "Note: blob URLs may not survive refresh/revocation."
    : null;

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <button className="ghostBtn" onClick={() => navigate("/analyze", { state: { dataUrl: r.dataUrl } })}>
          ← BACK
        </button>

        <div className="reportTitle">REPORT</div>

        <div className="reportActions">
          <button className="ghostBtn" onClick={() => window.print()}>
            PRINT / SAVE PDF
          </button>
        </div>
      </div>

      <Panel
        title="Report overview"
        note={
          <>
            {actionLabel} generated on {formatDate(r.createdAt)}.
            {blobWarning ? <div style={{ marginTop: 6, opacity: 0.8 }}>{blobWarning}</div> : null}
          </>
        }
      >
        <div className="metaRow">
          <span className="tag">
            image: {r.imageSize.w}×{r.imageSize.h}
          </span>
          <span className="tag">view: {safeUpper(r.viewMode)}</span>
          <span className="tag">
            region: {pct01(r.region.w)} × {pct01(r.region.h)}
          </span>
          <span className={`statusTag ${r.release.overallPass ? "pass" : "fail"}`}>
            {r.release.overallPass ? "READY TO UPLOAD" : "NOT READY"} • {r.release.score}/100
          </span>
        </div>
      </Panel>

      <Panel title="Release readiness" note="Final pass/fail decision for the current cover region." style={{ marginTop: 16 }}>
        <>
          <div className="readyTop">
            <span className={`statusTag ${r.release.overallPass ? "pass" : "fail"}`}>
              {r.release.overallPass ? "READY TO UPLOAD" : "NOT READY"} • {r.release.score}/100
            </span>
          </div>

          <div className="readyList">
            {r.release.checks.map((c) => (
              <div key={c.id} className="readyRow">
                <div>
                  <div className="readyLabel">{c.label}</div>
                  <div className="readyMeta">
                    <b>Value:</b> {c.value} • <b>Target:</b> {c.target}
                  </div>
                  <div className="readyMeta">{c.why}</div>
                </div>
                <span className={`statusTag ${c.pass ? "pass" : "fail"}`}>{c.pass ? "PASS" : "FAIL"}</span>
              </div>
            ))}
          </div>

          {!r.release.overallPass && r.release.nextChanges?.length ? (
            <div className="readyFixes">
              <div className="sectionHead">What to change next</div>
              <ul className="readyFixList">
                {r.release.nextChanges.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      </Panel>

      <div className="reportGrid" style={{ marginTop: 16 }}>
        <Panel title="Cover snapshot" note="Your uploaded cover.">
          <>
            <div className="reportFigure">
              <img src={r.dataUrl} alt="Cover report" onError={() => setImgBroken(true)} />
            </div>

            {imgBroken ? (
              <div className="detailLine" style={{ marginTop: 10 }}>
                Image preview failed. (This doesn’t affect metrics.)
              </div>
            ) : null}

            <KeyValueTable
              style={{ marginTop: 16 }}
              rows={[
                { k: "Created", v: formatDate(r.createdAt) },
                { k: "Mode", v: r.viewMode },
                { k: "Image size", v: `${r.imageSize.w}×${r.imageSize.h}` },
                { k: "Region avg color", v: r.palette.regionAvg },
                { k: "Best text color", v: `${r.palette.text.primary} • ${safeToFixed(r.palette.text.primaryRatio)}×` },
                { k: "Alt text color", v: `${r.palette.text.secondary} • ${safeToFixed(r.palette.text.secondaryRatio)}×` },
                { k: "Accent color", v: `${r.palette.text.accent} • ${safeToFixed(r.palette.text.accentRatio)}×` },
              ]}
            />
          </>
        </Panel>

        <Panel title="Summary" note="Metrics used to support the final decision.">
          <>
            <KeyValueTable
              rows={[
                { k: "Contrast", v: safeToFixed(r.regionMetrics.contrastRatio) },
                { k: "Clutter", v: `${Math.round(r.regionMetrics.clutterScore)}/100` },
                { k: "Safe area", v: `${Math.round(r.safeMargin.score)}/100 • ${r.safeMargin.pass ? "PASS" : "FAIL"}` },
                { k: "Outside safe area", v: `${Math.round(r.safeMargin.outsidePct)}%` },
                {
                  k: "64px check",
                  v: r.thumb64
                    ? `${r.thumb64.pass ? "PASS" : "FAIL"} • C ${safeToFixed(r.thumb64.contrastRatio)} • K ${Math.round(
                        r.thumb64.clutterScore
                      )} • ${Math.round(r.thumb64.regionMinPx)}px`
                    : "Not available",
                },
                { k: "Light / dark", v: r.composition.lightDark.label },
                { k: "Colour balance", v: r.composition.colorBalance.label },
                { k: "Symmetry", v: `${r.composition.symmetry.label} • ${r.composition.symmetry.score}/100` },
                { k: "Texture", v: `${r.composition.texture.label} • ${r.composition.texture.energy}/100` },
                { k: "Organic / technical", v: `${r.composition.organicTechnical.label} • ${r.composition.organicTechnical.score}/100` },
              ]}
            />

            {r.composition.lightDark.warning ? (
              <div className="detailLine" style={{ marginTop: 12 }}>
                {r.composition.lightDark.warning}
              </div>
            ) : null}

            <div className="reportSuggestions">
              <div className="sectionHead">Suggestions</div>
              <div className="suggestList">
                {r.suggestions.map((s, i) => (
                  <div key={`${s.title}-${i}`} className="suggestItem">
                    <div className="suggestTitle">{s.title}</div>
                    <div className="suggestDetail">
                      <div className="sLine">
                        <b>Why:</b> {s.why}
                      </div>
                      <div className="sLine">
                        <b>Try:</b> {s.try}
                      </div>
                      {s.target ? (
                        <div className="sLine">
                          <b>Target:</b> {s.target}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        </Panel>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  return (
    <ReportErrorBoundary onReset={() => navigate("/analyze")}>
      <ReportInner />
    </ReportErrorBoundary>
  );
}