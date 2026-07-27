// Reference Architecture — brand-native recreations of the Databricks solution
// architecture (fraud/AML) + the medallion Lakehouse platform (AWS/Azure). All
// colour comes from CSS vars so this file renders in each app's own palette.
import { useState } from "react";

type Item = { label: string; sub?: string };

function Stage({ title, groups }: { title: string; groups: { heading?: string; items: Item[] }[] }) {
  return (
    <div className="arch-stage">
      <h3 className="arch-stage-title">{title}</h3>
      {groups.map((g, i) => (
        <div key={i} className="arch-group">
          {g.heading && <div className="arch-group-heading">{g.heading}</div>}
          {g.items.map((it, j) => (
            <div key={j} className="arch-card">
              <span className="arch-card-dot" aria-hidden />
              <div>
                <div className="arch-card-label">{it.label}</div>
                {it.sub && <div className="arch-card-sub">{it.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const APPS: Item[] = [
  { label: "Chief Compliance Officer Dashboard", sub: "Team performance & case statistics insights" },
  { label: "SAR Report & Evidence Reporting Agent", sub: "Auto-generates case disposition, narrative & SAR" },
  { label: "Case Investigation Supervisor Agent", sub: "Complex analysis across specialist agents & tools" },
  { label: "Media & News Reporting Agent", sub: "Scours news / third-party data for customer profiling" },
  { label: "Policy Expert Agent", sub: "Answers on federal regulation & compliance docs" },
];

export function Architecture() {
  const [tab, setTab] = useState<"solution" | "aws" | "azure">("solution");
  return (
    <div className="arch">
      <div className="arch-head">
        <h1 className="page-title">Reference Architecture</h1>
        <p className="page-sub">
          End-to-end financial-crime intelligence on the Databricks Data Intelligence Platform —
          from governed ingestion to a multi-agent SAR workflow, all under one governance plane.
        </p>
      </div>
      <div className="tabs">
        <button className={tab === "solution" ? "active" : ""} onClick={() => setTab("solution")}>Solution Architecture</button>
        <button className={tab === "aws" ? "active" : ""} onClick={() => setTab("aws")}>Platform — AWS</button>
        <button className={tab === "azure" ? "active" : ""} onClick={() => setTab("azure")}>Platform — Azure</button>
      </div>
      {tab === "solution" ? <SolutionArch /> : <PlatformArch cloud={tab} />}
    </div>
  );
}

function SolutionArch() {
  return (
    <>
      <div className="arch-flow">
        <Stage title="Data Sources" groups={[
          { heading: "Structured", items: [
            { label: "Customers" }, { label: "Transactions" }, { label: "Case Management History" }] },
          { heading: "Semi-structured", items: [{ label: "SAR Records" }] },
          { heading: "Unstructured", items: [
            { label: "News & Negative Media" }, { label: "Customer Correspondence" },
            { label: "Global Sanctions & PEP Watchlists" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <Stage title="Ingest & ETL" groups={[
          { items: [
            { label: "Lakeflow Connect", sub: "Managed ingestion" },
            { label: "Business Rules", sub: "Declarative detection" },
            { label: "ML Model", sub: "Risk scoring" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <Stage title="Storage" groups={[
          { items: [
            { label: "Databricks Volume", sub: "Documents & PDFs" },
            { label: "Delta", sub: "Medallion Lakehouse" },
            { label: "Vector Search", sub: "Adverse-media RAG" },
            { label: "Alerts & Risk Scores", sub: "gold.fraud_alerts" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <Stage title="Agent Serving & Orchestration" groups={[
          { items: [
            { label: "External MCP" }, { label: "Knowledge Assistant" },
            { label: "AI/BI Genie", sub: "NL → governed SQL" },
            { label: "Custom LLM" }, { label: "Real-Time Scoring" },
            { label: "Multi-Agent Supervisor", sub: "Genie / Serving Endpoint / MCP" },
            { label: "AI/BI Dashboards" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <div className="arch-stage arch-apps">
          <h3 className="arch-stage-title">Databricks Apps <span className="arch-apps-sub">Secure data &amp; AI apps</span></h3>
          <div className="arch-group">
            {APPS.map((a, i) => (
              <div key={i} className="arch-card arch-app-card">
                <span className="arch-card-dot" aria-hidden />
                <div>
                  <div className="arch-card-label">{a.label}</div>
                  {a.sub && <div className="arch-card-sub">{a.sub}</div>}
                </div>
              </div>
            ))}
            <div className="arch-card arch-lakebase">
              <span className="arch-card-dot" aria-hidden />
              <div>
                <div className="arch-card-label">Lakebase</div>
                <div className="arch-card-sub">Real-time transaction DB</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="arch-bands">
        <div className="arch-band"><b>Unified, end-to-end governance</b><span>Tables · AI Models · Files · Notebooks · Dashboards</span></div>
        <div className="arch-band"><b>All Formats</b><span>Delta Lake · Iceberg · Parquet</span></div>
        <div className="arch-band"><b>All Clouds</b><span>AWS · Azure · Google Cloud</span></div>
        <div className="arch-band"><b>Any Model</b><span>OpenAI · Anthropic · Gemini · Meta</span></div>
      </div>
    </>
  );
}

// ── Platform Architecture — the classic Databricks medallion Lakehouse, per cloud.
const CLOUD: Record<string, {
  name: string; ingest: string; storage: string; serving: string; bi: string[];
}> = {
  aws: { name: "AWS", ingest: "Amazon Kinesis", storage: "Amazon S3",
    serving: "MLflow Model Serving / AWS ECS", bi: ["Tableau", "Databricks SQL", "Looker"] },
  azure: { name: "Azure", ingest: "Azure Event Hubs", storage: "ADLS Gen2",
    serving: "MLflow / Azure ML", bi: ["Tableau", "Redash", "Power BI"] },
};

function PlatformArch({ cloud }: { cloud: "aws" | "azure" }) {
  const c = CLOUD[cloud];
  return (
    <>
      <p className="arch-cloud-title">Databricks + {c.name} — Lakehouse Platform</p>
      <div className="arch-flow">
        <Stage title="Data Sources" groups={[
          { heading: "Batch Data", items: [
            { label: "Line of Business" }, { label: "CRM" }, { label: "On-Premises Databases" }] },
          { heading: "Streaming Data", items: [
            { label: "POS Data" }, { label: "IoT" }, { label: "Telemetry" }, { label: "Social Data" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <Stage title="Ingest" groups={[
          { items: [
            { label: "Databricks & Partners", sub: "Batch load" },
            { label: c.ingest, sub: "Streaming ingest" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <div className="arch-stage arch-medallion">
          <h3 className="arch-stage-title">Data Engineering — Medallion</h3>
          <div className="arch-group">
            <div className="arch-card arch-bronze"><span className="arch-card-dot" aria-hidden /><div>
              <div className="arch-card-label">Raw Data (Bronze)</div><div className="arch-card-sub">Delta Lake · {c.storage}</div></div></div>
            <div className="arch-medallion-etl">↓ Spark ETL</div>
            <div className="arch-card arch-silver"><span className="arch-card-dot" aria-hidden /><div>
              <div className="arch-card-label">Refined Data (Silver)</div><div className="arch-card-sub">Delta Lake · cleansed / conformed</div></div></div>
            <div className="arch-medallion-etl">↓ Spark ETL</div>
            <div className="arch-card arch-gold"><span className="arch-card-dot" aria-hidden /><div>
              <div className="arch-card-label">Enriched Data (Gold)</div><div className="arch-card-sub">Delta Lake · business-level</div></div></div>
          </div>
        </div>

        <div className="arch-arrow" aria-hidden>→</div>

        <Stage title="Databricks ML" groups={[
          { items: [
            { label: "Notebooks & ML Runtime" },
            { label: "MLflow Tracking" },
            { label: "MLflow Registry" },
            { label: c.serving, sub: "API / batch / real-time inference" }] },
        ]} />

        <div className="arch-arrow" aria-hidden>→</div>

        <Stage title="Databricks SQL" groups={[
          { items: [
            { label: "BI/SQL Client Connectors" }, { label: "Data Catalog" },
            { label: "Dashboards & Alerts" }, { label: "Integrated Security" },
            { label: "SQL Editor & Query Catalog" },
            { label: `BI: ${c.bi.join(" · ")}`, sub: "Downstream analytics" }] },
        ]} />
      </div>

      <div className="arch-bands">
        <div className="arch-band"><b>Open Delta Lake</b><span>ACID · time travel · unified batch + streaming</span></div>
        <div className="arch-band"><b>Unity Catalog governance</b><span>Lineage · access control · audit</span></div>
        <div className="arch-band"><b>{c.name} native</b><span>{c.storage} · {c.ingest} · {c.serving.split(" / ")[0]}</span></div>
        <div className="arch-band"><b>Any Model</b><span>MLflow · OpenAI · Anthropic · Meta</span></div>
      </div>
    </>
  );
}
