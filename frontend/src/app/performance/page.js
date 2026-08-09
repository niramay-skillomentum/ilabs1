"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loadUserId, getToken, authHeaders } from "../../lib/auth";
import toast from "react-hot-toast";

// ── API helper ──
// We hit the backend directly to avoid Next.js 30s proxy timeouts for slow AI generation
const api = (path, opts = {}) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const url = path.startsWith("/") ? `${backendUrl}${path}` : path;
  return fetch(url, { headers: authHeaders(), ...opts }).then(r => r.json());
};

// ══════════════════════════════════════
// KPI CARD
// ══════════════════════════════════════
function KPICard({ label, value, suffix = "", color = "#0B1F3A", sub = null, icon = null }) {
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: "20px 24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e8edf5",
      display: "flex", flexDirection: "column", gap: 4, minWidth: 140,
      transition: "transform 0.2s, box-shadow 0.2s"
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      {icon && <span style={{ fontSize: 20, marginBottom: 4 }}>{icon}</span>}
      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}{suffix && <span style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8" }}>{suffix}</span>}</span>
      {sub && <span style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</span>}
    </div>
  );
}

// ══════════════════════════════════════
// COMPETENCY BAR
// ══════════════════════════════════════
function CompetencyBar({ name, score }) {
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#84cc16" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ width: 180, fontSize: 13, color: "#334155", fontWeight: 500, textTransform: "capitalize" }}>
        {name.replace(/([A-Z])/g, " $1").trim()}
      </span>
      <div style={{ flex: 1, height: 10, background: "#f1f5f9", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          borderRadius: 8, transition: "width 1s ease"
        }} />
      </div>
      <span style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 600, color }}>{score}%</span>
    </div>
  );
}

// ══════════════════════════════════════
// TRADE ANALYSIS CARD
// ══════════════════════════════════════
function TradeCard({ trade, idx }) {
  const [open, setOpen] = useState(false);
  const ratingColor = trade.overallRating >= 4 ? "#22c55e" : trade.overallRating >= 3 ? "#f59e0b" : "#ef4444";
  const compColor = trade.workflowCompliance >= 80 ? "#22c55e" : trade.workflowCompliance >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      background: "white", borderRadius: 12, border: "1px solid #e8edf5",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 12,
      transition: "box-shadow 0.2s"
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: open ? "#f8fafc" : "white",
          borderBottom: open ? "1px solid #e8edf5" : "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>#{idx + 1}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{trade.tradeRef}</span>
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
            background: trade.scenario === "CLEAN" ? "#dcfce7" : "#fef3c7",
            color: trade.scenario === "CLEAN" ? "#166534" : "#92400e"
          }}>
            {trade.scenario || "UNKNOWN"}
          </span>
          <span style={{ fontSize: 11, color: "#64748b" }}>{trade.direction} • {trade.settlementType}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: compColor }}>
            {trade.workflowCompliance}% compliance
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700, color: ratingColor,
            background: `${ratingColor}15`, padding: "4px 12px", borderRadius: 20
          }}>
            ★ {trade.overallRating}/5
          </span>
          <span style={{ fontSize: 16, color: "#94a3b8", transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
        </div>
      </div>

      {/* Expanded Detail */}
      {open && (
        <div style={{ padding: "20px 24px" }}>
          {/* Expected vs Actual Table */}
          {trade.actionComparison && trade.actionComparison.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Expected vs Actual Actions
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 600 }}>Expected Action</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 600, width: 80 }}>Performed</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 600, width: 80 }}>Correct</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 600 }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {trade.actionComparison.map((ac, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", color: "#334155", fontWeight: 500 }}>{ac.expectedAction?.replace(/_/g, " ")}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span style={{ color: ac.userPerformed ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                          {ac.userPerformed ? "✅" : "❌"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span style={{ color: ac.isCorrect ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                          {ac.isCorrect ? "✅" : "❌"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#64748b", fontSize: 11 }}>{ac.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Decision Analysis */}
          {trade.decisions && trade.decisions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Decision Analysis
              </h4>
              {trade.decisions.map((d, i) => (
                <div key={i} style={{
                  padding: 12, marginBottom: 8, borderRadius: 8,
                  background: d.isCorrect ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${d.isCorrect ? "#bbf7d0" : "#fecaca"}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: d.isCorrect ? "#166534" : "#991b1b" }}>
                      {d.isCorrect ? "✅ Correct" : "❌ Incorrect"}: {d.action?.replace(/_/g, " ")}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                      background: d.operationalRisk === "CRITICAL" ? "#ef4444" : d.operationalRisk === "HIGH" ? "#f97316" : d.operationalRisk === "MEDIUM" ? "#f59e0b" : "#22c55e",
                      color: "white"
                    }}>
                      {d.operationalRisk} RISK
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "#475569", margin: "4px 0" }}>Evidence: {d.evidence}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0, fontStyle: "italic" }}>{d.learningPoint}</p>
                </div>
              ))}
            </div>
          )}

          {/* Mail Score */}
          {trade.mailScore !== null && trade.mailScore !== undefined && (
            <div style={{
              padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e8edf5",
              display: "flex", alignItems: "center", gap: 12
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>📧 Email Quality:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: trade.mailScore >= 70 ? "#22c55e" : "#f59e0b" }}>{trade.mailScore}%</span>
            </div>
          )}

          {/* AI Coaching */}
          {trade.aiCoaching && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1e40af", display: "block", marginBottom: 4 }}>🤖 AI Coaching</span>
              <p style={{ fontSize: 12, color: "#1e3a5f", margin: 0, lineHeight: 1.5 }}>{trade.aiCoaching}</p>
            </div>
          )}

          {/* Operational Impact */}
          {trade.operationalImpact && trade.operationalImpact !== "None" && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fef3c7", border: "1px solid #fde68a" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#92400e" }}>⚠️ Operational Impact: {trade.operationalImpact}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// TIMELINE VIEW
// ══════════════════════════════════════
function TimelineView({ timeline }) {
  if (!timeline || timeline.length === 0) return <p style={{ color: "#94a3b8", fontSize: 13 }}>No timeline data available.</p>;

  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      {/* Vertical line */}
      <div style={{
        position: "absolute", left: 10, top: 0, bottom: 0, width: 2,
        background: "linear-gradient(to bottom, #0B1F3A, #94a3b8)"
      }} />

      {timeline.slice(0, 50).map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
          {/* Dot */}
          <div style={{
            position: "absolute", left: -22, top: 4, width: 10, height: 10,
            borderRadius: "50%", background: getCategoryColor(entry.category),
            border: "2px solid white", boxShadow: "0 0 0 2px " + getCategoryColor(entry.category) + "40"
          }} />
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, width: 70, flexShrink: 0 }}>{entry.time}</span>
          <span style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>{entry.event}</span>
          {entry.tradeRef && <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8, background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{entry.tradeRef}</span>}
        </div>
      ))}
      {timeline.length > 50 && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>...and {timeline.length - 50} more events</p>}
    </div>
  );
}

function getCategoryColor(cat) {
  const colors = { WORKFLOW: "#3b82f6", DECISION: "#8b5cf6", COMMUNICATION: "#06b6d4", LEARNING: "#f59e0b", LIFECYCLE: "#22c55e", QUEUE: "#64748b", SYSTEM: "#94a3b8" };
  return colors[cat] || "#94a3b8";
}

// ══════════════════════════════════════
// EVIDENCE GRAPH VIEW
// ══════════════════════════════════════
function EvidenceView({ evidenceGraph }) {
  if (!evidenceGraph || evidenceGraph.length === 0) return <p style={{ color: "#94a3b8", fontSize: 13 }}>No evidence findings.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {evidenceGraph.map((entry, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>📌 {entry.finding}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
              background: "#22c55e20", color: "#166534"
            }}>
              {entry.confidence}% confidence
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#475569" }}>
            {(entry.evidence || []).map((e, j) => (
              <li key={j} style={{ marginBottom: 4 }}><span style={{ color: "#94a3b8", fontSize: 10 }}>[{e.type}]</span> {e.ref}</li>
            ))}
          </ul>
          {entry.relatedTrades && entry.relatedTrades.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {entry.relatedTrades.map((t, j) => (
                <span key={j} style={{ fontSize: 10, background: "#eff6ff", color: "#1e40af", padding: "2px 6px", borderRadius: 4 }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════
// SECTION WRAPPER
// ══════════════════════════════════════
function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "white", borderRadius: 14, border: "1px solid #e8edf5",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 20, overflow: "hidden"
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "18px 24px", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "#fafbfc",
          borderBottom: open ? "1px solid #e8edf5" : "none"
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{icon} {title}</h3>
        <span style={{ fontSize: 16, color: "#94a3b8", transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "20px 24px" }}>{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════
// TAB SWITCHER
// ══════════════════════════════════════
function TabSwitcher({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 24 }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, transition: "all 0.2s",
            background: active === tab.key ? "white" : "transparent",
            color: active === tab.key ? "#0B1F3A" : "#64748b",
            boxShadow: active === tab.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════
// SESSIONS LIST VIEW
// ══════════════════════════════════════
function SessionsList({ sessions, onSelect, onGenerate, generating }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>📊</p>
        <h2 style={{ color: "#0f172a", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Sessions Yet</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Complete a training session on any desk to see your performance reports here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sessions.map(s => (
        <div key={s.sessionId} style={{
          background: "white", borderRadius: 12, padding: "20px 24px",
          border: "1px solid #e8edf5", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: s.reportGenerated ? "pointer" : "default",
          transition: "transform 0.15s, box-shadow 0.15s"
        }}
          onClick={() => s.reportGenerated && s.reportId && onSelect(s.reportId)}
          onMouseEnter={e => { if (s.reportGenerated) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
              background: s.desk === "SETTLEMENT" ? "#eff6ff" : s.desk === "CONFIRMATION" ? "#fef3c7" : s.desk === "RECONCILIATION" ? "#ecfdf5" : "#f0f4ff",
              color: s.desk === "SETTLEMENT" ? "#1e40af" : s.desk === "CONFIRMATION" ? "#92400e" : s.desk === "RECONCILIATION" ? "#065f46" : "#312e81"
            }}>
              {s.desk}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{new Date(s.sessionStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {new Date(s.sessionStart).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {" • "}{s.tradeRefs?.length || 0} trades
                {" • "}{s.status}
              </div>
            </div>
          </div>
          <div>
            {s.reportGenerated ? (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
                background: "#0B1F3A", color: "white", cursor: "pointer"
              }}>
                View Report →
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate(s.sessionId); }}
                disabled={generating === s.sessionId}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
                  background: generating === s.sessionId ? "#94a3b8" : "#22c55e", color: "white",
                  border: "none", cursor: generating === s.sessionId ? "wait" : "pointer"
                }}
              >
                {generating === s.sessionId ? "⏳ Generating..." : "Generate Report"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════
function PerformancePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState([]);
  const [report, setReport] = useState(null);
  const [reportView, setReportView] = useState("student");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);
  const [competencyProfile, setCompetencyProfile] = useState(null);

  // Load sessions on mount
  useEffect(() => {
    const uid = loadUserId();
    if (!uid || !getToken()) {
      toast.error("Session expired. Login again.");
      router.push("/");
      return;
    }

    // Check if reportId is in URL
    const urlReportId = searchParams.get("reportId");
    if (urlReportId) {
      setActiveReportId(urlReportId);
      loadReport(urlReportId);
    }

    // Load sessions
    api("/api/performance/my-sessions?limit=50")
      .then(data => {
        if (data.success) setSessions(data.sessions || []);
      })
      .catch(err => console.warn("Sessions load failed:", err))
      .finally(() => setLoading(false));

    // Load competency profile
    api("/api/performance/my-competency")
      .then(data => { if (data.success && data.profile) setCompetencyProfile(data.profile); })
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async (reportId) => {
    setLoading(true);
    try {
      const data = await api(`/api/performance/report/${reportId}/student`);
      if (data.success) {
        setReport(data.report);
        setActiveReportId(reportId);
      } else {
        toast.error("Failed to load report");
      }
    } catch (err) {
      toast.error("Report load error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async (sessionId) => {
    setGenerating(sessionId);
    try {
      const data = await api(`/api/performance/generate/${sessionId}`, { method: "POST" });
      if (data.success) {
        toast.success(`Report generated in ${Math.round(data.generationTimeMs / 1000)}s`);
        setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, reportGenerated: true, reportId: data.reportId } : s));
        loadReport(data.reportId);
      } else {
        toast.error("Generation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Generation error: " + err.message);
    } finally {
      setGenerating(null);
    }
  }, [loadReport]);

  const handleBack = () => { setReport(null); setActiveReportId(null); };

  // ── Loading state ──
  if (loading && !report) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0f4f8" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 2s infinite" }}>📊</div>
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading performance data...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════
  // REPORT VIEW
  // ══════════════════════════════════════
  if (report) {
    const kpis = report.sessionKPIs || {};
    const comp = report.competencyScores || {};

    return (
      <div style={{ background: "#f0f4f8", minHeight: "100vh" }}>
        {/* Top Bar */}
        <div style={{
          padding: "16px 30px", background: "linear-gradient(135deg, #0B1F3A 0%, #1E3A5F 100%)",
          color: "white", display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={handleBack}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none", color: "white",
                padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600
              }}
            >
              ← Back
            </button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📊 Performance Intelligence Report</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.15)"
            }}>
              {report.desk} DESK
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              {new Date(report.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

          {/* View Tabs */}
          <TabSwitcher
            tabs={[
              { key: "student", label: "Student Report", icon: "🎓" },
              { key: "mentor", label: "Mentor Report", icon: "👨‍🏫" },
              { key: "manager", label: "Manager Report", icon: "👔" }
            ]}
            active={reportView}
            onChange={setReportView}
          />

          {/* ── Executive Summary ── */}
          {report.executiveSummary && (
            <Section title="Executive Summary" icon="📋" defaultOpen={true}>
              <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, margin: 0 }}>{report.executiveSummary}</p>
            </Section>
          )}

          {/* ── Session KPIs ── */}
          <Section title="Session KPIs" icon="📈" defaultOpen={true}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <KPICard label="Trades" value={kpis.tradesCompleted || 0} suffix={`/${kpis.totalTrades || 0}`} icon="📦" />
              <KPICard label="Decision Accuracy" value={kpis.decisionAccuracy || 0} suffix="%" color={kpis.decisionAccuracy >= 85 ? "#22c55e" : "#f59e0b"} icon="🎯" />
              <KPICard label="Workflow Compliance" value={kpis.avgWorkflowCompliance || 0} suffix="%" color={kpis.avgWorkflowCompliance >= 80 ? "#22c55e" : "#f59e0b"} icon="📋" />
              <KPICard label="Email Quality" value={kpis.avgMailScore || 0} suffix="%" color={kpis.avgMailScore >= 70 ? "#22c55e" : "#f59e0b"} icon="📧" />
              <KPICard label="Critical Errors" value={kpis.criticalErrors || 0} color={kpis.criticalErrors === 0 ? "#22c55e" : "#ef4444"} icon="🚨" />
              <KPICard label="Avg Time/Trade" value={kpis.avgTimePerTrade || 0} suffix="s" icon="⏱️" />
            </div>
          </Section>

          {/* ── Competency Analysis ── */}
          <Section title="Competency Analysis" icon="🧠" defaultOpen={reportView !== "manager"}>
            <div style={{ maxWidth: 600 }}>
              {Object.entries(comp).filter(([_, v]) => typeof v === "number" && v > 0).map(([key, score]) => (
                <CompetencyBar key={key} name={key} score={score} />
              ))}
            </div>
          </Section>

          {/* ── Trade-by-Trade Analysis (Student only) ── */}
          {reportView === "student" && report.tradeAnalyses && (
            <Section title={`Trade-by-Trade Analysis (${report.tradeAnalyses.length} trades)`} icon="🔍" defaultOpen={false}>
              {report.tradeAnalyses.map((trade, i) => (
                <TradeCard key={trade.tradeRef || i} trade={trade} idx={i} />
              ))}
            </Section>
          )}

          {/* ── Decision Analysis ── */}
          {reportView !== "manager" && report.decisionAnalysis && (
            <Section title="Decision Analysis" icon="⚖️" defaultOpen={false}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                <KPICard label="Total Decisions" value={report.decisionAnalysis.totalDecisions || 0} />
                <KPICard label="Correct" value={report.decisionAnalysis.correctDecisions || 0} color="#22c55e" />
                <KPICard label="Incorrect" value={report.decisionAnalysis.incorrectDecisions || 0} color="#ef4444" />
                <KPICard label="High-Risk Errors" value={report.decisionAnalysis.highRiskErrors || 0} color={report.decisionAnalysis.highRiskErrors > 0 ? "#ef4444" : "#22c55e"} />
              </div>
            </Section>
          )}

          {/* ── Communication Analysis ── */}
          {report.communicationCoaching && (
            <Section title="Communication Analysis" icon="💬" defaultOpen={reportView === "student"}>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{report.communicationCoaching}</p>
            </Section>
          )}

          {/* ── Repeated Mistakes ── */}
          {report.repeatedMistakes && report.repeatedMistakes.length > 0 && (
            <Section title="Repeated Mistakes" icon="🔄" defaultOpen={false}>
              {report.repeatedMistakes.map((m, i) => (
                <div key={i} style={{
                  padding: 12, marginBottom: 8, borderRadius: 8, background: "#fef3c7", border: "1px solid #fde68a",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>{m.title}</span>
                    <span style={{ fontSize: 11, color: "#b45309", marginLeft: 8 }}>({m.mistakeCode})</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>{m.count}×</span>
                </div>
              ))}
            </Section>
          )}

          {/* ── Timeline ── */}
          {reportView === "student" && report.timeline && (
            <Section title="Operational Timeline" icon="⏰" defaultOpen={false}>
              <TimelineView timeline={report.timeline} />
            </Section>
          )}

          {/* ── Evidence Graph ── */}
          {reportView !== "manager" && report.evidenceGraph && (
            <Section title="Evidence Graph" icon="🔗" defaultOpen={false}>
              <EvidenceView evidenceGraph={report.evidenceGraph} />
            </Section>
          )}

          {/* ── Recommendations ── */}
          {report.recommendations && report.recommendations.length > 0 && (
            <Section title="Recommendations & Learning Plan" icon="📝" defaultOpen={true}>
              {report.recommendations.map((r, i) => (
                <div key={i} style={{
                  padding: "12px 16px", marginBottom: 8, borderRadius: 8,
                  background: i === 0 && r.startsWith("CRITICAL") ? "#fef2f2" : "#f8fafc",
                  border: `1px solid ${i === 0 && r.startsWith("CRITICAL") ? "#fecaca" : "#e8edf5"}`,
                  fontSize: 13, color: "#334155", lineHeight: 1.5
                }}>
                  <span style={{ fontWeight: 600, color: "#0B1F3A", marginRight: 8 }}>{i + 1}.</span>
                  {r}
                </div>
              ))}
            </Section>
          )}

          {/* ── Improvement Plan (AI) ── */}
          {report.improvementPlan && (
            <Section title="Improvement Plan" icon="🚀" defaultOpen={reportView !== "manager"}>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{report.improvementPlan}</p>
            </Section>
          )}

          {/* ── Mentor Summary (Mentor view) ── */}
          {reportView === "mentor" && report.mentorSummary && (
            <Section title="Mentor Summary" icon="👨‍🏫" defaultOpen={true}>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{report.mentorSummary}</p>
            </Section>
          )}

          {/* ── Manager Summary (Manager view) ── */}
          {reportView === "manager" && (
            <Section title="Manager Summary" icon="👔" defaultOpen={true}>
              {report.managerSummary && <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 16 }}>{report.managerSummary}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <KPICard label="Decision Accuracy" value={kpis.decisionAccuracy || 0} suffix="%" color={kpis.decisionAccuracy >= 85 ? "#22c55e" : "#f59e0b"} />
                <KPICard label="Critical Errors" value={kpis.criticalErrors || 0} color={kpis.criticalErrors === 0 ? "#22c55e" : "#ef4444"} />
                <KPICard label="Production Ready" value={kpis.decisionAccuracy >= 85 && kpis.criticalErrors === 0 ? "YES" : "NO"} color={kpis.decisionAccuracy >= 85 && kpis.criticalErrors === 0 ? "#22c55e" : "#ef4444"} />
              </div>
            </Section>
          )}

          {/* ── Benchmarks ── */}
          {report.benchmarks && (
            <Section title="Benchmarks & Peer Comparison" icon="📊" defaultOpen={false}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <KPICard label="Avg Time Benchmark" value={report.benchmarks.avgTimePerTradeBenchmark || 0} suffix="s" icon="⏱️" />
                <KPICard label="Peer Percentile" value={report.benchmarks.peerPercentile || 0} suffix="th" icon="👥" />
                <KPICard label="AI Tokens Used" value={report.aiTokensUsed || 0} icon="🤖" sub="Nemotron Ultra" />
              </div>
            </Section>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════
  // SESSIONS LIST VIEW
  // ══════════════════════════════════════
  return (
    <div style={{ background: "#f0f4f8", minHeight: "100vh" }}>
      {/* Top Bar */}
      <div style={{
        padding: "16px 30px", background: "linear-gradient(135deg, #0B1F3A 0%, #1E3A5F 100%)",
        color: "white", display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: "white",
              padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600
            }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📊 Operations Performance Intelligence</h1>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {/* Competency Overview */}
        {competencyProfile && (
          <Section title="Your Competency Profile" icon="🧠" defaultOpen={true}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
              <div style={{
                width: 100, height: 100, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column",
                background: `conic-gradient(${competencyProfile.overallReadiness >= 80 ? "#22c55e" : "#f59e0b"} ${competencyProfile.overallReadiness * 3.6}deg, #f1f5f9 0)`,
                position: "relative"
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", background: "white",
                  display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column"
                }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{competencyProfile.overallReadiness}%</span>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>Readiness</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                  {competencyProfile.totalSessions || 0} session(s) completed
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Last updated: {new Date(competencyProfile.lastUpdated).toLocaleDateString("en-GB")}
                </div>
              </div>
            </div>
            {competencyProfile.competencies && (
              <div style={{ maxWidth: 550 }}>
                {Object.entries(competencyProfile.competencies)
                  .filter(([_, v]) => v && typeof v.score === "number" && v.score > 0)
                  .map(([key, dim]) => <CompetencyBar key={key} name={key} score={dim.score} />)}
              </div>
            )}
          </Section>
        )}

        {/* Sessions List */}
        <Section title="Your Sessions" icon="📋" defaultOpen={true}>
          <SessionsList
            sessions={sessions}
            onSelect={loadReport}
            onGenerate={handleGenerate}
            generating={generating}
          />
        </Section>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><p>Loading...</p></div>}>
      <PerformancePageInner />
    </Suspense>
  );
}
