// File: src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./layout/Shell2.tsx";

import PlayPage from "./pages/PlayPage";
import AnalyzePage from "./pages/AnalyzePage";
import ReportPage from "./pages/ReportPage";
import TestPage from "./pages/TestPage";
import AboutPage from "./pages/AboutPage";
import MatchPage from "./pages/MatchPage";
import MockupsPage from "./pages/MockupsPage";
import LicensingPage from "./pages/LicensingPage";
import MethodsReferencesPage from "./pages/MethodsReferencesPage.tsx";
import ComparePage from "./pages/ComparePage";
import AccessibilityPage from "./pages/AccessibilityPage.tsx";

export default function App() {
  return (
    <Routes>
      {/* Make the layout route explicit */}
      <Route path="/" element={<Shell />}>
        {/* Use index redirect instead of path="/" child */}
        <Route index element={<Navigate to="play" replace />} />

        {/* Prefer RELATIVE paths inside the layout */}
        <Route path="play" element={<PlayPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="mockups" element={<MockupsPage />} />
        <Route path="match" element={<MatchPage />} />
        <Route path="test" element={<TestPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="licensing" element={<LicensingPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="accessibility" element={<AccessibilityPage />} />

        {/* Avoid spaces in URLs; keep backwards-compatible redirect */}
        <Route path="methods-and-references" element={<MethodsReferencesPage />} />
        <Route
          path="methods and references"
          element={<Navigate to="/methods-and-references" replace />}
        />

        <Route path="*" element={<Navigate to="/play" replace />} />
      </Route>
    </Routes>
  );
}
