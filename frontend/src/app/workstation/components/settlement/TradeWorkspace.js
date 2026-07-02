"use client";
import { useState, useEffect } from 'react';
import { authHeaders } from '../../../../lib/auth';
import toast from 'react-hot-toast';
import OperationalInbox from './OperationalInbox';

export default function TradeWorkspace({ tradeId, onBack, userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTrade();
  }, [tradeId]);

  const fetchTrade = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settlement/v2/trade/${tradeId}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.trade) {
        setData(json);
      } else {
        toast.error("Failed to load trade");
      }
    } catch (err) {
      toast.error("Error loading trade");
    }
    setLoading(false);
  };

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/settlement/v2/trade/${tradeId}/action`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action, decision: "User triggered action" })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "Action failed");
      }
      if (result.aiFeedback) {
        toast((t) => (
          <span>
            <b>AI Coach:</b><br/>{result.aiFeedback}
          </span>
        ), { duration: 6000, icon: '🤖' });
      }
      fetchTrade();
    } catch (err) {
      toast.error("Action error");
    }
    setProcessing(false);
  };

  const executeSettlement = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/settlement/v2/trade/${tradeId}/execute`, {
        method: "POST",
        headers: authHeaders()
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.outcome);
      } else {
        toast.error(result.outcome || "Settlement failed");
      }
      if (result.aiFeedback) {
        toast((t) => (
          <span>
            <b>AI Coach:</b><br/>{result.aiFeedback}
          </span>
        ), { duration: 6000, icon: '🤖' });
      }
      fetchTrade();
    } catch (err) {
      toast.error("Execution error");
    }
    setProcessing(false);
  };

  const communicate = () => {
    if (!data?.trade) return;
    const mailParams = new URLSearchParams({
      desk: "SETTLEMENT", 
      tradeRef: data.trade.tradeRef, 
      composeFor: data.trade.tradeRef, 
      composeTo: "COUNTERPARTY"
    });
    window.open("/communication?" + mailParams.toString(), "_blank");
  };

  if (loading || !data) return <div style={{padding:'20px'}}>Loading workspace...</div>;

  const { trade, checklist, inbox } = data;
  const isReadyToSettle = trade.settlementOperationalStatus === "READY_TO_SETTLE" || trade.settlementOperationalStatus === "READY";

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={onBack} style={{ marginBottom: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold' }}>
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left Column */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary Card */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>Trade Summary: {trade.tradeRef}</h2>
              <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#3730a3', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold' }}>
                {trade.settlementOperationalStatus}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px', color: '#334155' }}>
              <div><strong>Counterparty:</strong> {trade.counterparty}</div>
              <div><strong>Amount:</strong> {trade.currency} {trade.amount?.toLocaleString()}</div>
              <div><strong>Method:</strong> {trade.settlementScenario?.settlementMethod}</div>
              <div><strong>Priority:</strong> <span style={{color: trade.priority === 'High' ? '#dc2626' : 'inherit'}}>{trade.priority || "Medium"}</span></div>
            </div>
          </div>

          {/* Readiness Checklist */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Settlement Readiness</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {checklist?.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: item.status === '✗' ? '#dc2626' : '#15803d' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.status}</span>
                  <span style={{ color: '#334155' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Action Panel</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>Can this trade proceed? If not, what do you need to do?</p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button disabled={processing} onClick={() => handleAction("Request Updated SSI")} className="action-btn">Request Updated SSI</button>
              <button disabled={processing} onClick={() => handleAction("Update Account")} className="action-btn">Update Account</button>
              <button disabled={processing} onClick={() => handleAction("Investigate Failure")} className="action-btn">Investigate Failure</button>
              <button disabled={processing} onClick={() => handleAction("Request Updated Instructions")} className="action-btn">Request Updated Instructions</button>
              <button disabled={processing} onClick={communicate} className="action-btn cpty-btn">Contact Counterparty</button>
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
              <button 
                disabled={processing || trade.settlementOperationalStatus === "COMPLETED"} 
                onClick={executeSettlement} 
                style={{ width: '100%', padding: '12px', background: isReadyToSettle ? '#15803d' : '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isReadyToSettle ? "Send to Settlement" : "Force Settlement (Risky)"}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <OperationalInbox events={inbox} />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        .action-btn { padding: 8px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; color: #334155; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .action-btn:hover { background: #e2e8f0; border-color: #94a3b8; }
        .cpty-btn { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
        .cpty-btn:hover { background: #dbeafe; border-color: #93c5fd; }
      `}}/>
    </div>
  );
}
