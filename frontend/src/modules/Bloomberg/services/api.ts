// Basic API wrapper calling the backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

async function fetchJson(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { 
    credentials: 'include',
    headers: {
      'X-Bloomberg-Terminal': 'true'
    }
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const bloombergApi = {
  // Security
  getProducts: () => fetchJson(`/security/products`),
  getRelated: (q: string) => fetchJson(`/security/related?q=${encodeURIComponent(q)}`),
  searchSecurity: (q: string, product?: string) => {
    let url = `/security/search?q=${encodeURIComponent(q)}`;
    if (product) url += `&product=${encodeURIComponent(product)}`;
    return fetchJson(url);
  },
  getSecurity: (id: string) => fetchJson(`/security/${encodeURIComponent(id)}`),
  
  // Entity
  searchEntity: (q: string) => fetchJson(`/entity/search?q=${encodeURIComponent(q)}`),
  getEntity: (id: string) => fetchJson(`/entity/${encodeURIComponent(id)}`),

  // Trade
  getTrade: (tradeRef: string) => fetchJson(`/trade/${encodeURIComponent(tradeRef)}`),
  getTradeHistory: (tradeRef: string) => fetchJson(`/audit/${encodeURIComponent(tradeRef)}`),
  getAllTrades: (opts?: { desk?: string; assignedOnly?: boolean; statusPattern?: string }) => {
    let url = `/trade/all`;
    const params: string[] = [];
    if (opts?.desk) params.push(`desk=${encodeURIComponent(opts.desk)}`);
    if (opts?.assignedOnly) params.push(`assignedOnly=true`);
    if (opts?.statusPattern) params.push(`statusPattern=${encodeURIComponent(opts.statusPattern)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchJson(url);
  },
  getReconciliationItems: () => fetchJson(`/reconciliation/items`),
  getPortfolio: (opts?: { desk?: string; assignedOnly?: boolean }) => {
    let url = `/trade/portfolio`;
    const params: string[] = [];
    if (opts?.desk) params.push(`desk=${encodeURIComponent(opts.desk)}`);
    if (opts?.assignedOnly) params.push(`assignedOnly=true`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchJson(url);
  },

  // Queue
  getMyQueue: () => fetchJson(`/queue/my`),

  // SSI
  getSSI: (id: string) => fetchJson(`/ssi/${encodeURIComponent(id)}`), // assuming this endpoint exists or will adapt
  getSsiGroup: (groupName: string) => fetchJson(`/ssi/group?groupName=${encodeURIComponent(groupName)}`),
  searchSsi: (alertCode: string, acronymCode: string) => fetchJson(`/ssi/search-codes?alertCode=${encodeURIComponent(alertCode)}&acronymCode=${encodeURIComponent(acronymCode)}`),
  
  // Swift
  getSwift: (id: string) => fetchJson(`/swift/trade/${encodeURIComponent(id)}`), // assuming this endpoint exists or will adapt
};
