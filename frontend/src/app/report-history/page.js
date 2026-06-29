"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../../lib/auth";
import toast, { Toaster } from "react-hot-toast";

function HistoryContent() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const token = getToken();
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(`/api/score/history`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setHistory(data.history || []);
        } else {
          toast.error(data.error || "Failed to load history");
        }
      } catch (err) {
        toast.error("Network error loading history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading your past sessions...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Performance History</h1>
          <p className="text-slate-400 text-sm">
            Review your past simulation sessions
          </p>
        </div>
        <button 
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors border border-slate-600"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="grid gap-4">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-800 rounded-2xl border border-slate-700">
            No past sessions found. Start a desk session to generate a report.
          </div>
        ) : (
          history.map((session, i) => (
            <div 
              key={i} 
              onClick={() => router.push(`/report?sessionId=${session.sessionId}`)}
              className="flex items-center justify-between p-6 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 shadow-lg cursor-pointer transition-colors"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">Session on {session.desk} Desk</h3>
                <p className="text-slate-400 text-sm">{new Date(session.sessionEnd || session.updatedAt).toLocaleString()}</p>
                <p className="text-slate-500 text-xs font-mono mt-1">ID: {session.sessionId}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Score</p>
                  <p className="text-xl font-mono text-white">{session.finalScore}</p>
                </div>
                <div className="h-12 w-12 rounded-lg flex items-center justify-center text-xl font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow">
                  {session.grade || "?"}
                </div>
                <span className="text-slate-500">&rarr;</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-slate-900 pt-20">
      <Toaster position="bottom-right" />
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
        <HistoryContent />
      </Suspense>
    </div>
  );
}
