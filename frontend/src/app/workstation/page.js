"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { io } from "socket.io-client";

function WorkstationComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState(null);

  const [queue, setQueue] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [simTime, setSimTime] = useState("");
  const [sessionTimerStr, setSessionTimerStr] = useState("");

  const [popupState, setPopupState] = useState({ type: null, action: null });
  const [comment, setComment] = useState("");
  const [emailText, setEmailText] = useState("");
  const [auditData, setAuditData] = useState({ xml: null, trail: [] });

  const alert1hrShown = useRef(false);
  const alert10minShown = useRef(false);
  const socketRef = useRef(null);

  const getToken = () => sessionStorage.getItem("auth_token") || Cookies.get("auth_token");
  const authHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  });

  useEffect(() => {
    const uid = searchParams.get("userId");
    const dsk = searchParams.get("desk");
    
    if (!dsk) {
      alert("Select desk first");
      router.push(`/dashboard${uid ? `?userId=${encodeURIComponent(uid)}` : ""}`);
      return;
    }
    if (!uid || !getToken()) {
      alert("Session expired. Login again.");
      router.push("/");
      return;
    }

    setUserId(uid);
    setDesk(dsk);

    // Initial load
    fetch(`/api/queue/my?desk=${encodeURIComponent(dsk)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setQueue(data.trades || []);
          if (data.sessionExpiry) setSessionExpiry(data.sessionExpiry);

          if (sessionStorage.getItem("justLoggedIn") === "true") {
            sessionStorage.removeItem("justLoggedIn");
            const diff = new Date(data.sessionExpiry) - new Date();
            if (diff > 0) {
              const hrs = Math.floor(diff / (1000 * 60 * 60));
              const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              alert(`Resuming previous session — ${hrs}h ${mins}m remaining`);
            }
          }
        }
      }).catch(console.error);

    // Socket Setup
    const socket = io({ auth: { token: getToken() } });
    socketRef.current = socket;
    socket.emit("join_desk", dsk);

    socket.on("clock_tick", (data) => {
      setSimTime(data.simTime);
      handleAlerts(data.timeLeftMinutes);
    });

    socket.on("trade_update", () => {
      refreshQueueSilent(dsk);
    });

    socket.on("new_email", () => {
      // Background update or toast
    });

    return () => socket.disconnect();
  }, [searchParams]);

  useEffect(() => {
    if (!sessionExpiry) return;
    const interval = setInterval(() => {
      const diff = new Date(sessionExpiry) - new Date();
      if (diff <= 0) {
        alert("⏰ Session expired (3 hours). Logging off.");
        logout();
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setSessionTimerStr(`Session: ${hrs}h ${mins}m ${secs}s remaining`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiry]);

  const handleAlerts = (mins) => {
    if (mins <= 60 && !alert1hrShown.current) {
      alert("⚠️ 1 hour remaining in simulation day");
      alert1hrShown.current = true;
    }
    if (mins <= 10 && !alert10minShown.current) {
      alert("⏳ 10 minutes remaining — wrap up trades");
      alert10minShown.current = true;
    }
    if (mins <= 0) {
      alert("📛 Market Closed — Logging off");
      logout();
    }
  };

  const refreshQueueSilent = async (dsk) => {
    try {
      const res = await fetch(`/api/queue/my?desk=${encodeURIComponent(dsk || desk)}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setQueue(data.trades || []);
        if (data.sessionExpiry) setSessionExpiry(data.sessionExpiry);
      }
    } catch (e) {}
  };

  const logout = async () => {
    await fetch("/api/session/logout", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
    Cookies.remove("auth_token");
    sessionStorage.removeItem("auth_token");
    router.push("/");
  };

  const generateQueue = async () => {
    const res = await fetch("/api/queue/generate", {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ desk })
    });
    const data = await res.json();
    if (!data.success) return alert(data.error || "Complete Your Current Trades First");
    setQueue(data.trades || []);
    if (data.sessionExpiry) setSessionExpiry(data.sessionExpiry);
  };

  const refreshQueue = async () => {
    const res = await fetch("/api/queue/my?desk=" + encodeURIComponent(desk), { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return alert(data.error || "Unable to refresh queue");
    setQueue(data.trades || []);
    if (data.sessionExpiry) setSessionExpiry(data.sessionExpiry);
    alert("Queue refreshed");
  };

  const format = (d) => d ? new Date(d).toLocaleDateString() : "";

  // Action Logic
  const allowed = {
    MO_VALIDATE_PASS: ["MO_PENDING", "PENDING_FO_RESPONSE"],
    MO_RAISE_BREAK: ["MO_PENDING"],
    MO_SEND_TO_FO: ["MO_BREAK_OPEN"],
    CONFIRM_TRADE: ["CONFIRMATION_PENDING", "LIASING_WITH_CPTY"],
    CONFIRM_RAISE_BREAK: ["LIASING_WITH_CPTY"],
    CONFIRM_SEND_TO_CPTY: ["CONFIRMATION_PENDING", "CONFIRMATION_BREAK", "LIASING_WITH_FO", "LIASING_WITH_CPTY"],
    CONFIRM_REJECT_CLAIM: ["CONFIRMATION_BREAK"],
    CONFIRM_REQUEST_EVIDENCE: ["CONFIRMATION_BREAK"],
    CONFIRM_ESCALATE_TO_FO: ["CONFIRMATION_BREAK"],
    CONFIRM_RAISE_AMENDMENT: ["CONFIRMATION_BREAK"],
    CONFIRM_APPROVE_AMENDMENT: ["CONFIRMATION_BREAK"],
    CONFIRM_RESEND: ["CONFIRMATION_PENDING"],
    SETTLEMENT_APPROVE: ["SETTLEMENT_PENDING"],
    SETTLEMENT_RAISE_BREAK: ["READY_FOR_APPROVAL"],
    SETTLEMENT_FOLLOW_UP_CPTY: ["SETTLEMENT_BREAK"]
  };

  const handleOpenAction = (action) => {
    if (!selectedTrade) return alert("Select trade first");
    if (!allowed[action] || !allowed[action].includes(selectedTrade.currentStatus)) {
      return alert("Invalid action for current state");
    }
    if (action === 'CONFIRM_RAISE_BREAK') {
      const cptyCount = selectedTrade.cptyContactCount || 0;
      const foCount = selectedTrade.foContactCount || 0;
      if (cptyCount !== 1 || foCount > 0) {
        return alert("You can only raise a Confirmation Break once, immediately after the first time you mail the Counterparty.");
      }
    }
    setPopupState({ type: "action", action });
    setComment("");
  };

  const submitAction = async () => {
    if (!comment || comment.trim() === "") console.warn("No comment provided - will be penalized in scoring");
    const res = await fetch("/api/trade/action", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ trade: selectedTrade, action: popupState.action, comment })
    });
    const data = await res.json();
    if (!data.success) return alert(data.error || "Action failed");
    setQueue(data.trades || []);
    setPopupState({ type: null });
  };

  const downloadCSV = () => {
    if (!queue || queue.length === 0) return alert("No data to export");
    const headers = [
      "Trade Ref", "Status", "Next Desk", "Age", "Trade Date", "Value Date", "Counterparty", "Entity", "FO Region",
      "Product", "Trade Type", "Settlement Type", "Direction", "Currency", "Amount"
    ];
    let csv = headers.join(",") + "\n";
    queue.forEach(t => {
      csv += [t.tradeRef, t.currentStatus, t.nextDesk, t.age, format(t.tradeDate), format(t.valueDate), t.counterparty, t.entity, t.foRegion, t.product, t.tradeType, t.settlementType, t.direction, t.currency, t.amount].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trade_queue.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openAudit = async () => {
    if (!selectedTrade) return alert("Select trade first");
    const res = await fetch("/api/audit/" + selectedTrade.tradeRef, { headers: authHeaders() });
    const data = await res.json();
    
    const trail = data.trail || data;
    const auditArray = Array.isArray(trail) ? trail : [];
    const hasManualEntries = auditArray.some(a => a.action !== "SYSTEM_GENERATED");

    if (!hasManualEntries && data.xmlAudit) {
      setAuditData({ xml: data.xmlAudit, trail: [] });
    } else {
      setAuditData({ xml: null, trail: auditArray.filter(a => a.action !== "SYSTEM_GENERATED") });
    }
    setPopupState({ type: "audit" });
  };

  const openMailboxGeneral = (forceChannel) => {
    const mailParams = new URLSearchParams({ userId, desk });
    if (selectedTrade) mailParams.set("tradeRef", selectedTrade.tradeRef);
    if (forceChannel) mailParams.set("channel", forceChannel);
    window.open("/communication.html?" + mailParams.toString(), "_blank");
  };

  const sendToFO = () => {
    if (!selectedTrade) return alert("Select trade first");
    if (!allowed['MO_SEND_TO_FO'] || !allowed['MO_SEND_TO_FO'].includes(selectedTrade.currentStatus)) return alert("Invalid action for current state");
    const mailParams = new URLSearchParams({
      userId, desk, tradeRef: selectedTrade.tradeRef, composeFor: selectedTrade.tradeRef, composeTo: "FO", composeAction: "MO_SEND_TO_FO"
    });
    window.open("/communication.html?" + mailParams.toString(), "_blank");
  };

  const startCptyFlow = () => {
    if (!selectedTrade) return alert("Select trade first");
    const mailParams = new URLSearchParams({
      userId, 
      desk, 
      tradeRef: selectedTrade.tradeRef, 
      composeFor: selectedTrade.tradeRef, 
      composeTo: "COUNTERPARTY",
      composeAction: "CONFIRM_SEND_TO_CPTY"
    });
    window.open("/communication.html?" + mailParams.toString(), "_blank");
  };

  const sendEmail = async () => {
    if (!selectedTrade) return alert("Select trade first");
    if (!emailText || emailText.trim() === "") return alert("Email content required");
    
    if (popupState.action === "CONFIRM_SEND_TO_CPTY") {
      const res = await fetch("/api/trade/action", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ trade: selectedTrade, action: popupState.action, comment: emailText })
      });
      const data = await res.json();
      if (!data.success) return alert(data.error || "Email send failed");
      alert("Email sent successfully");
      setPopupState({ type: null });
      refreshQueueSilent();
      return;
    }
    
    // Generic
    const res = await fetch("/api/conversation/send", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ tradeRef: selectedTrade.tradeRef, sender: userId, message: emailText, desk })
    });
    const data = await res.json();
    if (!data.success) return alert(data.error || "Email send failed");
    alert("Email sent successfully");
    setPopupState({ type: null });
    refreshQueueSilent();
  };

  const viewTruth = () => {
    if (!selectedTrade) return alert("Select trade first");
    const truthContent = selectedTrade.truths ? JSON.stringify(selectedTrade.truths, null, 2) : 
                        selectedTrade.truth ? JSON.stringify(selectedTrade.truth, null, 2) : "No truths object found for this trade.";
    setAuditData({ xml: truthContent, trail: [] });
    setPopupState({ type: "truth" });
  };

  const openTermsheet = () => {
    window.open(`/mo-risk.html?userId=${encodeURIComponent(userId)}&desk=${encodeURIComponent(desk)}`, "_blank");
  };

  if (!userId) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:`
        body { font-family: 'Inter', sans-serif; background: #f0f4f8; margin: 0; color: #1e293b; }
        .topbar { padding: 16px 30px; background: linear-gradient(135deg, #0B1F3A 0%, #1E3A5F 100%); color: white; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .clock { font-size: 14px; font-weight: 500; margin: 0 15px; }
        .session-timer { font-size: 13px; padding: 4px 10px; border-radius: 4px; background: rgba(255,255,255,0.15); margin: 0 10px; }
        .container { width: 96%; max-width: 1600px; margin: 24px auto; }
        .table-container { height: 550px; overflow: auto; background: white; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1; }
        table { border-collapse: collapse; width: 100%; min-width: 1500px; font-size: 12px; }
        th { position: sticky; top: 0; background: #1e293b; color: #f8fafc; padding: 6px 10px; font-weight: 600; text-align: left; border-bottom: 2px solid #0f172a; border-right: 1px solid #334155; z-index: 10; white-space: nowrap; }
        td { padding: 4px 10px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; color: #334155; white-space: nowrap; }
        tbody tr:nth-child(even) td { background-color: #f8fafc; }
        tbody tr:hover td { background-color: #e0e7ff; cursor: pointer; }
        .num { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }
        .action-bar { background: white; padding: 16px; margin-top: 20px; display: flex; justify-content: space-between; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 10px; border: 1px solid #e2e8f0; }
        .btn { padding: 10px 18px; margin: 4px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; border-radius: 6px; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .btn:active { transform: translateY(0); }
        .primary { background: #0B1F3A; color: white; }
        .primary:hover { background: #1E3A5F; }
        .secondary { background: #e2e8f0; color: #1e293b; }
        .secondary:hover { background: #cbd5e1; }
        .warning { background: #f59e0b; color: white; }
        .warning:hover { background: #d97706; }
        .popup { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); padding: 24px; border-radius: 16px; width: 450px; z-index: 999; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); }
        .popup h3 { margin-top: 0; color: #0f172a; font-size: 18px; }
        .popup textarea, .popup input { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 14px; margin-top: 10px; resize: vertical; }
        .popup textarea:focus, .popup input:focus { outline: none; border-color: #3b82f6; }
        .popup textarea { height: 100px; }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 998; }
        #auditContent { max-height: 300px; overflow-y: auto; margin: 15px 0; padding-right: 10px; }
        .audit-card { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin-bottom: 10px; border-radius: 4px 8px 8px 4px; font-size: 13px; }
        .audit-card.system { border-left-color: #8b5cf6; background: #f5f3ff; }
        .audit-header { display: flex; justify-content: space-between; color: #64748b; margin-bottom: 4px; font-size: 11px; }
        .audit-action { font-weight: 600; color: #0f172a; margin-bottom: 2px; }
        .audit-details { color: #475569; }
        .xml-section { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; margin-top: 10px; }
      `}}/>

      {popupState.type && <div className="overlay" onClick={() => setPopupState({type: null})}></div>}

      <div className="topbar" style={{ background: desk === "SETTLEMENT" ? "#3A1F1F" : desk === "CONFIRMATION" ? "#1E3A5F" : "#0B1F3A" }}>
        <div className="desk-title">{desk} Desk | Welcome, {userId}</div>
        <div>
          {desk === "MO" && <button className="btn" onClick={openTermsheet} style={{background:"#f59e0b", color:"white", marginRight: "10px"}}>📄 View Termsheet</button>}
          <button className="btn primary" onClick={() => openMailboxGeneral()}>📧 Mailbox</button>
          <span className="session-timer">{sessionTimerStr}</span>
          <button className="btn warning" onClick={refreshQueue}>Refresh</button>
          <span className="clock">{simTime}</span>
          <button className="btn secondary" onClick={logout}>Logoff</button>
        </div>
      </div>

      <div className="container">
        <button className="btn warning" onClick={generateQueue}>Generate Queue</button>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Select</th><th>Trade Ref</th><th>Status</th><th>Next Desk</th><th className="num">Age</th>
                <th>Trade Date</th><th>Value Date</th><th>Counterparty</th><th>Entity</th><th>FO Region</th>
                <th>Product</th><th>Trade Type</th><th>Settlement Type</th><th>Direction</th><th>Currency</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(t => (
                <tr key={t.tradeRef}>
                  <td><input type="checkbox" checked={selectedTrade?.tradeRef === t.tradeRef} onChange={() => setSelectedTrade(selectedTrade?.tradeRef === t.tradeRef ? null : t)} /></td>
                  <td>{t.tradeRef}</td>
                  <td>{t.currentStatus}</td>
                  <td>{t.nextDesk}</td>
                  <td className="num">{t.age}</td>
                  <td>{format(t.tradeDate)}</td>
                  <td>{format(t.valueDate)}</td>
                  <td>{t.counterparty}</td>
                  <td>{t.entity}</td>
                  <td>{t.foRegion}</td>
                  <td>{t.product}</td>
                  <td>{t.tradeType}</td>
                  <td>{t.settlementType}</td>
                  <td>{t.direction}</td>
                  <td>{t.currency}</td>
                  <td className="num">{t.amount ? t.amount.toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="action-bar">
          <div>
            {desk === "MO" && (
              <>
                <button className="btn primary" onClick={() => handleOpenAction('MO_VALIDATE_PASS')}>MO Validate</button>
                <button className="btn primary" onClick={() => handleOpenAction('MO_RAISE_BREAK')}>MO Raise Break</button>
                <button className="btn primary" onClick={sendToFO}>Send to FO</button>
              </>
            )}
            {desk === "CONFIRMATION" && (
              <>
                <button className="btn primary" onClick={() => handleOpenAction('CONFIRM_TRADE')}>Confirm Trade</button>
                <button className="btn primary" onClick={() => handleOpenAction('CONFIRM_RAISE_BREAK')}>Confirmation Break</button>
                <button className="btn primary" onClick={startCptyFlow}>Send to CPTY</button>
                <button className="btn primary" onClick={() => {
                  if(!selectedTrade) return alert("Select a trade first");
                  const mailParams = new URLSearchParams({userId, desk, tradeRef: selectedTrade.tradeRef, channel: "FO", composeFor: selectedTrade.tradeRef, composeTo: "FO"});
                  window.open("/communication.html?" + mailParams.toString(), "_blank");
                }}>Escalate to FO</button>
              </>
            )}
            {desk === "SETTLEMENT" && (
              <>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_APPROVE')}>Approve Settlement</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_RAISE_BREAK')}>Setts Break</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_FOLLOW_UP_CPTY')}>Follow-up</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_SEND_BACK_TO_MO')}>Send to MO</button>
              </>
            )}
          </div>
          <div>
            <button className="btn secondary" onClick={downloadCSV}>Download Excel</button>
            <button className="btn secondary" onClick={openAudit}>Audit</button>
            <button className="btn secondary" onClick={() => openMailboxGeneral()}>📧 Mailbox</button>
            <button className="btn secondary" style={{backgroundColor:"#8b5cf6", color:"white", border:"none"}} onClick={viewTruth}>👁️ View Truth</button>
          </div>
        </div>
      </div>

      {popupState.type === "action" && (
        <div className="popup" style={{display: 'block'}}>
          <h3>{popupState.action}</h3>
          <div>Proceed?</div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment (recommended for audit & scoring)"></textarea>
          <br/><br/>
          <button onClick={submitAction}>Submit</button>
          <button onClick={() => setPopupState({type: null})}>Cancel</button>
        </div>
      )}

      {popupState.type === "email" && (
        <div className="popup" style={{display: 'block'}}>
          <h3>Send Email</h3>
          <textarea value={emailText} onChange={e => setEmailText(e.target.value)}></textarea>
          <br/><br/>
          <button onClick={sendEmail}>Send</button>
          <button onClick={() => setPopupState({type: null})}>Cancel</button>
        </div>
      )}

      {(popupState.type === "audit" || popupState.type === "truth") && (
        <div className="popup" style={{display: 'block', width: '550px'}}>
          <h3>{popupState.type === "truth" ? "Underlying Truths (Testing Only)" : "Audit Trail"}</h3>
          <div id="auditContent">
            {auditData.xml ? (
              <pre className="xml-section">{auditData.xml}</pre>
            ) : auditData.trail.length > 0 ? (
              auditData.trail.map((a, i) => (
                <div key={i} className={`audit-card ${a.isAutomated ? "system" : ""}`}>
                  <div className="audit-header">
                    <strong>{a.userId || 'System'}</strong> 
                    <span>{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="audit-action">{a.action}</div>
                  <div className="audit-details">{a.details || ""}</div>
                </div>
              ))
            ) : (
              <p style={{color:'#94a3b8'}}>No audit entries yet.</p>
            )}
          </div>
          <button onClick={() => setPopupState({type: null})}>Close</button>
        </div>
      )}
    </>
  );
}

export default function WorkstationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkstationComponent />
    </Suspense>
  );
}
