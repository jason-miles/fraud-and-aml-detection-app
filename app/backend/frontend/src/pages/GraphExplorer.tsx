import { useEffect, useMemo, useRef, useState } from "react";
import { getGraph } from "../api";
import { Loading, num } from "../components/ui";

const CHIPS = [
  "high risk customers with offshore connections",
  "customers flagged for structuring cash deposits",
  "watchlist matches with high risk scores",
  "accounts linked to money service businesses",
  "counterparties in high risk jurisdictions",
];
const KIND_COLOR: Record<string, string> = {
  customer: "#17408b", alert: "#d92d20", account: "#6ea8de",
  counterparty: "#d1a43a", watchlist: "#7a1f1f", other: "#94a3b8",
};

// Deterministic force-directed layout (fixed iterations, no RNG).
function layout(nodes: any[], edges: any[], W: number, H: number) {
  const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
  const N = nodes.length || 1;
  nodes.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / N;
    const r = Math.min(W, H) * 0.36 * (0.5 + ((i * 37) % 100) / 200);
    pos[n.id] = { x: W / 2 + r * Math.cos(ang), y: H / 2 + r * Math.sin(ang), vx: 0, vy: 0 };
  });
  const adj = edges.map((e) => [e.source, e.target]);
  for (let it = 0; it < 120; it++) {
    // repulsion
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const p = pos[nodes[a].id], q = pos[nodes[b].id];
        let dx = p.x - q.x, dy = p.y - q.y;
        let d2 = dx * dx + dy * dy || 1;
        const f = 900 / d2;
        const d = Math.sqrt(d2);
        p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
      }
    }
    // spring
    for (const [s, t] of adj) {
      const p = pos[s], q = pos[t];
      if (!p || !q) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 70) * 0.02;
      p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
    }
    for (const n of nodes) {
      const p = pos[n.id];
      p.x += Math.max(-8, Math.min(8, p.vx)); p.y += Math.max(-8, Math.min(8, p.vy));
      p.vx *= 0.85; p.vy *= 0.85;
      p.x = Math.max(20, Math.min(W - 20, p.x)); p.y = Math.max(20, Math.min(H - 20, p.y));
    }
  }
  return pos;
}

export function GraphExplorer() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const run = (query = "") => {
    setLoading(true);
    getGraph(query, 12).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { run(); }, []);

  const W = 900, H = 560;
  const pos = useMemo(() => (data ? layout(data.nodes, data.edges, W, H) : {}), [data]);

  return (
    <>
      <h1 className="page-title">Graph Explorer</h1>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input style={{ flex: 1 }} placeholder="Search the knowledge graph with natural language…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(q)} />
        <button className="btn" onClick={() => run(q)}>Search</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        {CHIPS.map((c) => <span key={c} className="chip" onClick={() => { setQ(c); run(c); }}>{c}</span>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>
        <div className="panel">
          <h3 className="left" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Knowledge Graph</span>
            <span className="muted" style={{ fontWeight: 400 }}>{data?.node_count ?? 0} nodes · {data?.edge_count ?? 0} edges</span>
          </h3>
          {loading ? <Loading what="graph" /> : (
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: "#fbfcfe", borderRadius: 10 }}>
              {data.edges.map((e: any, i: number) => {
                const a = pos[e.source], b = pos[e.target]; if (!a || !b) return null;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e3e8f0" strokeWidth={1} />;
              })}
              {data.nodes.map((n: any) => {
                const p = pos[n.id]; if (!p) return null;
                const isCust = n.kind === "customer";
                const rad = isCust ? 13 : 6;
                return (
                  <g key={n.id}>
                    <circle cx={p.x} cy={p.y} r={rad} fill={KIND_COLOR[n.kind] || KIND_COLOR.other}
                      stroke={isCust ? "#d1a43a" : "none"} strokeWidth={isCust ? 2 : 0} />
                    {isCust && <text x={p.x} y={p.y - 16} fill="#1f2d4d" fontSize={10} textAnchor="middle">{n.label}</text>}
                  </g>
                );
              })}
            </svg>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
            {Object.entries(KIND_COLOR).filter(([k]) => k !== "other").map(([k, c]) => (
              <span key={k}><span className="dot" style={{ background: c }} />{k}</span>
            ))}
          </div>
        </div>

        <div>
          <div className="panel">
            <h3 className="left">🕐 AI Analysis</h3>
            <p className="muted" style={{ marginTop: 0 }}>{data?.analysis}</p>
          </div>
          <div className="panel">
            <h3 className="left">Matched Entities ({data?.matched_entities?.length ?? 0})</h3>
            {(data?.matched_entities || []).map((m: any, i: number) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{m.name}</strong>
                  <span className="badge sev-high">risk {num(m.score) * 20 || m.score}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{m.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
