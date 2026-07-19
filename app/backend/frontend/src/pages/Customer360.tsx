import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCustomers, getCustomer } from "../api";
import { Sev, Loading, money, fmtDate } from "../components/ui";

export function Customer360() {
  const { customerId } = useParams();
  if (customerId) return <CustomerDetail id={customerId} />;
  return <CustomerList />;
}

function CustomerList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [onlyAlerts, setOnlyAlerts] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCustomers(`?min_alerts=${onlyAlerts ? 1 : 0}&limit=100`)
      .then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false));
  }, [onlyAlerts]);

  return (
    <>
      <h1 className="page-title">Customer 360</h1>
      <p className="page-sub">High-wealth desk view — profile, accounts, risk rating, related parties, recent alerts.</p>
      <div className="panel">
        <span className={`chip ${onlyAlerts ? "active" : ""}`} onClick={() => setOnlyAlerts(true)}>With alerts</span>
        <span className={`chip ${!onlyAlerts ? "active" : ""}`} onClick={() => setOnlyAlerts(false)}>All customers</span>
      </div>
      <div className="panel">
        {loading ? <Loading what="customers" /> : (
          <table>
            <thead><tr><th>Name</th><th>Segment</th><th>City</th><th>Accounts</th><th>Balance</th><th>Risk</th><th>Alerts</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.customer_id} className="clickable" onClick={() => nav(`/customers/${c.customer_id}`)}>
                  <td>{c.full_name}</td>
                  <td className="muted">{c.segment}</td>
                  <td>{c.city}</td>
                  <td>{c.num_accounts}</td>
                  <td>{money(c.total_balance)}</td>
                  <td>{c.current_risk_rating ?? "—"}</td>
                  <td>{Number(c.recent_alerts) > 0 ? <span className="badge sev-high">{c.recent_alerts}</span> : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function CustomerDetail({ id }: { id: string }) {
  const [c, setC] = useState<any>(null);
  useEffect(() => { getCustomer(id).then(setC).catch(() => {}); }, [id]);
  if (!c) return <Loading what="customer" />;

  return (
    <>
      <Link to="/customers" className="muted">← Customer 360</Link>
      <h1 className="page-title" style={{ marginTop: 10 }}>{c.full_name}</h1>
      <p className="page-sub">{c.segment} · {c.city}, {c.country} · entity <span className="mono">{c.entity_id}</span></p>

      <div className="tiles">
        <div className="tile"><div className="v">{c.num_accounts}</div><div className="l">Accounts</div></div>
        <div className="tile"><div className="v">{money(c.total_balance)}</div><div className="l">Total balance</div></div>
        <div className="tile"><div className="v">{c.current_risk_rating ?? "—"}</div><div className="l">Risk rating</div></div>
        <div className="tile"><div className="v" style={{ color: "var(--high)" }}>{c.recent_alerts}</div><div className="l">Recent alerts</div></div>
      </div>

      <div className="row">
        <div className="col">
          <div className="panel">
            <h3>Alerts</h3>
            {(c.alerts || []).length === 0 ? <span className="muted">None.</span> : (
              <table><tbody>
                {c.alerts.map((a: any) => (
                  <tr key={a.alert_id} className="clickable">
                    <td><Link to={`/alerts/${a.alert_id}`}>{a.alert_type}</Link></td>
                    <td><Sev s={a.severity} /></td>
                    <td className="muted">{fmtDate(a.triggered_at)}</td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>
        <div className="col">
          <div className="panel">
            <h3>Adverse media (AI-grounded)</h3>
            {(c.adverse_media || []).length === 0 ? <span className="muted">No matches.</span> :
              c.adverse_media.map((m: any, i: number) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <strong>{m.headline}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>{m.source} · {fmtDate(m.published_at)}</div>
                  <div className="explain" style={{ marginTop: 6 }}>{m.risk_summary}</div>
                </div>
              ))}
          </div>
          <Link to={`/network/${c.entity_id}`} className="btn secondary" style={{ display: "inline-block" }}>
            View entity network →
          </Link>
        </div>
      </div>
    </>
  );
}
