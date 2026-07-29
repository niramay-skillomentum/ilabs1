"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadUserId, getToken, authHeaders } from "../../lib/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "";
const formatAmount = (n) => n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

const RECON_STYLE = `
  body { font-family: Tahoma, "Segoe UI", sans-serif; background: #ECE9D8; margin: 0; color: #000; overflow: hidden; }

  /* Toolbar */
  .xp-toolbar {
    background: #ECE9D8;
    border-bottom: 1px solid #ACA899;
    padding: 4px;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .xp-btn {
    background: transparent;
    border: 1px solid transparent;
    padding: 4px 8px;
    font-size: 11px;
    font-family: Tahoma, sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #000;
  }
  .xp-btn:hover { border: 1px solid #316AC5; background: #C1D2EE; }
  .xp-btn:active { background: #98B5E2; }
  .xp-btn:disabled { color: #ACA899; cursor: default; border: 1px solid transparent; background: transparent; }
  .xp-separator { width: 1px; height: 18px; background: #ACA899; margin: 0 4px; }

  .filter-bar {
    background: #F5F4F0;
    border-bottom: 1px solid #ACA899;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    flex-wrap: wrap;
  }
  .filter-bar input, .filter-bar select { font-size: 11px; font-family: Tahoma; padding: 1px 2px; border: 1px solid #7F9DB9; }

  /* Table */
  .grid-container {
    height: calc(100vh - 85px);
    overflow: auto;
    background: #fff;
    position: relative;
  }
  table { border-collapse: collapse; width: 100%; font-size: 11px; table-layout: fixed; min-width: 2500px; }
  th {
    position: sticky;
    top: 0;
    background: #ECE9D8;
    color: #000;
    padding: 1px 4px;
    font-weight: normal;
    text-align: left;
    border-right: 1px solid #ACA899;
    border-bottom: 1px solid #ACA899;
    border-top: 1px solid #fff;
    border-left: 1px solid #fff;
    z-index: 10;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 20px;
    box-sizing: border-box;
  }
  td {
    padding: 1px 4px;
    border-right: 1px solid #d4d0c8;
    border-bottom: 1px solid #d4d0c8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 18px;
    box-sizing: border-box;
    cursor: default;
  }
  
  tr.selected td { background-color: #ffe8cc !important; }
  .faded { opacity: 0.3; }

  .loading-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255,255,255,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 999;
    font-size: 12px;
  }
`;

function getRowColor(item) {
  const type = String(item.itemType || "").toUpperCase();
  if (type.includes("LEDGER") && type.includes("DEBIT")) return "#0058d6";
  if (type.includes("LEDGER") && type.includes("CREDIT")) return "#222222";
  if (type.includes("STATEMENT") && type.includes("DEBIT")) return "#d32f2f";
  if (type.includes("STATEMENT") && type.includes("CREDIT")) return "#6a1b9a";
  if (type === "LD") return "#0058d6";
  if (type === "LC") return "#222222";
  if (type === "SD") return "#d32f2f";
  if (type === "SC") return "#6a1b9a";
  return "#000000";
}

export default function ReconciliationDeskPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState("Preparing Reconciliation Desk...");
  const [isMatching, setIsMatching] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
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

  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  
  const [relationshipMatchId, setRelationshipMatchId] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [tradeIdInput, setTradeIdInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const uid = loadUserId();
    if (!uid || !getToken()) {
      toast.error("Session expired.");
      router.push("/");
    } else {
      setUserId(uid);
    }
  }, [router]);

  const loadAllocation = useCallback(async () => {
    if (!getToken()) return;
    setIsLoading(true);
    setLoadingLabel("Loading...");
    try {
      const res = await fetch(`${API}/api/reconciliation/items?limit=10000&t=${Date.now()}`, {
        method: "GET", headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) setItems(data.items || []);
    } catch (err) {
      toast.error("Failed to load desk.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (userId) loadAllocation(); }, [userId, loadAllocation]);

  useEffect(() => {
    if (!userId) return;
    const token = getToken();
    if (!token) return;
    const socketUrl = API || (window.location.hostname === "localhost" ? "http://localhost:3002" : undefined);
    const socket = io(socketUrl, { auth: { token } });
    socket.on("recon_desk_update", () => {
      fetch(`${API}/api/reconciliation/items?limit=10000&t=${Date.now()}`, {
        method: "GET", headers: authHeaders()
      }).then(res => res.json()).then(data => {
        if (data.success) setItems(data.items || []);
      });
    });
    return () => socket.disconnect();
  }, [userId]);

  let filteredItems = items.filter(i => {
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

  // Sort logically so matches stack exactly together
  filteredItems.sort((a, b) => {
    if (a.matchId && b.matchId && a.matchId === b.matchId) {
      return (a.source || "").localeCompare(b.source || "");
    }
    if (a.matchId && b.matchId) return a.matchId.localeCompare(b.matchId);
    if (a.matchId) return -1;
    if (b.matchId) return 1;
    return 0;
  });

  const toggleSelect = (item, index, e) => {
    if (relationshipMatchId) setRelationshipMatchId(null);
    setSelectedItemIds(prev => {
      if (e && e.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const newSelection = [...prev];
        for (let i = start; i <= end; i++) {
          const id = filteredItems[i].itemId;
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      }
      // Automatically toggle on every click for easy multi-selection
      return prev.includes(item.itemId) ? prev.filter(id => id !== item.itemId) : [...prev, item.itemId];
    });
    setLastSelectedIndex(index);
  };


  const selectedLedgers = filteredItems.filter(i => selectedItemIds.includes(i.itemId) && i.source === "LEDGER");
  const selectedStatements = filteredItems.filter(i => selectedItemIds.includes(i.itemId) && i.source === "STATEMENT");
  const selectedMatchedItems = filteredItems.filter(i => selectedItemIds.includes(i.itemId) && i.status === "Matched");
  
  const canMatch = selectedItemIds.length === 2 && selectedLedgers.length === 1 && selectedStatements.length === 1 && selectedMatchedItems.length === 0 && !isMatching;
  
  const handleMatch = async () => {
    if (!canMatch) return;
    setIsMatching(true);
    try {
      const res = await fetch(`${API}/api/reconciliation/manual-match`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerItemId: selectedLedgers[0].itemId, statementItemId: selectedStatements[0].itemId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Match successful");
        setItems(prev => prev.map(it => {
          if (it.itemId === data.ledgerItemId || it.itemId === data.statementItemId) {
            return { ...it, status: "Matched", matchId: data.matchId };
          }
          return it;
        }));
        setSelectedItemIds([]);
        setLastSelectedIndex(null);
      } else {
        toast.error(data.message || "Items cannot be matched.");
      }
    } catch (err) {
      toast.error("Items cannot be matched.");
    } finally {
      setIsMatching(false);
    }
  };

  const uniqueMatchIds = [...new Set(selectedMatchedItems.map(i => i.matchId))];
  const canUnmatch = selectedItemIds.length > 0 && selectedItemIds.length === selectedMatchedItems.length && uniqueMatchIds.length === 1;
  const matchIdToUnmatch = canUnmatch ? uniqueMatchIds[0] : null;

  const canApplyTradeId = selectedItemIds.length === 1 && selectedStatements.length === 1 && !isApplying;

  const handleApplyTradeId = async () => {
    if (!canApplyTradeId || !tradeIdInput.trim()) return;
    setIsApplying(true);
    try {
      const res = await fetch(`${API}/api/reconciliation/apply-trade-id`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ statementItemId: selectedStatements[0].itemId, tradeRef: tradeIdInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Trade ID applied successfully.");
        setItems(prev => prev.map(it => it.itemId === selectedStatements[0].itemId ? { ...it, ...data.item } : it));
        setTradeIdInput("");
        setShowApplyModal(false);
      } else {
        toast.error(data.message || "Failed to apply Trade ID.");
      }
    } catch (err) {
      toast.error("Failed to apply Trade ID.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleUnmatch = async () => {
    if (!canUnmatch || !matchIdToUnmatch) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/reconciliation/unmatch`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: matchIdToUnmatch })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Match reversed successfully.");
        setItems(prev => prev.map(it => it.matchId === matchIdToUnmatch ? { ...it, status: "Outstanding", matchId: null } : it));
        setSelectedItemIds([]);
        setLastSelectedIndex(null);
      } else {
        toast.error(data.message || "Failed to reverse match.");
      }
    } catch (err) {
      toast.error("Failed to reverse match.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMatch = () => {
    if (selectedItemIds.length > 0) {
      const firstItem = filteredItems.find(i => i.itemId === selectedItemIds[0]);
      if (firstItem && firstItem.matchId) {
        setRelationshipMatchId(firstItem.matchId);
      } else {
        toast.error("Selected item has no Match ID.");
      }
    }
  };

  const uniqueDesks = [...new Set(items.map(i => i.reconDesk).filter(Boolean))].sort();

  if (!userId) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RECON_STYLE }} />
      {(isLoading || isMatching) && <div className="loading-overlay">{isMatching ? "Matching..." : loadingLabel}</div>}

      <div className="xp-toolbar">
        <button className="xp-btn" onClick={() => router.push("/dashboard")}>← Dashboard</button>
        <button className="xp-btn" onClick={() => window.open("/gcms", "_blank")}>GCMS</button>
        <div className="xp-separator" />
        <button className="xp-btn" onClick={loadAllocation}>⟳ Refresh</button>
        <button className="xp-btn" onClick={handleMatch} disabled={!canMatch}>🔗 Match</button>
        <button className="xp-btn" onClick={handleUnmatch} disabled={!canUnmatch}>🔓 Unmatch</button>
        <button className="xp-btn" onClick={handleViewMatch} disabled={selectedItemIds.length === 0}>🔍 View Match</button>
        <button className="xp-btn" onClick={() => setShowApplyModal(true)} disabled={!canApplyTradeId}>✏️ Apply Trade ID</button>
        <button className="xp-btn" onClick={() => toast("Export feature not implemented yet.")}>Export</button>
      </div>

      <div className="filter-bar">
        <span>Status:</span>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="Outstanding">Outstanding</option>
          <option value="Matched">Matched</option>
        </select>

        <span>Source:</span>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All</option>
          <option value="LEDGER">Ledger</option>
          <option value="STATEMENT">Statement</option>
        </select>

        <span>Desk:</span>
        <select value={deskFilter} onChange={e => setDeskFilter(e.target.value)}>
          <option value="">All Desks</option>
          {uniqueDesks.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        
        <span>Currency:</span>
        <input style={{width: 60}} value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)} />
        
        <span>Trade ID:</span>
        <input style={{width: 100}} value={tradeRefFilter} onChange={e => setTradeRefFilter(e.target.value)} />

        <span>Trade Date:</span>
        <input type="date" style={{width: 95}} value={tradeDateFrom} onChange={e => setTradeDateFrom(e.target.value)} />
        <span>-</span>
        <input type="date" style={{width: 95}} value={tradeDateTo} onChange={e => setTradeDateTo(e.target.value)} />

        <span>Value Date:</span>
        <input type="date" style={{width: 95}} value={valueDateFrom} onChange={e => setValueDateFrom(e.target.value)} />
        <span>-</span>
        <input type="date" style={{width: 95}} value={valueDateTo} onChange={e => setValueDateTo(e.target.value)} />

        <span>Amount:</span>
        <input type="number" style={{width: 70}} placeholder="Min" value={amountFrom} onChange={e => setAmountFrom(e.target.value)} />
        <span>-</span>
        <input type="number" style={{width: 70}} placeholder="Max" value={amountTo} onChange={e => setAmountTo(e.target.value)} />

        <button className="xp-btn" style={{border: "1px solid #7F9DB9", padding: "1px 6px", marginLeft: 4}} onClick={() => {
          setAppliedFilters({ status: statusFilter, source: sourceFilter, desk: deskFilter, currency: currencyFilter, tradeRef: tradeRefFilter, tradeDateFrom, tradeDateTo, valueDateFrom, valueDateTo, amountFrom, amountTo });
        }}>Filter</button>
        <button className="xp-btn" style={{border: "1px solid #7F9DB9", padding: "1px 6px"}} onClick={() => {
          setStatusFilter(""); setSourceFilter(""); setDeskFilter(""); setCurrencyFilter(""); setTradeRefFilter(""); setTradeDateFrom(""); setTradeDateTo(""); setValueDateFrom(""); setValueDateTo(""); setAmountFrom(""); setAmountTo(""); setAppliedFilters({});
        }}>Clear</button>
      </div>

      {showApplyModal && (
        <div style={{ position: 'fixed', top: '30%', left: '40%', width: '300px', background: '#ECE9D8', border: '1px solid #0055EA', boxShadow: '2px 2px 10px rgba(0,0,0,0.5)', zIndex: 1200 }}>
          <div style={{ background: 'linear-gradient(to right, #0058e6, #3a93ff)', color: 'white', padding: '4px 6px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Tahoma', fontSize: '12px' }}>
            <span>Apply Trade ID</span>
            <button onClick={() => setShowApplyModal(false)} style={{ background: '#e04343', color: 'white', border: '1px solid white', fontWeight: 'bold', cursor: 'pointer', padding: '0 6px' }}>X</button>
          </div>
          <div style={{ padding: '16px', background: '#F5F4F0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>Enter Trade ID for {selectedStatements.length === 1 ? selectedStatements[0].itemId : ""}:</label>
            <input type="text" value={tradeIdInput} onChange={e => setTradeIdInput(e.target.value)} style={{ padding: '4px', border: '1px solid #7F9DB9' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button className="xp-btn" style={{ border: '1px solid #7F9DB9' }} onClick={handleApplyTradeId}>{isApplying ? "Applying..." : "Apply"}</button>
            </div>
          </div>
        </div>
      )}

      {relationshipMatchId && (
        <div style={{ position: 'fixed', top: '20%', left: '15%', width: '70%', background: '#ECE9D8', border: '1px solid #0055EA', boxShadow: '2px 2px 10px rgba(0,0,0,0.5)', zIndex: 1100 }}>
          <div style={{ background: 'linear-gradient(to right, #0058e6, #3a93ff)', color: 'white', padding: '4px 6px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Tahoma', fontSize: '12px' }}>
            <span>View Match Details</span>
            <button onClick={() => setRelationshipMatchId(null)} style={{ background: '#e04343', color: 'white', border: '1px solid white', fontWeight: 'bold', cursor: 'pointer', padding: '0 6px' }}>X</button>
          </div>
          <div style={{ padding: '16px', background: '#fff', minHeight: '100px', fontSize: '12px', border: '2px solid #ECE9D8' }}>
            <div style={{ position: 'relative', marginLeft: '10px' }}>
               <div style={{
                 position: 'absolute',
                 left: '0px',
                 top: '12px',
                 bottom: '12px',
                 width: '12px',
                 borderLeft: '2px solid #2e7d32',
                 borderTop: '2px solid #2e7d32',
                 borderBottom: '2px solid #2e7d32'
               }} />
               {filteredItems.filter(i => i.matchId === relationshipMatchId).map(item => (
                 <div key={item.itemId} style={{ padding: '4px 0', marginLeft: '24px', color: getRowColor(item), display: 'flex', gap: '16px', height: '24px', boxSizing: 'border-box' }}>
                   <span style={{ width: '80px', fontWeight: 'bold' }}>{item.source}</span>
                   <span style={{ width: '120px' }}>{item.itemId}</span>
                   <span style={{ width: '120px' }}>{item.itemType}</span>
                   <span style={{ width: '100px', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(item.amount)}</span>
                   <span style={{ width: '40px' }}>{item.currency}</span>
                   <span style={{ width: '120px' }}>Ref: {item.itemRef1 || ""}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid-container">
        <table>
          <thead>
            <tr>
              <th style={{width: 24, textAlign: 'center'}}><input type="checkbox" disabled /></th>
              <th style={{width: 24, textAlign: 'center'}}>M</th>
              <th style={{width: 120}}>Item ID</th>
              <th style={{width: 100}}>Source</th>
              <th style={{width: 120}}>Item Type</th>
              <th style={{width: 100}}>Amount</th>
              <th style={{width: 60}}>Ccy</th>
              <th style={{width: 80}}>Trade Date</th>
              <th style={{width: 80}}>Value Date</th>
              <th style={{width: 150}}>Match ID</th>
              <th style={{width: 120}}>Ref1: Trade</th>
              <th style={{width: 120}}>Ref2: Underlyer</th>
              <th style={{width: 120}}>Ref3: Entity</th>
              <th style={{width: 120}}>Ref4: Country</th>
              <th style={{width: 120}}>Ref5: Product</th>
              <th style={{width: 120}}>Ref6: ProdType</th>
              <th style={{width: 120}}>Ref7: Cpty</th>
              <th style={{width: 120}}>SWIFT1: BuyerBIC</th>
              <th style={{width: 120}}>SWIFT2: SellerAcc</th>
              <th style={{width: 120}}>SWIFT3: BuyerAcc</th>
              <th style={{width: 120}}>SWIFT4: SellerBIC</th>
              <th style={{width: 120}}>SWIFT5: Field20</th>
              <th style={{width: 120}}>SWIFT6: 56A</th>
              <th style={{width: 120}}>SWIFT7: Inst</th>
              <th style={{width: 120}}>SWIFT8: Bank</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, index) => {
              const isMatched = item.status === "Matched";
              const isSelected = selectedItemIds.includes(item.itemId);
              const color = getRowColor(item);
              const isFaded = relationshipMatchId && item.matchId !== relationshipMatchId;

              return (
                <tr
                  key={item._id || item.itemId}
                  className={`${isSelected ? "selected" : ""} ${isFaded ? "faded" : ""}`}
                  onClick={(e) => toggleSelect(item, index, e)}
                  style={{ color }}
                >
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={isSelected} readOnly />
                  </td>
                  <td style={{ textAlign: "center", color: "#2e7d32", fontWeight: "bold" }}>
                    {isMatched ? "✔" : ""}
                  </td>
                  <td>{item.itemId}</td>
                  <td>{item.source}</td>
                  <td>{item.itemType || "—"}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(item.amount)}</td>
                  <td>{item.currency || "—"}</td>
                  <td>{formatDate(item.tradeDate)}</td>
                  <td>{formatDate(item.valueDate)}</td>
                  <td>{item.matchId || "—"}</td>
                  <td>{item.itemRef1 || "—"}</td>
                  <td>{item.itemRef2 || "—"}</td>
                  <td>{item.itemRef3 || "—"}</td>
                  <td>{item.itemRef4 || "—"}</td>
                  <td>{item.itemRef5 || "—"}</td>
                  <td>{item.itemRef6 || "—"}</td>
                  <td>{item.itemRef7 || "—"}</td>
                  <td>{item.ref1 || "—"}</td>
                  <td>{item.ref2 || "—"}</td>
                  <td>{item.ref3 || "—"}</td>
                  <td>{item.ref4 || "—"}</td>
                  <td>{item.ref5 || "—"}</td>
                  <td>{item.ref6 || "—"}</td>
                  <td>{item.ref7 || "—"}</td>
                  <td>{item.ref8 || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
