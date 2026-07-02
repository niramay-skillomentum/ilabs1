"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { loadUserId, getToken, authHeaders, clearSession } from "../../lib/auth";
import toast from "react-hot-toast";
import InstructionPanel from "../../components/InstructionPanel";
import TutorialPanel from "../../components/TutorialPanel";
import SettlementDesk from "./components/settlement/SettlementDesk";

function WorkstationComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState(null);

  const [queue, setQueue] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [simTime, setSimTime] = useState("");
  const [sessionTimerStr, setSessionTimerStr] = useState("");

  const [popupState, setPopupState] = useState({ type: null, action: null });
  const [comment, setComment] = useState("");
  const [emailText, setEmailText] = useState("");
  const [auditData, setAuditData] = useState({ xml: null, trail: [] });

  const [isGeneratingQueue, setIsGeneratingQueue] = useState(false);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [settlementTypeSelection, setSettlementTypeSelection] = useState("BILATERAL");
  const [isEditingSSI, setIsEditingSSI] = useState(false);
  const [ssiFormData, setSsiFormData] = useState({});

  const alert1hrShown = useRef(false);
  const alert10minShown = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const uid = loadUserId();
    const dsk = searchParams.get("desk");
    
    if (!dsk) {
      toast.error("Select desk first");
      router.push("/dashboard");
      return;
    }
    if (!uid || !getToken()) {
      toast.error("Session expired. Login again.");
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
          if (data.sessionExpiry) {
            setSessionExpiry(data.sessionExpiry);
            if (data.sessionStart) setSessionStart(data.sessionStart);
          }

          if (sessionStorage.getItem("justLoggedIn") === "true") {
            sessionStorage.removeItem("justLoggedIn");
            const diff = new Date(data.sessionExpiry) - new Date();
            if (diff > 0) {
              const hrs = Math.floor(diff / (1000 * 60 * 60));
              const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              toast.success(`Resuming previous session — ${hrs}h ${mins}m remaining`);
            }
          }
        }
      }).catch(console.error);

    // Socket Setup
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
    const socket = io(socketUrl, { auth: { token: getToken() } });
    socketRef.current = socket;
    socket.emit("join_desk", dsk);

    socket.on("trade_update", () => {
      refreshQueueSilent(dsk);
    });

    socket.on("new_email", () => {
      refreshQueueSilent(dsk);
    });

    return () => socket.disconnect();
  }, [searchParams]);

  useEffect(() => {
    if (!sessionExpiry || !sessionStart) return;
    const interval = setInterval(() => {
      const diff = new Date(sessionExpiry) - new Date();
      if (diff <= 0) {
        toast.error("🚨 Session expired (3 hours). Logging off.");
        logout();
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setSessionTimerStr(`Session: ${hrs}h ${mins}m ${secs}s remaining`);

      // 1 real hour = 1 simulated hour. Sim time starts at 9:00 AM on sessionStart.
      const elapsedMs = new Date() - new Date(sessionStart);
      const currentSimTime = new Date();
      currentSimTime.setHours(9, 0, 0, 0); // Start at 9:00 AM
      currentSimTime.setTime(currentSimTime.getTime() + elapsedMs);
      
      const pad = (n) => String(n).padStart(2, "0");
      setSimTime(`${currentSimTime.getFullYear()}-${pad(currentSimTime.getMonth()+1)}-${pad(currentSimTime.getDate())} ${pad(currentSimTime.getHours())}:${pad(currentSimTime.getMinutes())}:${pad(currentSimTime.getSeconds())}`);

      const totalMinutesLeft = Math.floor(diff / (1000 * 60));
      handleAlerts(totalMinutesLeft);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiry, sessionStart]);

  // Keep selectedTrade in sync with the latest queue updates
  // Uses targeted field comparison instead of expensive JSON.stringify (KP-005)
  useEffect(() => {
    if (selectedTrade && queue.length > 0) {
      const updatedTrade = queue.find(t => t.tradeRef === selectedTrade.tradeRef);
      if (updatedTrade) {
        const changed =
          updatedTrade.currentStatus !== selectedTrade.currentStatus ||
          updatedTrade.age !== selectedTrade.age ||
          JSON.stringify(updatedTrade.pendingAmendments) !== JSON.stringify(selectedTrade.pendingAmendments) ||
          updatedTrade.cptyResponseReceived !== selectedTrade.cptyResponseReceived ||
          updatedTrade.foResponseReceived !== selectedTrade.foResponseReceived ||
          updatedTrade.cptyContactCount !== selectedTrade.cptyContactCount ||
          updatedTrade.foContactCount !== selectedTrade.foContactCount;
        if (changed) {
          setSelectedTrade(updatedTrade);
        }
      }
    }
  }, [queue, selectedTrade]);

  // Sturdy Background Polling Fallback (ensures UI is never stale)
  useEffect(() => {
    if (!desk) return;
    const pollInterval = setInterval(() => {
      refreshQueueSilent(desk);
    }, 15000); // Poll every 15 seconds silently
    return () => clearInterval(pollInterval);
  }, [desk]);

  const handleAlerts = (mins) => {
    if (mins <= 60 && !alert1hrShown.current) {
      toast("⚠️ 1 hour remaining in simulation day", { icon: "⚠️" });
      alert1hrShown.current = true;
    }
    if (mins <= 10 && !alert10minShown.current) {
      toast("⏳ 10 minutes remaining — wrap up trades", { icon: "⏳" });
      alert10minShown.current = true;
    }
    if (mins <= 0) {
      toast.error("📛 Market Closed — Logging off");
      logout();
    }
  };

  const refreshQueueSilent = async (dsk) => {
    try {
      const res = await fetch(`/api/queue/my?desk=${encodeURIComponent(dsk || desk)}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setQueue(data.trades || []);
        if (data.sessionExpiry) {
          setSessionExpiry(data.sessionExpiry);
          if (data.sessionStart) setSessionStart(data.sessionStart);
        }
      }
    } catch (e) {}
  };

  const logout = async () => {
    await fetch("/api/session/logout", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
    clearSession();
    router.push("/");
  };

  const generateQueue = async () => {
    setIsGeneratingQueue(true);
    const res = await fetch("/api/queue/generate", {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ desk })
    });
    const data = await res.json();
    setIsGeneratingQueue(false);
    if (!data.success) {
      toast.error(data.error || "Complete Your Current Trades First");
      return false;
    }
    setQueue(data.trades || []);
    if (data.sessionExpiry) {
      setSessionExpiry(data.sessionExpiry);
      if (data.sessionStart) setSessionStart(data.sessionStart);
    }
    return true;
  };

  const refreshQueue = async () => {
    setIsRefreshingQueue(true);
    const res = await fetch("/api/queue/my?desk=" + encodeURIComponent(desk), { headers: authHeaders() });
    const data = await res.json();
    setIsRefreshingQueue(false);
    if (!data.success) return toast.error(data.error || "Unable to refresh queue");
    setQueue(data.trades || []);
    if (data.sessionExpiry) {
      setSessionExpiry(data.sessionExpiry);
      if (data.sessionStart) setSessionStart(data.sessionStart);
    }
    toast.success("Queue refreshed");
  };

  const format = (d) => d ? new Date(d).toLocaleDateString() : "";

  // Action Logic
  const allowed = {
    MO_VALIDATE_PASS: ["MO_PENDING", "PENDING_FO_RESPONSE"],
    MO_RAISE_BREAK: ["MO_PENDING"],
    MO_SEND_TO_FO: ["MO_BREAK_OPEN"],
    CONFIRM_TRADE: ["LIASING_WITH_CPTY"],
    CONFIRM_RAISE_BREAK: ["LIASING_WITH_CPTY"],
    CONFIRM_SEND_TO_CPTY: ["CONFIRMATION_PENDING", "CONFIRMATION_BREAK", "LIASING_WITH_FO", "LIASING_WITH_CPTY"],
    CONFIRM_REJECT_CLAIM: ["CONFIRMATION_BREAK"],
    CONFIRM_REQUEST_EVIDENCE: ["CONFIRMATION_BREAK"],
    CONFIRM_ESCALATE_TO_FO: ["CONFIRMATION_BREAK"],
    CONFIRM_RAISE_AMENDMENT: ["CONFIRMATION_BREAK"],
    CONFIRM_APPROVE_AMENDMENT: ["CONFIRMATION_BREAK"],
    CONFIRM_RESEND: ["CONFIRMATION_PENDING"],
    SETTLEMENT_APPROVE: ["SETTLEMENT_PENDING", "LIASING_WITH_CPTY", "SETTLEMENT_BREAK"],
    SETTLEMENT_RAISE_BREAK: ["SETTLEMENT_PENDING", "READY_FOR_APPROVAL", "LIASING_WITH_CPTY"],
    SETTLEMENT_FOLLOW_UP_CPTY: ["SETTLEMENT_PENDING", "SETTLEMENT_BREAK", "LIASING_WITH_CPTY"]
  };

  const handleOpenAction = (action) => {
    if (!selectedTrade) return toast.error("Select trade first");
    if (!allowed[action] || !allowed[action].includes(selectedTrade.currentStatus)) {
      return toast.error("Invalid action for current state");
    }
    if (action === 'CONFIRM_RAISE_BREAK') {
      const cptyCount = selectedTrade.cptyContactCount || 0;
      const foCount = selectedTrade.foContactCount || 0;
      if (cptyCount !== 1 || foCount > 0) {
        return toast.error("You can only raise a Confirmation Break once, immediately after the first time you mail the Counterparty.");
      }
    }
    setPopupState({ type: "action", action });
    setComment("");
  };

  const handleOpenSettlementType = () => {
    if (!selectedTrade) return toast.error("Select trade first");
    setPopupState({ type: "settlement_type" });
    setSettlementTypeSelection("BILATERAL");
  };

  const submitAction = async () => {
    if (!comment || comment.trim() === "") console.warn("No comment provided - will be penalized in scoring");
    setIsSubmittingAction(true);
    const res = await fetch("/api/trade/action", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ trade: selectedTrade, action: popupState.action, comment })
    });
    const data = await res.json();
    setIsSubmittingAction(false);
    if (!data.success) return toast.error(data.error || "Action failed");
    setQueue(data.trades || []);
    setPopupState({ type: null });
  };

  const handleSaveSSI = async () => {
    try {
      const res = await fetch("/api/settlement/edit-ssi", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          tradeRef: popupState.trade.tradeRef,
          ssiData: ssiFormData
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("SSI Updated Successfully");
        setIsEditingSSI(false);
        refreshQueueSilent();
        setPopupState({type: null});
      } else {
        toast.error(data.error || "Failed to update SSI");
      }
    } catch (err) {
      toast.error("Error saving SSI");
    }
  };

  const submitSettlementType = async () => {
    setIsSubmittingAction(true);
    const res = await fetch("/api/settlement/select-type", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ tradeRef: selectedTrade.tradeRef, selectedType: settlementTypeSelection })
    });
    const data = await res.json();
    setIsSubmittingAction(false);
    
    if (!res.ok || !data.success) {
      toast.error(data.error || "Incorrect Settlement Type");
      setPopupState({ type: null }); // allow them to retry by reopening modal
      return;
    }
    
    setPopupState({ type: null });
    if (data.redirect) {
      toast.success("Correct Settlement Type!");
      window.open(data.redirect + "?tradeRef=" + selectedTrade.tradeRef, "_blank");
    } else {
      toast.success("Bilateral confirmed! Please verify SSI manually.", { duration: 4000 });
      refreshQueueSilent();
    }
  };

  const downloadCSV = () => {
    if (!queue || queue.length === 0) return toast.error("No data to export");
    const baseHeaders = [
      "Trade Ref", "Status", "Next Desk", "Age", "Trade Date", "Value Date", "Counterparty", "Entity", "FO Region",
      "Product", "Trade Type"
    ];
    
    let headers = [...baseHeaders];
    if (desk === "SETTLEMENT") {
      headers = headers.concat(["Beneficiary Name", "Beneficiary BIC", "Account Number", "Account Type", "Settlement Method", "Direction", "Currency", "Amount"]);
    } else {
      headers = headers.concat(["Settlement Type", "Direction", "Currency", "Amount"]);
    }

    let csv = headers.join(",") + "\n";
    queue.forEach(t => {
      let row = [
        t.tradeRef, t.currentStatus, t.nextDesk, t.age, format(t.tradeDate), format(t.valueDate), 
        t.counterparty, t.entity, t.foRegion, t.product, t.tradeType
      ];
      
      if (desk === "SETTLEMENT") {
        row = row.concat([
          t.settlementDetails?.beneficiaryName || "",
          t.settlementDetails?.beneficiaryBIC || "",
          t.settlementDetails?.accountNumber || "",
          t.settlementDetails?.accountType || "",
          t.settlementDetails?.settlementMethod || "",
          t.direction,
          t.currency,
          t.amount
        ]);
      } else {
        row = row.concat([t.settlementType || "", t.direction, t.currency, t.amount]);
      }
      
      csv += row.join(",") + "\n";
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
    if (!selectedTrade) return toast.error("Select trade first");
    const res = await fetch("/api/audit/" + selectedTrade.tradeRef, { headers: authHeaders() });
    const data = await res.json();
    
    const trail = data.trail || data;
    const auditArray = Array.isArray(trail) ? trail : [];
    setAuditData({ 
      xml: data.xmlAudit || null, 
      trail: auditArray.filter(a => a.action !== "SYSTEM_GENERATED") 
    });
    setPopupState({ type: "audit" });
  };

  const openMailboxGeneral = (forceChannel, forceComposeTo) => {
    const mailParams = new URLSearchParams({ desk });
    if (selectedTrade) {
      mailParams.set("tradeRef", selectedTrade.tradeRef);
      mailParams.set("composeFor", selectedTrade.tradeRef);
    }
    if (forceChannel) {
      mailParams.set("channel", forceChannel);
    }
    if (forceComposeTo) {
      mailParams.set("composeTo", forceComposeTo);
    }
    window.open("/communication?" + mailParams.toString(), "_blank");
  };

  const sendToFO = () => {
    if (!selectedTrade) return toast.error("Select trade first");
    if (!allowed['MO_SEND_TO_FO'] || !allowed['MO_SEND_TO_FO'].includes(selectedTrade.currentStatus)) return toast.error("Invalid action for current state");
    const mailParams = new URLSearchParams({
      desk, tradeRef: selectedTrade.tradeRef, composeFor: selectedTrade.tradeRef, composeTo: "FO"
    });
    window.open("/communication?" + mailParams.toString(), "_blank");
  };

  const startCptyFlow = () => {
    if (!selectedTrade) return toast.error("Select trade first");
    if (!allowed['CONFIRM_SEND_TO_CPTY'] || !allowed['CONFIRM_SEND_TO_CPTY'].includes(selectedTrade.currentStatus)) return toast.error("Invalid action for current state");
    const mailParams = new URLSearchParams({
      desk, tradeRef: selectedTrade.tradeRef, composeFor: selectedTrade.tradeRef, composeTo: "COUNTERPARTY",
      composeAction: "CONFIRM_SEND_TO_CPTY"
    });
    window.open("/communication?" + mailParams.toString(), "_blank");
  };

  const startSettlementCptyFlow = () => {
    if (!selectedTrade) return toast.error("Select trade first");
    if (!allowed['SETTLEMENT_FOLLOW_UP_CPTY'] || !allowed['SETTLEMENT_FOLLOW_UP_CPTY'].includes(selectedTrade.currentStatus)) return toast.error("Invalid action for current state");
    const mailParams = new URLSearchParams({
      desk, tradeRef: selectedTrade.tradeRef, composeFor: selectedTrade.tradeRef, composeTo: "COUNTERPARTY",
      composeAction: "SETTLEMENT_FOLLOW_UP_CPTY"
    });
    window.open("/communication?" + mailParams.toString(), "_blank");
  };

  const sendEmail = async () => {
    if (!selectedTrade) return toast.error("Select trade first");
    if (!emailText || emailText.trim() === "") return toast.error("Email content required");
    
    setIsSendingEmail(true);
    if (popupState.action === "CONFIRM_SEND_TO_CPTY") {
      const res = await fetch("/api/trade/action", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ trade: selectedTrade, action: popupState.action, comment: emailText })
      });
      const data = await res.json();
      setIsSendingEmail(false);
      if (!data.success) return toast.error(data.error || "Email send failed");
      toast.success("Email sent successfully");
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
    setIsSendingEmail(false);
    if (!data.success) return toast.error(data.error || "Email send failed");
    toast.success("Email sent successfully");
    setPopupState({ type: null });
    refreshQueueSilent();
  };

  const viewTruth = () => {
    if (!selectedTrade) return toast.error("Select trade first");
    const truthContent = selectedTrade.truths ? JSON.stringify(selectedTrade.truths, null, 2) : 
                        selectedTrade.truth ? JSON.stringify(selectedTrade.truth, null, 2) : "No truths object found for this trade.";
    setAuditData({ xml: truthContent, trail: [] });
    setPopupState({ type: "truth" });
  };

  const viewSSI = (trade) => {
    setPopupState({ type: "ssi", trade });
  };

  const openTermsheet = () => {
    window.open(`/mo-risk?desk=${encodeURIComponent(desk)}`, "_blank");
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
          <button className="btn warning" onClick={refreshQueue} disabled={isRefreshingQueue}>
            {isRefreshingQueue ? "Refreshing..." : "Refresh"}
          </button>
          <span className="clock">{simTime}</span>
          <button className="btn secondary" onClick={logout}>Logoff</button>
        </div>
      </div>

      {desk === "SETTLEMENT" ? (
        <SettlementDesk userId={userId} generateQueue={generateQueue} isGeneratingQueue={isGeneratingQueue} />
      ) : (
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="btn warning" onClick={generateQueue} disabled={isGeneratingQueue} style={{ margin: 0 }}>
            {isGeneratingQueue ? "Generating..." : "Generate Queue"}
          </button>
          
          <TutorialPanel desk={desk} />
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Select</th><th>Trade Ref</th><th>Status</th><th>Next Desk</th><th className="num">Age</th>
                <th>Trade Date</th><th>Value Date</th><th>Counterparty</th><th>Entity</th><th>FO Region</th>
                <th>Product</th><th>Trade Type</th>
                {desk !== "SETTLEMENT" && <th>Settlement Type</th>}
                {desk === "SETTLEMENT" && <th>SSI Details</th>}
                <th>Direction</th><th>Currency</th>
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
                  {desk !== "SETTLEMENT" && <td>{t.settlementType}</td>}
                  {desk === "SETTLEMENT" && (
                    <td>
                      <button className="btn secondary" style={{padding: "4px 8px", fontSize: "11px", margin: 0}} onClick={(e) => { e.stopPropagation(); viewSSI(t); }}>View SSI</button>
                    </td>
                  )}
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
                  if(!selectedTrade) return toast.error("Select a trade first");
                  if (!allowed['CONFIRM_ESCALATE_TO_FO'] || !allowed['CONFIRM_ESCALATE_TO_FO'].includes(selectedTrade.currentStatus)) return toast.error("Invalid action for current state");
                  const mailParams = new URLSearchParams({desk, tradeRef: selectedTrade.tradeRef, channel: "FO", composeFor: selectedTrade.tradeRef, composeTo: "FO"});
                  window.open("/communication?" + mailParams.toString(), "_blank");
                }}>Escalate to FO</button>
              </>
            )}
            {desk === "SETTLEMENT" && (
              <>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_APPROVE')}>Approve Settlement</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_RAISE_BREAK')}>Setts Break</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_FOLLOW_UP_CPTY')}>Follow-up</button>
                <button className="btn primary" onClick={startSettlementCptyFlow}>Mail CPTY</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_SEND_BACK_TO_MO')}>Send to MO</button>
                <button className="btn warning" onClick={handleOpenSettlementType}>Select Settlement Type</button>
                <button className="btn secondary" style={{backgroundColor:"#0f766e", color:"white", border:"none"}} onClick={() => window.open("/ssi-database?desk=" + desk, "_blank")}>SSI Database</button>
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

        {/* Instructions Panel */}
        {desk && <InstructionPanel desk={desk} />}
      </div>
      )}

      {popupState.type === "action" && (
        <div className="popup" style={{display: 'block'}}>
          <h3 style={{marginBottom: '10px'}}>{popupState.action?.replace(/_/g, ' ')}</h3>
          <div style={{color: '#475569', fontSize: '14px', marginBottom: '15px'}}>Are you sure you want to proceed with this action?</div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment (recommended for audit & scoring)"></textarea>
          <div style={{display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end'}}>
            <button className="btn secondary" onClick={() => setPopupState({type: null})} disabled={isSubmittingAction}>Cancel</button>
            <button className="btn primary" onClick={submitAction} disabled={isSubmittingAction}>
              {isSubmittingAction ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {popupState.type === "settlement_type" && (
        <div className="popup" style={{display: 'block'}}>
          <h3 style={{marginBottom: '10px'}}>Choose Settlement Type</h3>
          <div style={{color: '#475569', fontSize: '14px', marginBottom: '15px'}}>Select the correct settlement type to process this trade.</div>
          <select 
            value={settlementTypeSelection} 
            onChange={(e) => setSettlementTypeSelection(e.target.value)}
            style={{width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', marginTop: '10px'}}
          >
            <option value="BILATERAL">Bilateral</option>
            <option value="ELECTRONIC">Electronic</option>
          </select>
          <div style={{display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end'}}>
            <button className="btn secondary" onClick={() => setPopupState({type: null})} disabled={isSubmittingAction}>Cancel</button>
            <button className="btn primary" onClick={submitSettlementType} disabled={isSubmittingAction}>
              {isSubmittingAction ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {popupState.type === "email" && (
        <div className="popup" style={{display: 'block'}}>
          <h3 style={{marginBottom: '15px'}}>Send Email</h3>
          <textarea value={emailText} onChange={e => setEmailText(e.target.value)} placeholder="Type your email body here..."></textarea>
          <div style={{display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end'}}>
            <button className="btn secondary" onClick={() => setPopupState({type: null})} disabled={isSendingEmail}>Cancel</button>
            <button className="btn primary" onClick={sendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {(popupState.type === "audit" || popupState.type === "truth") && (
        <div className="popup" style={{display: 'block', width: '550px'}}>
          <h3>{popupState.type === "truth" ? "Underlying Truths (Testing Only)" : "Audit Trail"}</h3>
          <div id="auditContent">
            {auditData.xml && (
              <pre className="xml-section" style={{marginBottom: "15px"}}>{auditData.xml}</pre>
            )}
            {auditData.trail.length > 0 ? (
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
              !auditData.xml && <p style={{color:'#94a3b8'}}>No audit entries yet.</p>
            )}
          </div>
          <button onClick={() => setPopupState({type: null})}>Close</button>
        </div>
      )}

      {popupState.type === "ssi" && popupState.trade && (
        <div className="popup" style={{display: 'block', width: '600px'}}>
          <h3 style={{marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px'}}>
            Standard Settlement Instructions 
            {popupState.trade.currentStatus === 'SETTLEMENT_BREAK' && !isEditingSSI && (
              <button onClick={() => {
                setSsiFormData(popupState.trade.settlementDetails || {});
                setIsEditingSSI(true);
              }} style={{marginLeft: "15px", padding: "4px 8px", background: "#f59e0b", color: "white", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer"}}>Edit SSI</button>
            )}
          </h3>
          <div style={{fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155'}}>
            {!isEditingSSI ? (
              <>
                <div style={{marginBottom: '16px'}}>
                  <div style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px'}}>Currency & Method</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Currency:</strong> {popupState.trade.currency}</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Settlement Method:</strong> {popupState.trade.settlementDetails?.settlementMethod}</div>
                </div>
                <div style={{marginBottom: '16px'}}>
                  <div style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px'}}>Beneficiary Customer</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Name:</strong> {popupState.trade.settlementDetails?.beneficiaryName}</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Account Number:</strong> {popupState.trade.settlementDetails?.accountNumber}</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Account Type:</strong> {popupState.trade.settlementDetails?.accountType}</div>
                </div>
                <div style={{marginBottom: '16px'}}>
                  <div style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px'}}>Beneficiary Institution</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Bank Name:</strong> {popupState.trade.settlementDetails?.beneficiaryBank}</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>BIC / SWIFT:</strong> {popupState.trade.settlementDetails?.beneficiaryBIC}</div>
                </div>
                <div style={{marginBottom: '16px'}}>
                  <div style={{color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px'}}>Intermediary / Correspondent</div>
                  <div><strong style={{display: 'inline-block', width: '150px', color: '#0f172a'}}>Correspondent Bank:</strong> {popupState.trade.settlementDetails?.correspondentBank}</div>
                </div>
              </>
            ) : (
              <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                {["beneficiaryName", "accountNumber", "accountType", "beneficiaryBank", "beneficiaryBIC", "settlementMethod", "correspondentBank"].map(field => (
                  <div key={field} style={{display: "flex", alignItems: "center"}}>
                    <label style={{width: "180px", fontWeight: "bold"}}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</label>
                    <input 
                      style={{flex: 1, padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px"}}
                      value={ssiFormData[field] || ""}
                      onChange={e => setSsiFormData({...ssiFormData, [field]: e.target.value})}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px'}}>
            {!isEditingSSI ? (
              <button className="btn secondary" onClick={() => setPopupState({type: null})}>Close</button>
            ) : (
              <>
                <button className="btn secondary" onClick={() => setIsEditingSSI(false)}>Cancel Edit</button>
                <button className="btn primary" onClick={handleSaveSSI}>Save Changes</button>
              </>
            )}
          </div>
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
