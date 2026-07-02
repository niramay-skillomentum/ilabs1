"use client";
import { useState, useEffect } from 'react';
import TradeWorkspace from './TradeWorkspace';
import { authHeaders } from '../../../../lib/auth';
import toast from 'react-hot-toast';

export default function SettlementDesk({ userId, generateQueue, isGeneratingQueue }) {
  const [trades, setTrades] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settlement/v2/dashboard', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrades(data);
      } else {
        toast.error(data.error || "Failed to load settlement dashboard");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    }
    setLoading(false);
  };

  if (selectedTradeId) {
    return <TradeWorkspace 
             tradeId={selectedTradeId} 
             onBack={() => { setSelectedTradeId(null); fetchDashboard(); }} 
             userId={userId} 
           />;
  }

  // Group trades by operational status
  const grouped = {
    "NEEDS_REVIEW": [],
    "READY": [],
    "READY_TO_SETTLE": [],
    "WAITING_COUNTERPARTY": [],
    "FAILED_SETTLEMENT": [],
    "COMPLETED": []
  };

  trades.forEach(t => {
    const status = t.settlementOperationalStatus || "READY";
    if (grouped[status]) {
      grouped[status].push(t);
    } else {
      grouped["READY"].push(t);
    }
  });

  const handleGenerate = async () => {
    if (generateQueue) {
      const success = await generateQueue();
      if (success) fetchDashboard();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Settlement Operations Queue</h1>
        <div>
          <button onClick={handleGenerate} disabled={isGeneratingQueue} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
            {isGeneratingQueue ? "Generating..." : "Generate Queue"}
          </button>
          <button onClick={fetchDashboard} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Refresh Queue</button>
        </div>
      </div>

      {loading ? (
        <p>Loading queue...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {Object.entries(grouped).map(([status, list]) => (
            list.length > 0 && (
              <div key={status} style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '15px' }}>
                <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px', fontSize: '14px', color: '#475569', textTransform: 'uppercase' }}>
                  {status.replace(/_/g, ' ')} ({list.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {list.map(t => (
                    <div 
                      key={t._id} 
                      onClick={() => setSelectedTradeId(t._id)}
                      style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ color: '#0f172a' }}>{t.tradeRef}</strong>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: t.priority === 'High' ? '#fee2e2' : '#e0e7ff', color: t.priority === 'High' ? '#991b1b' : '#3730a3', borderRadius: '4px' }}>
                          {t.priority || "Medium"}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t.counterparty}</span>
                        <span>{t.currency} {t.amount?.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '8px', color: '#94a3b8' }}>
                        Method: {t.settlementScenario?.settlementMethod || 'Electronic'} | Diff: {t.settlementScenario?.difficulty || 'Beginner'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
