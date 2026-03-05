export const REPORT_SESSION_KEY = "covercheck.report.current.v2";

export function saveReportToSession<T>(report: T) {
  sessionStorage.setItem(REPORT_SESSION_KEY, JSON.stringify(report));
}

export function loadReportFromSession<T>() {
  const raw = sessionStorage.getItem(REPORT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearReportFromSession() {
  sessionStorage.removeItem(REPORT_SESSION_KEY);
}
