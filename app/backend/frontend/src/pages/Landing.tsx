import { useNavigate } from "react-router-dom";
import { HeroLogo } from "../components/Logo";

export function Landing() {
  const nav = useNavigate();
  return (
    <div className="landing">
      <HeroLogo />

      <div className="stat-band">
        <div className="s"><div className="n">90%</div><div className="l">Faster Investigations</div></div>
        <div className="s"><div className="n">50%</div><div className="l">Fewer False Positives</div></div>
        <div className="s"><div className="n">$10M+</div><div className="l">Annual Savings</div></div>
      </div>

      <div className="entry-cards">
        <div className="entry">
          <div className="ico">📊</div>
          <h2>Executive Dashboard</h2>
          <div className="role">Chief Compliance Officer View</div>
          <p className="muted">Real-time operational intelligence across your entire AML program. Monitor KPIs, track team performance, and ensure regulatory compliance with unified dashboards.</p>
          <ul>
            <li>Enterprise risk metrics</li>
            <li>Compliance deadlines</li>
            <li>Team performance analytics</li>
            <li>SAR conversion tracking</li>
          </ul>
          <a className="cta" onClick={() => nav("/exec")}>Enter Executive View →</a>
        </div>

        <div className="entry hl">
          <div className="ico">🔍</div>
          <h2>Alert Investigation</h2>
          <div className="role">AML Analyst Workspace</div>
          <p className="muted">AI-powered investigation workspace with multi-agent assistance. Analyze alerts, gather evidence, and make SAR decisions in minutes instead of hours.</p>
          <ul>
            <li>Intelligent alert prioritization</li>
            <li>Automated evidence gathering</li>
            <li>AI investigation assistant</li>
            <li>One-click SAR generation</li>
          </ul>
          <a className="cta" onClick={() => nav("/investigation")}>Enter Investigation View →</a>
        </div>
      </div>

      <div className="footer-band">
        <div className="f"><div className="l">Powered by</div><div className="v">Databricks Intelligence Platform</div></div>
        <div className="f"><div className="l">Processing</div><div className="v">100,000+ TPS</div></div>
        <div className="f"><div className="l">Deployment Time</div><div className="v">&lt;20 Weeks</div></div>
        <div className="f"><div className="l">Compliance Rate</div><div className="v">99.9%</div></div>
      </div>
    </div>
  );
}
