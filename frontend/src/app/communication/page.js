"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { io } from "socket.io-client";
import "./page.css";

function CommunicationComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ========================================
  // STATE
  // ========================================
  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState(null);
  const [channel, setChannel] = useState(null);
  const [selectedTradeRef, setSelectedTradeRef] = useState(null);
  const [currentFolder, setCurrentFolder] = useState("inbox");
  const [inboxData, setInboxData] = useState([]);
  const [currentTrade, setCurrentTrade] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [todayDate, setTodayDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Reply modal state
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  // Compose modal state
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("FO");
  const [composeToDisabled, setComposeToDisabled] = useState(false);
  const [composeTrade, setComposeTrade] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTrades, setComposeTrades] = useState([]);

  // Refs for latest values in callbacks
  const socketRef = useRef(null);
  const inboxDataRef = useRef([]);
  const selectedTradeRefRef = useRef(null);
  const currentFolderRef = useRef("inbox");
  const lastRenderedInboxDataStr = useRef("");

  // ========================================
  // AUTH HELPERS
  // ========================================
  const getToken = () => sessionStorage.getItem("auth_token") || Cookies.get("auth_token");
  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  }), []);

  // ========================================
  // FORMATTERS (identical to original)
  // ========================================
  const formatDate = (ts) => new Date(ts).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
  const formatDateFull = (ts) => new Date(ts).toLocaleString("en-GB", { weekday:"long", day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });
  const formatAmount = (amount) => Number(amount).toLocaleString();
  
  const buildSubject = (trade) => {
    if (!trade) return "";
    const vd = new Date(trade.valueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
    return `${trade.tradeRef} | ${trade.currency} ${formatAmount(trade.amount)} | ${vd}`;
  };

  const getSenderInfo = useCallback((sender, trade) => {
    if (sender === "FO") return { name: "Front Office Trading Desk", email: "fo.trading@sgb.com", initials: "FO", color: "#c4314b" };
    if (sender === "COUNTERPARTY" || sender === "CPTY") {
      const cpName = trade ? trade.counterparty : "Counterparty";
      return { name: cpName + " Operations", email: `operations@${(cpName||"cpty").toLowerCase()}.com`, initials: (cpName||"CP").substring(0,2).toUpperCase(), color: "#107c10" };
    }
    return { name: sender, email: sender, initials: (sender||"").substring(0,2).toUpperCase(), color: "#0f6cbd" };
  }, []);

  const getRecipientLabel = useCallback((sender, trade, dsk, ch, uid, msgMoUser) => {
    const targetUser = msgMoUser || uid;
    if (sender !== "FO" && sender !== "CPTY" && sender !== "COUNTERPARTY") {
      if (trade) {
        if (trade.currentStatus && (trade.currentStatus.startsWith("MO") || trade.currentStatus === "PENDING_FO_RESPONSE" || trade.currentStatus === "LIASING_WITH_FO")) {
          return "Front Office Trading Desk <fo.trading@sgb.com>";
        }
        return trade.counterparty + " Operations <operations@" + trade.counterparty.toLowerCase() + ".com>";
      }
      if (ch === "FO") return "Front Office Trading Desk <fo.trading@sgb.com>";
      return dsk + " Desk";
    }
    return targetUser + " <" + targetUser + ">";
  }, []);

  const getStatusBadge = useCallback((trade) => {
    const status = trade.currentStatus;
    const isFoPendingState = status === "PENDING_FO_RESPONSE" || status === "LIASING_WITH_FO";
    if (trade.conversation && trade.conversation.status === "RESOLVED") return <span className="status-badge badge-resolved">Resolved</span>;
    if (isFoPendingState && trade.foResponseReceived) return <span className="status-badge badge-responded">FO Responded</span>;
    if (status === "MO_PENDING" && trade.foResponseReceived) return <span className="status-badge badge-responded">FO Responded (Clean)</span>;
    if (isFoPendingState && !trade.foResponseReceived) return <span className="status-badge badge-awaiting">Awaiting FO</span>;
    if (status === "LIASING_WITH_CPTY") return <span className="status-badge badge-awaiting">Awaiting CPTY</span>;
    return null;
  }, []);

  // ========================================
  // MAP CONVERSATIONS (identical to original)
  // ========================================
  const mapConversations = useCallback((conversations) => {
    return conversations.map(item => {
      const lastMsg = item.conversation.messages.length
        ? item.conversation.messages[item.conversation.messages.length - 1]
        : null;
      if (!lastMsg) return null;
      return { trade: item.trade, subject: buildSubject(item.trade), lastMsg, conversation: item.conversation };
    }).filter(x => x !== null);
  }, []);

  // ========================================
  // LOAD INBOX DATA
  // ========================================
  const loadPersonalInbox = useCallback((dsk, uid, ch) => {
    const endpoint = ch === "FO"
      ? `/api/fo-channel/list?desk=${encodeURIComponent(dsk)}`
      : `/api/conversations/personal?userId=${encodeURIComponent(uid)}&desk=${encodeURIComponent(dsk)}`;
    return fetch(endpoint, { headers: { "Authorization": "Bearer " + getToken() } })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return [];
        const newDataStr = JSON.stringify(data.conversations);
        if (newDataStr === lastRenderedInboxDataStr.current) return inboxDataRef.current;
        lastRenderedInboxDataStr.current = newDataStr;
        const mapped = mapConversations(data.conversations);
        setInboxData(mapped);
        inboxDataRef.current = mapped;
        return mapped;
      })
      .catch(() => []);
  }, [mapConversations]);

  const loadGroupInbox = useCallback((dsk) => {
    return fetch(`/api/conversations/shared?desk=${encodeURIComponent(dsk)}`, { headers: { "Authorization": "Bearer " + getToken() } })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return [];
        const newDataStr = JSON.stringify(data.conversations);
        if (newDataStr === lastRenderedInboxDataStr.current) return inboxDataRef.current;
        lastRenderedInboxDataStr.current = newDataStr;
        const mapped = mapConversations(data.conversations);
        setInboxData(mapped);
        inboxDataRef.current = mapped;
        return mapped;
      })
      .catch(() => []);
  }, [mapConversations]);

  // ========================================
  // LOAD CONVERSATION
  // ========================================
  const loadConversation = useCallback((tradeRef, ch, currentInboxData, forceScroll) => {
    setSelectedTradeRef(tradeRef);
    selectedTradeRefRef.current = tradeRef;
    const data = currentInboxData || inboxDataRef.current;
    const inboxItem = data.find(i => i.trade.tradeRef === tradeRef);
    if (inboxItem) setCurrentTrade(inboxItem.trade);

    const endpoint = ch === "FO" ? `/api/fo-channel/${tradeRef}` : `/api/conversation/${tradeRef}`;
    fetch(endpoint, { headers: { "Authorization": "Bearer " + getToken() } })
      .then(res => res.json())
      .then(convData => {
        let msgs;
        if (ch === "FO") {
          msgs = (convData.messages || []).map(m => ({
            sender: m.senderRole === "FO" ? "FO" : (m.sender || "Unknown User"),
            body: m.message,
            timestamp: m.timestamp
          }));
        } else {
          msgs = convData.messages || [];
        }
        setCurrentMessages(msgs);
      });
  }, []);

  // ========================================
  // INIT EFFECT
  // ========================================
  useEffect(() => {
    const uid = searchParams.get("userId");
    const dsk = searchParams.get("desk");
    const tRef = searchParams.get("tradeRef");
    const ch = searchParams.get("channel");

    if (!uid) {
      alert("Session expired. Login again.");
      router.push("/");
      return;
    }

    setUserId(uid);
    setDesk(dsk);
    setChannel(ch);
    if (tRef) { setSelectedTradeRef(tRef); selectedTradeRefRef.current = tRef; }

    const d = new Date();
    setTodayDate(d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }));

    // Check for compose mode from workstation
    const composeForTrade = searchParams.get("composeFor");
    const composeToRecipient = searchParams.get("composeTo");

    if (composeForTrade) {
      // Compose mode: load inbox + open compose modal
      if (ch === "FO") {
        loadPersonalInbox(dsk, uid, ch);
      } else {
        loadGroupInbox(dsk);
      }

      // Load compose trades
      fetch(`/api/queue/my?userId=${encodeURIComponent(uid)}`, {
        headers: { "Authorization": "Bearer " + getToken() }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.trades) {
            setComposeTrades(data.trades);
            setComposeTrade(composeForTrade);
            if (composeToRecipient) {
              setComposeTo(composeToRecipient);
              setComposeToDisabled(true);
            } else {
              setComposeToDisabled(false);
            }
            // Generate subject + body
            const toLabel = (composeToRecipient || "FO") === "FO" ? "FO Clarification Request" : "Trade Inquiry";
            setComposeSubject(`${composeForTrade} — ${toLabel}`);

            // Generate pre-draft
            if (dsk === "CONFIRMATION" && (composeToRecipient || "FO") === "COUNTERPARTY") {
              const trade = data.trades.find(t => t.tradeRef === composeForTrade);
              if (trade) {
                setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${trade.tradeRef}\nCounterparty    : ${trade.counterparty}\nTrade Date      : ${new Date(trade.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(trade.valueDate).toLocaleDateString()}\nCurrency        : ${trade.currency}\nAmount          : ${formatAmount(trade.amount)}\nBuy/Sell        : ${trade.buySell}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
              }
            } else {
              setComposeBody("");
            }
            setComposeModalOpen(true);
          }
        });
    } else {
      // Normal load
      loadPersonalInbox(dsk, uid, ch).then(() => {
        if (tRef) {
          setTimeout(() => loadConversation(tRef, ch, null, true), 300);
        }
      });
    }

    // Setup Socket.io
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const socket = io(backendUrl || window.location.origin, { auth: { token: getToken() } });
    socket.emit("join_desk", dsk);

    socket.on("new_email", (data) => {
      console.log("New email via websocket:", data);
      const folder = currentFolderRef.current;
      let refreshPromise = Promise.resolve();
      if (folder === "inbox") refreshPromise = loadPersonalInbox(dsk, uid, ch);
      else if (folder === "group") refreshPromise = loadGroupInbox(dsk);

      refreshPromise.then(() => {
        const currentSel = selectedTradeRefRef.current;
        if (currentSel === data.tradeRef) {
          loadConversation(currentSel, ch, null, false);
        }
      });
    });

    socketRef.current = socket;

    // 5-second polling fallback
    const pollInterval = setInterval(() => {
      const folder = currentFolderRef.current;
      let refreshPromise = Promise.resolve();
      if (folder === "inbox") refreshPromise = loadPersonalInbox(dsk, uid, ch);
      else if (folder === "group") refreshPromise = loadGroupInbox(dsk);

      refreshPromise.then(() => {
        const currentSel = selectedTradeRefRef.current;
        if (currentSel && !replyModalOpen) {
          loadConversation(currentSel, ch, null, false);
        }
      });
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [searchParams]);

  // Keep refs in sync
  useEffect(() => { inboxDataRef.current = inboxData; }, [inboxData]);
  useEffect(() => { selectedTradeRefRef.current = selectedTradeRef; }, [selectedTradeRef]);
  useEffect(() => { currentFolderRef.current = currentFolder; }, [currentFolder]);

  // ========================================
  // FOLDER NAVIGATION
  // ========================================
  const switchFolder = (folder) => {
    setCurrentFolder(folder);
    currentFolderRef.current = folder;
    setSelectedTradeRef(null);
    selectedTradeRefRef.current = null;
    setCurrentTrade(null);
    setCurrentMessages([]);
    lastRenderedInboxDataStr.current = "";

    if (folder === "inbox") {
      loadPersonalInbox(desk, userId, channel);
    } else if (folder === "group") {
      if (channel === "FO") {
        setInboxData([]);
      } else {
        loadGroupInbox(desk);
      }
    } else {
      setInboxData([]);
    }
  };

  const folderTitle = () => {
    if (channel === "FO") return "Front Office Communications";
    const titles = { inbox: "Inbox", group: "Group Inbox", sent: "Sent", drafts: "Drafts", deleted: "Deleted Items" };
    return titles[currentFolder] || currentFolder;
  };

  // ========================================
  // CLOSE MAILBOX
  // ========================================
  const closeMailbox = () => {
    window.close();
    setTimeout(() => {
      router.push(`/workstation?userId=${encodeURIComponent(userId)}&desk=${encodeURIComponent(desk)}`);
    }, 300);
  };

  // ========================================
  // RESOLVE BUTTON LOGIC
  // ========================================
  const getResolveState = () => {
    if (!currentTrade) return { disabled: true, text: "✅ Resolve & Return to MO", statusText: "" };

    if (currentTrade.currentStatus === "CONFIRMATION_PENDING" ||
        (currentTrade.conversation && currentTrade.conversation.status === "RESOLVED")) {
      return { disabled: true, text: "✅ Resolve & Return to MO", statusText: "✅ Already resolved" };
    }

    if (desk === "CONFIRMATION") {
      if (channel === "FO") {
        if (!currentTrade.foResponseReceived) {
          return { disabled: true, text: "✅ Return to Workstation", statusText: "⏳ Awaiting FO response...", isClose: true };
        }
        return { disabled: false, text: "✅ Return to Workstation", statusText: "✅ FO has responded — please action from Workstation", isClose: true };
      }
      if (!currentTrade.cptyResponseReceived) {
        return { disabled: true, text: "✅ Return to Workstation", statusText: "⏳ Awaiting CPTY response...", isClose: true };
      }
      return { disabled: false, text: "✅ Return to Workstation", statusText: "✅ CPTY has responded — please action from Workstation", isClose: true };
    }

    // MO Desk
    if (!currentTrade.foResponseReceived) {
      return { disabled: true, text: "✅ Resolve & Return to MO", statusText: "⏳ Awaiting FO response..." };
    }
    if (currentTrade.currentStatus === "MO_PENDING") {
      return { disabled: true, text: "✅ Resolve & Return to MO", statusText: "✅ FO RESPONDED (Clean) — Please validate from Workstation" };
    }
    return { disabled: false, text: "✅ Resolve & Return to MO", statusText: "FO has responded (Discrepancy) — ready to resolve" };
  };

  const resolveConversation = () => {
    if (!selectedTradeRef) return alert("No trade selected");
    fetch("/api/conversation/resolve", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tradeRef: selectedTradeRef, userId })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) return alert(data.error || "Resolve failed");
      alert("✅ " + data.message);
      loadConversation(selectedTradeRef, channel, null, false);
    });
  };

  // ========================================
  // REPLY MODAL
  // ========================================
  const openReplyModal = () => {
    if (!selectedTradeRef || !currentTrade) return alert("Select an email first");
    setReplyBody("");
    setReplyModalOpen(true);
  };

  const sendReply = () => {
    if (!replyBody.trim()) return alert("Email content cannot be empty");
    if (!selectedTradeRef) return alert("No trade selected");
    const endpoint = channel === "FO" ? "/api/fo-channel/send" : "/api/conversation/send";
    fetch(endpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tradeRef: selectedTradeRef, sender: userId, message: replyBody, desk })
    }).then(() => {
      setReplyModalOpen(false);
      setReplyBody("");
      loadConversation(selectedTradeRef, channel, null, true);
    });
  };

  // ========================================
  // COMPOSE MODAL
  // ========================================
  const openNewCompose = () => {
    setComposeTo(desk === "CONFIRMATION" ? "COUNTERPARTY" : "FO");
    setComposeToDisabled(false);
    setComposeBody("");
    setComposeSubject("");
    fetch(`/api/queue/my?userId=${encodeURIComponent(userId)}`, {
      headers: { "Authorization": "Bearer " + getToken() }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.trades) {
          setComposeTrades(data.trades);
          if (data.trades.length > 0) {
            setComposeTrade(data.trades[0].tradeRef);
            const toVal = desk === "CONFIRMATION" ? "COUNTERPARTY" : "FO";
            const toLabel = toVal === "FO" ? "FO Clarification Request" : "Trade Inquiry";
            setComposeSubject(`${data.trades[0].tradeRef} — ${toLabel}`);
            // Generate pre-draft
            if (desk === "CONFIRMATION" && toVal === "COUNTERPARTY") {
              const t = data.trades[0];
              setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${t.tradeRef}\nCounterparty    : ${t.counterparty}\nTrade Date      : ${new Date(t.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(t.valueDate).toLocaleDateString()}\nCurrency        : ${t.currency}\nAmount          : ${formatAmount(t.amount)}\nBuy/Sell        : ${t.buySell}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
            }
          }
        }
        setComposeModalOpen(true);
      });
  };

  const handleComposeTradeChange = (newTradeRef) => {
    setComposeTrade(newTradeRef);
    const toLabel = composeTo === "FO" ? "FO Clarification Request" : "Trade Inquiry";
    setComposeSubject(`${newTradeRef} — ${toLabel}`);
    // Generate pre-draft
    if (desk === "CONFIRMATION" && composeTo === "COUNTERPARTY") {
      const trade = composeTrades.find(t => t.tradeRef === newTradeRef);
      if (trade) {
        setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${trade.tradeRef}\nCounterparty    : ${trade.counterparty}\nTrade Date      : ${new Date(trade.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(trade.valueDate).toLocaleDateString()}\nCurrency        : ${trade.currency}\nAmount          : ${formatAmount(trade.amount)}\nBuy/Sell        : ${trade.buySell}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
      }
    } else {
      setComposeBody("");
    }
  };

  const handleComposeToChange = (newTo) => {
    setComposeTo(newTo);
    const toLabel = newTo === "FO" ? "FO Clarification Request" : "Trade Inquiry";
    setComposeSubject(`${composeTrade} — ${toLabel}`);
    if (desk === "CONFIRMATION" && newTo === "COUNTERPARTY") {
      const trade = composeTrades.find(t => t.tradeRef === composeTrade);
      if (trade) {
        setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${trade.tradeRef}\nCounterparty    : ${trade.counterparty}\nTrade Date      : ${new Date(trade.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(trade.valueDate).toLocaleDateString()}\nCurrency        : ${trade.currency}\nAmount          : ${formatAmount(trade.amount)}\nBuy/Sell        : ${trade.buySell}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
      }
    } else {
      setComposeBody("");
    }
  };

  const sendCompose = () => {
    if (!composeTrade) return alert("Select a trade");
    if (!composeBody.trim()) return alert("Email body cannot be empty");

    const composeAction = searchParams.get("composeAction");

    if (composeAction) {
      fetch("/api/trade/action", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ trade: { tradeRef: composeTrade }, action: composeAction, comment: composeBody })
      }).then(() => {
        setComposeModalOpen(false);
        setSelectedTradeRef(composeTrade);
        selectedTradeRefRef.current = composeTrade;
        const folder = currentFolderRef.current;
        if (folder === "inbox") loadPersonalInbox(desk, userId, channel);
        else if (folder === "group" && channel !== "FO") loadGroupInbox(desk);
        setTimeout(() => loadConversation(composeTrade, channel, null, true), 500);
      });
      return;
    }

    const endpoint = channel === "FO" ? "/api/fo-channel/send" : "/api/conversation/send";
    fetch(endpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tradeRef: composeTrade, sender: userId, message: composeBody, desk })
    }).then(() => {
      setComposeModalOpen(false);
      setSelectedTradeRef(composeTrade);
      selectedTradeRefRef.current = composeTrade;
      const folder = currentFolderRef.current;
      if (folder === "inbox") loadPersonalInbox(desk, userId, channel);
      else if (folder === "group" && channel !== "FO") loadGroupInbox(desk);
      setTimeout(() => loadConversation(composeTrade, channel, null, true), 500);
    });
  };

  // ========================================
  // SEARCH FILTER
  // ========================================
  const filteredInbox = inboxData.filter(item => {
    if (!searchQuery) return true;
    const val = searchQuery.toLowerCase();
    const tradeRef = item.trade.tradeRef.toLowerCase();
    const subject = item.subject.toLowerCase();
    const counterparty = (item.trade.counterparty || "").toLowerCase();
    const lastBody = (item.lastMsg.body || "").toLowerCase();
    let senderLabel = "";
    if (item.lastMsg.sender === "FO") senderLabel = "front office";
    if (item.lastMsg.sender === "COUNTERPARTY") senderLabel = (item.trade.counterparty || "counterparty").toLowerCase();
    if (item.lastMsg.sender === "USER") senderLabel = (userId || "").toLowerCase();
    return tradeRef.includes(val) || subject.includes(val) || counterparty.includes(val) || lastBody.includes(val) || senderLabel.includes(val);
  });

  // ========================================
  // RESOLVE STATE
  // ========================================
  const resolveState = getResolveState();

  // ========================================
  // RENDER
  // ========================================
  if (!userId) return null;

  return (
    <div style={{fontFamily:"'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background:"#f3f2f1", color:"#323130", overflow:"hidden", height:"100vh"}}>

      {/* ========== HEADER ========== */}
      <div className="header">
        <div className="header-left">
          <div className="header-logo">{channel === "FO" ? "💬 SGB FO Chat" : "✉ SGB OpsMail"}</div>
        </div>
        <div className="header-right">
          <div className="header-user">
            {channel === "FO" ? `${desk} Desk | FO Internal Channel` : `${desk || ""} Desk | Welcome, ${userId}`}
          </div>
          <div className="header-date">{todayDate}</div>
          <button className="btn-close-tab" onClick={closeMailbox}>✕ Close</button>
        </div>
      </div>

      {/* ========== MAIN 3-PANEL LAYOUT ========== */}
      <div className="main">

        {/* LEFT: FOLDER NAV */}
        <div className="folder-nav">
          {[
            { key: "inbox", icon: "📥", label: "Inbox" },
            { key: "group", icon: "👥", label: "Group Inbox" },
          ].map(f => (
            <div key={f.key} className={`folder-item ${currentFolder === f.key ? "active" : ""}`} onClick={() => switchFolder(f.key)}>
              <span className="folder-icon">{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
          <div className="folder-divider" />
          {[
            { key: "sent", icon: "📤", label: "Sent" },
            { key: "drafts", icon: "📝", label: "Drafts" },
            { key: "deleted", icon: "🗑️", label: "Deleted Items" },
          ].map(f => (
            <div key={f.key} className={`folder-item ${currentFolder === f.key ? "active" : ""}`} onClick={() => switchFolder(f.key)}>
              <span className="folder-icon">{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* MIDDLE: EMAIL LIST */}
        <div className="email-list-panel">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input type="text" className="search-input" placeholder="Search mail (subject, sender, content...)"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="email-list-toolbar">
            <span className="toolbar-title">{folderTitle()}</span>
          </div>
          <div className="email-list">
            {(currentFolder === "inbox" || currentFolder === "group") ? (
              filteredInbox.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📭</div><div>No emails in this folder</div></div>
              ) : (
                filteredInbox.map(item => {
                  const senderInfo = (() => {
                    if (item.lastMsg.sender === userId) return { name: "You" };
                    if (item.lastMsg.sender === "FO") return { name: "Front Office" };
                    if (item.lastMsg.sender === "COUNTERPARTY" || item.lastMsg.sender === "CPTY") return { name: (item.trade.counterparty || "Cpty") + " Ops" };
                    return { name: item.lastMsg.sender };
                  })();
                  const time = formatDate(item.lastMsg.timestamp);
                  const badge = getStatusBadge(item.trade);
                  const preview = item.lastMsg.body.substring(0, 80).replace(/\n/g, " ").replace(/<[^>]*>/g, "");
                  const isUnread = item.lastMsg.sender !== userId;
                  return (
                    <div key={item.trade.tradeRef}
                      className={`email-item ${selectedTradeRef === item.trade.tradeRef ? "selected" : ""} ${isUnread ? "unread" : ""}`}
                      onClick={() => loadConversation(item.trade.tradeRef, channel, null, true)}>
                      <div className="email-item-top">
                        <span className="email-sender">{senderInfo.name}</span>
                        <span className="email-time">{time}</span>
                      </div>
                      <div className="email-subject-row">
                        <span className="email-subject">{item.subject}</span>
                        {badge}
                      </div>
                      <div className="email-preview">{preview}</div>
                    </div>
                  );
                })
              )
            ) : (
              <div className="empty-state">
                <div className="empty-icon">{currentFolder === "sent" ? "📤" : currentFolder === "drafts" ? "📝" : "🗑️"}</div>
                <div>{currentFolder === "sent" ? "No sent items" : currentFolder === "drafts" ? "No drafts" : "No deleted items"}</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: READING PANE */}
        <div className="reading-pane">
          {!selectedTradeRef || !currentTrade ? (
            <div className="reading-pane-empty">
              <div className="rp-icon">✉</div>
              <div className="rp-text">Select an email to read</div>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
              {/* Subject Header */}
              <div className="email-header">
                <div className="email-header-subject">{buildSubject(currentTrade)}</div>
                <div className="email-header-meta">
                  <div className="meta-item"><span className="meta-label">Status:</span> {currentTrade.currentStatus || "N/A"}</div>
                  <div className="meta-item"><span className="meta-label">Messages:</span> {currentMessages.length}</div>
                  {currentTrade.counterparty && <div className="meta-item"><span className="meta-label">Counterparty:</span> {currentTrade.counterparty}</div>}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="email-actions-bar">
                <button className="btn-action primary" onClick={openReplyModal}>↩ Reply</button>
                <button className="btn-action resolve" disabled={resolveState.disabled}
                  onClick={resolveState.isClose ? () => window.close() : resolveConversation}>
                  {resolveState.text}
                </button>
                <span className="resolve-status">{resolveState.statusText}</span>
              </div>

              {/* Email Thread */}
              <div className="email-thread">
                {currentMessages.length === 0 ? (
                  <div className="empty-state" style={{padding:"40px"}}><div className="empty-icon">💬</div><div>No messages yet</div></div>
                ) : (
                  currentMessages.map((msg, idx) => {
                    const isLatest = idx === currentMessages.length - 1;
                    const sender = getSenderInfo(msg.sender, currentTrade);
                    let msgMoUser = userId;
                    for (let i = idx; i >= 0; i--) {
                      const pastMsg = currentMessages[i];
                      if (pastMsg.sender !== "FO" && pastMsg.sender !== "CPTY" && pastMsg.sender !== "COUNTERPARTY") {
                        msgMoUser = pastMsg.sender;
                        break;
                      }
                    }
                    const toLabel = getRecipientLabel(msg.sender, currentTrade, desk, channel, userId, msgMoUser);
                    const snippet = msg.body.substring(0, 60).replace(/\n/g, " ").replace(/<[^>]*>/g, "");
                    const [collapsed, setCollapsed] = [!isLatest, null]; // Default collapsed state
                    return (
                      <ThreadEmail key={idx} msg={msg} sender={sender} toLabel={toLabel} isLatest={isLatest} snippet={snippet} formatDateFull={formatDateFull} />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== REPLY MODAL ========== */}
      {replyModalOpen && (
        <>
          <div className="modal-overlay" onClick={() => setReplyModalOpen(false)} />
          <div className="compose-modal" style={{display:"flex"}}>
            <div className="compose-titlebar">
              <span className="compose-titlebar-text">↩ Reply — {currentTrade?.tradeRef}</span>
              <button className="compose-close" onClick={() => setReplyModalOpen(false)}>✕</button>
            </div>
            <div className="compose-fields">
              <div className="compose-field-row">
                <span className="compose-label">From:</span>
                <span className="compose-value-text">{userId} &lt;{getSenderInfo(userId, currentTrade).email}&gt;</span>
              </div>
              <div className="compose-field-row">
                <span className="compose-label">To:</span>
                <span className="compose-value-text">
                  {(() => {
                    const lastMsg = currentMessages.length ? currentMessages[currentMessages.length - 1] : null;
                    if (lastMsg && (lastMsg.sender === "FO" || lastMsg.sender === "CPTY" || lastMsg.sender === "COUNTERPARTY")) {
                      const s = getSenderInfo(lastMsg.sender, currentTrade);
                      return `${s.name} <${s.email}>`;
                    }
                    return getRecipientLabel(userId, currentTrade, desk, channel, userId, null);
                  })()}
                </span>
              </div>
              <div className="compose-field-row">
                <span className="compose-label">Subject:</span>
                <input type="text" className="compose-value" readOnly value={"RE: " + buildSubject(currentTrade)} />
              </div>
            </div>
            <div className="compose-body-area">
              <textarea className="compose-textarea" placeholder="Type your reply here..."
                value={replyBody} onChange={e => setReplyBody(e.target.value)} autoFocus />
              {currentMessages.length > 0 && (
                <div className="compose-quoted">
                  <div className="quoted-header">— Previous messages —</div>
                  {[...currentMessages].reverse().map((msg, i) => {
                    const s = getSenderInfo(msg.sender, currentTrade);
                    return (
                      <div key={i} className="quoted-message">
                        <span className="qm-from">{s.name}</span>
                        <span className="qm-date">{formatDateFull(msg.timestamp)}</span>
                        <div className="qm-body">{msg.body.replace(/<[^>]*>/g, "")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="compose-footer">
              <button className="btn-send" onClick={sendReply}>Send</button>
              <button className="btn-discard" onClick={() => setReplyModalOpen(false)}>Discard</button>
            </div>
          </div>
        </>
      )}

      {/* ========== COMPOSE MODAL ========== */}
      {composeModalOpen && (
        <>
          <div className="modal-overlay" onClick={() => setComposeModalOpen(false)} />
          <div className="compose-modal" style={{display:"flex"}}>
            <div className="compose-titlebar">
              <span className="compose-titlebar-text">✏️ New Email</span>
              <button className="compose-close" onClick={() => setComposeModalOpen(false)}>✕</button>
            </div>
            <div className="compose-fields">
              <div className="compose-field-row">
                <span className="compose-label">From:</span>
                <span className="compose-value-text">{userId} &lt;{getSenderInfo(userId, currentTrade).email}&gt;</span>
              </div>
              <div className="compose-field-row">
                <span className="compose-label">To:</span>
                <select className="compose-value" value={composeTo} disabled={composeToDisabled}
                  onChange={e => handleComposeToChange(e.target.value)}>
                  <option value="FO">Front Office Trading Desk &lt;fo.trading@sgb.com&gt;</option>
                  <option value="COUNTERPARTY">Counterparty Operations</option>
                </select>
              </div>
              <div className="compose-field-row">
                <span className="compose-label">Trade:</span>
                <select className="compose-value" value={composeTrade}
                  onChange={e => handleComposeTradeChange(e.target.value)}>
                  {composeTrades.map(t => (
                    <option key={t.tradeRef} value={t.tradeRef}>
                      {t.tradeRef} — {t.counterparty} — {t.currency} {formatAmount(t.amount)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="compose-field-row">
                <span className="compose-label">Subject:</span>
                <input type="text" className="compose-value" value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)} placeholder="Enter subject..." />
              </div>
            </div>
            <div className="compose-body-area">
              <textarea className="compose-textarea" placeholder="Compose your email..."
                value={composeBody} onChange={e => setComposeBody(e.target.value)} autoFocus />
            </div>
            <div className="compose-footer">
              <button className="btn-send" onClick={sendCompose}>Send</button>
              <button className="btn-discard" onClick={() => setComposeModalOpen(false)}>Discard</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ========================================
// Thread Email Sub-Component (handles collapse toggle)
// ========================================
function ThreadEmail({ msg, sender, toLabel, isLatest, snippet, formatDateFull }) {
  const [collapsed, setCollapsed] = useState(!isLatest);
  return (
    <div className={`thread-email ${isLatest ? "latest" : ""} ${collapsed ? "collapsed" : ""}`}>
      <div className="thread-email-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="thread-avatar" style={{background: sender.color}}>{sender.initials}</div>
        <div className="thread-meta">
          <div className="thread-from-row">
            <span className="thread-sender">{sender.name}</span>
            <span className="thread-date">{formatDateFull(msg.timestamp)}</span>
          </div>
          <div className="thread-to">To: {toLabel}</div>
          {collapsed && <div className="thread-snippet">{snippet}...</div>}
        </div>
        <span className="collapse-arrow">▶</span>
      </div>
      <div className="thread-email-body" dangerouslySetInnerHTML={{__html: msg.body}} />
    </div>
  );
}

export default function CommunicationPage() {
  return (
    <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Segoe UI",color:"#605e5c"}}>⏳ Loading mailbox...</div>}>
      <CommunicationComponent />
    </Suspense>
  );
}
