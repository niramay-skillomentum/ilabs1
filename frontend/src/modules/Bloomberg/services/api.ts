// Bloomberg Terminal API Service
// All data endpoints fetch the FULL simulator dataset (no desk/user filtering).
// Authentication is handled via the X-Bloomberg-Terminal header.

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
const BASE_URL = `${BACKEND_URL}/api`;

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
  // ======================================
  // SECURITY MASTER (Reference Data)
  // ======================================
  getProducts: () => fetchJson(`/security/products`),
  getRelated: (q: string) => fetchJson(`/security/related?q=${encodeURIComponent(q)}`),
  searchSecurity: (q: string, product?: string) => {
    let url = `/security/search?q=${encodeURIComponent(q)}`;
    if (product) url += `&product=${encodeURIComponent(product)}`;
    return fetchJson(url);
  },
  getSecurity: (id: string) => fetchJson(`/security/${encodeURIComponent(id)}`),
  
  // ======================================
  // ENTITY (Reference Data)
  // ======================================
  searchEntity: (q: string) => fetchJson(`/entity/search?q=${encodeURIComponent(q)}`),
  getEntity: (id: string) => fetchJson(`/entity/${encodeURIComponent(id)}`),

  // ======================================
  // SSI (Reference Data)
  // ======================================
  getSSI: (id: string) => fetchJson(`/ssi/${encodeURIComponent(id)}`),
  getSsiGroup: (groupName: string) => fetchJson(`/ssi/group?groupName=${encodeURIComponent(groupName)}`),
  searchSsi: (alertCode: string, acronymCode: string) => fetchJson(`/ssi/search-codes?alertCode=${encodeURIComponent(alertCode)}&acronymCode=${encodeURIComponent(acronymCode)}`),

  // ======================================
  // BLOOMBERG GLOBAL DATA (Full DB Access)
  // ======================================

  // All trades — global, no desk/user filter
  getAllTradesGlobal: (opts?: { desk?: string; statusPattern?: string; limit?: number }) => {
    let url = `/bloomberg/trades`;
    const params: string[] = [];
    if (opts?.desk) params.push(`desk=${encodeURIComponent(opts.desk)}`);
    if (opts?.statusPattern) params.push(`statusPattern=${encodeURIComponent(opts.statusPattern)}`);
    if (opts?.limit) params.push(`limit=${opts.limit}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchJson(url);
  },

  // Single trade by ref
  getTrade: (tradeRef: string) => fetchJson(`/trade/${encodeURIComponent(tradeRef)}`),

  // Trade statistics
  getTradeStats: () => fetchJson(`/bloomberg/trades/stats`),

  // Trade audit trail (global)
  getTradeHistory: (tradeRef: string) => fetchJson(`/bloomberg/audit/${encodeURIComponent(tradeRef)}`),

  // Global portfolio (all trades)
  getPortfolioGlobal: () => fetchJson(`/bloomberg/portfolio`),

  // SWIFT messages
  getSwiftGlobal: (tradeRef: string) => fetchJson(`/bloomberg/swift/${encodeURIComponent(tradeRef)}`),
  getAllSwiftMessages: () => fetchJson(`/bloomberg/swift/all`),

  // Reconciliation
  getReconItems: (opts?: { status?: string; source?: string }) => {
    let url = `/bloomberg/reconciliation/items`;
    const params: string[] = [];
    if (opts?.status) params.push(`status=${encodeURIComponent(opts.status)}`);
    if (opts?.source) params.push(`source=${encodeURIComponent(opts.source)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchJson(url);
  },
  getReconStats: () => fetchJson(`/bloomberg/reconciliation/stats`),

  // Counterparties
  getCounterparties: () => fetchJson(`/bloomberg/counterparties`),
};
