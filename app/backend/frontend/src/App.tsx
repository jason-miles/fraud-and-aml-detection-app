import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { PersonaProvider, usePersona } from "./components/ui";
import { BrandMark } from "./components/Logo";
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
      <div className="viewas">
        View As:
        <select value={current?.analyst_id || ""}
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
      <TopBar />
      <div className="page">
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
      </div>
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
