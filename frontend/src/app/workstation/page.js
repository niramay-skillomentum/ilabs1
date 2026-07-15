"use client";

import { Suspense, useEffect, useState, useRef, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { loadUserId, getToken, authHeaders, clearSession } from "../../lib/auth";
import toast from "react-hot-toast";
import InstructionPanel from "../../components/InstructionPanel";
import TutorialPanel from "../../components/TutorialPanel";

// ============ Module-scope stable constants (F2) ============
const format = (d) => d ? new Date(d).toLocaleDateString() : "";

// Static stylesheet — hoisted so it isn't re-created on every render.
const WORKSTATION_STYLE = `
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
      `;

// Which trade statuses each action is valid from.
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
  SETTLEMENT_APPROVE: ["LIASING_WITH_CPTY", "AMENDED"],
  SETTLEMENT_RAISE_BREAK: ["LIASING_WITH_CPTY"],
  SETTLEMENT_MAIL_CPTY: ["SETTLEMENT_PENDING"]
};

// ============ SessionClock (F1) ============
// Owns the 1 Hz tick so the parent (and the trade blotter) no longer re-renders
// every second. Renders the timer/clock spans with the Refresh button (passed as
// children) between them to preserve the original header layout.
const SessionClock = memo(function SessionClock({ sessionExpiry, sessionStart, onExpire, children }) {
  const [simTime, setSimTime] = useState("");
  const [sessionTimerStr, setSessionTimerStr] = useState("");
  const alert1hrShown = useRef(false);
  const alert10minShown = useRef(false);

  useEffect(() => {
    if (!sessionExpiry || !sessionStart) return;
    const interval = setInterval(() => {
      const diff = new Date(sessionExpiry) - new Date();
      if (diff <= 0) {
        toast.error("🚨 Session expired (3 hours). Logging off.");
        if (onExpire) onExpire();
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setSessionTimerStr(`Session: ${hrs}h ${mins}m ${secs}s remaining`);

      const elapsedMs = new Date() - new Date(sessionStart);
      const currentSimTime = new Date();
      currentSimTime.setHours(9, 0, 0, 0);
      currentSimTime.setTime(currentSimTime.getTime() + elapsedMs);
      const pad = (n) => String(n).padStart(2, "0");
      setSimTime(`${currentSimTime.getFullYear()}-${pad(currentSimTime.getMonth()+1)}-${pad(currentSimTime.getDate())} ${pad(currentSimTime.getHours())}:${pad(currentSimTime.getMinutes())}:${pad(currentSimTime.getSeconds())}`);

      const totalMinutesLeft = Math.floor(diff / (1000 * 60));
      if (totalMinutesLeft <= 60 && !alert1hrShown.current) {
        toast("⚠️ 1 hour remaining in simulation day", { icon: "⚠️" });
        alert1hrShown.current = true;
      }
      if (totalMinutesLeft <= 10 && !alert10minShown.current) {
        toast("⏳ 10 minutes remaining — wrap up trades", { icon: "⏳" });
        alert10minShown.current = true;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiry, sessionStart, onExpire]);

  return (
    <>
      <span className="session-timer">{sessionTimerStr}</span>
      {children}
      <span className="clock">{simTime}</span>
    </>
  );
});

// ============ TradeRow (F1) ============
// Memoized so a queue refresh (which replaces every row object) only re-renders
// rows whose displayed data actually changed. Comparison is by value, not by
// object reference, because refreshQueueSilent produces fresh objects each poll.
const TradeRow = memo(function TradeRow({ t, desk, isSelected, onToggle, onViewSSI }) {
  return (
    <tr>
      <td><input type="checkbox" checked={isSelected} onChange={() => onToggle(t)} /></td>
      <td>{t.tradeRef}</td>
      <td>{t.currentStatus}</td>
      <td>{t.nextDesk}</td>
      <td className="num">{t.age}</td>
      <td>{format(t.tradeDate)}</td>
      <td>{format(t.valueDate)}</td>
      <td>{t.counterpartyGroup}</td>
      <td>{t.counterparty}</td>
      <td>{t.entity}</td>
      <td>{t.foRegion}</td>
      <td>{t.product}</td>
      <td>{t.productType || ''}</td>
      <td>{t.tradeType}</td>
      <td style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis'}} title={t.underlyer || ''}>{t.underlyer || ''}</td>
      <td>{t.settlementType}</td>
      {desk === "SETTLEMENT" && (
        <td>
          <button className="btn secondary" style={{padding: "4px 8px", fontSize: "11px", margin: 0}} onClick={(e) => { e.stopPropagation(); onViewSSI(t); }}>View SSI</button>
        </td>
      )}
      <td>{t.direction}</td>
      <td>{t.currency}</td>
      <td className="num">{t.amount ? t.amount.toLocaleString() : ''}</td>
    </tr>
  );
}, (prev, next) =>
  prev.isSelected === next.isSelected &&
  prev.desk === next.desk &&
  prev.onToggle === next.onToggle &&
  prev.onViewSSI === next.onViewSSI &&
  prev.t.tradeRef === next.t.tradeRef &&
  prev.t.currentStatus === next.t.currentStatus &&
  prev.t.nextDesk === next.t.nextDesk &&
  prev.t.age === next.t.age &&
  prev.t.tradeDate === next.t.tradeDate &&
  prev.t.valueDate === next.t.valueDate &&
  prev.t.counterpartyGroup === next.t.counterpartyGroup &&
  prev.t.counterparty === next.t.counterparty &&
  prev.t.entity === next.t.entity &&
  prev.t.foRegion === next.t.foRegion &&
  prev.t.product === next.t.product &&
  prev.t.productType === next.t.productType &&
  prev.t.tradeType === next.t.tradeType &&
  prev.t.underlyer === next.t.underlyer &&
  prev.t.settlementType === next.t.settlementType &&
  prev.t.direction === next.t.direction &&
  prev.t.currency === next.t.currency &&
  prev.t.amount === next.t.amount
);

function WorkstationComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState(null);

  const [queue, setQueue] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);

  const [popupState, setPopupState] = useState({ type: null, action: null });
  const [comment, setComment] = useState("");
  const [emailText, setEmailText] = useState("");
  const [auditData, setAuditData] = useState({ xml: null, trail: [] });

  const [isGeneratingQueue, setIsGeneratingQueue] = useState(false);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEditingSSI, setIsEditingSSI] = useState(false);
  const [ssiFormData, setSsiFormData] = useState({});
  const [ssiGroupList, setSsiGroupList] = useState([]);
  const [selectedSsiId, setSelectedSsiId] = useState("");

  const socketRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const refreshQueueSilent = useCallback(async (dsk) => {
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
  }, [desk]);

  // (F4) Debounce so a burst of new_email/trade_update events collapses into one fetch.
  const scheduleRefresh = useCallback((dsk) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => refreshQueueSilent(dsk), 300);
  }, [refreshQueueSilent]);

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

    // trade_update carries { tradeRef, currentStatus } — patch that row in place
    // instead of refetching the whole 20-trade queue. Status transitions (esp.
    // from the settlement bots) are frequent; a full refetch per event is the
    // dominant read load from the socket layer.
    socket.on("trade_update", (payload) => {
      if (payload && payload.tradeRef && payload.currentStatus) {
        setQueue(prev => prev.map(t =>
          t.tradeRef === payload.tradeRef
            ? { ...t, currentStatus: payload.currentStatus }
            : t));
      } else {
        // Malformed/legacy event — fall back to a reconciling refresh.
        scheduleRefresh(dsk);
      }
    });

    // new_email may attach amendments / response flags the client can't derive
    // from the payload, so a (debounced) reconciling refresh is still warranted.
    socket.on("new_email", () => {
      scheduleRefresh(dsk);
    });

    return () => socket.disconnect();
  }, [searchParams]);

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

  // Stable handlers for the memoized TradeRow (F1/F2).
  const handleToggleSelect = useCallback((t) => {
    setSelectedTrade(prev => prev?.tradeRef === t.tradeRef ? null : t);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/session/logout", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
    clearSession();
    router.push("/");
  }, [router]);

  // (F3) Polling fallback that runs ONLY while the socket is disconnected —
  // when the socket is healthy, live events drive updates and polling pauses.
  useEffect(() => {
    if (!desk) return;
    const socket = socketRef.current;
    let pollId = null;
    const startPoll = () => { if (!pollId) pollId = setInterval(() => refreshQueueSilent(desk), 15000); };
    const stopPoll = () => { if (pollId) { clearInterval(pollId); pollId = null; } };

    if (socket) {
      socket.on("connect", stopPoll);
      socket.on("disconnect", startPoll);
      if (!socket.connected) startPoll();
    } else {
      startPoll();
    }

    return () => {
      stopPoll();
      if (socket) { socket.off("connect", stopPoll); socket.off("disconnect", startPoll); }
    };
  }, [desk, refreshQueueSilent]);

  const generateQueue = async () => {
    setIsGeneratingQueue(true);
    const res = await fetch("/api/queue/generate", {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ desk })
    });
    const data = await res.json();
    setIsGeneratingQueue(false);
    if (!data.success) return toast.error(data.error || "Complete Your Current Trades First");
    setQueue(data.trades || []);
    if (data.sessionExpiry) {
      setSessionExpiry(data.sessionExpiry);
      if (data.sessionStart) setSessionStart(data.sessionStart);
    }
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

  const handleSendToSystemAmendment = async () => {
    try {
      const res = await fetch("/api/settlement/amend", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tradeRef: popupState.trade.tradeRef, ssiId: selectedSsiId || undefined })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent to System for Amendment${selectedSsiId ? ` (SSI: ${selectedSsiId})` : ""}. The trade is now PENDING_AMENDMENT — check the System Mailbox for confirmation.`);
        setIsEditingSSI(false);
        setSelectedSsiId("");
        setSsiGroupList([]);
        refreshQueueSilent();
        setPopupState({type: null});
      } else {
        toast.error(data.error || "Failed to send for amendment");
      }
    } catch (err) {
      toast.error("Error sending to system for amendment");
    }
  };

  const downloadCSV = () => {
    if (!queue || queue.length === 0) return toast.error("No data to export");
    const baseHeaders = [
      "Trade Ref", "Status", "Next Desk", "Age", "Trade Date", "Value Date", "CP Group", "Counterparty", "Entity", "FO Region",
      "Product", "Product Type", "Trade Type", "Underlyer"
    ];
    
    let headers = [...baseHeaders, "Settlement Mode"];
    if (desk === "SETTLEMENT") {
      headers = headers.concat(["SSI ID", "Beneficiary Name", "Beneficiary BIC", "Account Number", "Account Type", "Settlement Method", "Direction", "Currency", "Amount"]);
    } else {
      headers = headers.concat(["Direction", "Currency", "Amount"]);
    }

    let csv = headers.join(",") + "\n";
    queue.forEach(t => {
      let row = [
        t.tradeRef, t.currentStatus, t.nextDesk, t.age, format(t.tradeDate), format(t.valueDate), 
        t.counterpartyGroup || "", t.counterparty, t.entity, t.foRegion, t.product, t.productType || "", t.tradeType, t.underlyer || "",
        t.settlementType || ""
      ];
      
      if (desk === "SETTLEMENT") {
        row = row.concat([
          t.ssiId || "",
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
        row = row.concat([t.direction, t.currency, t.amount]);
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
    if (!allowed['SETTLEMENT_MAIL_CPTY'] || !allowed['SETTLEMENT_MAIL_CPTY'].includes(selectedTrade.currentStatus)) return toast.error("Invalid action for current state");
    const mailParams = new URLSearchParams({
      desk, tradeRef: selectedTrade.tradeRef, composeFor: selectedTrade.tradeRef, composeTo: "COUNTERPARTY",
      composeAction: "SETTLEMENT_MAIL_CPTY"
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

  const viewSSI = useCallback(async (trade) => {
    setPopupState({ type: "ssi", trade });
    setSelectedSsiId("");
    setSsiGroupList([]);
    // If trade has a settlement break, fetch SSI group for the dropdown
    if (["SETTLEMENT_BREAK", "REJECTED_REVERIFY"].includes(trade.currentStatus)) {
      try {
        const groupNameToUse = trade.counterpartyGroup || trade.counterparty || trade.settlementDetails?.counterpartyName;
        const params = new URLSearchParams({ groupName: groupNameToUse });
        if (trade.currency) params.set("currency", trade.currency);
        const res = await fetch(`/api/ssi/group?${params.toString()}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success && data.ssis) {
          setSsiGroupList(data.ssis);
        }
      } catch (err) {
        console.error("Failed to load SSI group:", err);
      }
    }
  }, []);

  const openTermsheet = () => {
    window.open(`/mo-risk?desk=${encodeURIComponent(desk)}`, "_blank");
  };

  if (!userId) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: WORKSTATION_STYLE}}/>

      {popupState.type && <div className="overlay" onClick={() => setPopupState({type: null})}></div>}

      <div className="topbar" style={{ background: desk === "SETTLEMENT" ? "#3A1F1F" : desk === "CONFIRMATION" ? "#1E3A5F" : "#0B1F3A" }}>
        <div className="desk-title">{desk} Desk | Welcome, {userId}</div>
        <div>
          {desk === "MO" && <button className="btn" onClick={openTermsheet} style={{background:"#f59e0b", color:"white", marginRight: "10px"}}>📄 View Termsheet</button>}
          <button className="btn primary" onClick={() => openMailboxGeneral()}>📧 Mailbox</button>
          {desk === "SETTLEMENT" && (
            <button className="btn" style={{background:"#0f766e", color:"white", marginLeft:"10px"}}
              onClick={() => window.open(`/communication?channel=SYSTEM&desk=SETTLEMENT${selectedTrade ? `&tradeRef=${encodeURIComponent(selectedTrade.tradeRef)}` : ""}`, "_blank")}>
              🖥️ System Mailbox
            </button>
          )}
          <SessionClock sessionExpiry={sessionExpiry} sessionStart={sessionStart} onExpire={logout}>
            <button className="btn warning" onClick={refreshQueue} disabled={isRefreshingQueue}>
              {isRefreshingQueue ? "Refreshing..." : "Refresh"}
            </button>
          </SessionClock>
          <button className="btn secondary" onClick={logout}>Logoff</button>
        </div>
      </div>

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
                <th>Trade Date</th><th>Value Date</th><th>CP Group</th><th>Counterparty</th><th>Entity</th><th>FO Region</th>
                <th>Product</th><th>Product Type</th><th>Trade Type</th><th>Underlyer</th>
                <th>Settlement Mode</th>
                {desk === "SETTLEMENT" && <th>SSI Details</th>}
                <th>Direction</th><th>Currency</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(t => (
                <TradeRow
                  key={t.tradeRef}
                  t={t}
                  desk={desk}
                  isSelected={selectedTrade?.tradeRef === t.tradeRef}
                  onToggle={handleToggleSelect}
                  onViewSSI={viewSSI}
                />
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
                <button className="btn primary" onClick={startSettlementCptyFlow}>Mail CPTY</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_APPROVE')}>Approve Settlement</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_RAISE_BREAK')}>Setts Break</button>
                <button className="btn primary" onClick={() => handleOpenAction('SETTLEMENT_SEND_BACK_TO_MO')}>Send to MO</button>
                <button className="btn secondary" style={{backgroundColor:"#0f766e", color:"white", border:"none"}} onClick={() => window.open("/ssi-database?desk=" + desk, "_blank")}>SSI Database</button>
                <button className="btn" style={{background:"#1a1a1a", color:"white", border:"none", marginLeft: "8px"}} onClick={() => window.open("/electronic-settlement?desk=SETTLEMENT", "_blank")}>🏦 STCC Electronic Settlement</button>
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

      {popupState.type === "ssi" && popupState.trade && (() => {
        const sd = popupState.trade.settlementDetails || {};
        const isCorrespondent = !!(sd.intermediaryBank || sd.intermediaryBIC || sd.intermediaryAccount);
        const settlType = isCorrespondent ? "CORRESPONDENT" : "DIRECT";
        const LINE = "═".repeat(62);
        const DASH = "─".repeat(62);

        return (
          <div className="popup" style={{display: 'block', width: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '0'}}>
            <div style={{padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isCorrespondent ? '#1E3A5F' : '#0B1F3A'}}>
              <h3 style={{margin: 0, color: 'white', fontSize: '15px'}}>
                Standard Settlement Instruction ({settlType})
              </h3>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                {sd.alertCode && (
                  <div style={{background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", color: "white"}}>
                    Alert: {sd.alertCode}
                  </div>
                )}
                {sd.alertAcronym && (
                  <div style={{background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", color: "white"}}>
                    Acronym: {sd.alertAcronym}
                  </div>
                )}
                {(popupState.trade.currentStatus === 'SETTLEMENT_BREAK' || popupState.trade.currentStatus === 'REJECTED_REVERIFY') && (
                  <button onClick={handleSendToSystemAmendment} style={{padding: "4px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600}}>Send to System for Amendment</button>
                )}
                <span style={{background: isCorrespondent ? '#f59e0b' : '#22c55e', color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700}}>
                  {settlType}
                </span>
              </div>
            </div>

            <div style={{fontFamily: "'Consolas', 'Courier New', monospace", fontSize: '13px', backgroundColor: '#fdfdfd', padding: '20px 24px', color: '#1e293b', lineHeight: '1.7'}}>
              {!isEditingSSI ? (
                <>
                  {/* Header */}
                  <div style={{color: '#64748b', fontSize: '12px', letterSpacing: '1px'}}>{LINE}</div>
                  <div style={{fontWeight: 'bold', fontSize: '14px', padding: '4px 0', background: '#f1f5f9', textAlign: 'center'}}>
                    STANDARD SETTLEMENT INSTRUCTION ({settlType} SETTLEMENT)
                  </div>
                  <div style={{color: '#64748b', fontSize: '12px', letterSpacing: '1px'}}>{LINE}</div>

                  {/* SSI ID & Currency & Asset Class */}
                  <div style={{padding: '8px 0'}}>
                    {(popupState.trade.ssiId || sd.ssiId) && (
                      <div style={{marginBottom: '6px'}}><strong style={{display: 'inline-block', width: '200px', color: '#0f766e'}}>SSI ID:</strong> <span style={{color: '#0f766e', fontWeight: 'bold', fontSize: '14px'}}>{popupState.trade.ssiId || sd.ssiId}</span></div>
                    )}
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Currency:</strong> {sd.currency || popupState.trade.currency}</div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Asset Class:</strong> {popupState.trade.product || 'FX / Cash'}</div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Product Type:</strong> {popupState.trade.productType || ''}</div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Underlyer:</strong> {popupState.trade.underlyer || 'N/A'}</div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Settlement Method:</strong> {sd.settlementMethod || 'SWIFT'}</div>
                    {sd.counterpartyName && (
                      <div><strong style={{display: 'inline-block', width: '200px'}}>Counterparty:</strong> {sd.counterpartyName}</div>
                    )}
                  </div>
                  <div style={{color: '#cbd5e1', letterSpacing: '1px'}}>{DASH}</div>

                  {/* Agent Bank Section (Correspondent only) */}
                  {isCorrespondent && (
                    <>
                      <div style={{padding: '8px 0'}}>
                        <div style={{color: '#1E3A5F', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px'}}>▎ Agent / Intermediary Bank</div>
                        <div><strong style={{display: 'inline-block', width: '200px'}}>Agent Bank (Inter):</strong> <span style={{color: '#0f172a'}}>{sd.intermediaryBIC || ''} ({sd.intermediaryBank || sd.correspondentBank || ''})</span></div>
                        <div><strong style={{display: 'inline-block', width: '200px'}}>Account at Agent:</strong> <span style={{color: '#0f172a'}}>{sd.intermediaryAccount || ''}</span></div>
                      </div>
                      <div style={{color: '#cbd5e1', letterSpacing: '1px'}}>{DASH}</div>
                    </>
                  )}

                  {/* Beneficiary Bank Section */}
                  <div style={{padding: '8px 0'}}>
                    <div style={{color: '#1E3A5F', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px'}}>▎ Beneficiary Bank</div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Beneficiary Bank:</strong> <span style={{color: '#0f172a'}}>{sd.beneficiaryBIC || ''} ({sd.beneficiaryBank || ''})</span></div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Account Number/IBAN:</strong> <span style={{color: '#0f172a'}}>{sd.accountNumber || ''}</span></div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Beneficiary Name:</strong> <span style={{color: '#0f172a'}}>{sd.beneficiaryName || ''}</span></div>
                    <div><strong style={{display: 'inline-block', width: '200px'}}>Account Type:</strong> <span style={{color: '#0f172a'}}>{sd.accountType || ''}</span></div>
                    {sd.country && (
                      <div><strong style={{display: 'inline-block', width: '200px'}}>Country:</strong> <span style={{color: '#0f172a'}}>{sd.country}</span></div>
                    )}
                  </div>
                  <div style={{color: '#cbd5e1', letterSpacing: '1px'}}>{DASH}</div>

                  {/* Notes */}
                  <div style={{padding: '8px 0'}}>
                    <div style={{color: '#1E3A5F', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px'}}>▎ Notes</div>
                    <div style={{color: '#475569'}}>
                      {isCorrespondent
                        ? `Route via ${sd.intermediaryBank || sd.correspondentBank || 'Agent Bank'}. ${sd.intermediaryBank || 'Agent'} will credit ${sd.beneficiaryBank || 'Beneficiary Bank'}'s ledger before final credit.`
                        : `Direct settlement. Funds credit the beneficiary's account directly at ${sd.beneficiaryBank || 'the beneficiary bank'}.`
                      }
                    </div>
                    {sd.field72 && (
                      <div style={{marginTop: '4px', color: '#64748b', fontSize: '12px'}}>Field 72: {sd.field72}</div>
                    )}
                  </div>
                  <div style={{color: '#64748b', fontSize: '12px', letterSpacing: '1px'}}>{LINE}</div>

                  {/* Ref IDs */}
                  {popupState.trade.truthSSIRefId && (
                    <div style={{marginTop: '8px', fontSize: '11px', color: '#94a3b8'}}>
                      Truth Ref: {popupState.trade.truthSSIRefId} | Presented Ref: {popupState.trade.presentedSSIRefId}
                    </div>
                  )}

                  {/* SSI ID Selection Dropdown — shown for settlement breaks */}
                  {ssiGroupList.length > 0 && ['SETTLEMENT_BREAK', 'REJECTED_REVERIFY'].includes(popupState.trade.currentStatus) && (
                    <div style={{marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b'}}>
                      <div style={{fontWeight: 'bold', fontSize: '13px', color: '#92400e', marginBottom: '8px'}}>⚠️ Select SSI ID for Amendment</div>
                      <select
                        value={selectedSsiId}
                        onChange={e => setSelectedSsiId(e.target.value)}
                        style={{width: '100%', padding: '8px', border: '1px solid #d97706', borderRadius: '4px', fontSize: '13px', background: 'white', marginBottom: '8px'}}
                      >
                        <option value="">-- Select an SSI ID --</option>
                        {ssiGroupList.map((ssi, idx) => (
                          <option key={idx} value={ssi.ssiId}>
                            {ssi.ssiId} — {ssi.currency} — {ssi.accountWithInstitution || ssi.counterPartyName}
                          </option>
                        ))}
                      </select>
                      {selectedSsiId && (
                        <div style={{fontSize: '11px', color: '#78716c'}}>
                          Selected: <strong>{selectedSsiId}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                  {["beneficiaryName", "accountNumber", "accountType", "beneficiaryBank", "beneficiaryBIC", "settlementMethod", "correspondentBank", "intermediaryBank", "intermediaryBIC", "intermediaryAccount"].map(field => (
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
            <div style={{display: 'flex', justifyContent: 'flex-end', padding: '12px 24px', gap: '10px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'}}>
              {!isEditingSSI ? (
                <>
                  <button className="btn secondary" onClick={() => setPopupState({type: null})}>Close</button>
                  {['SETTLEMENT_BREAK', 'REJECTED_REVERIFY'].includes(popupState.trade.currentStatus) && (
                    <button className="btn primary" onClick={handleSendToSystemAmendment} disabled={ssiGroupList.length > 0 && !selectedSsiId}>
                      Send to System for Amendment
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className="btn secondary" onClick={() => setIsEditingSSI(false)}>Cancel Edit</button>
                  <button className="btn primary" onClick={handleSendToSystemAmendment}>Send to System for Amendment</button>
                </>
              )}
            </div>
          </div>
        );
      })()}
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
