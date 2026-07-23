"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadUserId, getToken, authHeaders } from "../../../lib/auth";
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

  .stats-bar {
    display: flex;
    gap: 12px;
    padding: 16px 30px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }
  .stat-card {
    padding: 12px 20px;
    border-radius: 10px;
    min-width: 120px;
    text-align: center;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .stat-value { font-size: 24px; font-weight: 700; font-family: 'Consolas', monospace; }
  .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; opacity: 0.7; }

  .stat-total { background: linear-gradient(135deg, #f0f4ff, #e0e7ff); border-color: #c7d2fe; }
  .stat-total .stat-value { color: #3730a3; }
  .stat-matched { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-color: #a7f3d0; }
  .stat-matched .stat-value { color: #065f46; }
  .stat-outstanding { background: linear-gradient(135deg, #fefce8, #fef3c7); border-color: #fde68a; }
  .stat-outstanding .stat-value { color: #92400e; }
  .stat-rate { background: linear-gradient(135deg, #f0f9ff, #dbeafe); border-color: #93c5fd; }
  .stat-rate .stat-value { color: #1e40af; }
  .stat-ledger { background: linear-gradient(135deg, #faf5ff, #ede9fe); border-color: #c4b5fd; }
  .stat-ledger .stat-value { color: #5b21b6; }
  .stat-statement { background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-color: #99f6e4; }
  .stat-statement .stat-value { color: #115e59; }

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

  .container { width: 97%; max-width: 1800px; margin: 16px auto; }

  .table-container {
    max-height: calc(100vh - 310px);
    overflow: auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07);
    border: 1px solid #e2e8f0;
  }
  table { border-collapse: collapse; width: 100%; min-width: 2400px; font-size: 11.5px; }
  th {
    position: sticky;
    top: 0;
    background: #0f172a;
    color: #f1f5f9;
    padding: 8px 10px;
    font-weight: 600;
    text-align: left;
    border-bottom: 2px solid #1e293b;
    border-right: 1px solid #334155;
    z-index: 10;
    white-space: nowrap;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  td {
    padding: 5px 10px;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #f1f5f9;
    color: #334155;
    white-space: nowrap;
    font-size: 11.5px;
  }
  tbody tr:nth-child(even) td { background-color: #f8fafc; }
  tbody tr:hover td { background-color: #e0f2fe; cursor: pointer; }
  .num { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
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
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .source-ledger { background: #ede9fe; color: #5b21b6; }
  .source-statement { background: #ccfbf1; color: #115e59; }

  .btn {
    padding: 8px 16px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.12); }
  .btn:active { transform: translateY(0); }
  .btn-primary { background: linear-gradient(135deg, #0B2027, #0A4D68); color: white; }
  .btn-primary:hover { background: linear-gradient(135deg, #0A4D68, #088395); }
  .btn-secondary { background: #e2e8f0; color: #1e293b; }
  .btn-secondary:hover { background: #cbd5e1; }
  .btn-back { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); font-size: 12px; padding: 6px 14px; }
  .btn-back:hover { background: rgba(255,255,255,0.25); }
  .btn-match {
    background: linear-gradient(135deg, #059669, #10b981);
    color: white;
    font-size: 13px;
    padding: 8px 20px;
  }
  .btn-match:hover { background: linear-gradient(135deg, #047857, #059669); }
  .btn-match:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .desk-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
  }
  .desk-apac { background: #dbeafe; color: #1e40af; }
  .desk-emea { background: #fce7f3; color: #9d174d; }
  .desk-amer { background: #fef3c7; color: #92400e; }
  .desk-global { background: #e2e8f0; color: #475569; }

  .ref-cell { color: #64748b; font-family: 'Consolas', monospace; font-size: 10.5px; }

  /* Selection */
  .sel-cell { text-align: center; width: 34px; }
  tr.row-selected td { background-color: #dbeafe !important; }
  tr.row-selected:hover td { background-color: #bfdbfe !important; }
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

  // Selection for user-driven matching: at most one LEDGER + one STATEMENT.
  const [selectedLedger, setSelectedLedger] = useState(null);      // itemId
  const [selectedStatement, setSelectedStatement] = useState(null); // itemId

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
      const res = await fetch(`${API}/api/reconciliation/stats`, { headers: authHeaders() });
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
    setLoadingLabel("Preparing Reconciliation Desk...");
    try {
      const res = await fetch(`${API}/api/reconciliation/my-allocation`, {
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

  // ============ Selection ============
  const toggleSelect = (item) => {
    if (item.status === "Matched") return; // matched rows are locked
    if (item.source === "LEDGER") {
      setSelectedLedger(prev => prev === item.itemId ? null : item.itemId);
    } else {
      setSelectedStatement(prev => prev === item.itemId ? null : item.itemId);
    }
  };

  const clearSelection = () => {
    setSelectedLedger(null);
    setSelectedStatement(null);
  };

  // ============ User-driven Match ============
  const canMatch = selectedLedger && selectedStatement && !isMatching;

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
    if (statusFilter && i.status !== statusFilter) return false;
    if (sourceFilter && i.source !== sourceFilter) return false;
    if (deskFilter && i.reconDesk !== deskFilter) return false;
    if (currencyFilter && i.currency !== currencyFilter) return false;
    if (tradeRefFilter && !String(i.itemRef1 || "").toLowerCase().includes(tradeRefFilter.toLowerCase())) return false;
    return true;
  });

  // ============ Unique values for filters ============
  const uniqueDesks = [...new Set(items.map(i => i.reconDesk).filter(Boolean))].sort();
  const uniqueCurrencies = [...new Set(items.map(i => i.currency).filter(Boolean))].sort();

  if (!userId) return null;

  return (
    <>
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
          <div className="topbar-title">⚖️ My Allocations</div>
          <div className="topbar-subtitle">Enterprise Cash Settlement Reconciliation</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-back" onClick={() => router.push("/reconciliation-desk")}>
              ← Back to Desk
          </button>
        </div>
      </div>

      {/* Match Tray — user selects one Ledger + one Statement, then matches */}
      <div className="match-tray">
        <span style={{ fontSize: 13, fontWeight: 700 }}>Manual Match</span>
        <span className={`tray-chip ${selectedLedger ? "filled-ledger" : ""}`}>
          Ledger: {selectedLedger || "—"}
        </span>
        <span className={`tray-chip ${selectedStatement ? "filled-statement" : ""}`}>
          Statement: {selectedStatement || "—"}
        </span>
        <button className="btn btn-match" onClick={handleMatch} disabled={!canMatch}>
          {isMatching ? "⏳ Matching..." : "🔗 Match"}
        </button>
        {(selectedLedger || selectedStatement) && (
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={clearSelection}>
            ✕ Clear Selection
          </button>
        )}
        <span className="tray-hint">Select one Ledger row and one Statement row, then click Match.</span>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-card stat-total">
            <div className="stat-value">{stats.totalItems}</div>
            <div className="stat-label">Total Items</div>
          </div>
          <div className="stat-card stat-matched" style={{ cursor: "pointer" }} onClick={() => { setStatusFilter(statusFilter === "Matched" ? null : "Matched"); }}>
            <div className="stat-value">{stats.matchedItems}</div>
            <div className="stat-label">Matched</div>
          </div>
          <div className="stat-card stat-outstanding" style={{ cursor: "pointer" }} onClick={() => { setStatusFilter(statusFilter === "Outstanding" ? null : "Outstanding"); }}>
            <div className="stat-value">{stats.outstandingItems}</div>
            <div className="stat-label">Outstanding</div>
          </div>
          <div className="stat-card stat-rate">
            <div className="stat-value">{stats.matchRate}%</div>
            <div className="stat-label">Match Rate</div>
          </div>
          <div className="stat-card stat-ledger" style={{ cursor: "pointer" }} onClick={() => { setSourceFilter(sourceFilter === "LEDGER" ? null : "LEDGER"); }}>
            <div className="stat-value">{stats.ledgerItems}</div>
            <div className="stat-label">Ledger</div>
          </div>
          <div className="stat-card stat-statement" style={{ cursor: "pointer" }} onClick={() => { setSourceFilter(sourceFilter === "STATEMENT" ? null : "STATEMENT"); }}>
            <div className="stat-value">{stats.statementItems}</div>
            <div className="stat-label">Statement</div>
          </div>
        </div>
      )}

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

        <span className="filter-label">Desk:</span>
        <select className="filter-select" value={deskFilter} onChange={(e) => setDeskFilter(e.target.value)}>
          <option value="">All Desks</option>
          {uniqueDesks.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <span className="filter-label" style={{ marginLeft: 8 }}>Currency:</span>
        <select className="filter-select" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
          <option value="">All</option>
          {uniqueCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          className="filter-input"
          placeholder="Trade ID..."
          value={tradeRefFilter}
          onChange={(e) => setTradeRefFilter(e.target.value)}
        />

        <button className="btn btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => {
          setStatusFilter(null);
          setSourceFilter(null);
          setDeskFilter("");
          setCurrencyFilter("");
          setTradeRefFilter("");
        }}>
          ✕ Clear
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
                  <th>Recon Desk</th>
                  <th>Match ID</th>
                  <th title="Trade ID">Ref1: Trade</th>
                  <th title="Underlyer">Ref2: Underlyer</th>
                  <th title="Entity Code">Ref3: Entity</th>
                  <th title="Country">Ref4: Country</th>
                  <th title="Product">Ref5: Product</th>
                  <th title="Product Type">Ref6: ProdType</th>
                  <th title="Buyer BIC">SWIFT1: BuyerBIC</th>
                  <th title="Seller Account">SWIFT2: SellerAcc</th>
                  <th title="Buyer Account">SWIFT3: BuyerAcc</th>
                  <th title="Seller BIC">SWIFT4: SellerBIC</th>
                  <th title="Field20">SWIFT5: Field20</th>
                  <th title="56A Intermediary">SWIFT6: 56A</th>
                  <th title="Institution Name">SWIFT7: Inst</th>
                  <th title="Bank Name">SWIFT8: Bank</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isMatched = item.status === "Matched";
                  const isSelected = item.itemId === selectedLedger || item.itemId === selectedStatement;
                  return (
                  <tr
                    key={item._id || item.itemId}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => toggleSelect(item)}
                  >
                    <td className="sel-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="sel-checkbox"
                        disabled={isMatched}
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
                    <td>
                      <span className={`source-badge ${item.source === "LEDGER" ? "source-ledger" : "source-statement"}`}>
                        {item.source}
                      </span>
                    </td>
                    <td>{item.itemType || "—"}</td>
                    <td className="num">{formatAmount(item.amount)}</td>
                    <td style={{ fontWeight: 500 }}>{item.currency || "—"}</td>
                    <td>{formatDate(item.tradeDate)}</td>
                    <td>{formatDate(item.valueDate)}</td>
                    <td>
                      <span className={`desk-badge ${deskClass(item.reconDesk)}`}>
                        {item.reconDesk || "—"}
                      </span>
                    </td>
                    <td style={{ fontFamily: "Consolas, monospace", color: item.matchId ? "#059669" : "#94a3b8" }}>
                      {item.matchId || "—"}
                    </td>
                    <td className="ref-cell">{item.itemRef1 || "—"}</td>
                    <td className="ref-cell">{item.itemRef2 || "—"}</td>
                    <td className="ref-cell">{item.itemRef3 || "—"}</td>
                    <td className="ref-cell">{item.itemRef4 || "—"}</td>
                    <td className="ref-cell">{item.itemRef5 || "—"}</td>
                    <td className="ref-cell">{item.itemRef6 || "—"}</td>
                    <td className="ref-cell">{item.ref1 || "—"}</td>
                    <td className="ref-cell">{item.ref2 || "—"}</td>
                    <td className="ref-cell">{item.ref3 || "—"}</td>
                    <td className="ref-cell">{item.ref4 || "—"}</td>
                    <td className="ref-cell">{item.ref5 || "—"}</td>
                    <td className="ref-cell">{item.ref6 || "—"}</td>
                    <td className="ref-cell">{item.ref7 || "—"}</td>
                    <td className="ref-cell">{item.ref8 || "—"}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
