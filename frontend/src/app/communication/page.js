"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadUserId, getToken, authHeaders } from "../../lib/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import "./page.css";
import FolderNav from "./components/FolderNav";
import InboxList from "./components/InboxList";
import MessageThread from "./components/MessageThread";
import ComposeModal from "./components/ComposeModal";
import ReplyModal from "./components/ReplyModal";
import { formatDate, formatDateFull, formatAmount, buildSubject, getSenderInfo, getRecipientLabel, getStatusBadge } from "./components/utils";

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
  const [isLoading, setIsLoading] = useState(true);

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

  // Loading states
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isSendingCompose, setIsSendingCompose] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Refs for latest values in callbacks
  const socketRef = useRef(null);
  const inboxDataRef = useRef([]);
  const selectedTradeRefRef = useRef(null);
  const currentFolderRef = useRef("inbox");
  const lastRenderedInboxDataStr = useRef("");

  // ========================================
  // AUTH HELPERS (shared via lib/auth)
  // ========================================

  // ========================================
  // FORMATTERS (identical to original)
  // ========================================
  // Imported from ./components/utils.js

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
  // LOAD INTERNAL SYSTEM MAILBOX (Inbox-only)
  // ========================================
  const loadSystemInbox = useCallback(() => {
    return fetch(`/api/system-mailbox/list`, { headers: { "Authorization": "Bearer " + getToken() } })
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

    // System mailbox messages are already loaded with the inbox list — no per-thread fetch.
    if (ch === "SYSTEM") {
      setCurrentMessages(inboxItem ? inboxItem.conversation.messages : []);
      return;
    }

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
    const uid = loadUserId();
    const dsk = searchParams.get("desk");
    const tRef = searchParams.get("tradeRef");
    const ch = searchParams.get("channel");

    if (!uid) {
      toast.error("Session expired. Login again.");
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
        loadPersonalInbox(dsk, uid, ch).finally(() => setIsLoading(false));
      } else {
        loadGroupInbox(dsk).finally(() => setIsLoading(false));
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
                setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${trade.tradeRef}\nCounterparty    : ${trade.counterparty}\nTrade Date      : ${new Date(trade.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(trade.valueDate).toLocaleDateString()}\nCurrency        : ${trade.currency}\nAmount          : ${formatAmount(trade.amount)}\nBuy/Sell        : ${trade.direction}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
              }
            } else if (dsk === "SETTLEMENT" && (composeToRecipient || "FO") === "COUNTERPARTY") {
              const trade = data.trades.find(t => t.tradeRef === composeForTrade);
              if (trade) {
                setComposeBody(`Dear Counterparty,\n\nWe are preparing to settle trade ${trade.tradeRef}. Please confirm your Standard Settlement Instructions (SSI ID) for this transaction so we can verify our system details before approving settlement.\n\nRegards,\nSettlement Desk`);
              }
            } else {
              setComposeBody("");
            }
            setComposeModalOpen(true);
          }
        });
    } else if (ch === "SYSTEM") {
      // Internal System Mailbox
      setIsLoading(true);
      loadSystemInbox().then((mapped) => {
        setIsLoading(false);
        if (tRef) {
          setTimeout(() => loadConversation(tRef, ch, mapped, true), 300);
        }
      });
    } else {
      // Normal load
      setIsLoading(true);
      loadPersonalInbox(dsk, uid, ch).then(() => {
        setIsLoading(false);
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
      if (ch === "SYSTEM") refreshPromise = loadSystemInbox();
      else if (folder === "inbox") refreshPromise = loadPersonalInbox(dsk, uid, ch);
      else if (folder === "group") refreshPromise = loadGroupInbox(dsk);

      refreshPromise.then(() => {
        const currentSel = selectedTradeRefRef.current;
        if (currentSel === data.tradeRef) {
          loadConversation(currentSel, ch, null, false);
        }
      });
    });

    // Internal System Mailbox notifications
    socket.on("new_system_mail", () => {
      if (ch !== "SYSTEM") return;
      loadSystemInbox().then(() => {
        const currentSel = selectedTradeRefRef.current;
        if (currentSel) loadConversation(currentSel, ch, null, false);
      });
    });

    socketRef.current = socket;

    // 5-second polling fallback
    const pollInterval = setInterval(() => {
      const folder = currentFolderRef.current;
      let refreshPromise = Promise.resolve();
      if (ch === "SYSTEM") refreshPromise = loadSystemInbox();
      else if (folder === "inbox") refreshPromise = loadPersonalInbox(dsk, uid, ch);
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
    setIsLoading(true);

    if (folder === "inbox") {
      loadPersonalInbox(desk, userId, channel).finally(() => setIsLoading(false));
    } else if (folder === "group") {
      if (channel === "FO") {
        setInboxData([]);
        setIsLoading(false);
      } else {
        loadGroupInbox(desk).finally(() => setIsLoading(false));
      }
    } else {
      setInboxData([]);
      setIsLoading(false);
    }
  };

  const folderTitle = () => {
    if (channel === "SYSTEM") return "System Notifications";
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
    if (!selectedTradeRef) return toast.error("No trade selected");
    setIsResolving(true);
    fetch("/api/conversation/resolve", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tradeRef: selectedTradeRef, userId })
    })
    .then(res => res.json())
    .then(data => {
      setIsResolving(false);
      if (!data.success) return toast.error(data.error || "Resolve failed");
      toast.success("✅ " + data.message);
      loadConversation(selectedTradeRef, channel, null, false);
    });
  };

  // ========================================
  // REPLY MODAL
  // ========================================
  const openReplyModal = () => {
    if (!selectedTradeRef || !currentTrade) return toast.error("Select an email first");
    setReplyBody("");
    setReplyModalOpen(true);
  };

  const sendReply = () => {
    if (!replyBody.trim()) return toast.error("Email content cannot be empty");
    if (!selectedTradeRef) return toast.error("No trade selected");
    setIsSendingReply(true);
    const endpoint = channel === "FO" ? "/api/fo-channel/send" : "/api/conversation/send";
    fetch(endpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tradeRef: selectedTradeRef, sender: userId, message: replyBody, desk })
    }).then(() => {
      setIsSendingReply(false);
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
              setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${t.tradeRef}\nCounterparty    : ${t.counterparty}\nTrade Date      : ${new Date(t.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(t.valueDate).toLocaleDateString()}\nCurrency        : ${t.currency}\nAmount          : ${formatAmount(t.amount)}\nBuy/Sell        : ${t.direction}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
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
        setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${trade.tradeRef}\nCounterparty    : ${trade.counterparty}\nTrade Date      : ${new Date(trade.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(trade.valueDate).toLocaleDateString()}\nCurrency        : ${trade.currency}\nAmount          : ${formatAmount(trade.amount)}\nBuy/Sell        : ${trade.direction}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
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
        setComposeBody(`Dear Counterparty,\n\nPlease verify our trade details for the below transaction:\n\n--------------------------------------------------\nTrade Reference : ${trade.tradeRef}\nCounterparty    : ${trade.counterparty}\nTrade Date      : ${new Date(trade.tradeDate).toLocaleDateString()}\nValue Date      : ${new Date(trade.valueDate).toLocaleDateString()}\nCurrency        : ${trade.currency}\nAmount          : ${formatAmount(trade.amount)}\nBuy/Sell        : ${trade.direction}\n--------------------------------------------------\n\nKindly confirm if the details match your records.\n\nRegards,\nConfirmation Desk`);
      }
    } else {
      setComposeBody("");
    }
  };

  const sendCompose = () => {
    if (!composeTrade) return toast.error("Select a trade");
    if (!composeBody.trim()) return toast.error("Email body cannot be empty");

    const composeAction = searchParams.get("composeAction");

    if (composeAction) {
      setIsSendingCompose(true);
      fetch("/api/trade/action", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ trade: { tradeRef: composeTrade }, action: composeAction, comment: composeBody })
      })
      .then(res => res.json())
      .then(data => {
        setIsSendingCompose(false);
        if (!data.success) {
          return toast.error(data.error || "Failed to send message");
        }
        setComposeModalOpen(false);
        setSelectedTradeRef(composeTrade);
        selectedTradeRefRef.current = composeTrade;
        const folder = currentFolderRef.current;
        if (folder === "inbox") loadPersonalInbox(desk, userId, channel);
        else if (folder === "group" && channel !== "FO") loadGroupInbox(desk);
        setTimeout(() => loadConversation(composeTrade, channel, null, true), 500);
      })
      .catch(err => {
        setIsSendingCompose(false);
        toast.error("Network error");
      });
      return;
    }

    setIsSendingCompose(true);
    const endpoint = channel === "FO" ? "/api/fo-channel/send" : "/api/conversation/send";
    fetch(endpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tradeRef: composeTrade, sender: userId, message: composeBody, desk })
    }).then(() => {
      setIsSendingCompose(false);
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
          <div className="header-logo">{channel === "SYSTEM" ? "🖥️ SGB System Mailbox" : channel === "FO" ? "💬 SGB FO Chat" : "✉ SGB OpsMail"}</div>
        </div>
        <div className="header-right">
          <div className="header-user">
            {channel === "SYSTEM" ? `${desk || ""} Desk | System Notifications` : channel === "FO" ? `${desk} Desk | FO Internal Channel` : `${desk || ""} Desk | Welcome, ${userId}`}
          </div>
          <div className="header-date">{todayDate}</div>
          <button className="btn-close-tab" onClick={closeMailbox}>✕ Close</button>
        </div>
      </div>

      {/* ========== MAIN 3-PANEL LAYOUT ========== */}
      <div className="main">
        <FolderNav channel={channel} currentFolder={currentFolder} switchFolder={switchFolder} />
        
        <InboxList
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} folderTitle={folderTitle}
          isLoading={isLoading} currentFolder={currentFolder} filteredInbox={filteredInbox}
          userId={userId} formatDate={formatDate} getStatusBadge={getStatusBadge}
          selectedTradeRef={selectedTradeRef} channel={channel} loadConversation={loadConversation}
        />

        <MessageThread
          selectedTradeRef={selectedTradeRef} currentTrade={currentTrade} buildSubject={buildSubject}
          currentMessages={currentMessages} openReplyModal={openReplyModal} resolveState={resolveState}
          resolveConversation={resolveConversation} getSenderInfo={getSenderInfo} userId={userId}
          desk={desk} channel={channel} getRecipientLabel={getRecipientLabel} formatDateFull={formatDateFull}
          isResolving={isResolving} readOnly={channel === "SYSTEM"}
        />
      </div>

      <ReplyModal
        replyModalOpen={replyModalOpen} setReplyModalOpen={setReplyModalOpen} currentTrade={currentTrade}
        userId={userId} getSenderInfo={getSenderInfo} currentMessages={currentMessages}
        getRecipientLabel={getRecipientLabel} desk={desk} channel={channel} buildSubject={buildSubject}
        replyBody={replyBody} setReplyBody={setReplyBody} formatDateFull={formatDateFull}
        sendReply={sendReply} isSendingReply={isSendingReply}
      />

      <ComposeModal
        composeModalOpen={composeModalOpen} setComposeModalOpen={setComposeModalOpen} userId={userId}
        getSenderInfo={getSenderInfo} currentTrade={currentTrade} composeTo={composeTo}
        composeToDisabled={composeToDisabled} handleComposeToChange={handleComposeToChange}
        composeTrade={composeTrade} handleComposeTradeChange={handleComposeTradeChange}
        composeTrades={composeTrades} formatAmount={formatAmount} composeSubject={composeSubject}
        setComposeSubject={setComposeSubject} composeBody={composeBody} setComposeBody={setComposeBody}
        sendCompose={sendCompose} isSendingCompose={isSendingCompose}
      />
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
