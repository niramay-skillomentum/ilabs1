"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { loadUserId, getToken, authHeaders } from "../../lib/auth";
import toast from "react-hot-toast";
import "./page.css";

// ============ Helpers ============
const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "";
const formatDateTime = (d) => d ? new Date(d).toLocaleString() : "";
const formatAmount = (n) => n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

const COMPARISON_FIELDS = [
  { key: "amount", label: "Trade Amount", type: "number" },
  { key: "currency", label: "Currency" },
  { key: "counterparty", label: "Counterparty" },
  { key: "valueDate", label: "Value Date", type: "date" },
  { key: "beneficiaryName", label: "Beneficiary Name" },
  { key: "beneficiaryBank", label: "Beneficiary Bank" },
  { key: "beneficiaryBIC", label: "Beneficiary BIC" },
  { key: "accountNumber", label: "Account Number" },
  { key: "accountType", label: "Account Type" },
  { key: "settlementMethod", label: "Settlement Method" },
  { key: "correspondentBank", label: "Correspondent Bank" },
  { key: "intermediaryBank", label: "Intermediary Bank" },
  { key: "intermediaryBIC", label: "Intermediary BIC" },
  { key: "intermediaryAccount", label: "Intermediary Account" },
  { key: "country", label: "Country" }
];

function ElectronicSettlementComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(null);
  const [trades, setTrades] = useState([]);
  const [counts, setCounts] = useState({ MATCHED: 0, UNMATCHED: 0, PENDING: 0, SETTLED: 0 });
  const [asOf, setAsOf] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(null); // null = all
  const [searchTradeRef, setSearchTradeRef] = useState("");
  const [searchTradeDate, setSearchTradeDate] = useState("");
  const [searchValueDate, setSearchValueDate] = useState("");
  const [searchCounterparty, setSearchCounterparty] = useState("");
  const [searchCurrency, setSearchCurrency] = useState("");
  const [searchDirection, setSearchDirection] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  // Selection
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedTradeRefs, setSelectedTradeRefs] = useState(new Set());

  // Comparison popup
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const socketRef = useRef(null);

  // ============ Data Fetching ============
  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/electronic-settlement/trades", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades || []);
        setCounts(data.counts || { MATCHED: 0, UNMATCHED: 0, PENDING: 0, SETTLED: 0 });
        setAsOf(data.asOf || new Date().toISOString());
      }
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============ Init ============
  useEffect(() => {
    const uid = loadUserId();
    if (!uid || !getToken()) {
      toast.error("Session expired. Login again.");
      router.push("/");
      return;
    }
    setUserId(uid);
    fetchTrades();

    // Socket for live updates
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
    const socket = io(socketUrl, { auth: { token: getToken() } });
    socketRef.current = socket;
    socket.emit("join_desk", "SETTLEMENT");

    socket.on("trade_update", () => {
      fetchTrades();
    });

    return () => socket.disconnect();
  }, [searchParams, fetchTrades, router]);

  // ============ Filtering ============
  const filteredTrades = trades.filter((t) => {
    if (statusFilter && t.electronicStatus !== statusFilter) return false;
    if (searchTradeRef && !t.tradeRef.toLowerCase().includes(searchTradeRef.toLowerCase())) return false;
    if (searchTradeDate && formatDate(t.tradeDate) !== formatDate(new Date(searchTradeDate))) return false;
    if (searchValueDate && formatDate(t.valueDate) !== formatDate(new Date(searchValueDate))) return false;
    if (searchCounterparty && !(t.counterparty || "").toLowerCase().includes(searchCounterparty.toLowerCase()) &&
        !(t.counterpartyGroup || "").toLowerCase().includes(searchCounterparty.toLowerCase())) return false;
    if (searchCurrency && t.currency !== searchCurrency.toUpperCase()) return false;
    if (searchDirection && t.direction !== searchDirection) return false;
    if (searchProduct && t.product !== searchProduct) return false;
    return true;
  });

  const clearFilters = () => {
    setSearchTradeRef("");
    setSearchTradeDate("");
    setSearchValueDate("");
    setSearchCounterparty("");
    setSearchCurrency("");
    setSearchDirection("");
    setSearchProduct("");
    setStatusFilter(null);
  };

  // ============ Actions ============
  const handleSettle = async () => {
    if (!selectedTrade) return toast.error("Select a trade first");
    if (!selectedTrade.isOwned) return toast.error("You can only settle trades assigned to you");
    if (selectedTrade.electronicStatus !== "MATCHED") {
      return toast.error("Only MATCHED trades can be settled directly");
    }

    setIsSettling(true);
    try {
      const res = await fetch("/api/electronic-settlement/settle", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tradeRef: selectedTrade.tradeRef })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Trade ${selectedTrade.tradeRef} settled successfully`);
        setSelectedTrade(null);
        fetchTrades();
      } else {
        toast.error(data.error || "Settlement failed");
      }
    } catch (err) {
      toast.error("Error settling trade");
    } finally {
      setIsSettling(false);
    }
  };

  const handleOpenComparison = async () => {
    if (!selectedTrade) return toast.error("Select a trade first");
    if (!selectedTrade.isOwned) return toast.error("You can only edit trades assigned to you");
    if (selectedTrade.electronicStatus !== "UNMATCHED") {
      return toast.error("Only UNMATCHED trades can be edited");
    }

    try {
      const res = await fetch(
        `/api/electronic-settlement/trade/${selectedTrade.tradeRef}/truth`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        setComparisonData(data);
        // Initialize edited fields from current side
        const initialEdits = {};
        COMPARISON_FIELDS.forEach((f) => {
          const val = data.currentSide[f.key];
          initialEdits[f.key] = val !== undefined && val !== null ? String(val) : "";
        });
        setEditedFields(initialEdits);
        setShowComparison(true);
      } else {
        toast.error(data.error || "Failed to load comparison data");
      }
    } catch (err) {
      toast.error("Error loading trade data");
    }
  };

  const handleSaveEdit = async () => {
    if (!comparisonData) return;
    setIsSaving(true);
    try {
      // Convert edited fields to proper types
      const processed = { ...editedFields };
      if (processed.amount) processed.amount = Number(processed.amount);
      if (processed.valueDate) processed.valueDate = new Date(processed.valueDate).toISOString();

      const res = await fetch("/api/electronic-settlement/save-edit", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          tradeRef: comparisonData.tradeRef,
          editedFields: processed
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Trade amended successfully. Moved to Pending — verification bot will check.");
        setShowComparison(false);
        setComparisonData(null);
        setSelectedTrade(null);
        fetchTrades();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch (err) {
      toast.error("Error saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSelect = (trade) => {
    setSelectedTrade((prev) => (prev?.tradeRef === trade.tradeRef ? null : trade));
  };

  // Unique values for filter dropdowns
  const uniqueCurrencies = [...new Set(trades.map((t) => t.currency).filter(Boolean))];
  const uniqueProducts = [...new Set(trades.map((t) => t.product).filter(Boolean))];

  if (!userId) return null;

  return (
    <div className="stcc-page">
      {/* ── HEADER ── */}
      <div className="stcc-header">
        <div className="stcc-header-top">
          <div className="stcc-logo">
            <span className="stcc-logo-text">STCC</span>
            <div className="stcc-logo-divider"></div>
            <span className="stcc-logo-subtitle">INSTITUTIONAL TRADE PROCESSING</span>
          </div>
          <div className="stcc-header-icons">
            <button onClick={() => window.close()} className="stcc-back-btn">
              ← Back to Workstation
            </button>
            <button title="Settings">⚙</button>
            <button title="Help">?</button>
            <button title="User">{userId?.split("@")[0] || "User"}</button>
          </div>
        </div>
        <div className="stcc-nav">
          <button className="stcc-nav-tab active">Settlement Instruction Manager</button>
          <button className="stcc-nav-tab">Client Configuration</button>
        </div>
      </div>

      <div className="stcc-content">
        {/* ── MANAGER BAR ── */}
        <div className="stcc-manager-bar">
          <span className="stcc-manager-title">SETTLEMENT INSTRUCTION MANAGER</span>
          <div className="stcc-current-view">
            <span>CURRENT VIEW:</span>
            <select defaultValue="default">
              <option value="default">Default View</option>
              <option value="compact">Compact View</option>
            </select>
            <div className="stcc-view-icons">
              <button title="Grid View">▦</button>
              <button title="List View">☰</button>
              <button title="Download" onClick={() => {
                if (filteredTrades.length === 0) return toast.error("No data to export");
                const headers = ["Trade Ref","Status","Electronic Status","Trade Date","Settlement Date","Counterparty","Currency","Direction","Product","Amount","Settlement Mode"];
                let csv = headers.join(",") + "\n";
                filteredTrades.forEach(t => {
                  csv += [t.tradeRef, t.currentStatus, t.electronicStatus, formatDate(t.tradeDate), formatDate(t.valueDate), t.counterparty, t.currency, t.direction, t.product, t.amount, t.settlementType].join(",") + "\n";
                });
                const blob = new Blob([csv], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "stcc_settlement.csv";
                a.click();
                window.URL.revokeObjectURL(url);
              }}>⬇</button>
            </div>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="stcc-filter-bar">
          <span className="stcc-filter-icon">🔍</span>
          <button className="stcc-filter-btn" onClick={() => fetchTrades()}>
            ⟳ FILTERS
          </button>
          <div className="stcc-date-chip">
            Settlement Date: {formatDate(new Date())}
          </div>
        </div>

        {/* ── STATUS FILTERS ── */}
        <div className="stcc-status-filters">
          <span className="stcc-status-label">STATUS FILTERS:</span>
          <button
            className={`stcc-status-pill ${statusFilter === null ? "active" : ""}`}
            onClick={() => setStatusFilter(null)}
          >
            All <span className="count">{trades.length}</span>
          </button>
          {["MATCHED", "UNMATCHED", "PENDING", "SETTLED"].map((st) => (
            <button
              key={st}
              className={`stcc-status-pill ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(statusFilter === st ? null : st)}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}{" "}
              <span className="count">{counts[st] || 0}</span>
            </button>
          ))}
        </div>

        {/* ── SEARCH FILTERS ── */}
        <div className="stcc-search-filters">
          <div className="stcc-search-field">
            <label>Trade Ref</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchTradeRef}
              onChange={(e) => setSearchTradeRef(e.target.value)}
            />
          </div>
          <div className="stcc-search-field">
            <label>Trade Date</label>
            <input
              type="date"
              value={searchTradeDate}
              onChange={(e) => setSearchTradeDate(e.target.value)}
            />
          </div>
          <div className="stcc-search-field">
            <label>Value Date</label>
            <input
              type="date"
              value={searchValueDate}
              onChange={(e) => setSearchValueDate(e.target.value)}
            />
          </div>
          <div className="stcc-search-field">
            <label>Counterparty</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchCounterparty}
              onChange={(e) => setSearchCounterparty(e.target.value)}
            />
          </div>
          <div className="stcc-search-field">
            <label>Currency</label>
            <select value={searchCurrency} onChange={(e) => setSearchCurrency(e.target.value)}>
              <option value="">All</option>
              {uniqueCurrencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="stcc-search-field">
            <label>Direction</label>
            <select value={searchDirection} onChange={(e) => setSearchDirection(e.target.value)}>
              <option value="">All</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
          <div className="stcc-search-field">
            <label>Product</label>
            <select value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)}>
              <option value="">All</option>
              {uniqueProducts.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button className="stcc-clear-filters" onClick={clearFilters}>
            ✕ Clear Filters
          </button>
        </div>

        {/* ── ACTION BAR ── */}
        <div className="stcc-action-bar">
          <div className="stcc-action-buttons">
            <button
              className="stcc-action-btn settle"
              disabled={!selectedTrade || !selectedTrade.isOwned || selectedTrade.electronicStatus !== "MATCHED" || isSettling}
              onClick={handleSettle}
            >
              {isSettling ? "Settling..." : "⬆ Settle"}
            </button>
            <button
              className="stcc-action-btn"
              disabled={!selectedTrade || !selectedTrade.isOwned || selectedTrade.electronicStatus !== "UNMATCHED"}
              onClick={handleOpenComparison}
            >
              ✎ Edit / Compare
            </button>
            <button className="stcc-action-btn cancel" disabled={!selectedTrade || !selectedTrade.isOwned}>
              ✕ Cancel
            </button>
            <button
              className="stcc-action-btn"
              onClick={fetchTrades}
            >
              ⟳ Refresh
            </button>
          </div>
          <div className="stcc-results-info">
            {filteredTrades.length} Results as of {asOf ? formatDateTime(asOf) : "—"}
          </div>
        </div>

        {/* ── TRADE TABLE ── */}
        <div className="stcc-table-container">
          {isLoading ? (
            <div className="stcc-loading">
              <div className="stcc-loading-spinner"></div>
              Loading electronic settlement trades...
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="stcc-empty">
              <div className="stcc-empty-icon">📋</div>
              <div>No electronic settlement trades found</div>
              <div style={{ fontSize: 12, marginTop: 4, color: "#b0b0b0" }}>
                {statusFilter ? `No trades with status "${statusFilter}"` : "Generate a queue from the Settlement desk workstation"}
              </div>
            </div>
          ) : (
            <table className="stcc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>☐</th>
                  <th>Trade Ref</th>
                  <th>Status</th>
                  <th>Settlement Status</th>
                  <th>Assigned To</th>
                  <th>Settlement Mode</th>
                  <th>Buy/Sell</th>
                  <th>Counterparty</th>
                  <th>Product</th>
                  <th>Product Type</th>
                  <th>Trade Date</th>
                  <th>Settlement Date</th>
                  <th>Currency</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Entity</th>
                  <th>FO Region</th>
                  <th>Underlyer</th>
                  <th>SSI ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t) => (
                  <tr
                    key={t.tradeRef}
                    className={`${selectedTrade?.tradeRef === t.tradeRef ? "selected" : ""} ${!t.isOwned ? "not-owned" : ""}`}
                    onClick={() => handleToggleSelect(t)}
                    style={!t.isOwned ? { opacity: 0.65 } : {}}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedTrade?.tradeRef === t.tradeRef}
                        onChange={() => handleToggleSelect(t)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: t.isOwned ? "#1e40af" : "#94a3b8" }}>{t.tradeRef}</td>
                    <td>
                      <span className={`stcc-status-badge ${(t.electronicStatus || "").toLowerCase()}`}>
                        {t.electronicStatus}
                      </span>
                    </td>
                    <td style={{ fontSize: 10, color: "#64748b" }}>{t.currentStatus}</td>
                    <td style={{ fontSize: 10 }}>
                      {t.isOwned
                        ? <span style={{ color: "#166534", fontWeight: 600 }}>You</span>
                        : <span style={{ color: "#94a3b8" }}>{t.assignedTo ? t.assignedTo.split("@")[0] : "Unassigned"}</span>
                      }
                    </td>
                    <td>{t.settlementType}</td>
                    <td>{t.direction}</td>
                    <td>{t.counterparty}</td>
                    <td>{t.product}</td>
                    <td>{t.productType || ""}</td>
                    <td>{formatDate(t.tradeDate)}</td>
                    <td>{formatDate(t.valueDate)}</td>
                    <td>{t.currency}</td>
                    <td className="num">{formatAmount(t.amount)}</td>
                    <td>{t.entity}</td>
                    <td>{t.foRegion}</td>
                    <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }} title={t.underlyer || ""}>
                      {t.underlyer || ""}
                    </td>
                    <td style={{ fontSize: 10 }}>{t.ssiId || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── COMPARISON POPUP ── */}
      {showComparison && comparisonData && (
        <>
          <div className="stcc-overlay" onClick={() => setShowComparison(false)}></div>
          <div className="stcc-popup">
            <div className="stcc-popup-header">
              <h3>Trade Comparison — {comparisonData.tradeRef}</h3>
              <button className="stcc-popup-close" onClick={() => setShowComparison(false)}>✕ Close</button>
            </div>

            <div className="stcc-comparison-body">
              {/* LEFT: User Side (Editable) */}
              <div className="stcc-comparison-side user-side">
                <div className="stcc-side-title user">📝 Your Side (Editable)</div>
                {COMPARISON_FIELDS.map((f) => {
                  const mismatch = comparisonData.mismatches?.find((m) => m.field === f.key);
                  const currentVal = editedFields[f.key] || "";

                  return (
                    <div key={f.key} className="stcc-field-row">
                      <span className="stcc-field-label">{f.label}</span>
                      <input
                        className={`stcc-field-input ${mismatch ? "mismatch" : ""}`}
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        value={f.type === "date" && currentVal
                          ? (currentVal.includes("T") ? currentVal.split("T")[0] : currentVal)
                          : currentVal
                        }
                        onChange={(e) =>
                          setEditedFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              {/* RIGHT: Counterparty Side (Read-only truth) */}
              <div className="stcc-comparison-side cpty-side">
                <div className="stcc-side-title cpty">✓ Counterparty Side (Truth)</div>
                {COMPARISON_FIELDS.map((f) => {
                  const truthVal = comparisonData.counterpartySide?.[f.key];
                  const mismatch = comparisonData.mismatches?.find((m) => m.field === f.key);
                  const displayVal = f.type === "date" && truthVal
                    ? formatDate(truthVal)
                    : truthVal !== undefined && truthVal !== null
                    ? String(truthVal)
                    : "—";

                  return (
                    <div key={f.key} className="stcc-field-row">
                      <span className="stcc-field-label">{f.label}</span>
                      <span className={`stcc-field-value ${mismatch ? "mismatch" : "match"}`}>
                        {displayVal}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="stcc-popup-footer">
              <div className="stcc-mismatch-count">
                {comparisonData.mismatchCount || 0} mismatched field(s) detected
              </div>
              <div className="stcc-popup-actions">
                <button className="stcc-cancel-btn" onClick={() => setShowComparison(false)}>
                  Cancel
                </button>
                <button className="stcc-save-btn" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save & Exit"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ElectronicSettlementPage() {
  return (
    <Suspense fallback={<div className="stcc-loading"><div className="stcc-loading-spinner"></div>Loading...</div>}>
      <ElectronicSettlementComponent />
    </Suspense>
  );
}
