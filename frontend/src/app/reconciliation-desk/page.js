"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadUserId, getToken, authHeaders } from "../../lib/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

// ============ Helpers ============
const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "";
const formatAmount = (n) => n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ============ Styles ============
const RECON_STYLE = `
  body { font-family: 'Inter', sans-serif; background: #f0f4f8; margin: 0; color: #1e293b; }

  .topbar {
    padding: 16px 30px;
    background: linear-gradient(135deg, #0B2027 0%, #0A4D68 50%, #088395 100%);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
  .topbar-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .topbar-subtitle { font-size: 12px; opacity: 0.7; margin-top: 2px; }
  .topbar-actions { display: flex; gap: 10px; align-items: center; }


  .filter-bar {
    display: flex;
    gap: 8px;
    padding: 12px 30px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
    align-items: center;
  }
  .filter-label { font-size: 12px; font-weight: 600; color: #64748b; margin-right: 4px; }
  .filter-btn {
    padding: 5px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    background: white;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .filter-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
  .filter-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
  .filter-input {
    padding: 5px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12px;
    background: white;
    width: 120px;
  }
  .filter-input:focus { outline: none; border-color: #3b82f6; }
  .filter-select {
    padding: 5px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12px;
    background: white;
    cursor: pointer;
  }

  .desk-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .container { width: 100%; max-width: none; margin: 0; padding: 0; display: flex; flex-direction: column; flex: 1; min-height: 0; }

  .table-container {
    flex: 1;
    overflow: auto;
    background: white;
    border-radius: 0;
    box-shadow: none;
    border: none;
    border-top: 1px solid #e2e8f0;
  }
  table { border-collapse: collapse; width: 100%; min-width: 1920px; font-size: 11px; color: #334155; }
  th {
    position: sticky;
    top: 0;
    background: #0f172a;
    color: #f1f5f9;
    padding: 3px 5px;
    font-weight: 600;
    text-align: left;
    border-bottom: 2px solid #1e293b;
    border-right: 1px solid #334155;
    z-index: 10;
    white-space: nowrap;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  td {
    padding: 2px 5px;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #f1f5f9;
    color: inherit;
    white-space: nowrap;
    font-size: 10.5px;
  }
  tbody tr:nth-child(even) td { background-color: #f8fafc; }
  tbody tr:hover td { background-color: #e0f2fe; cursor: pointer; }
  .num { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }

  .status-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-outstanding { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .status-matched { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

  .source-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .source-ledger { background: #ede9fe; color: #5b21b6; }
  .source-statement { background: #ccfbf1; color: #115e59; }



  .desk-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 600;
  }
  .desk-apac { background: #dbeafe; color: #1e40af; }
  .desk-emea { background: #fce7f3; color: #9d174d; }
  .desk-amer { background: #fef3c7; color: #92400e; }
  .desk-global { background: #e2e8f0; color: #475569; }

  .ref-cell { color: inherit; font-family: 'Consolas', monospace; font-size: 10.5px; }

  /* Selection */
  .sel-cell { text-align: center; width: 34px; }
  tr.row-selected td { background-color: #ffedd5 !important; }
  tr.row-selected:hover td { background-color: #fed7aa !important; }
  .sel-checkbox { width: 15px; height: 15px; cursor: pointer; accent-color: #0A4D68; }

  .match-tray {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 30px;
    background: #0f172a;
    color: #e2e8f0;
    border-bottom: 1px solid #1e293b;
    flex-wrap: wrap;
  }
  .tray-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Consolas', monospace;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .tray-chip.filled-ledger { background: rgba(139,92,246,0.25); border-color: #8b5cf6; }
  .tray-chip.filled-statement { background: rgba(20,184,166,0.25); border-color: #14b8a6; }
  .tray-hint { font-size: 12px; opacity: 0.65; }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #94a3b8;
  }
  .empty-state h3 { font-size: 18px; margin-bottom: 8px; color: #64748b; }
  .empty-state p { font-size: 14px; }

  .loading-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }
  .loading-spinner {
    width: 40px; height: 40px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Detail Panel */
  .detail-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(4px);
    z-index: 998;
  }
  .detail-panel {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: 480px;
    background: white;
    box-shadow: -8px 0 30px rgba(0,0,0,0.15);
    z-index: 999;
    overflow-y: auto;
    animation: slideIn 0.2s ease-out;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .detail-header {
    padding: 20px;
    background: linear-gradient(135deg, #0B2027, #0A4D68);
    color: white;
  }
  .detail-header h3 { margin: 0 0 4px 0; font-size: 18px; }
  .detail-header p { margin: 0; opacity: 0.7; font-size: 12px; }
  .detail-section { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
  .detail-section h4 { margin: 0 0 10px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .detail-key { color: #64748b; }
  .detail-value { font-weight: 500; color: #0f172a; font-family: 'Consolas', monospace; }
`;

// ============ Component ============
export default function ReconciliationDeskPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState("Preparing Reconciliation Desk...");
  const [isMatching, setIsMatching] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState(null);
  const [sourceFilter, setSourceFilter] = useState(null);
  const [deskFilter, setDeskFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [tradeRefFilter, setTradeRefFilter] = useState("");
  const [tradeDateFrom, setTradeDateFrom] = useState("");
  const [tradeDateTo, setTradeDateTo] = useState("");
  const [valueDateFrom, setValueDateFrom] = useState("");
  const [valueDateTo, setValueDateTo] = useState("");
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({});

  // Selection for user-driven matching and moving.
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [tradeIdInput, setTradeIdInput] = useState("");
  const [viewMatchData, setViewMatchData] = useState(null);

  // ============ Auth ============
  useEffect(() => {
    const uid = loadUserId();
    if (!uid || !getToken()) {
      toast.error("Session expired. Login again.");
      router.push("/");
    } else {
      setUserId(uid);
    }
  }, [router]);

  // ============ Stats ============
  const fetchStats = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await fetch(`${API}/api/reconciliation/stats?t=${Date.now()}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (err) {
      console.error("[ReconDesk] Stats error:", err);
    }
  }, []);

  // ============ Allocation entry ============
  // On entry we ensure an allocation exists (20 settled trades → 40 rows).
  // This is idempotent server-side: an existing allocation is returned as-is;
  // otherwise the backend auto-generates the shortfall through the full
  // lifecycle. Filtering is applied client-side over the allocated rows so
  // Ledger/Statement rows always stay together as one mixed set.
  const loadAllocation = useCallback(async () => {
    if (!getToken()) return;
    setIsLoading(true);
    setLoadingLabel("Preparing Reconciliation Operations...");
    try {
      const res = await fetch(`${API}/api/reconciliation/items?limit=10000&t=${Date.now()}`, {
        method: "GET",
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      } else {
        toast.error(data.error || "Failed to load reconciliation desk.");
      }
    } catch (err) {
      console.error("[ReconDesk] Load error:", err);
      toast.error("Failed to load reconciliation desk.");
    } finally {
      setIsLoading(false);
      fetchStats();
    }
  }, [fetchStats]);

  useEffect(() => {
    if (userId) loadAllocation();
  }, [userId, loadAllocation]);

  // ============ Socket Real-Time Sync ============
  useEffect(() => {
    if (!userId) return;
    const token = getToken();
    if (!token) return;

    // Use explicit backend URL on localhost to bypass Next.js proxy 404s
    const socketUrl = API || (window.location.hostname === "localhost" ? "http://localhost:3002" : undefined);
    const socket = io(socketUrl, { auth: { token } });

    socket.on("recon_desk_update", () => {
      // Background sync without loading overlay
      fetch(`${API}/api/reconciliation/items?limit=10000&t=${Date.now()}`, {
        method: "GET",
        headers: authHeaders()
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setItems(data.items || []);
          fetchStats();
        }
      })
      .catch(err => console.error("[ReconDesk] Background sync error:", err));
    });

    return () => socket.disconnect();
  }, [userId, fetchStats]);

  // ============ Selection ============
  const toggleSelect = (item) => {
    setSelectedItemIds(prev => 
      prev.includes(item.itemId) ? prev.filter(id => id !== item.itemId) : [...prev, item.itemId]
    );
  };

  const clearSelection = () => {
    setSelectedItemIds([]);
    setTradeIdInput("");
  };

  // Derived selected items for matching
  const selectedLedgers = items.filter(i => selectedItemIds.includes(i.itemId) && i.source === "LEDGER");
  const selectedStatements = items.filter(i => selectedItemIds.includes(i.itemId) && i.source === "STATEMENT");
  const selectedLedger = selectedLedgers.length === 1 ? selectedLedgers[0].itemId : null;
  const selectedStatement = selectedStatements.length === 1 ? selectedStatements[0].itemId : null;
  const selectedMatchedItems = items.filter(i => selectedItemIds.includes(i.itemId) && i.status === "Matched");

  // ============ User-driven Match ============
  const canMatch = selectedItemIds.length === 2 && selectedLedger && selectedStatement && selectedMatchedItems.length === 0 && !isMatching;

  const handleMatch = async () => {
    if (!canMatch) return;
    setIsMatching(true);
    try {
      const res = await fetch(`${API}/api/reconciliation/manual-match`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerItemId: selectedLedger, statementItemId: selectedStatement })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Match successful — ${data.matchId}`);
        // Update both rows locally to Matched with the new matchId.
        setItems(prev => prev.map(it => {
          if (it.itemId === data.ledgerItemId || it.itemId === data.statementItemId) {
            return { ...it, status: "Matched", matchId: data.matchId };
          }
          return it;
        }));
        clearSelection();
        fetchStats();
      } else {
        // Neutral message — the backend never reveals WHY.
        toast.error(data.message || "Items cannot be matched.");
      }
    } catch (err) {
      toast.error("Items cannot be matched.");
    } finally {
      setIsMatching(false);
    }
  };

  // ============ User-driven Unmatch ============
  const [isUnmatching, setIsUnmatching] = useState(false);
  const uniqueMatchIds = [...new Set(selectedMatchedItems.map(i => i.matchId))];
  const canUnmatch = selectedItemIds.length > 0 && selectedItemIds.length === selectedMatchedItems.length && uniqueMatchIds.length === 1 && !isUnmatching;
  const matchIdToUnmatch = canUnmatch ? uniqueMatchIds[0] : null;

  const handleUnmatch = async () => {
    if (!canUnmatch || !matchIdToUnmatch) return;
    setIsUnmatching(true);
    try {
      const res = await fetch(`${API}/api/reconciliation/unmatch`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: matchIdToUnmatch })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Match ${matchIdToUnmatch} reversed successfully.`);
        // Update local state: clear matchId and set status to Outstanding for all items with this matchId
        setItems(prev => prev.map(it => it.matchId === matchIdToUnmatch ? { ...it, status: "Outstanding", matchId: null } : it));
        clearSelection();
        fetchStats();
      } else {
        toast.error(data.message || "Failed to reverse match.");
      }
    } catch (err) {
      toast.error("Failed to reverse match.");
    } finally {
      setIsUnmatching(false);
    }
  };

  // ============ View Match ============
  const canViewMatch = selectedItemIds.length === 1 && selectedMatchedItems.length === 1 && selectedMatchedItems[0].matchId;
  const handleViewMatch = () => {
    if (!canViewMatch) return;
    setViewMatchData(items.filter(i => i.matchId === selectedMatchedItems[0].matchId));
  };

  // ============ Apply Trade ID ============
  const [isApplying, setIsApplying] = useState(false);
  const [isApplyPopupOpen, setIsApplyPopupOpen] = useState(false);
  const canApplyTradeId = selectedItemIds.length === 1 && tradeIdInput.trim() !== "" && !isApplying;

  const handleApplyTradeId = async () => {
    if (!canApplyTradeId) return;
    setIsApplying(true);
    try {
      const res = await fetch(`${API}/api/reconciliation/apply-trade-id`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedItemIds[0], tradeRef: tradeIdInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Trade ID applied successfully.");
        // Update local state for the item
        setItems(prev => prev.map(it => it.itemId === selectedItemIds[0] ? { ...it, ...data.item } : it));
        setTradeIdInput("");
        setIsApplyPopupOpen(false);
      } else {
        toast.error(data.message || "Failed to apply Trade ID.");
      }
    } catch (err) {
      toast.error("Failed to apply Trade ID.");
    } finally {
      setIsApplying(false);
    }
  };

  // ============ Desk Badge ============
  const deskClass = (desk) => {
    if (!desk) return "desk-global";
    if (desk.startsWith("APAC")) return "desk-apac";
    if (desk.startsWith("EMEA")) return "desk-emea";
    if (desk.startsWith("AMER")) return "desk-amer";
    return "desk-global";
  };

  // ============ Client-side filtering (over the allocated set) ============
  const filteredItems = items.filter(i => {
    if (appliedFilters.status && i.status !== appliedFilters.status) return false;
    if (appliedFilters.source && i.source !== appliedFilters.source) return false;
    if (appliedFilters.desk && i.reconDesk !== appliedFilters.desk) return false;
    if (appliedFilters.currency && !String(i.currency || "").toLowerCase().includes(appliedFilters.currency.toLowerCase())) return false;
    if (appliedFilters.tradeRef && !String(i.itemRef1 || "").toLowerCase().includes(appliedFilters.tradeRef.toLowerCase())) return false;
    if (appliedFilters.tradeDateFrom && new Date(i.tradeDate) < new Date(appliedFilters.tradeDateFrom)) return false;
    if (appliedFilters.tradeDateTo && new Date(i.tradeDate) > new Date(appliedFilters.tradeDateTo)) return false;
    if (appliedFilters.valueDateFrom && new Date(i.valueDate) < new Date(appliedFilters.valueDateFrom)) return false;
    if (appliedFilters.valueDateTo && new Date(i.valueDate) > new Date(appliedFilters.valueDateTo)) return false;
    if (appliedFilters.amountFrom !== undefined && appliedFilters.amountFrom !== "" && i.amount < Number(appliedFilters.amountFrom)) return false;
    if (appliedFilters.amountTo !== undefined && appliedFilters.amountTo !== "" && i.amount > Number(appliedFilters.amountTo)) return false;
    return true;
  });

  // ============ Unique values for filters ============
  const uniqueDesks = [...new Set(items.map(i => i.reconDesk).filter(Boolean))].sort();
  const uniqueCurrencies = [...new Set(items.map(i => i.currency).filter(Boolean))].sort();

  if (!userId) return null;

  return (
    <div className="desk-layout">
      <style dangerouslySetInnerHTML={{ __html: RECON_STYLE }} />

      {/* Loading overlay */}
      {(isLoading || isMatching) && (
        <div className="loading-overlay">
          <div style={{ textAlign: "center", color: "white" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {isMatching ? "Matching..." : loadingLabel}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">⚖️ Reconciliation Operations</div>
          <div className="topbar-subtitle">Enterprise Cash Settlement Reconciliation</div>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => router.push("/gcms")} style={{ marginRight: "10px" }}>
            GCMS
          </button>
          <button className="btn secondary" onClick={() => router.push("/dashboard")}>
              ← Dashboard
          </button>
        </div>
      </div>

      {/* Match Tray — user selects one Ledger + one Statement, then matches, or multiple to move */}
      <div className="match-tray">
        <span style={{ fontSize: 13, fontWeight: 700 }}>Action Menu</span>
        <span className={`tray-chip ${selectedLedger ? "filled-ledger" : ""}`}>
          Ledger: {selectedLedger || "—"}
        </span>
        <span className={`tray-chip ${selectedStatement ? "filled-statement" : ""}`}>
          Statement: {selectedStatement || "—"}
        </span>
        <button className="btn primary2" onClick={handleMatch} disabled={!canMatch}>
          {isMatching ? "⏳ Matching..." : "🔗 Match"}
        </button>
        {canUnmatch && (
          <button className="btn secondary" onClick={handleUnmatch} disabled={!canUnmatch} style={{ marginLeft: "10px", borderColor: "#fca5a5", color: "#b91c1c" }}>
            {isUnmatching ? "⏳ Unmatching..." : "🔓 Unmatch"}
          </button>
        )}
        {canViewMatch && (
          <button className="btn secondary" onClick={handleViewMatch} style={{ marginLeft: "10px", borderColor: "#6366f1", color: "#4f46e5", background: "#e0e7ff" }}>
            👁 View Match
          </button>
        )}
        
        {/* Apply Trade ID controls moved to filter bar */}

        {selectedItemIds.length > 0 && (
          <button className="btn secondary" style={{ fontSize: 12, padding: "6px 12px", marginLeft: "10px" }} onClick={clearSelection}>
            ✕ Clear Selection ({selectedItemIds.length})
          </button>
        )}
        <span className="tray-hint" style={{ marginLeft: "10px" }}>Select one Ledger + Statement to match.</span>
      </div>


      {/* Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">Status:</span>
        <button className={`filter-btn ${!statusFilter ? "active" : ""}`} onClick={() => setStatusFilter(null)}>All</button>
        <button className={`filter-btn ${statusFilter === "Outstanding" ? "active" : ""}`} onClick={() => setStatusFilter(statusFilter === "Outstanding" ? null : "Outstanding")}>Outstanding</button>
        <button className={`filter-btn ${statusFilter === "Matched" ? "active" : ""}`} onClick={() => setStatusFilter(statusFilter === "Matched" ? null : "Matched")}>Matched</button>

        <span style={{ margin: "0 8px", borderLeft: "1px solid #cbd5e1", height: 20 }} />

        <span className="filter-label">Source:</span>
        <button className={`filter-btn ${!sourceFilter ? "active" : ""}`} onClick={() => setSourceFilter(null)}>All</button>
        <button className={`filter-btn ${sourceFilter === "LEDGER" ? "active" : ""}`} onClick={() => setSourceFilter(sourceFilter === "LEDGER" ? null : "LEDGER")}>Ledger</button>
        <button className={`filter-btn ${sourceFilter === "STATEMENT" ? "active" : ""}`} onClick={() => setSourceFilter(sourceFilter === "STATEMENT" ? null : "STATEMENT")}>Statement</button>

        <span style={{ margin: "0 8px", borderLeft: "1px solid #cbd5e1", height: 20 }} />

        <span className="filter-label">Recon Operations:</span>
        <select className="filter-select" value={deskFilter} onChange={(e) => setDeskFilter(e.target.value)}>
          <option value="">All Operations</option>
          {uniqueDesks.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <span className="filter-label" style={{ marginLeft: 8 }}>Currency:</span>
        <input
          className="filter-input"
          placeholder="e.g. USD"
          style={{width: 100}}
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
        />
        <span className="filter-label">Trade ID:</span>
        <input
          className="filter-input"
          placeholder="Trade ID..."
          style={{width: 150}}
          value={tradeRefFilter}
          onChange={(e) => setTradeRefFilter(e.target.value)}
        />

        <div style={{ flexBasis: "100%", height: 10 }}></div>

        <span className="filter-label">Trade-Date:</span>
        <input type="date" className="filter-input" style={{width: 110}} value={tradeDateFrom} onChange={e => setTradeDateFrom(e.target.value)} />
        <span className="filter-label" style={{margin: "0 2px"}}>-</span>
        <input type="date" className="filter-input" style={{width: 110}} value={tradeDateTo} onChange={e => setTradeDateTo(e.target.value)} />

        <span style={{ margin: "0 8px", borderLeft: "1px solid #cbd5e1", height: 20 }} />

        <span className="filter-label">Value-Date:</span>
        <input type="date" className="filter-input" style={{width: 110}} value={valueDateFrom} onChange={e => setValueDateFrom(e.target.value)} />
        <span className="filter-label" style={{margin: "0 2px"}}>-</span>
        <input type="date" className="filter-input" style={{width: 110}} value={valueDateTo} onChange={e => setValueDateTo(e.target.value)} />

        <span style={{ margin: "0 8px", borderLeft: "1px solid #cbd5e1", height: 20 }} />

        <span className="filter-label">Amount:</span>
        <input type="number" className="filter-input" style={{width: 80}} placeholder="Min" value={amountFrom} onChange={e => setAmountFrom(e.target.value)} />
        <span className="filter-label" style={{margin: "0 2px"}}>-</span>
        <input type="number" className="filter-input" style={{width: 80}} placeholder="Max" value={amountTo} onChange={e => setAmountTo(e.target.value)} />

        <button className="btn primary" style={{ fontSize: 11, padding: "4px 10px", marginLeft: "10px" }} onClick={() => {
          setAppliedFilters({
            status: statusFilter,
            source: sourceFilter,
            desk: deskFilter,
            currency: currencyFilter,
            tradeRef: tradeRefFilter,
            tradeDateFrom,
            tradeDateTo,
            valueDateFrom,
            valueDateTo,
            amountFrom,
            amountTo
          });
        }}>Execute Query</button>

        <button className="btn secondary" style={{ fontSize: 11, padding: "4px 10px", marginLeft: "10px" }} onClick={() => {
          setStatusFilter(null);
          setSourceFilter(null);
          setDeskFilter("");
          setCurrencyFilter("");
          setTradeRefFilter("");
          setTradeDateFrom("");
          setTradeDateTo("");
          setValueDateFrom("");
          setValueDateTo("");
          setAmountFrom("");
          setAmountTo("");
          setAppliedFilters({});
        }}>
          ✕ Clear
        </button>

        <span style={{ margin: "0 8px", borderLeft: "1px solid #cbd5e1", height: 20 }} />

        <button className="btn primary" style={{ fontSize: 11, padding: "5px 12px", marginLeft: "10px" }} onClick={() => setIsApplyPopupOpen(true)}>
          Apply Trade ID
        </button>
      </div>

      {/* Main Table */}
      <div className="container">
        {filteredItems.length === 0 && !isLoading ? (
          <div className="empty-state">
            <h3>No Reconciliation Items</h3>
            <p>The reconciliation desk allocation is empty. Try reloading the desk.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="sel-cell">✓</th>
                  <th>Status</th>
                  <th>Item ID</th>
                  <th>Source</th>
                  <th>Item Type</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Trade Date</th>
                  <th>Value Date</th>
                  <th>Recon Operations</th>
                  <th>Match ID</th>
                  <th title="Trade ID">Ref1: Trade</th>
                  <th title="Underlyer">Ref2: Underlyer</th>
                  <th title="Entity Code">Ref3: Entity</th>
                  <th title="Country">Ref4: Country</th>
                  <th title="Product">Ref5: Product</th>
                  <th title="Product Type">Ref6: ProdType</th>
                  <th title="Counterparty Name">Ref7: Counterparty</th>
                  <th title="Buyer BIC">SWIFT1: BuyerBIC</th>
                  <th title="Seller Account">SWIFT2: SellerAcc</th>
                  <th title="Buyer Account">SWIFT3: BuyerAcc</th>
                  <th title="Seller BIC">SWIFT4: SellerBIC</th>
                  <th title="Field20">SWIFT5: Field20</th>
                  <th title="56A Intermediary">SWIFT6: 56A</th>
                  <th title="Institution Name">SWIFT7: Inst</th>
                  <th title="Bank Name">SWIFT8: Bank</th>
                  <th title="Field72">SWIFT9: Field72</th>
                  <th title="Field70">SWIFT10: Field70</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isMatched = item.status === "Matched";
                  const isSelected = selectedItemIds.includes(item.itemId);
                  
                  let rowColor = undefined;
                  const iType = (item.itemType || "").toLowerCase();
                  if (iType === "statement debit" || iType === "sd") rowColor = "#ef4444"; // red
                  else if (iType === "statement credit" || iType === "sc") rowColor = "#9333ea"; // purple
                  else if (iType === "ledger debit" || iType === "ld") rowColor = "#2563eb"; // blue
                  else if (iType === "ledger credit" || iType === "lc") rowColor = "#000000"; // black

                  return (
                  <tr
                    key={item._id || item.itemId}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => toggleSelect(item)}
                    style={{ color: rowColor }}
                  >
                    <td className="sel-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="sel-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item)}
                      />
                    </td>
                    <td>
                      <span className={`status-badge ${isMatched ? "status-matched" : "status-outstanding"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: "Consolas, monospace" }}>{item.itemId}</td>
                    <td>{item.source}</td>
                    <td>{item.itemType || "—"}</td>
                    <td className="num">{formatAmount(item.amount)}</td>
                    <td style={{ fontWeight: 500 }}>{item.currency || "—"}</td>
                    <td>{formatDate(item.tradeDate)}</td>
                    <td>{formatDate(item.valueDate)}</td>
                    <td>{item.reconDesk || "—"}</td>
                    <td style={{ fontFamily: "Consolas, monospace", color: "inherit" }}>
                      {item.matchId || "—"}
                    </td>
                    <td className="ref-cell">{item.itemRef1 || "—"}</td>
                    <td className="ref-cell">{item.itemRef2 || "—"}</td>
                    <td className="ref-cell">{item.itemRef3 || "—"}</td>
                    <td className="ref-cell">{item.itemRef4 || "—"}</td>
                    <td className="ref-cell">{item.itemRef5 || "—"}</td>
                    <td className="ref-cell">{item.itemRef6 || "—"}</td>
                    <td className="ref-cell">{item.itemRef7 || "—"}</td>
                    <td className="ref-cell">{item.ref1 || "—"}</td>
                    <td className="ref-cell">{item.ref2 || "—"}</td>
                    <td className="ref-cell">{item.ref3 || "—"}</td>
                    <td className="ref-cell">{item.ref4 || "—"}</td>
                    <td className="ref-cell">{item.ref5 || "—"}</td>
                    <td className="ref-cell">{item.ref6 || "—"}</td>
                    <td className="ref-cell">{item.ref7 || "—"}</td>
                    <td className="ref-cell">{item.ref8 || "—"}</td>
                    <td className="ref-cell">{item.ref9 || "—"}</td>
                    <td className="ref-cell">{item.ref10 || "—"}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* View Match Popup */}
      {viewMatchData && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", width: "1000px", maxWidth: "95vw", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>Match Details - {viewMatchData[0]?.matchId}</h2>
              <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => setViewMatchData(null)}>✕ Close</button>
            </div>
            <div className="table-container" style={{ flex: 1, overflow: "auto", border: "1px solid #e2e8f0", maxHeight: "400px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Item ID</th>
                    <th>Source</th>
                    <th>Item Type</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Trade Date</th>
                    <th>Value Date</th>
                    <th>Recon Operations</th>
                    <th>Match ID</th>
                    <th title="Trade ID">Ref1: Trade</th>
                    <th title="Underlyer">Ref2: Underlyer</th>
                    <th title="Entity Code">Ref3: Entity</th>
                    <th title="Country">Ref4: Country</th>
                    <th title="Product">Ref5: Product</th>
                    <th title="Product Type">Ref6: ProdType</th>
                    <th title="Counterparty Name">Ref7: Counterparty</th>
                    <th title="Buyer BIC">SWIFT1: BuyerBIC</th>
                    <th title="Seller Account">SWIFT2: SellerAcc</th>
                    <th title="Buyer Account">SWIFT3: BuyerAcc</th>
                    <th title="Seller BIC">SWIFT4: SellerBIC</th>
                    <th title="Field20">SWIFT5: Field20</th>
                    <th title="56A Intermediary">SWIFT6: 56A</th>
                    <th title="Institution Name">SWIFT7: Inst</th>
                    <th title="Bank Name">SWIFT8: Bank</th>
                    <th title="Field72">SWIFT9: Field72</th>
                    <th title="Field70">SWIFT10: Field70</th>
                  </tr>
                </thead>
                <tbody>
                  {viewMatchData.map(item => {
                    let rowColor = undefined;
                    const iType = (item.itemType || "").toLowerCase();
                    if (iType === "statement debit" || iType === "sd") rowColor = "#ef4444"; // red
                    else if (iType === "statement credit" || iType === "sc") rowColor = "#9333ea"; // purple
                    else if (iType === "ledger debit" || iType === "ld") rowColor = "#2563eb"; // blue
                    else if (iType === "ledger credit" || iType === "lc") rowColor = "#000000"; // black

                    return (
                      <tr key={item.id} style={{ color: rowColor }}>
                        <td>
                          <span className={`status-badge ${item.status === "Matched" ? "status-matched" : "status-outstanding"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, fontFamily: "Consolas, monospace" }}>{item.itemId}</td>
                        <td>{item.source}</td>
                        <td>{item.itemType || "—"}</td>
                        <td className="num">{formatAmount(item.amount)}</td>
                        <td style={{ fontWeight: 500 }}>{item.currency || "—"}</td>
                        <td>{formatDate(item.tradeDate)}</td>
                        <td>{formatDate(item.valueDate)}</td>
                        <td>{item.reconDesk || "—"}</td>
                        <td style={{ fontFamily: "Consolas, monospace", color: "inherit" }}>
                          {item.matchId || "—"}
                        </td>
                        <td className="ref-cell">{item.itemRef1 || "—"}</td>
                        <td className="ref-cell">{item.itemRef2 || "—"}</td>
                        <td className="ref-cell">{item.itemRef3 || "—"}</td>
                        <td className="ref-cell">{item.itemRef4 || "—"}</td>
                        <td className="ref-cell">{item.itemRef5 || "—"}</td>
                        <td className="ref-cell">{item.itemRef6 || "—"}</td>
                        <td className="ref-cell">{item.itemRef7 || "—"}</td>
                        <td className="ref-cell">{item.ref1 || "—"}</td>
                        <td className="ref-cell">{item.ref2 || "—"}</td>
                        <td className="ref-cell">{item.ref3 || "—"}</td>
                        <td className="ref-cell">{item.ref4 || "—"}</td>
                        <td className="ref-cell">{item.ref5 || "—"}</td>
                        <td className="ref-cell">{item.ref6 || "—"}</td>
                        <td className="ref-cell">{item.ref7 || "—"}</td>
                        <td className="ref-cell">{item.ref8 || "—"}</td>
                        <td className="ref-cell">{item.ref9 || "—"}</td>
                        <td className="ref-cell">{item.ref10 || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Apply Trade ID Popup */}
      {isApplyPopupOpen && (
        <>
          <div className="detail-overlay" onClick={() => setIsApplyPopupOpen(false)} />
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "24px",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            zIndex: 1000,
            width: "360px"
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#0f172a" }}>Apply Trade ID</h3>
            
            {selectedItemIds.length === 1 ? (
              <>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                  Applying to {selectedStatements.some(s => s.itemId === selectedItemIds[0]) ? "Statement" : "Ledger"} Item: <strong>{selectedItemIds[0]}</strong>
                </p>
                <input 
                  type="text" 
                  placeholder="Enter Trade ID..." 
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" }}
                  value={tradeIdInput}
                  onChange={(e) => setTradeIdInput(e.target.value)}
                  autoFocus
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn btn-secondary" onClick={() => setIsApplyPopupOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleApplyTradeId} disabled={!canApplyTradeId}>
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>
                  Please select exactly one Ledger or Statement item to apply a Trade ID.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={() => setIsApplyPopupOpen(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

    </div>
  );
}
