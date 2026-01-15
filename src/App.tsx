import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import PlayPage from "./pages/PlayPage.tsx";
import AnalyzePage from "./pages/AnalyzePage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import TestPage from "./pages/TestPage.tsx";
import ReportPage from "./pages/ReportPage";
export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Shell>
  );
}