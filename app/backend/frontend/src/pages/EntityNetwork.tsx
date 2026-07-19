import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getNetwork } from "../api";
import { Loading } from "../components/ui";

// Simple radial layout: center node in the middle, neighbours on a circle.
export function EntityNetwork() {
  const { entityId } = useParams();
  const [eid, setEid] = useState(entityId || "ENT00008001");
  const [input, setInput] = useState(entityId || "ENT00008001");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getNetwork(eid).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [eid]);

  const W = 900, H = 560, cx = W / 2, cy = H / 2;
  const nodes: any[] = data?.nodes || [];
  const edges: any[] = data?.edges || [];
  const others = nodes.filter((n) => n.id !== eid);
  const pos: Record<string, { x: number; y: number }> = { [eid]: { x: cx, y: cy } };
  others.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / Math.max(1, others.length);
    const r = 210;
    pos[n.id] = { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
  });
  const color = (kind: string) =>
    kind === "customer" ? "#2272b4" : kind === "third_party" ? "#ff9f1c" :
    kind === "account" ? "#4ade80" : "#8b93a7";

  return (
    <>
      <h1 className="page-title">Entity Network</h1>
      <p className="page-sub">People ↔ accounts ↔ counterparties ↔ related third parties — the substrate for surfacing fraud.</p>

      <div className="panel">
        <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Entity id (e.g. ENT00008001)" style={{ width: 260 }} />
          <button className="btn" onClick={() => setEid(input)}>Load</button>
          <span className="muted" style={{ alignSelf: "center" }}>
            Try ENT00008001 (Marco Silva = Onyx Capital)
          </span>
        </div>
      </div>

      <div className="panel">
        {loading ? <Loading what="graph" /> : nodes.length === 0 ? (
          <div className="muted">No edges for {eid}.</div>
        ) : (
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 600 }}>
            {edges.map((e, i) => {
              const a = pos[e.source_entity_id], b = pos[e.target_entity_id];
              if (!a || !b) return null;
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2a3140" strokeWidth={1.5} />
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} fill="#6b7488" fontSize={9}>{e.edge_type}</text>
                </g>
              );
            })}
            {nodes.map((n) => {
              const p = pos[n.id]; if (!p) return null;
              const center = n.id === eid;
              return (
                <g key={n.id}>
                  <circle cx={p.x} cy={p.y} r={center ? 16 : 11} fill={color(n.kind)} stroke={center ? "#fff" : "none"} strokeWidth={2} />
                  <text x={p.x + 16} y={p.y + 4} fill="#e6e9ef" fontSize={12}>{n.label}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </>
  );
}
