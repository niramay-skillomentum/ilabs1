"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const TRANSIENT_STATUSES = ["PENDING_AMENDMENT", "PENDING_APPROVAL"];

function BilateralDashboardContent() {
  const searchParams = useSearchParams();
  const tradeRef = searchParams.get("tradeRef");
  const router = useRouter();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef(null);

  const fetchTrade = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch(`/api/settlement/bilateral/${tradeRef}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTrade(data.trade);
      } else {
        toast.error(data.error || "Failed to load trade");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tradeRef]);

  useEffect(() => {
    if (tradeRef) {
      fetchTrade();
    } else {
      router.push("/workstation");
    }
  }, [tradeRef, fetchTrade, router]);

  // Poll while the trade is being processed by the system (amendment / verification)
  useEffect(() => {
    if (trade && TRANSIENT_STATUSES.includes(trade.currentStatus)) {
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchTrade, 3000);
      }
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [trade, fetchTrade]);

  // Legacy actions that still post to /bilateral/action (RAISE_BREAK, MAIL_CPTY, direct APPROVE)
  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch(`/api/settlement/bilateral/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tradeRef, action })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Success");
        if (data.trade) setTrade(data.trade);
        if (action === "MAIL_CPTY") router.push(`/communication?desk=SETTLEMENT&tradeRef=${tradeRef}`);
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // New system-workflow endpoints (/amend, /send-for-approval, /settle)
  const callWorkflow = async (path, successMsg) => {
    setActionLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch(`/api/settlement/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tradeRef, settlementType: "BILATERAL" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(successMsg);
        await fetchTrade();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openSystemMailbox = () => {
    window.open(`/communication?channel=SYSTEM&desk=SETTLEMENT&tradeRef=${encodeURIComponent(tradeRef)}`, "_blank");
  };

  if (loading) return <div className="p-8 text-white">Loading Bilateral Dashboard...</div>;
  if (!trade) return <div className="p-8 text-white">Trade not found.</div>;

  const status = trade.currentStatus;
  const system = trade.settlementDetails || {};
  const truth = trade.truths?.settlement || {};
  const fields = [
    { key: "beneficiaryName", label: "Beneficiary Name" },
    { key: "beneficiaryBank", label: "Beneficiary Bank" },
    { key: "beneficiaryBIC", label: "Beneficiary BIC" },
    { key: "accountNumber", label: "Account Number" },
    { key: "accountType", label: "Account Type" },
    { key: "currency", label: "Currency" },
    { key: "settlementMethod", label: "Settlement Method" },
    { key: "correspondentBank", label: "Correspondent Bank" },
    { key: "paymentReference", label: "Payment Ref" }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Bilateral Settlement Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300">
              Ref: <span className="font-mono text-white">{trade.tradeRef}</span>
            </span>
            <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300">
              Status: <span className="font-semibold text-blue-400">{status}</span>
            </span>
            <button onClick={openSystemMailbox}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded text-sm transition-colors">
              🖥️ System Mailbox
            </button>
            <button onClick={() => router.push("/workstation")}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
              Back to Workstation
            </button>
          </div>
        </div>

        {/* Verification failure banner */}
        {status === "REJECTED_REVERIFY" && (
          <div className="mb-6 bg-red-950/60 border border-red-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-red-300 mb-2">⚠ Verification Failed</h3>
            <p className="text-sm text-red-200 mb-3">The System Verification Bot rejected this trade for the following reasons. Correct the details and resubmit for approval.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-100">
              {(trade.verificationErrors || []).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* System Details */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
              <h2 className="text-xl font-semibold">System Details (Booking)</h2>
            </div>
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.key} className="flex justify-between border-b border-gray-700/50 pb-1">
                  <span className="text-gray-400 text-sm">{f.label}</span>
                  <span className="font-mono text-sm">{system[f.key] || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Truth Details */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 relative shadow-xl">
            {status === "SETTLED" && (
              <div className="absolute inset-0 bg-green-900/20 rounded-lg flex items-center justify-center pointer-events-none">
                <span className="text-6xl opacity-20">✅</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
              <h2 className="text-xl font-semibold">Truth Details (Expected)</h2>
              <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-700">
                Strict Confidential
              </span>
            </div>
            <div className="space-y-3">
              {fields.map(f => {
                const isMismatch = system[f.key] !== truth[f.key];
                return (
                  <div key={f.key} className="flex justify-between border-b border-gray-700/50 pb-1">
                    <span className="text-gray-400 text-sm">{f.label}</span>
                    <span className={`font-mono text-sm ${isMismatch ? "text-red-400 font-bold" : "text-green-400"}`}>
                      {truth[f.key] || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-wrap gap-4 items-center justify-center shadow-xl">
          {/* Clean / pre-break: direct approve or raise a break */}
          {status === "SETTLEMENT_PENDING" && (
            <>
              <button onClick={() => handleAction("APPROVE_SETTLEMENT")} disabled={actionLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
                Approve Settlement
              </button>
              <button onClick={() => handleAction("RAISE_BREAK")} disabled={actionLoading}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
                Raise Break
              </button>
            </>
          )}

          {/* Break raised: send to system for amendment (replaces Edit) or mail CPTY */}
          {status === "SETTLEMENT_BREAK" && (
            <>
              <button onClick={() => callWorkflow("amend", "Sent to System for Amendment")} disabled={actionLoading}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
                Send to System for Amendment
              </button>
              <button onClick={() => handleAction("MAIL_CPTY")} disabled={actionLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
                Mail CPTY
              </button>
            </>
          )}

          {status === "PENDING_AMENDMENT" && (
            <div className="text-yellow-300 font-medium flex items-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>System is processing the amendment… awaiting confirmation in the System Mailbox.</span>
            </div>
          )}

          {status === "AMENDED" && (
            <button onClick={() => callWorkflow("send-for-approval", "Sent for Approval — System Verification Bot is reviewing")}
              disabled={actionLoading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
              Send for Approval
            </button>
          )}

          {status === "PENDING_APPROVAL" && (
            <div className="text-indigo-300 font-medium flex items-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>System Verification Bot is reviewing the amended trade…</span>
            </div>
          )}

          {status === "APPROVED" && (
            <button onClick={() => callWorkflow("settle", "Trade settled")} disabled={actionLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
              Proceed to Settlement
            </button>
          )}

          {status === "REJECTED_REVERIFY" && (
            <>
              <button onClick={() => callWorkflow("amend", "Sent to System for Amendment")} disabled={actionLoading}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
                Send to System for Amendment
              </button>
              <button onClick={() => callWorkflow("send-for-approval", "Resubmitted for Approval")} disabled={actionLoading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
                Resubmit for Approval
              </button>
            </>
          )}

          {status === "LIASING_WITH_CPTY" && (
            <button onClick={() => handleAction("MAIL_CPTY")} disabled={actionLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors disabled:opacity-50 shadow-lg">
              Mail CPTY
            </button>
          )}

          {status === "SETTLED" && (
            <div className="text-green-400 font-bold text-lg flex items-center space-x-2">
              <span>✅</span>
              <span>This trade has been successfully settled.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BilateralDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 p-8 text-white">Loading...</div>}>
      <BilateralDashboardContent />
    </Suspense>
  );
}