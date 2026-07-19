// Thin API client for the FastAPI backend.
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

// Alerts
export const getAlerts = (q = "") => apiGet(`/api/alerts${q}`);
export const getAlertSummary = () => apiGet(`/api/alerts/summary`);
export const getAlert = (id: string) => apiGet(`/api/alerts/${encodeURIComponent(id)}`);
export const postFeedback = (b: any) => apiPost(`/api/alerts/feedback`, b);
// Network / customers / travel / reports
export const getNetwork = (eid: string) => apiGet(`/api/network/${encodeURIComponent(eid)}`);
export const getCustomers = (q = "") => apiGet(`/api/customers${q}`);
export const getCustomer = (id: string) => apiGet(`/api/customers/${encodeURIComponent(id)}`);
export const getImpossibleTravel = () => apiGet(`/api/impossible-travel`);
export const getWeeklyReport = () => apiGet(`/api/reports/weekly`);
