import { NavLink, Route, Routes } from "react-router-dom";
import { AlertQueue } from "./pages/AlertQueue";
import { AlertDetail } from "./pages/AlertDetail";
import { EntityNetwork } from "./pages/EntityNetwork";
import { Customer360 } from "./pages/Customer360";
import { Reports } from "./pages/Reports";
import { TravelMap } from "./pages/TravelMap";

const NAV = [
  { to: "/", label: "Alert Queue", end: true },
  { to: "/network", label: "Entity Network" },
  { to: "/customers", label: "Customer 360" },
  { to: "/travel", label: "Impossible Travel" },
  { to: "/reports", label: "Reports" },
];

export function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          Investec <span className="bar">|</span> Fraud & AML
          <span className="sub">Wealth & Banking · Databricks</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => (isActive ? "active" : "")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<AlertQueue />} />
          <Route path="/alerts/:alertId" element={<AlertDetail />} />
          <Route path="/network" element={<EntityNetwork />} />
          <Route path="/network/:entityId" element={<EntityNetwork />} />
          <Route path="/customers" element={<Customer360 />} />
          <Route path="/customers/:customerId" element={<Customer360 />} />
          <Route path="/travel" element={<TravelMap />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}
