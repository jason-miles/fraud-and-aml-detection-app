import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { PersonaProvider, usePersona } from "./components/ui";
import { BrandMark } from "./components/Logo";

// Theme: persisted to localStorage, defaulting to the OS preference.
function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem("sentinel-theme");
    if (saved) return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sentinel-theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}
import { Landing } from "./pages/Landing";
import { ExecutiveOverview } from "./pages/ExecutiveOverview";
import { AlertInvestigation } from "./pages/AlertInvestigation";
import { Investigation } from "./pages/Investigation";
import { SarFiling } from "./pages/SarFiling";
import { GraphExplorer } from "./pages/GraphExplorer";
import { AskSentinel } from "./pages/AskSentinel";
import { Compliance } from "./pages/Compliance";
import { Reports } from "./pages/Reports";

function TopBar() {
  const { personas, current, setCurrent } = usePersona();
  const [theme, toggleTheme] = useTheme();
  return (
    <div className="topbar">
      <BrandMark />
      <nav className="nav-pills">
        <NavLink to="/exec" className={({ isActive }) => (isActive ? "active" : "")}>Executive Overview</NavLink>
        <NavLink to="/investigation" className={({ isActive }) => (isActive ? "active" : "")}>Alert Investigation</NavLink>
        <NavLink to="/compliance" className={({ isActive }) => (isActive ? "active" : "")}>Compliance</NavLink>
        <NavLink to="/graph" className={({ isActive }) => (isActive ? "active" : "")}>Graph Explorer</NavLink>
        <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>Reports</NavLink>
        <NavLink to="/ask" className={({ isActive }) => (isActive ? "active" : "")}>Ask Sentinel</NavLink>
      </nav>
      <button className="theme-toggle" onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
        {theme === "dark" ? "☀" : "☾"}
      </button>
      <div className="viewas">
        View As:
        <select aria-label="View as analyst persona" value={current?.analyst_id || ""}
          onChange={(e) => { const p = personas.find((x) => x.analyst_id === e.target.value); if (p) setCurrent(p); }}>
          {personas.map((p) => (
            <option key={p.analyst_id} value={p.analyst_id}>{p.analyst_name} ({p.team_name})</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Shell() {
  const loc = useLocation();
  if (loc.pathname === "/") return <Landing />;
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <TopBar />
      <main id="main-content" className="page">
        <Routes>
          <Route path="/exec" element={<ExecutiveOverview />} />
          <Route path="/investigation" element={<AlertInvestigation />} />
          <Route path="/investigation/:caseId" element={<Investigation />} />
          <Route path="/sar/:caseId" element={<SarFiling />} />
          <Route path="/graph" element={<GraphExplorer />} />
          <Route path="/ask" element={<AskSentinel />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return (
    <PersonaProvider>
      <Routes>
        <Route path="/*" element={<Shell />} />
      </Routes>
    </PersonaProvider>
  );
}
