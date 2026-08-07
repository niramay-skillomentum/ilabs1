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
import SendSSIModal from "./components/SendSSIModal";
import EmailRedirectionWarningModal from "./components/EmailRedirectionWarningModal";
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

  const [sendSSIModalOpen, setSendSSIModalOpen] = useState(false);

  const [popupState, setPopupState] = useState({ type: null, isError: false, title: "", message: "" });

  // Compose modal state
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeToDisabled, setComposeToDisabled] = useState(false);
  const [composeTrade, setComposeTrade] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTrades, setComposeTrades] = useState([]);

  // Recipient validation states & helper
  const [warningModalData, setWarningModalData] = useState({ open: false });
  const [expectedRecipientData, setExpectedRecipientData] = useState(null);
  const [recipientOptions, setRecipientOptions] = useState([]);

  const fetchExpectedRecipient = useCallback((ref, dsk) => {
    if (!dsk) return;
    const tradeParam = ref ? `&tradeRef=${encodeURIComponent(ref)}` : "";
    fetch(`/api/conversation/expected-recipient?desk=${encodeURIComponent(dsk)}${tradeParam}`, {
      headers: authHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.expectedEmail) setExpectedRecipientData(data);
          if (Array.isArray(data.allRecipients) && data.allRecipients.length > 0) {
            setRecipientOptions(data.allRecipients);
          } else {
            const options = [];
            if (dsk === "MO") {
              const regions = [
                { code: "americas", label: "Americas" },
                { code: "emea", label: "EMEA" },
                { code: "apac", label: "APAC" }
              ];
              regions.forEach(r => {
                const email = `fo-operations-${r.code}@skillomentum.com`;
                options.push({ label: `Front Office Operations (${r.label}) <${email}>`, value: email });
              });
              options.push({ label: `Counterparty Operations <operations@citi.com>`, value: "operations@citi.com" });
            } else if (data.expectedEmail) {
              const target = data.expectedEmail;
              options.push({ label: `${data.counterparty || "Counterparty"} Operations <${target}>`, value: target });
              const decoys = [
                "operations@jpmorgan.com",
                "operations@hsbc.com",
                "operations@citi.com",
                "fo-operations-americas@skillomentum.com"
              ];
              decoys.forEach(d => {
                if (d.toLowerCase() !== target.toLowerCase()) {
                  const label = d.includes("fo-") ? `Front Office Desk <${d}>` : `External Operations <${d}>`;
                  options.push({ label, value: d });
                }
              });
            }
            setRecipientOptions(options);
          }
        }
      })
      .catch(err => console.error("Failed to fetch expected recipient:", err));
  }, []);

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
      : `/api/conversations/personal?userId=${encodeURIComponent(uid)}`;
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
    
    const uid = loadUserId();
    
    // API call to persist read state across sessions
    if (ch === "SYSTEM" || currentFolderRef.current === "system") {
      fetch("/api/system-mailbox/read", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tradeRef })
      });
    } else if (ch === "FO") {
      fetch("/api/fo-channel/read", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tradeRef })
      });
    } else {
      fetch("/api/conversation/read", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tradeRef })
      });
    }

    // Optimistic UI Update
    const data = currentInboxData || inboxDataRef.current;
    const newData = data.map(item => {
      if (item.trade.tradeRef === tradeRef) {
        if (ch === "SYSTEM" || currentFolderRef.current === "system") {
          item.conversation.read = true;
        } else {
          item.conversation.readBy = item.conversation.readBy || [];
          if (!item.conversation.readBy.includes(uid)) {
            item.conversation.readBy.push(uid);
          }
        }
      }
      return item;
    });
    setInboxData(newData);
    inboxDataRef.current = newData;

    const inboxItem = newData.find(i => i.trade.tradeRef === tradeRef);
    if (inboxItem) setCurrentTrade(inboxItem.trade);

    // System mailbox messages are already loaded with the inbox list — no per-thread fetch.
    if (ch === "SYSTEM" || currentFolderRef.current === "system") {
      const newMsgs = inboxItem ? inboxItem.conversation.messages : [];
      setCurrentMessages(prev => JSON.stringify(prev) === JSON.stringify(newMsgs) ? prev : newMsgs);
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
        setCurrentMessages(prev => JSON.stringify(prev) === JSON.stringify(msgs) ? prev : msgs);
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

    setTodayDate(new Date().toLocaleDateString());

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
            setComposeTo("");
            setComposeToDisabled(false);
            fetchExpectedRecipient(composeForTrade, dsk);
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
            
            // Clean up URL to prevent reopen on refresh
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("composeFor");
            newParams.delete("composeTo");
            newParams.delete("composeAction");
            window.history.replaceState(null, "", `/communication?${newParams.toString()}`);
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
    const socket = io(backendUrl, { auth: { token: getToken() } });
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

    socket.on("trade_update", (data) => {
      console.log("Trade update via websocket:", data);
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
      else if (folder === "system") refreshPromise = loadSystemInbox();
      else if (folder === "inbox") refreshPromise = loadPersonalInbox(dsk, uid, ch);
      else if (folder === "unread") {
        refreshPromise = loadPersonalInbox(dsk, uid, ch).then(mapped => {
          const unread = (mapped || []).filter(item => item.lastMsg && item.lastMsg.sender !== uid && !(item.conversation.readBy || []).includes(uid));
          setInboxData(unread);
          inboxDataRef.current = unread;
        });
      }
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
      // Cross-desk personal inbox
      loadPersonalInbox(desk, userId, channel).finally(() => setIsLoading(false));
    } else if (folder === "unread") {
      // Load personal inbox then client-filter to unread
      loadPersonalInbox(desk, userId, channel).then(mapped => {
        const unread = (mapped || []).filter(item => item.lastMsg && item.lastMsg.sender !== userId && !(item.conversation.readBy || []).includes(userId));
        setInboxData(unread);
        inboxDataRef.current = unread;
      }).finally(() => setIsLoading(false));
    } else if (folder === "flagged") {
      // Placeholder — no flagging yet
      setInboxData([]);
      setIsLoading(false);
    } else if (folder === "system") {
      loadSystemInbox().finally(() => setIsLoading(false));
    } else if (folder === "group" || folder.startsWith("group_")) {
      // Group inbox — desk-specific
      if (channel === "FO") {
        setInboxData([]);
        setIsLoading(false);
      } else {
        const groupDesk = folder.startsWith("group_") ? folder.replace("group_", "") : desk;
        loadGroupInbox(groupDesk).finally(() => setIsLoading(false));
      }
    } else {
      // Placeholder folders (sent, drafts, archive, deleted)
      setInboxData([]);
      setIsLoading(false);
    }
  };

  const DESK_LABELS = { SETTLEMENT: "Settlement", CONFIRMATION: "Confirmation", MO: "Middle Office", RECONCILIATION: "Reconciliation" };
  const folderTitle = () => {
    if (channel === "SYSTEM") return "System Notifications";
    if (channel === "FO") return "Front Office Communications";
    if (currentFolder === "inbox") return "Inbox";
    if (currentFolder === "unread") return "Unread";
    if (currentFolder === "flagged") return "Flagged";
    if (currentFolder.startsWith("group_")) {
      const deskKey = currentFolder.replace("group_", "");
      return `Group Inbox — ${DESK_LABELS[deskKey] || deskKey}`;
    }
    const titles = { group: "Group Inbox", sent: "Sent Items", drafts: "Drafts", archive: "Archive", deleted: "Deleted Items", system: "System Mails" };
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

    const targetDesk = currentTrade.mailStatus?.desk || desk;

    if (targetDesk === "CONFIRMATION") {
      const isFOConversation = channel === "FO" ||
                               currentTrade.currentStatus === "LIASING_WITH_FO" ||
                               (currentMessages && currentMessages.some(m => m.sender === "FO" || (m.sender && m.sender.includes("FO"))));
      if (isFOConversation) {
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

  const openSendSSIModal = () => {
    if (!selectedTradeRef || !currentTrade) return toast.error("Select an email first");
    setSendSSIModalOpen(true);
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
    }).then(res => res.json()).then((data) => {
      setIsSendingReply(false);
      setReplyModalOpen(false);
      setReplyBody("");
      
      if (!data.success) {
        setPopupState({ type: "feedback", isError: true, title: "⚠️ Action Denied", message: data.error || "Action failed" });
      } else if (data.warning) {
        setPopupState({ type: "feedback", isError: false, title: "⚠️ Warning", message: data.warning });
      }
      
      loadConversation(selectedTradeRef, channel, null, true);
    });
  };

  // ========================================
  // COMPOSE MODAL ACTIONS
  // ========================================
  const openNewCompose = () => {
    setComposeTo("");
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
            const firstRef = data.trades[0].tradeRef;
            setComposeTrade(firstRef);
            fetchExpectedRecipient(firstRef, desk);
            const toVal = desk === "CONFIRMATION" ? "COUNTERPARTY" : "FO";
            const toLabel = toVal === "FO" ? "FO Clarification Request" : "Trade Inquiry";
            setComposeSubject(`${firstRef} — ${toLabel}`);
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
    fetchExpectedRecipient(newTradeRef, desk);
    const toLabel = composeTo.includes("fo-") || composeTo === "FO" ? "FO Clarification Request" : "Trade Inquiry";
    setComposeSubject(`${newTradeRef} — ${toLabel}`);
    if (desk === "CONFIRMATION" && (composeTo.includes("operations@") || composeTo === "COUNTERPARTY")) {
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
    const toLabel = newTo.includes("fo-") || newTo === "FO" ? "FO Clarification Request" : "Trade Inquiry";
    setComposeSubject(`${composeTrade} — ${toLabel}`);
    if (desk === "CONFIRMATION" && (newTo.includes("operations@") || newTo === "COUNTERPARTY")) {
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
    if (!composeTo) return toast.error("Please select a recipient email in the To: field");
    if (!composeBody.trim()) return toast.error("Email body cannot be empty");

    if (expectedRecipientData && expectedRecipientData.expectedEmail) {
      const selectedEmail = String(composeTo).toLowerCase().trim();
      const targetEmail = String(expectedRecipientData.expectedEmail).toLowerCase().trim();
      if (selectedEmail !== targetEmail && selectedEmail !== "fo" && selectedEmail !== "counterparty") {
        setWarningModalData({
          open: true,
          title: expectedRecipientData.warningTitle || "Email Redirection Warning",
          message: expectedRecipientData.warningMessage,
          expectedEmail: targetEmail,
          submittedEmail: selectedEmail
        });
        return;
      }
    }

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
      body: JSON.stringify({ tradeRef: composeTrade, sender: userId, message: composeBody, desk, recipient: composeTo })
    })
    .then(res => res.json())
    .then((data) => {
      setIsSendingCompose(false);
      if (!data.success && (data.validationError || data.errorType === "EMAIL_REDIRECTION_WARNING")) {
        setWarningModalData({
          open: true,
          title: data.title || "Email Redirection Warning",
          message: data.message,
          expectedEmail: data.expectedEmail,
          submittedEmail: composeTo
        });
        return;
      }
      if (!data.success) {
        return toast.error(data.error || "Failed to send message");
      }
      toast.success("Email dispatched securely");
      setComposeModalOpen(false);
      
      if (!data.success) {
        setPopupState({ type: "feedback", isError: true, title: "⚠️ Action Denied", message: data.error || "Action failed" });
      } else if (data.warning) {
        setPopupState({ type: "feedback", isError: false, title: "⚠️ Warning", message: data.warning });
      }
      
      setSelectedTradeRef(composeTrade);
      selectedTradeRefRef.current = composeTrade;
      const folder = currentFolderRef.current;
      if (folder === "inbox") loadPersonalInbox(desk, userId, channel);
      else if (folder === "group" && channel !== "FO") loadGroupInbox(desk);
      setTimeout(() => loadConversation(composeTrade, channel, null, true), 500);
    })
    .catch(() => {
      setIsSendingCompose(false);
      toast.error("Network error during transmission");
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

  const userName = userId.split('@')[0].charAt(0).toUpperCase() + userId.split('@')[0].slice(1);

  return (
    <div style={{fontFamily:"'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background:"#f3f2f1", color:"#323130", overflow:"hidden", height:"100vh"}}>
      {/* ========== HEADER ========== */}
      <div className="header">
        <div className="header-left">
          <div className="header-logo">{channel === "SYSTEM" ? "🖥️ SGB System Mailbox" : channel === "FO" ? "💬 SGB FO Chat" : "✉ SGB Operations Mailbox"}</div>
        </div>
        <div className="header-right">
          <div className="header-user">
            {channel === "SYSTEM" ? `${desk || ""} Desk | System Notifications` : channel === "FO" ? `${desk} Desk | FO Internal Channel` : `${desk || ""} Desk | Welcome, ${userName}`}
          </div>
          <div className="header-date">{todayDate}</div>
          <button className="btn secondary" onClick={closeMailbox}>✕ Close</button>
        </div>
      </div>

      {/* ========== MAIN 3-PANEL LAYOUT ========== */}
      <div className="main">
        <FolderNav channel={channel} currentFolder={currentFolder} switchFolder={switchFolder} inboxData={inboxData} desk={desk} userId={userId} />
        
        <InboxList
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} folderTitle={folderTitle}
          isLoading={isLoading} currentFolder={currentFolder} filteredInbox={filteredInbox}
          userId={userId} formatDate={formatDate} getStatusBadge={getStatusBadge}
          selectedTradeRef={selectedTradeRef} channel={channel} loadConversation={loadConversation}
          openNewCompose={openNewCompose}
        />

        <MessageThread
          selectedTradeRef={selectedTradeRef} currentTrade={currentTrade} buildSubject={buildSubject}
          currentMessages={currentMessages} openReplyModal={openReplyModal} openSendSSIModal={openSendSSIModal} resolveState={resolveState}
          resolveConversation={resolveConversation} getSenderInfo={getSenderInfo} userId={userId}
          desk={desk} channel={channel} getRecipientLabel={getRecipientLabel} formatDateFull={formatDateFull}
          isResolving={isResolving} readOnly={channel === "SYSTEM"}
        />
      </div>

      <SendSSIModal 
        isOpen={sendSSIModalOpen} setIsOpen={setSendSSIModalOpen} currentTrade={currentTrade}
        userId={userId} desk={desk} channel={channel} sendReply={(body) => {
          setReplyBody(body);
          // Wait a tick for state to update then send
          setTimeout(() => {
            const endpoint = channel === "FO" ? "/api/fo-channel/send" : "/api/conversation/send";
            setIsSendingReply(true);
            fetch(endpoint, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({ tradeRef: selectedTradeRef, sender: userId, message: body, desk })
            }).then(() => {
              setIsSendingReply(false);
              setSendSSIModalOpen(false);
              loadConversation(selectedTradeRef, channel, null, true);
            });
          }, 0);
        }} isSendingReply={isSendingReply}
      />

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
        sendCompose={sendCompose} isSendingCompose={isSendingCompose} recipientOptions={recipientOptions}
      />

      <EmailRedirectionWarningModal
        open={warningModalData.open}
        title={warningModalData.title}
        message={warningModalData.message}
        expectedEmail={warningModalData.expectedEmail}
        submittedEmail={warningModalData.submittedEmail}
        onClose={() => setWarningModalData({ open: false })}
      />

      {popupState.type === "feedback" && (
        <div className="popup" style={{ display: 'block', maxWidth: '400px' }}>
          <button style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }} onClick={() => setPopupState({ type: null })}>✕</button>
          <h3 style={{ marginBottom: '15px', color: popupState.isError ? '#dc2626' : '#f59e0b', paddingRight: '20px' }}>
            {popupState.title || (popupState.isError ? '⚠️ Action Denied' : '⚠️ Warning')}
          </h3>
          <div style={{ color: '#475569', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
            {popupState.message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={() => setPopupState({ type: null })}>Understood</button>
          </div>
        </div>
      )}
      
      {popupState.type && (
        <div className="overlay" onClick={() => setPopupState({ type: null })} />
      )}
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
