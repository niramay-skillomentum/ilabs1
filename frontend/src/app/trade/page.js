"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { io } from "socket.io-client";

function TradeComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState(null);
  const [tradeRef, setTradeRef] = useState(null);
  
  const [trade, setTrade] = useState(null);
  const [simTime, setSimTime] = useState("");
  const [auditData, setAuditData] = useState({ xml: null, trail: [] });
  const [messages, setMessages] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [emailBody, setEmailBody] = useState("");

  const socketRef = useRef(null);

  const getToken = () => sessionStorage.getItem("auth_token") || Cookies.get("auth_token");
  const authHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  });

  useEffect(() => {
    const uid = searchParams.get("userId");
    const dsk = searchParams.get("desk");
    const tRef = searchParams.get("tradeRef");

    if (!uid || !getToken()) {
      alert("User session missing. Login again.");
      router.push("/");
      return;
    }

    setUserId(uid);
    setDesk(dsk);
    setTradeRef(tRef);

    if (tRef) {
      loadTrade(tRef);
      loadConversation(tRef);
    }

    // Socket Initialization
    const socket = io({ auth: { token: getToken() } });
    socketRef.current = socket;
    socket.emit("join_desk", dsk);

    socket.on("clock_tick", (data) => {
      setSimTime(data.simTime);
    });

    socket.on("trade_update", (data) => {
      if (data.tradeRef === tRef) {
        loadTrade(tRef); // Reload audit and status
      }
    });

    socket.on("new_email", (data) => {
      if (data.tradeRef === tRef) {
        loadConversation(tRef);
      }
    });

    return () => socket.disconnect();
  }, [searchParams]);

  const loadTrade = async (tRef) => {
    try {
      const res = await fetch("/api/queue/my", { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.trades) {
        const found = data.trades.find(t => t.tradeRef === tRef);
        if (found) {
          setTrade(found);
          loadAudit(found.tradeRef);
        } else {
          alert("Trade not found in your queue");
        }
      }
    } catch (err) {
      console.error("Load trade error:", err);
    }
  };

  const loadAudit = async (tRef) => {
    try {
      const res = await fetch("/api/audit/" + tRef, { headers: authHeaders() });
      const data = await res.json();
      const trail = data.trail || data;
      const auditArray = Array.isArray(trail) ? trail : [];
      const hasManualEntries = auditArray.some(a => a.action !== "SYSTEM_GENERATED");

      if (!hasManualEntries && data.xmlAudit) {
        setAuditData({ xml: data.xmlAudit, trail: [] });
      } else {
        setAuditData({ xml: null, trail: auditArray.filter(a => a.action !== "SYSTEM_GENERATED") });
      }
    } catch (err) {
      console.error("Audit error:", err);
    }
  };

  const loadConversation = async (tRef) => {
    try {
      const res = await fetch("/api/conversation/" + tRef, { headers: authHeaders() });
      const data = await res.json();
      setMessages(data || []);
    } catch (err) {
      console.error("Conversation error:", err);
    }
  };

  const executeAction = async (action) => {
    try {
      const res = await fetch("/api/trade/action", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ trade, action, comment: "Action from trade page" })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Action failed");
        return;
      }
      if (data.trade) {
        setTrade(data.trade);
        loadAudit(data.trade.tradeRef);
      }
    } catch (err) {
      console.error("Action error:", err);
      alert("Something went wrong");
    }
  };

  const sendEmail = async () => {
    if (!emailBody) return;
    try {
      await fetch("/api/conversation/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeRef: trade.tradeRef, sender: desk, subject: "Query", body: emailBody })
      });
      setEmailBody("");
      loadConversation(trade.tradeRef);
    } catch (err) {
      console.error("Email send error:", err);
    }
  };

  if (!userId || !trade) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        body{ font-family: Arial; background:#F5F7FA; margin:0; }
        .topbar{ background:#0B1F3A; color:white; padding:20px; display:flex; justify-content:space-between; align-items:center; }
        .clock{ font-size:14px; }
        .container{ width:96%; margin:20px auto; }
        .blotter{ background:white; padding:10px; display:flex; gap:20px; border-radius:6px; font-size:13px; flex-wrap:wrap; }
        .blotter div{ min-width:120px; }
        .main{ display:grid; grid-template-columns:1fr 1.3fr; gap:20px; margin-top:20px; }
        .panel{ background:white; padding:15px; border-radius:6px; margin-bottom:15px; }
        .mail-box{ background:white; border-radius:6px; display:flex; flex-direction:column; height:520px; }
        .mail-header{ background:#1E3A5F; color:white; padding:10px; }
        .mail-body{ flex:1; display:flex; }
        .mail-list{ width:40%; border-right:1px solid #eee; overflow:auto; }
        .mail-item{ padding:8px; border-bottom:1px solid #eee; cursor:pointer; }
        .mail-view{ flex:1; padding:10px; overflow:auto; }
        .compose{ border-top:1px solid #eee; padding:10px; }
        textarea{ width:100%; height:70px; }
        .action-btn{ background:#0B1F3A; color:white; padding:10px; margin:5px; cursor:pointer; border:none; border-radius:4px;}
        .back-btn{ background:#FFC107; padding:10px; border:none; cursor:pointer; margin-bottom:10px; border-radius:4px;}
      `}}/>

      <div className="topbar">
        <div>Trade Workstation</div>
        <div className="clock">{simTime ? `Sim Time: ${simTime}` : ""}</div>
      </div>

      <div className="container">
        <button className="back-btn" onClick={() => router.push(`/workstation?userId=${encodeURIComponent(userId)}&desk=${encodeURIComponent(desk)}`)}>⬅ Back</button>
        
        <div className="blotter">
          <div><small>Trade Ref</small><br/><b>{trade.tradeRef}</b></div>
          <div><small>Counterparty</small><br/>{trade.counterparty || "-"}</div>
          <div><small>CCY</small><br/>{trade.currency}</div>
          <div><small>Amount</small><br/>{trade.amount}</div>
          <div><small>Direction</small><br/>{trade.direction}</div>
          <div><small>Product</small><br/>{trade.product}</div>
          <div><small>Entity</small><br/>{trade.entity || "-"}</div>
          <div><small>Status</small><br/>{trade.currentStatus}</div>
          <div><small>Value Date</small><br/>{trade.valueDate ? new Date(trade.valueDate).toLocaleDateString() : "-"}</div>
        </div>

        <div className="main">
          <div>
            <div className="panel">
              <h3>Actions</h3>
              <div>
                {desk === "MO" && (
                  <>
                    <button className="action-btn" onClick={() => executeAction('MO_VALIDATE_PASS')}>Validate</button>
                    <button className="action-btn" onClick={() => executeAction('MO_RAISE_BREAK')}>Raise Break</button>
                    <button className="action-btn" onClick={() => executeAction('MO_RESOLVE_BREAK')}>Resolve Break</button>
                  </>
                )}
                {desk === "CONFIRMATION" && (
                  <>
                    <button className="action-btn" onClick={() => executeAction('CONFIRM_TRADE')}>Confirm</button>
                    <button className="action-btn" onClick={() => executeAction('CONFIRM_RAISE_BREAK')}>Confirmation Break</button>
                    <button className="action-btn" onClick={() => executeAction('CONFIRM_RESOLVE_BREAK')}>Break Resolved</button>
                  </>
                )}
              </div>
            </div>

            <div className="panel">
              <h3>Audit Trail</h3>
              <div>
                {auditData.xml ? (
                  <pre style={{background: "#f8fafc", color: "#0f172a", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "4px", overflowX: "auto", fontSize: "12px", whiteSpace: "pre-wrap"}}>
                    {auditData.xml}
                  </pre>
                ) : auditData.trail.map((a, i) => (
                  <div key={i} style={{marginBottom: "10px", padding: "5px", border: "1px solid #ddd"}}>
                    <strong>{a.action || a.event}</strong><br/><small>{a.details || ""}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mail-box">
            <div className="mail-header">Communication</div>
            <div className="mail-body">
              <div className="mail-list">
                {messages.map((m, i) => {
                  const senderLabel = m.sender === "CONFIRMATION" ? "Broker / CPTY" : m.sender === "MO" ? "Front Office" : m.sender;
                  const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : "";
                  return (
                    <div key={i} className="mail-item" onClick={() => setSelectedMail(m)}>
                      <b>{senderLabel}</b><br/>
                      <small>{m.subject}</small><br/>
                      <small style={{color:"gray"}}>{time}</small>
                    </div>
                  );
                })}
              </div>
              <div className="mail-view">
                {selectedMail ? (
                  <>
                    <b>{selectedMail.sender}</b><br/>
                    <small style={{color:"gray"}}>{new Date(selectedMail.timestamp).toLocaleString()}</small>
                    <hr/>
                    <div>{selectedMail.body}</div>
                  </>
                ) : "Select email"}
              </div>
            </div>
            <div className="compose">
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}></textarea>
              <button onClick={sendEmail}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TradeComponent />
    </Suspense>
  );
}
