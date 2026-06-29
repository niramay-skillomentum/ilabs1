"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken } from "../../lib/auth";
import toast, { Toaster } from "react-hot-toast";

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      toast.error("No session ID provided.");
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      const token = getToken();
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(`/api/score/report/${sessionId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
        } else {
          toast.error(data.error || "Failed to load report");
        }
      } catch (err) {
        toast.error("Network error loading report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId, router]);

  const handleDownload = () => {
    if (!report) return;
    
    // Create a simple text blob for the report
    let content = `=== SGB OPERATIONS SIMULATOR REPORT ===\n`;
    content += `Session ID: ${report.sessionId}\n`;
    content += `Desk: ${report.desk}\n`;
    content += `Date: ${new Date(report.sessionEnd || report.updatedAt).toLocaleString()}\n`;
    content += `Grade: ${report.grade}\n`;
    content += `Final Score: ${report.finalScore} (Points: ${report.totalPoints}, Penalties: ${report.totalPenalties})\n\n`;

    content += `--- SUMMARY ---\n`;
    content += `${report.feedback?.summary || "No summary available"}\n\n`;

    if (report.feedback?.strengths?.length > 0) {
      content += `--- STRENGTHS ---\n`;
      report.feedback.strengths.forEach(s => content += `- ${s}\n`);
      content += `\n`;
    }

    if (report.feedback?.improvements?.length > 0) {
      content += `--- AREAS FOR IMPROVEMENT ---\n`;
      report.feedback.improvements.forEach(i => content += `- ${i}\n`);
      content += `\n`;
    }

    content += `--- PER-TRADE BREAKDOWN ---\n`;
    report.tradeScores?.forEach(ts => {
      content += `\nTrade ${ts.tradeRef} [${ts.tradeType}]: Subtotal ${ts.tradeSubtotal}\n`;
      ts.actions?.forEach(a => {
        content += `  > Action: ${a.action} | Verdict: ${a.verdict} | Pts: +${a.pointsAwarded}/-${a.penaltyApplied}\n`;
        content += `    Reason: ${a.reason}\n`;
      });
      ts.emails?.forEach(e => {
        content += `  > Email to ${e.recipient} | Quality Score: ${e.qualityScore}/10\n`;
        content += `    Feedback: ${e.feedback}\n`;
      });
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SGB_Report_${report.sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-20 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-lg text-slate-300 font-medium">Wait, report is being generated...</p>
        <p className="text-sm text-slate-500 mt-2">Analyzing your session performance and compiling feedback.</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Report not found or not generated yet.</p>
        <button 
          onClick={() => router.push("/dashboard")}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Simulation Report</h1>
          <p className="text-slate-400 text-sm">
            Session ID: {report.sessionId} • Desk: <span className="text-indigo-400 font-semibold">{report.desk}</span> • Date: {new Date(report.sessionEnd || report.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <p className="text-slate-400 text-sm uppercase tracking-wider">Final Score</p>
            <p className="text-2xl font-mono text-white">{report.finalScore}</p>
          </div>
          <div className="h-16 w-16 rounded-xl flex items-center justify-center text-3xl font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
            {report.grade || "?"}
          </div>
          <button 
            onClick={handleDownload}
            className="ml-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors border border-slate-600 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg md:col-span-2">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-emerald-400">⚡</span> Executive Summary
          </h2>
          <p className="text-slate-300 leading-relaxed text-lg mb-6">
            {report.feedback?.summary || "Session completed."}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-900/50">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {(report.feedback?.strengths || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 shrink-0">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/50">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Areas for Improvement</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {(report.feedback?.improvements || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 shrink-0">!</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 text-center">Score Breakdown</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-300">Total Points Earned</span>
              <span className="text-emerald-400 font-mono">+{report.totalPoints}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-slate-300">Penalties Applied</span>
              <span className="text-red-400 font-mono">-{report.totalPenalties}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-white font-semibold">Net Score</span>
              <span className="text-white font-mono font-bold text-xl">{report.finalScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Log */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Detailed Trade Log</h2>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
          {(!report.tradeScores || report.tradeScores.length === 0) && (
            <div className="p-8 text-center text-slate-400">No trades processed in this session.</div>
          )}
          
          <div className="divide-y divide-slate-700/50">
            {(report.tradeScores || []).map((ts, i) => (
              <div key={i} className="p-6 hover:bg-slate-800/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-indigo-400 font-semibold">{ts.tradeRef}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ts.tradeType === 'CLEAN' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {ts.tradeType}
                    </span>
                    {ts.breakFields?.length > 0 && (
                      <span className="text-xs text-slate-400">Breaks: {ts.breakFields.join(", ")}</span>
                    )}
                  </div>
                  <div className={`font-mono font-semibold ${ts.tradeSubtotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ts.tradeSubtotal > 0 ? '+' : ''}{ts.tradeSubtotal} pts
                  </div>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-slate-700">
                  {(!ts.actions?.length && !ts.emails?.length) && (
                    <div className="text-sm text-slate-500 italic py-2">
                      No actions or emails were recorded for this trade.
                    </div>
                  )}

                  {/* Actions */}
                  {ts.actions?.map((act, j) => (
                    <div key={`act-${j}`} className="flex gap-4 items-start text-sm">
                      <div className="w-8 shrink-0 text-center text-xs font-mono text-slate-500">
                        {new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-200">{act.action}</span>
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            act.verdict === 'CORRECT' ? 'bg-emerald-900/50 text-emerald-400' : 
                            act.verdict.includes('FALSE') || act.verdict.includes('VIOLATION') ? 'bg-red-900/50 text-red-400' : 
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {act.verdict.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">{act.reason}</p>
                      </div>
                      <div className="text-right whitespace-nowrap shrink-0 font-mono text-sm font-bold bg-slate-900/50 px-2 py-1 rounded">
                        {act.pointsAwarded > 0 && <span className="text-emerald-400">+{act.pointsAwarded}</span>}
                        {act.penaltyApplied > 0 && <span className="text-red-400 ml-2">-{act.penaltyApplied}</span>}
                        {(act.pointsAwarded === 0 && act.penaltyApplied === 0) && <span className="text-slate-500">0</span>}
                      </div>
                    </div>
                  ))}

                  {/* Emails */}
                  {ts.emails?.map((em, j) => {
                    const emailPoints = em.qualityScore >= 8 ? 5 : (em.qualityScore <= 4 ? -5 : 0);
                    return (
                      <div key={`em-${j}`} className="flex gap-4 items-start text-sm mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <div className="w-8 shrink-0 text-center text-xs font-mono text-slate-500">
                          {new Date(em.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-200">Email to {em.recipient}</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-400">AI Quality: <span className={`font-mono font-bold ${em.qualityScore >= 8 ? 'text-emerald-400' : em.qualityScore <= 4 ? 'text-red-400' : 'text-amber-400'}`}>{em.qualityScore}/10</span></span>
                              <div className="w-12 text-right font-mono text-xs">
                                {emailPoints > 0 && <span className="text-emerald-400">+{emailPoints}</span>}
                                {emailPoints < 0 && <span className="text-red-400">{emailPoints}</span>}
                                {emailPoints === 0 && <span className="text-slate-500">0</span>}
                              </div>
                            </div>
                          </div>
                          <p className="text-slate-400 text-xs italic mb-2">"{em.body}"</p>
                          <div className="flex items-start gap-1.5 bg-slate-800 p-2 rounded border border-slate-700/50">
                            <span className="text-indigo-400 shrink-0">💡</span>
                            <span className="text-xs text-slate-300">{em.feedback}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-center pt-8 pb-12">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-slate-400 hover:text-white transition-colors"
        >
          &larr; Return to Dashboard
        </button>
      </div>

    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-slate-900 pt-20">
      <Toaster position="bottom-right" />
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
        <ReportContent />
      </Suspense>
    </div>
  );
}
