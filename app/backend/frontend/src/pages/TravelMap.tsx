import { useEffect, useState } from "react";
import { getImpossibleTravel } from "../api";
import { Loading, num, fmtDate } from "../components/ui";

// Equirectangular projection of lat/lon onto an SVG world box.
function project(lat: number, lon: number, W: number, H: number) {
  return { x: (lon + 180) * (W / 360), y: (90 - lat) * (H / 180) };
}

export function TravelMap() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getImpossibleTravel().then((r) => { setAlerts(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const W = 960, H = 480;
  return (
    <>
      <h1 className="page-title">Impossible Travel</h1>
      <p className="page-sub">Card journeys whose implied speed is physically impossible — trivial in the Lakehouse, impossible in the legacy stack.</p>

      {loading ? <Loading what="journeys" /> : (
        <>
          <div className="panel">
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: "#0e131c", borderRadius: 10 }}>
              <rect x={0} y={0} width={W} height={H} fill="#0e131c" />
              {/* graticule */}
              {[-120, -60, 0, 60, 120].map((lon) => {
                const x = (lon + 180) * (W / 360);
                return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="#1c2230" />;
              })}
              {[-60, -30, 0, 30, 60].map((lat) => {
                const y = (90 - lat) * (H / 180);
                return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="#1c2230" />;
              })}
              {alerts.map((a, i) => {
                const legs = (a.legs || []).slice(0, 2);
                if (legs.length < 2) return null;
                const p1 = project(num(legs[1].lat), num(legs[1].lon), W, H);
                const p2 = project(num(legs[0].lat), num(legs[0].lon), W, H);
                return (
                  <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ff4d4f" strokeWidth={2} strokeDasharray="5 4" />
                    <circle cx={p1.x} cy={p1.y} r={5} fill="#4ade80" />
                    <circle cx={p2.x} cy={p2.y} r={5} fill="#ff4d4f" />
                    <text x={p1.x + 7} y={p1.y - 6} fill="#e6e9ef" fontSize={11}>{legs[1].city}</text>
                    <text x={p2.x + 7} y={p2.y - 6} fill="#e6e9ef" fontSize={11}>{legs[0].city}</text>
                    <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} fill="#ff9f1c" fontSize={10}>
                      {Math.round(num(a.implied_kmh)).toLocaleString()} km/h
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="panel">
            <h3>Flagged cards</h3>
            <table>
              <thead><tr><th>Card / account</th><th>From</th><th>To</th><th>Implied speed</th><th>When</th></tr></thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i}>
                    <td className="mono">{a.account_id}</td>
                    <td>{a.from_city}</td>
                    <td>{a.to_city}</td>
                    <td style={{ color: "var(--critical)" }}>{Math.round(num(a.implied_kmh)).toLocaleString()} km/h</td>
                    <td className="muted">{fmtDate(a.triggered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
