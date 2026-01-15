import { Navigate, Route, Routes } from "react-router-dom";
import PlayPage from "./pages/PlayPage";
import AnalyzePage from "./pages/AnalyzePage";
import ReportPage from "./pages/ReportPage";
import TestPage from "./pages/TestPage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/play" replace />} />
      <Route path="/play" element={<PlayPage />} />
      <Route path="/analyze" element={<AnalyzePage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/play" replace />} />
    </Routes>
  );
}