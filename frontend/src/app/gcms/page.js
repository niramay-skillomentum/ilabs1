"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadFullName } from '../../lib/auth';

export default function GCMSPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("SIM_OPS_01");
  
  const [processedData, setProcessedData] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  React.useEffect(() => {
    setUserName(loadFullName() || "SIM_OPS_01");
    async function loadData() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/swift/all", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.messages) {
          const formatted = data.messages.map(msg => ({
            id: msg.tradeRef,
            valueDate: msg.valueDate ? new Date(msg.valueDate).toISOString().split('T')[0] : "-",
            senderBic: msg.senderBIC || "-",
            receiverBic: msg.receiverBIC || "-",
            currency: msg.currency || "-",
            amount: msg.amount ? msg.amount.toLocaleString() : "-",
            status: msg.status,
            type: msg.messageType,
            rawSwift: msg.displayPayload || msg.messagePayload || ""
          }));
          setProcessedData(formatted);
        }
      } catch (e) {
        console.error("Failed to load swift messages", e);
      }
    }
    loadData();
  }, []);

  return (
    <div className="gcms-layout">
      <style dangerouslySetInnerHTML={{__html: `
        body, html { margin: 0; padding: 0; height: 100%; background: #F4F6F9; font-family: 'Inter', 'Segoe UI', sans-serif; }
        .gcms-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        
        .gcms-header { background: #0A2540; color: #fff; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; height: 48px; border-bottom: 2px solid #2D3748; }
        .gcms-header-left { display: flex; align-items: center; gap: 24px; font-size: 14px; font-weight: 600; }
        .gcms-logo { font-weight: 800; font-size: 24px; letter-spacing: 1px; color: #4ade80; }
        .gcms-nav-links { display: flex; gap: 16px; color: #94a3b8; }
        .gcms-nav-links span.active { color: #fff; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
        .gcms-header-right { display: flex; align-items: center; gap: 16px; font-size: 12px; }
        .gcms-env-badge { background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; letter-spacing: 0.5px; }
        
        .gcms-toolbar { background: #ffffff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #1e293b; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .btn-back { background: transparent; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 4px; cursor: pointer; color: #475569; font-weight: 600; font-size: 12px; }
        .btn-back:hover { background: #f1f5f9; }
        
        .gcms-body { display: flex; flex: 1; overflow: hidden; }
        
        .gcms-sidebar { width: 220px; background: #2D3748; color: #cbd5e1; display: flex; flex-direction: column; justify-content: space-between; }
        .gcms-sidebar-nav { padding: 16px 0; }
        .gcms-sidebar-item { padding: 10px 16px; font-size: 13px; font-weight: 500; cursor: pointer; border-left: 3px solid transparent; }
        .gcms-sidebar-item:hover { background: #1e293b; color: #fff; }
        .gcms-sidebar-item.active { background: #1e293b; color: #3b82f6; border-left-color: #3b82f6; font-weight: 600; }
        
        .gcms-sidebar-footer { padding: 16px; font-size: 11px; background: #1e293b; border-top: 1px solid #334155; }
        .status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; margin-right: 6px; }
        .status-line { margin-bottom: 6px; color: #94a3b8; }
        
        .gcms-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 16px; gap: 16px; }
        
        .gcms-panel { background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
        .panel-header { background: #f8fafc; padding: 8px 16px; border-bottom: 1px solid #cbd5e1; font-size: 13px; font-weight: 600; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .filter-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }
        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-group label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .filter-input { padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-family: inherit; }
        .filter-input:focus { outline: none; border-color: #0ea5e9; }
        .filter-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px; }
        .btn-clear { background: white; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; }
        .btn-search { background: #0ea5e9; border: 1px solid #0284c7; padding: 6px 20px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .btn-search:hover { background: #0284c7; }
        
        .grid-container { flex: 1; overflow: auto; background: #fff; border-top: 1px solid #cbd5e1; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .data-table th { position: sticky; top: 0; background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 8px 16px; border-bottom: 2px solid #cbd5e1; white-space: nowrap; }
        .data-table td { padding: 8px 16px; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', Courier, monospace; color: #0D1B2A; font-weight: 600; cursor: pointer; }
        .data-table tr:hover { background: #f8fafc; }
        .data-table tr.selected { background: #e0f2fe; border-left: 3px solid #0ea5e9; }
        
        .badge { padding: 2px 6px; border-radius: 12px; font-size: 10px; font-family: 'Inter', sans-serif; font-weight: 700; letter-spacing: 0.5px; }
        .badge.ACSP { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge.PDNG { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
        .badge.RJCT { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        
        .inspector-panel { height: 250px; background: #fff; border-top: 2px solid #cbd5e1; display: flex; flex-direction: column; }
        .inspector-header { display: flex; justify-content: space-between; padding: 6px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #334155; }
        .inspector-content { flex: 1; padding: 16px; overflow: auto; background: #fafafa; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.5; color: #0f172a; white-space: pre-wrap; }
        .swift-highlight { color: #0ea5e9; font-weight: bold; }
      `}} />

      {/* ZONE 4: HEADERS */}
      <div className="gcms-header">
        <div className="gcms-header-left">
          <div className="gcms-logo">Skillomentum Global Cash Management System (GCMS) v4.2</div>
        </div>
        <div className="gcms-header-right">
          <div>User: {userName}</div>
        </div>
      </div>

      <div className="gcms-toolbar">
        <button className="btn-back" onClick={() => router.push('/reconciliation-desk')}>← Back to Dashboard</button>
        <div>Module: SWIFT Message Center</div>
      </div>

      <div className="gcms-body">
        {/* ZONE 4: SIDEBAR */}
        <div className="gcms-sidebar">
          <div className="gcms-sidebar-nav">
            <div className="gcms-sidebar-item active">{">"} SWIFT Messages</div>
          </div>
          
          <div className="gcms-sidebar-footer">
            <div style={{color: '#fff', fontWeight: 600, marginBottom: 8}}>SYSTEM STATUS</div>
            <div className="status-line"><span className="status-dot"></span>SWIFT Network: Operational</div>
            <div className="status-line"><span className="status-dot"></span>HSM Crypto Key: Active</div>
            <div className="status-line"><span className="status-dot"></span>MQ Queues: Bound</div>
          </div>
        </div>

        <div className="gcms-main">
          {/* ZONE 1: FILTER */}
          <div className="gcms-panel">
            <div className="panel-header">Search Criteria</div>
            <div className="filter-grid">
              <div className="filter-group">
                <label>Currency</label>
                <input className="filter-input" placeholder="e.g. USD" />
              </div>
              <div className="filter-group">
                <label>Sender BIC</label>
                <input className="filter-input" placeholder="e.g. CHASUS33XXX" />
              </div>
              <div className="filter-group">
                <label>Receiver BIC</label>
                <input className="filter-input" placeholder="e.g. BOFAUS3NXXX" />
              </div>
              <div className="filter-group">
                <label>Sender Account No.</label>
                <input className="filter-input" placeholder="Sender Account" />
              </div>
              <div className="filter-group">
                <label>Receiver Account No.</label>
                <input className="filter-input" placeholder="Receiver Account" />
              </div>
              <div className="filter-group">
                <label>Value Date (From)</label>
                <input type="date" className="filter-input" />
              </div>
              <div className="filter-group">
                <label>Value Date (To)</label>
                <input type="date" className="filter-input" />
              </div>
              <div className="filter-group">
                <label>Amount (From)</label>
                <input type="number" className="filter-input" placeholder="Min" />
              </div>
              <div className="filter-group">
                <label>Amount (To)</label>
                <input type="number" className="filter-input" placeholder="Max" />
              </div>
            </div>
            <div className="filter-actions">
              <button className="btn-clear">CLEAR</button>
              <button className="btn-search">EXECUTE QUERY</button>
            </div>
          </div>

          {/* ZONE 2 & 3 CONTAINER */}
          <div className="gcms-panel" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="panel-header" style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>Message Ledger</span>
              <span style={{color: '#64748b', fontSize: 11}}>Viewing 1-{processedData.length} of {processedData.length} Records</span>
            </div>
            
            {/* ZONE 2: RESULTS GRID */}
            <div className="grid-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TRX ID</th>
                    <th>TYPE</th>
                    <th>VALUE DATE</th>
                    <th>SENDER BIC</th>
                    <th>REC BIC</th>
                    <th>CURR</th>
                    <th style={{textAlign: 'right'}}>AMOUNT</th>
                    <th>STAT</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.map(tx => (
                    <tr 
                      key={tx.id + tx.type} 
                      className={activeRowId === tx.id ? 'selected' : ''}
                      onClick={() => setActiveRowId(tx.id)}
                    >
                      <td>{tx.id}</td>
                      <td>{tx.type}</td>
                      <td>{tx.valueDate}</td>
                      <td>{tx.senderBic}</td>
                      <td>{tx.receiverBic}</td>
                      <td>{tx.currency}</td>
                      <td style={{textAlign: 'right'}}>{tx.amount}</td>
                      <td><span className={`badge ${tx.status}`}>{tx.status}</span></td>
                      <td>
                        {activeRowId === tx.id && (
                          <button 
                            style={{
                              background: '#3b82f6', color: 'white', border: 'none', 
                              padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                              setIsInspectorOpen(true);
                            }}
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ZONE 3: INSPECTOR */}
            {isInspectorOpen && (
              <div className="inspector-panel">
                <div className="inspector-header">
                  <span>SWIFT PAYEE INSPECTOR</span>
                  <div>
                    <span style={{marginRight: '16px'}}>Selected: {selectedTx?.id || "None"}</span>
                    <button 
                      style={{background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px'}}
                      onClick={() => setIsInspectorOpen(false)}
                    >
                      CLOSE
                    </button>
                  </div>
                </div>
                <div className="inspector-content">
                  {selectedTx ? (
                    selectedTx.rawSwift.split(/(:[0-9]{2,3}[A-Z]?:)/g).map((part, i) => {
                      if (part.match(/^:[0-9]{2,3}[A-Z]?:$/)) {
                        return <span key={i} className="swift-highlight">{part}</span>;
                      }
                      return <React.Fragment key={i}>{part}</React.Fragment>;
                    })
                  ) : (
                    <span style={{color: '#94a3b8'}}>Select a record to view raw SWIFT data.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
