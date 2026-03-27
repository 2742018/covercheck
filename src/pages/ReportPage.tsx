import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearReportFromSession as clearReportFromSessionStore,
  useReportFromSession,
} from "../lib/reportStore";
import type { ReportData } from "../lib/report";
import { Printer } from "lucide-react";

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

function statusTone(pass: boolean) {
  return pass ? "pass" : "fail";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs work";
  return "Poor";
}


function formatEffect(n: unknown) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}

function classifyContrast(ratio: number) {
  if (ratio >= 7) return { label: "Very strong", note: "Very strong tonal separation for small text." };
  if (ratio >= 4.5) return { label: "Good", note: "Good contrast for most text uses." };
  if (ratio >= 3) return { label: "Borderline", note: "Usable for larger display text, but still risky for smaller text." };
  return { label: "Weak", note: "Low separation between light and dark values inside the selected box." };
}

function classifyClutter(score: number) {
  if (score >= 75) return { label: "Calm", note: "Background detail is unlikely to compete heavily with letterforms." };
  if (score >= 60) return { label: "Manageable", note: "Some texture is present, but it remains reasonably controllable." };
  return { label: "Busy", note: "Background texture and edges are likely to interfere with text clarity." };
}

function classifyUniformity(score: number) {
  if (score >= 75) return { label: "Stable", note: "Tone stays fairly even across the selected box." };
  if (score >= 55) return { label: "Mixed", note: "The box contains more than one tonal zone, so text treatment must work harder." };
  return { label: "Unstable", note: "The box shifts sharply between light and dark patches." };
}

function describeTone(label: unknown) {
  if (label === "Dark") {
    return "The text region sits mainly on darker tones, so lighter text usually separates best.";
  }
  if (label === "Light") {
    return "The text region sits mainly on lighter tones, so darker text usually separates best.";
  }
  return "The text region sits in mixed mid-tones, so contrast and background control matter more than average brightness alone.";
}

function renderMaybeList(items: unknown) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <ul className="readyFixList" style={{ marginTop: 8 }}>
      {items.map((item, idx) => (
        <li key={`${String(item)}-${idx}`}>{String(item)}</li>
      ))}
    </ul>
  );
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
            <Printer size={16} />PRINT / SAVE PDF
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
            <div className="panelTitle">Analysis summary</div>
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

function StatChip({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  const borderColor = tone === "good" ? "rgba(130,225,160,0.35)" : tone === "warn" ? "rgba(255,210,90,0.35)" : tone === "bad" ? "rgba(255,120,120,0.35)" : "rgba(255,255,255,0.10)";
  const bg = tone === "good" ? "rgba(130,225,160,0.08)" : tone === "warn" ? "rgba(255,210,90,0.08)" : tone === "bad" ? "rgba(255,120,120,0.08)" : "rgba(255,255,255,0.03)";
  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bg, borderRadius: 14, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  meaning,
  basis,
  tone = "default",
}: {
  title: string;
  value: ReactNode;
  meaning: ReactNode;
  basis?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const borderColor = tone === "good" ? "rgba(130,225,160,0.35)" : tone === "warn" ? "rgba(255,210,90,0.35)" : tone === "bad" ? "rgba(255,120,120,0.35)" : "rgba(255,255,255,0.10)";
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 16, padding: 14, background: "rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{value}</div>
      </div>
      <div className="detailLine" style={{ marginTop: 8 }}>{meaning}</div>
      {basis ? (
        <div className="detailLine" style={{ marginTop: 8, opacity: 0.72 }}>
          <b>Basis:</b> {basis}
        </div>
      ) : null}
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
  const rm = (r.regionMetrics ?? {}) as any;
  const comp = (r.composition ?? {}) as any;
  const safe = (r.safeMargin ?? {}) as any;
  const thumb = (r.thumb64 ?? null) as any;
  const typo = (r.typography ?? null) as any;

  const blobWarning = r.dataUrl.startsWith("blob:")
    ? "Note: blob URLs may not survive refresh or revocation."
    : null;

  const contrastState = classifyContrast(typeof rm.contrastRatio === "number" ? rm.contrastRatio : 0);
  const clutterState = classifyClutter(typeof rm.clutterScore === "number" ? rm.clutterScore : 0);
  const uniformityState = classifyUniformity(typeof rm.uniformityScore === "number" ? rm.uniformityScore : 0);

  const analysisReasons = useMemo(() => {
    const out: string[] = [];
    if (typeof rm.contrastRatio === "number" && rm.contrastRatio < 4.5) {
      out.push(`Contrast is ${rm.contrastRatio.toFixed(2)}×, below the preferred safer text target.`);
    }
    if (typeof rm.clutterScore === "number" && rm.clutterScore < 60) {
      out.push(`Clutter is ${Math.round(rm.clutterScore)}/100, so background texture is likely competing with the text.`);
    }
    if (typeof rm.uniformityScore === "number" && rm.uniformityScore < 55) {
      out.push(`Uniformity is ${Math.round(rm.uniformityScore)}/100, which means the box shifts across multiple tonal patches.`);
    }
    if (typeof safe.pass === "boolean" && !safe.pass && typeof safe.outsidePct === "number") {
      out.push(`${safe.outsidePct.toFixed(0)}% of the selected box sits outside the inset safe area.`);
    }
    if (r.viewMode === "crop" && thumb && thumb.pass === false && typeof thumb.regionMinPx === "number") {
      out.push(`At 64px the smallest side of the selected region is only about ${Math.round(thumb.regionMinPx)}px.`);
    }
    if (!out.length) {
      out.push("The current box is mostly passing the main thresholds, so the comments here are primarily confirming what is already working.");
    }
    return out;
  }, [rm.clutterScore, rm.contrastRatio, rm.uniformityScore, r.viewMode, safe.outsidePct, safe.pass, thumb]);

  const compositionCards = [
    {
      title: "Light / dark",
      value: comp.lightDark?.label ?? "—",
      meaning: comp.lightDark?.explanation ?? comp.lightDark?.warning ?? "Shows whether the current view reads overall as dark, mid, or light.",
      basis:
        comp.lightDark?.basis ??
        "Based on average luminance sampled across the current crop or full-image view.",
    },
    {
      title: "Colour balance",
      value: comp.colorBalance?.label ?? "—",
      meaning:
        comp.colorBalance?.explanation ??
        "Shows whether one hue family dominates, or whether the palette is more evenly spread.",
      basis:
        comp.colorBalance?.basis ??
        "Based on sampled hue families, dominant hue weight, and saturation spread.",
    },
    {
      title: "Symmetry",
      value:
        typeof comp.symmetry?.score === "number"
          ? `${comp.symmetry.label} • ${comp.symmetry.score}/100`
          : comp.symmetry?.label ?? "—",
      meaning:
        comp.symmetry?.explanation ??
        "Shows how closely the left and right sides visually balance around a central axis.",
      basis:
        comp.symmetry?.basis ??
        "Calculated by comparing left and right luminance across a vertical mirror axis.",
    },
    {
      title: "Texture",
      value:
        typeof comp.texture?.energy === "number"
          ? `${comp.texture.label} • ${comp.texture.energy}/100`
          : comp.texture?.label ?? "—",
      meaning:
        comp.texture?.explanation ??
        "Shows how visually busy the current view feels because of local edges and surface detail.",
      basis:
        comp.texture?.basis ??
        "Calculated from local edge energy across the analysed area.",
    },
    {
      title: "Organic / technical",
      value:
        typeof comp.organicTechnical?.score === "number"
          ? `${comp.organicTechnical.label} • ${comp.organicTechnical.score}/100`
          : comp.organicTechnical?.label ?? "—",
      meaning:
        comp.organicTechnical?.explanation ??
        "Shows whether the structure feels more freeform or more aligned to repeated angles and engineered shapes.",
      basis:
        comp.organicTechnical?.basis ??
        "Calculated from how strongly edge directions cluster around a few dominant angles.",
    },
  ];

  return (
    <div className="reportWrap">
      <div className="reportHeader">
        <button className="ghostBtn" onClick={() => navigate("/analyze", { state: { dataUrl: r.dataUrl } })}>
          ← BACK
        </button>

        <div className="reportTitle">REPORT</div>

        <div className="reportActions">
          <button className="ghostBtn" onClick={() => window.print()}>
            <Printer size={16} /> PRINT / SAVE PDF
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
          <span className="tag">image: {r.imageSize.w}×{r.imageSize.h}</span>
          <span className="tag">view: {safeUpper(r.viewMode)}</span>
          <span className="tag">region: {pct01(r.region.w)} × {pct01(r.region.h)}</span>
          <span className={`statusTag ${r.release.overallPass ? "pass" : "fail"}`}>
            {r.release.overallPass ? "READY TO UPLOAD" : "NOT READY"} • {r.release.score}/100
          </span>
        </div>
      </Panel>

      <Panel title="Release readiness" note="Final pass / fail decision for the current text test region." style={{ marginTop: 16 }}>
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
                <span className={`statusTag ${statusTone(c.pass)}`}>{c.pass ? "PASS" : "FAIL"}</span>
              </div>
            ))}
          </div>

          {!r.release.overallPass && r.release.nextChanges?.length ? (
            <div className="readyFixes">
              <div className="sectionHead">Most important changes</div>
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
        <Panel title="Cover snapshot" note="Your uploaded cover and the analysed text region.">
          <>
            <div className="reportFigure">
              <img src={r.dataUrl} alt="Cover report" onError={() => setImgBroken(true)} />
            </div>

            {imgBroken ? (
              <div className="detailLine" style={{ marginTop: 10 }}>
                Image preview failed. This does not affect the stored metrics.
              </div>
            ) : null}

            <div className="detailLine" style={{ marginTop: 12 }}>
              The highlighted box in Analyze is the <b>text test region</b>: the title / artist area used for contrast,
              clutter, uniformity, safe-area, and thumbnail checks. The report reflects that same selected region.
            </div>

            <KeyValueTable
              style={{ marginTop: 16 }}
              rows={[
                { k: "Created", v: formatDate(r.createdAt) },
                { k: "Mode", v: r.viewMode },
                { k: "Image size", v: `${r.imageSize.w}×${r.imageSize.h}` },
                { k: "Region size", v: `${pct01(r.region.w)} × ${pct01(r.region.h)}` },
                {
                  k: "Mapped image region",
                  v: `${pct01((r as any).mappedRegion?.x)} / ${pct01((r as any).mappedRegion?.y)} / ${pct01((r as any).mappedRegion?.w)} / ${pct01((r as any).mappedRegion?.h)}`,
                },
                {
                  k: "Region pixels",
                  v:
                    typeof rm.pixelWidth === "number" && typeof rm.pixelHeight === "number"
                      ? `${rm.pixelWidth}×${rm.pixelHeight}`
                      : "—",
                },
                { k: "Region avg colour", v: r.palette.regionAvg },
                { k: "Best text colour", v: `${r.palette.text.primary} • ${safeToFixed(r.palette.text.primaryRatio)}×` },
                { k: "Alt text colour", v: `${r.palette.text.secondary} • ${safeToFixed(r.palette.text.secondaryRatio)}×` },
                { k: "Accent colour", v: `${r.palette.text.accent} • ${safeToFixed(r.palette.text.accentRatio)}×` },
              ]}
            />
          </>
        </Panel>

        <Panel title="Analysis at a glance" note="The strongest signals pulled through from Analyze.">
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              <StatChip
                label="Contrast"
                value={`${safeToFixed(rm.contrastRatio)}×`}
                tone={typeof rm.contrastRatio === "number" ? (rm.contrastRatio >= 4.5 ? "good" : rm.contrastRatio >= 3 ? "warn" : "bad") : "default"}
              />
              <StatChip
                label="Clutter"
                value={`${typeof rm.clutterScore === "number" ? Math.round(rm.clutterScore) : "—"}/100`}
                tone={typeof rm.clutterScore === "number" ? (rm.clutterScore >= 60 ? "good" : "bad") : "default"}
              />
              <StatChip
                label="Uniformity"
                value={`${typeof rm.uniformityScore === "number" ? Math.round(rm.uniformityScore) : "—"}/100`}
                tone={typeof rm.uniformityScore === "number" ? (rm.uniformityScore >= 55 ? "good" : "warn") : "default"}
              />
              <StatChip
                label="Safe area"
                value={`${typeof safe.score === "number" ? Math.round(safe.score) : "—"}/100`}
                tone={safe.pass ? "good" : "bad"}
              />
              <StatChip
                label="64px check"
                value={thumb ? `${thumb.pass ? "Pass" : "Fail"}` : "Not available"}
                tone={thumb ? (thumb.pass ? "good" : "bad") : "default"}
              />
              <StatChip
                label="Composition"
                value={comp.summary?.headline ?? comp.lightDark?.label ?? "—"}
              />
            </div>

            {comp.summary?.guidance ? (
              <div className="detailLine" style={{ marginTop: 14 }}>
                <b>Overall reading:</b> {comp.summary.guidance}
              </div>
            ) : null}

            {Array.isArray(comp.highlights) && comp.highlights.length ? (
              <div className="readyFixes" style={{ marginTop: 14 }}>
                <div className="sectionHead">Most important visual highlights</div>
                <ul className="readyFixList">
                  {comp.highlights.map((item: any, idx: number) => (
                    <li key={`${item.key ?? item.title ?? idx}`}>
                      <b>{item.title}:</b> {item.detail}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        </Panel>
      </div>

      <Panel
        title="Region analysis"
        note="This section explains what the selected text region means, how the values are read, and why the report comments were triggered."
        style={{ marginTop: 16 }}
      >
        <>
          <div className="detailLine">
            The report does not score the whole cover equally. It focuses on the selected <b>text test region</b>, because this
            is usually where a cover succeeds or fails first when reduced to thumbnail size.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <InfoCard
              title="Contrast"
              value={`${safeToFixed(rm.contrastRatio)}× • ${contrastState.label}`}
              meaning={contrastState.note}
              basis="Uses the darker and lighter luminance percentiles inside the selected box to estimate tonal separation for text."
              tone={typeof rm.contrastRatio === "number" ? (rm.contrastRatio >= 4.5 ? "good" : rm.contrastRatio >= 3 ? "warn" : "bad") : "default"}
            />
            <InfoCard
              title="Clutter"
              value={`${typeof rm.clutterScore === "number" ? Math.round(rm.clutterScore) : "—"}/100 • ${clutterState.label}`}
              meaning={clutterState.note}
              basis={`Derived from local edge activity${typeof rm.edgeMean === "number" ? ` (edge mean ${rm.edgeMean.toFixed(3)})` : ""} inside the selected box.`}
              tone={typeof rm.clutterScore === "number" ? (rm.clutterScore >= 60 ? "good" : "bad") : "default"}
            />
            <InfoCard
              title="Uniformity"
              value={`${typeof rm.uniformityScore === "number" ? Math.round(rm.uniformityScore) : "—"}/100 • ${uniformityState.label}`}
              meaning={uniformityState.note}
              basis="Measures how evenly tone is distributed across the selected box, so the same text treatment behaves consistently from side to side."
              tone={typeof rm.uniformityScore === "number" ? (rm.uniformityScore >= 55 ? "good" : "warn") : "default"}
            />
            <InfoCard
              title="Tone reading"
              value={rm.toneLabel ?? "—"}
              meaning={describeTone(rm.toneLabel)}
              basis={`Based on average luminance${typeof rm.averageLuminance === "number" ? ` (${rm.averageLuminance.toFixed(1)}/100)` : ""} inside the selected box.`}
            />
            <InfoCard
              title="Luminance spread"
              value={typeof rm.luminanceSpread === "number" ? `${rm.luminanceSpread.toFixed(1)}/100` : "—"}
              meaning="Shows how wide the light-to-dark range is inside the selected box. A wider spread can help contrast, but may also create unstable text behaviour if the region shifts between extremes."
              basis={`Calculated from the lower and upper luminance percentiles${typeof rm.p10Luminance === "number" && typeof rm.p90Luminance === "number" ? ` (${rm.p10Luminance.toFixed(1)} to ${rm.p90Luminance.toFixed(1)})` : ""}.`}
            />
            <InfoCard
              title="Selection scale"
              value={typeof rm.areaPct === "number" ? `${rm.areaPct.toFixed(1)}% of image` : "—"}
              meaning="Shows how large the selected box is relative to the full cover. Oversized selections can blur the analysis by including artwork that is not really part of the text zone."
              basis={typeof rm.sampleCount === "number" ? `Based on approximately ${rm.sampleCount} sampled pixels inside a ${rm.pixelWidth ?? "—"}×${rm.pixelHeight ?? "—"} region.` : "Measured from the mapped region size in the source image."}
            />
          </div>

          <div className="readyFixes" style={{ marginTop: 16 }}>
            <div className="sectionHead">Why the comments were triggered</div>
            <ul className="readyFixList">
              {analysisReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </>
      </Panel>

      <div className="reportGrid" style={{ marginTop: 16 }}>
        <Panel title="Safe area and thumbnail checks" note="These checks explain how the selected text region behaves in reduced or constrained viewing conditions.">
          <>
            <KeyValueTable
              rows={[
                {
                  k: "Safe area",
                  v: `${typeof safe.score === "number" ? Math.round(safe.score) : "—"}/100 • ${safe.pass ? "PASS" : "FAIL"}`,
                },
                {
                  k: "Outside safe area",
                  v: typeof safe.outsidePct === "number" ? `${Math.round(safe.outsidePct)}%` : "—",
                },
                {
                  k: "Inset guide",
                  v: typeof safe.insetPct === "number" ? `${Math.round(safe.insetPct)}% from each edge` : "—",
                },
                {
                  k: "64px thumbnail",
                  v: thumb ? `${thumb.pass ? "PASS" : "FAIL"} • ${thumb.note}` : "Not available in full-image mode",
                },
                {
                  k: "Thumbnail contrast",
                  v: thumb ? `${safeToFixed(thumb.contrastRatio)}×` : "—",
                },
                {
                  k: "Thumbnail clutter",
                  v: thumb ? `${Math.round(thumb.clutterScore)}/100` : "—",
                },
                {
                  k: "Smallest box side",
                  v: thumb ? `${Math.round(thumb.regionMinPx)}px` : "—",
                },
              ]}
            />

            <div className="detailLine" style={{ marginTop: 12 }}>
              The safe-area score checks whether the selected box stays comfortably away from the cover edges. The 64px
              test simulates how the same region is likely to behave once the artwork is reduced to a small streaming-style thumbnail.
            </div>
          </>
        </Panel>

        <Panel title="Composition reading" note="This mirrors the richer composition panel from Analyze so the report explains what the values mean, not just the labels.">
          <>
            <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 14, background: "rgba(255,255,255,0.03)" }}>
              <div className="sectionHead">Overall reading</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{comp.summary?.headline ?? "Composition summary"}</div>
              <div className="detailLine" style={{ marginTop: 8 }}>
                {comp.summary?.guidance ?? "This section describes how the current crop or full-image view reads overall in terms of brightness, balance, and structure."}
              </div>
              <div className="detailLine" style={{ marginTop: 8, opacity: 0.72 }}>
                <b>Basis:</b> {comp.summary?.basis ?? "Computed from sampled pixels across the current crop or full-image view."}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
                <StatChip label="Sample count" value={comp.sampleCount ?? "—"} />
                <StatChip label="Sample step" value={typeof comp.sampleStep === "number" ? `${comp.sampleStep}px` : "—"} />
                <StatChip label="Warm / cool / neutral" value={comp.colorBalance ? `${comp.colorBalance.warmPct ?? 0}% / ${comp.colorBalance.coolPct ?? 0}% / ${comp.colorBalance.neutralPct ?? 0}%` : "—"} />
                <StatChip label="Avg saturation" value={typeof comp.colorBalance?.averageSaturation === "number" ? `${comp.colorBalance.averageSaturation}/100` : "—"} />
              </div>
            </div>

            {Array.isArray(comp.highlights) && comp.highlights.length ? (
              <div className="readyFixes" style={{ marginTop: 14 }}>
                <div className="sectionHead">Highlights</div>
                <ul className="readyFixList">
                  {comp.highlights.map((item: any, idx: number) => (
                    <li key={`${item.key ?? item.title ?? idx}`}>
                      <b>{item.title}:</b> {item.detail}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="sectionHead" style={{ marginTop: 16 }}>What each metric means</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 12,
                marginTop: 10,
              }}
            >
              {compositionCards.map((card) => (
                <InfoCard key={card.title} title={card.title} value={card.value} meaning={card.meaning} basis={card.basis} />
              ))}
            </div>
          </>
        </Panel>
      </div>


{typo ? (
  <Panel
    title="Typography stress test"
    note="This captures the last typography setup from Analyze, including the stress score, the main score factors, and the most important changes suggested by the test."
    style={{ marginTop: 16 }}
  >
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <StatChip
          label="Stress score"
          value={`${typo.label ?? "—"} • ${typeof typo.score === "number" ? `${typo.score}/100` : "—"}`}
          tone={
            typeof typo.score === "number"
              ? typo.score >= 82
                ? "good"
                : typo.score >= 64
                ? "warn"
                : "bad"
              : "default"
          }
        />
        <StatChip label="Sample" value={typeof typo.sampleSize === "number" ? `${typo.sampleSize}px` : "—"} />
        <StatChip label="Font" value={typo.controls?.fontLabel ?? typo.controls?.font ?? "—"} />
        <StatChip label="Overlay" value={typo.controls?.overlay ?? "—"} />
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 14, background: "rgba(255,255,255,0.03)" }}>
        <div className="sectionHead">Overall reading</div>
        <div className="detailLine" style={{ marginTop: 8 }}>
          {typo.summary ??
            "This score describes how well the current text styling should survive reduction into a streaming-style thumbnail."}
        </div>
        <div className="detailLine" style={{ marginTop: 8, opacity: 0.72 }}>
          <b>Basis:</b> {typo.basis ?? "Built from typography controls and measured region conditions."}
        </div>
      </div>

      <div className="reportGrid" style={{ marginTop: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div className="sectionHead">Typography settings</div>
          <KeyValueTable
            rows={[
              {
                k: "Font",
                v: typo.controls?.fontLabel
                  ? `${typo.controls.fontLabel}${typo.controls?.fontVibe ? ` • ${typo.controls.fontVibe}` : ""}`
                  : "—",
              },
              {
                k: "Weight / tracking",
                v:
                  typeof typo.controls?.weight === "number"
                    ? `${typo.controls.weight} • ${typeof typo.controls?.tracking === "number" ? `${typo.controls.tracking.toFixed(3)}em` : "—"}`
                    : "—",
              },
              {
                k: "Overlay / align",
                v: `${typo.controls?.overlay ?? "—"} • ${typo.controls?.align ?? "—"}`,
              },
              {
                k: "Case / text colour",
                v: `${typo.controls?.caseMode ?? "—"} • ${typo.controls?.textColor ?? "—"}`,
              },
              {
                k: "Title / artist scale",
                v:
                  typeof typo.controls?.titleScale === "number"
                    ? `${Math.round(typo.controls.titleScale * 100)}% • ${typeof typo.controls?.artistScale === "number" ? `${Math.round(typo.controls.artistScale * 100)}%` : "—"}`
                    : "—",
              },
              {
                k: "Placement block",
                v:
                  typeof typo.controls?.blockX === "number"
                    ? `X ${typo.controls.blockX.toFixed(2)} • Y ${typo.controls.blockY.toFixed(2)} • Width ${typo.controls.blockWidth.toFixed(2)}`
                    : "—",
              },
              {
                k: "Region context",
                v: typo.regionContext
                  ? `${typeof typo.regionContext.contrastRatio === "number" ? `${typo.regionContext.contrastRatio.toFixed(2)}× contrast` : "—"} • ${typeof typo.regionContext.clutterScore === "number" ? `${Math.round(typo.regionContext.clutterScore)}/100 clutter` : "—"}`
                  : "No saved region context",
              },
            ]}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="sectionHead">Main score factors</div>
          {Array.isArray(typo.factors) && typo.factors.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {typo.factors.slice(0, 5).map((factor: any, idx: number) => (
                <InfoCard
                  key={`${factor.key ?? factor.label ?? idx}`}
                  title={factor.label ?? "Factor"}
                  value={`${factor.value ?? "—"} • ${formatEffect(factor.effect)}`}
                  meaning={factor.basis ?? "No factor explanation saved."}
                  tone={
                    typeof factor.effect === "number"
                      ? factor.effect > 0
                        ? "good"
                        : factor.effect < 0
                        ? "bad"
                        : "warn"
                      : "default"
                  }
                />
              ))}
            </div>
          ) : (
            <div className="miniHint">No factor list was saved with this report.</div>
          )}
        </div>
      </div>

      <div className="readyFixes" style={{ marginTop: 16 }}>
        <div className="sectionHead">Most important changes</div>
        {Array.isArray(typo.suggestions) && typo.suggestions.length ? (
          <ul className="readyFixList">
            {typo.suggestions.map((item: any, idx: number) => (
              <li key={`${item.key ?? item.title ?? idx}`}>
                <b>{item.title}:</b> {item.detail}
                {item.tryLine ? <> <span style={{ opacity: 0.85 }}>Try: {item.tryLine}</span></> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="detailLine" style={{ marginTop: 8 }}>
            No typography changes were saved for this report.
          </div>
        )}
      </div>
    </>
  </Panel>
) : null}

      <Panel title="Suggestions" note="Prioritised findings only. Each suggestion should add new information rather than repeating the same issue in different words." style={{ marginTop: 16 }}>
        <>
          {r.suggestions?.length ? (
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
          ) : (
            <div className="detailLine">No suggestions were saved in this report.</div>
          )}
        </>
      </Panel>

      {r.changes ? (
        <Panel title="Saved change set" note="If the Analyze page stored a change set, it will appear here." style={{ marginTop: 16 }}>
          <>
            {renderMaybeList((r.changes as any).mainScoreFactors)}
            {renderMaybeList((r.changes as any).mostImportantChanges)}
          </>
        </Panel>
      ) : null}
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
