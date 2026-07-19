// SherlockAML API client.
export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
export async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

const S = "/api/sherlock";
// Personas
export const getPersonas = () => apiGet(`${S}/personas`);
// Executive
export const getExecKpis = () => apiGet(`${S}/exec/kpis`);
export const getDailyNew = () => apiGet(`${S}/exec/daily-new`);
export const getOutstanding = () => apiGet(`${S}/exec/outstanding`);
export const getByScenario = () => apiGet(`${S}/exec/by-scenario`);
export const getPriorityStatus = () => apiGet(`${S}/exec/priority-status`);
export const getResolutionFlow = () => apiGet(`${S}/exec/resolution-flow`);
export const getTeamPerformance = () => apiGet(`${S}/exec/team-performance`);
// Investigation
export const getQueue = (analystId: string) => apiGet(`${S}/queue/${encodeURIComponent(analystId)}`);
export const getCase = (caseId: string) => apiGet(`${S}/case/${encodeURIComponent(caseId)}`);
export const addNote = (b: any) => apiPost(`${S}/case/note`, b);
export const caseAction = (b: any) => apiPost(`${S}/case/action`, b);
// Agent + SAR
export const agentChat = (b: any) => apiPost(`${S}/agent/chat`, b);
export const sarGenerate = (b: any) => apiPost(`${S}/sar/generate`, b);
export const sarSubmit = (b: any) => apiPost(`${S}/sar/submit`, b);
// Graph
export const getGraph = (q = "", limit = 12) =>
  apiGet(`${S}/graph?limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`);

// Advanced AML (sanctions screening, pKYC, peer anomaly)
const A = "/api/aml";
export const getScreening = (confidence = "", limit = 200) =>
  apiGet(`${A}/screening?limit=${limit}${confidence ? `&confidence=${confidence}` : ""}`);
export const getScreeningSummary = () => apiGet(`${A}/screening/summary`);
export const getPkyc = (minRisk = 0, limit = 100) => apiGet(`${A}/pkyc?min_risk=${minRisk}&limit=${limit}`);
export const getPkycSummary = () => apiGet(`${A}/pkyc/summary`);
export const getAnomalies = (limit = 100) => apiGet(`${A}/anomalies?limit=${limit}`);

// GenAI
const G = "/api/genai";
export const genieAsk = (b: any) => apiPost(`${G}/ask`, b);
export const execBriefing = () => apiGet(`${G}/exec-briefing`);
export const caseTriage = (b: any) => apiPost(`${G}/triage`, b);
export const casePrioritize = (b: any) => apiPost(`${G}/prioritize`, b);
