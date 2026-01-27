import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./layout/Shell2.tsx";

import PlayPage from "./pages/PlayPage";
import AnalyzePage from "./pages/AnalyzePage";
import ReportPage from "./pages/ReportPage";
import TestPage from "./pages/TestPage";
import AboutPage from "./pages/AboutPage";
import MatchPage from "./pages/MatchPage";
import MockupsPage from "./pages/MockupsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/mockups" element={<MockupsPage />} />
        <Route path="/match" element={<MatchPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Route>
    </Routes>
  );
}