let _hasReport = false;
let _report: unknown = null;
let _meta: unknown = null;

/**
 * Fast in-memory store.
 * No persistence by design.
 */
export function saveReportToSession(report: unknown, meta?: unknown) {
  _hasReport = true;
  _report = report;
  _meta = meta ?? null;

  console.log("[reportStore] saved", {
    hasReport: _hasReport,
    meta: _meta,
    reportType: typeof _report,
  });
}

export function loadReportFromSession<TReport = unknown, TMeta = unknown>() {
  console.log("[reportStore] loaded", {
    hasReport: _hasReport,
    meta: _meta,
    reportType: typeof _report,
  });

  if (!_hasReport) return null;

  return {
    report: _report as TReport,
    meta: _meta as TMeta,
  };
}

export function clearReportFromSession() {
  _hasReport = false;
  _report = null;
  _meta = null;

  console.log("[reportStore] cleared");
}