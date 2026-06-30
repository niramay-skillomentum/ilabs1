"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function BilateralDashboardContent() {
  const searchParams = useSearchParams();
  const tradeRef = searchParams.get("tradeRef");
  const router = useRouter();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

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

  const handleAction = async (action, editData = null) => {
    setActionLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch(`/api/settlement/bilateral/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tradeRef, action, editData })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Success`);
        setTrade(data.trade);
        if (action === "EDIT_SETTLEMENT") {
          setIsEditModalOpen(false);
        }
        if (action === "MAIL_CPTY") {
          router.push(`/communication?desk=SETTLEMENT&tradeRef=${tradeRef}`);
        }
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = () => {
    setEditForm(trade?.settlementDetails || {});
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdits = () => {
    handleAction("EDIT_SETTLEMENT", editForm);
  };

  if (loading) {
    return <div className="p-8 text-white">Loading Bilateral Dashboard...</div>;
  }

  if (!trade) {
    return <div className="p-8 text-white">Trade not found.</div>;
  }

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
              Status: <span className="font-semibold text-blue-400">{trade.currentStatus}</span>
            </span>
            <button 
              onClick={() => router.push("/workstation")}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              Back to Workstation
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* System Details */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
              <h2 className="text-xl font-semibold">System Details (Booking)</h2>
              <button
                onClick={openEditModal}
                disabled={actionLoading || trade.currentStatus === "SETTLED"}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm transition-colors disabled:opacity-50"
              >
                Edit Details
              </button>
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
            {trade.currentStatus === "SETTLED" && (
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
          {trade.currentStatus !== "SETTLED" && (
            <>
              <button
                onClick={() => handleAction("APPROVE_SETTLEMENT")}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors disabled:opacity-50 flex items-center shadow-lg"
              >
                Approve Settlement
              </button>

              {(trade.currentStatus === "SETTLEMENT_PENDING" || trade.currentStatus === "SETTLEMENT_BREAK") && (
                <button
                  onClick={() => handleAction("RAISE_BREAK")}
                  disabled={actionLoading || trade.currentStatus === "SETTLEMENT_BREAK"}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-medium transition-colors disabled:opacity-50 flex items-center shadow-lg"
                >
                  Raise Break
                </button>
              )}

              {(trade.currentStatus === "SETTLEMENT_BREAK" || trade.currentStatus === "LIASING_WITH_CPTY") && (
                <button
                  onClick={() => handleAction("MAIL_CPTY")}
                  disabled={actionLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors disabled:opacity-50 flex items-center shadow-lg"
                >
                  Mail CPTY
                </button>
              )}
            </>
          )}

          {trade.currentStatus === "SETTLED" && (
            <div className="text-green-400 font-bold text-lg flex items-center space-x-2">
              <span>✅</span>
              <span>This trade has been successfully settled.</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Edit System Details</h2>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input
                    type="text"
                    name={f.key}
                    value={editForm[f.key] || ""}
                    onChange={handleEditChange}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdits}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
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
