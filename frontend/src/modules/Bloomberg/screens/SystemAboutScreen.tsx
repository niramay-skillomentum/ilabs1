import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function SystemAboutScreen({ isNews }: { isNews?: boolean }) {
  const [activeTab, setActiveTab] = useState('ABOUT');
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'ABOUT') {
      const start = Date.now();
      bloombergApi.getProducts().then(() => {
        setApiLatency(Date.now() - start);
      }).catch(() => setApiLatency(-1));
    }
  }, [activeTab]);

  if (isNews) {
    return (
      <div style={{ padding: '16px' }}>
        <div className="bb-screen-header">
          <div className="bb-command-echo">Command &gt; <span>NEWS</span></div>
        </div>
        
        <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
          OPERATIONS NOTICES & MARKET NEWS
        </div>

        <div className="bb-panel" style={{ padding: '16px' }}>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>2026-07-28 08:30 GMT - ECB Rate Decision</div>
            <div style={{ color: 'var(--bb-text-tertiary)', marginTop: '4px' }}>European Central Bank has maintained interest rates at 3.50%. High volatility expected in EUR crosses.</div>
          </div>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>2026-07-27 14:00 GMT - SYSTEM MAINTENANCE</div>
            <div style={{ color: 'var(--bb-text-tertiary)', marginTop: '4px' }}>SWIFT Gateway maintenance scheduled for Saturday 01-Aug from 02:00 to 04:00 GMT. Messages will be queued.</div>
          </div>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>2026-07-26 10:15 GMT - NEW COUNTERPARTY ONBOARDED</div>
            <div style={{ color: 'var(--bb-text-tertiary)', marginTop: '4px' }}>Standard Chartered Bank (SCBL) SSIs have been verified and loaded into the SSI database.</div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = ['ABOUT', 'Utility', 'Terminal Information', 'Version', 'Support', 'Internal'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ABOUT':
        return (
          <>
            <h1 style={{ color: 'var(--bb-text-primary)', fontSize: '24px', marginBottom: '8px', letterSpacing: '1px' }}>SGB TERMINAL</h1>
            <div style={{ color: 'var(--bb-text-tertiary)', fontSize: '14px', marginBottom: '4px' }}>Corporate & Institutional Banking Operations</div>
            <div style={{ color: 'var(--bb-text-secondary)', fontSize: '13px', marginBottom: '32px' }}>Build Version: 1.0.4 (Build 8832)</div>
            
            <table className="bb-results-table" style={{ width: '50%' }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--bb-text-secondary)', width: '40%' }}>API STATUS</td>
                  <td style={{ color: apiLatency && apiLatency > 0 ? '#00ffcc' : 'red' }}>
                    {apiLatency === null ? 'TESTING...' : apiLatency > 0 ? `ONLINE (${apiLatency}ms)` : 'OFFLINE'}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--bb-text-secondary)' }}>MONGODB</td>
                  <td style={{ color: '#00ffcc' }}>CONNECTED</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--bb-text-secondary)' }}>SWIFT GATEWAY</td>
                  <td style={{ color: '#00ffcc' }}>ACTIVE</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--bb-text-secondary)' }}>SUPPORT LINE</td>
                  <td style={{ color: 'var(--bb-text-primary)' }}>Internal Help Desk (Ext. 4455)</td>
                </tr>
              </tbody>
            </table>
          </>
        );
      case 'Utility':
        return (
          <div style={{ color: '#ccc' }}>
            <h2 style={{ color: '#ff9900', marginBottom: '16px' }}>System Utilities</h2>
            <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
              <li>Cache Flush: <span style={{ color: '#00ccff', cursor: 'pointer' }}>Execute</span></li>
              <li>Re-index Search DB: <span style={{ color: '#00ccff', cursor: 'pointer' }}>Execute</span></li>
              <li>Diagnostic Ping: <span style={{ color: '#00ccff', cursor: 'pointer' }}>Execute</span></li>
            </ul>
          </div>
        );
      case 'Terminal Information':
        return (
          <div style={{ color: '#ccc', lineHeight: '1.6' }}>
            <h2 style={{ color: '#ff9900', marginBottom: '16px' }}>Terminal Specifications</h2>
            <p><strong>Workstation ID:</strong> WK-49201-LON</p>
            <p><strong>Session Desk:</strong> Dynamically Assigned</p>
            <p><strong>Security Level:</strong> Tier 2 (Operations)</p>
            <p><strong>Environment:</strong> UAT / Pre-Production</p>
          </div>
        );
      case 'Version':
        return (
          <div style={{ color: '#ccc' }}>
            <h2 style={{ color: '#ff9900', marginBottom: '16px' }}>Version History</h2>
            <table className="bb-results-table bb-results-table-bordered">
              <thead>
                <tr><th>Version</th><th>Date</th><th>Changes</th></tr>
              </thead>
              <tbody>
                <tr><td>1.0.4</td><td>2026-08-01</td><td>Added dynamic tabs, PORT command</td></tr>
                <tr><td>1.0.3</td><td>2026-07-15</td><td>Queue management updates, BREAK monitor</td></tr>
                <tr><td>1.0.2</td><td>2026-06-30</td><td>SWIFT MT202COV support added</td></tr>
              </tbody>
            </table>
          </div>
        );
      case 'Support':
        return (
          <div style={{ color: '#ccc', lineHeight: '1.6' }}>
            <h2 style={{ color: '#ff9900', marginBottom: '16px' }}>Contact Support</h2>
            <p>For immediate assistance with trade breaks or settlement failures, contact the global ops desk.</p>
            <br/>
            <p><strong>Phone:</strong> Ext. 4455 (Global) / +44 20 7946 0958</p>
            <p><strong>Email:</strong> ops-support@skillomentum-bank.internal</p>
            <p><strong>Ticket Portal:</strong> <span style={{ color: '#00ccff', cursor: 'pointer', textDecoration: 'underline' }}>Open Service-Now</span></p>
          </div>
        );
      case 'Internal':
        return (
          <div style={{ color: '#ccc' }}>
            <h2 style={{ color: '#ff9900', marginBottom: '16px' }}>Internal Admin Links</h2>
            <p>Restricted to authorized system administrators only.</p>
            <br/>
            <div style={{ padding: '8px', border: '1px solid red', display: 'inline-block', color: 'red' }}>
              ACCESS DENIED - REQUIRES LEVEL 3 CLEARANCE
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>ABOUT</span></div>
      </div>

      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        TERMINAL INFORMATION
        <div className="bb-screen-title-right">
          <span style={{color: 'var(--bb-text-secondary)'}}>SESSIONS</span> INTERNAL
        </div>
      </div>

      {/* Dynamic Header Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px', fontSize: '14px' }}>
        {tabs.map((tab, index) => (
          <React.Fragment key={tab}>
            <span 
              onClick={() => setActiveTab(tab)}
              style={{ 
                color: activeTab === tab ? 'var(--bb-orange)' : 'var(--bb-text-primary)', 
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {tab}
            </span>
            {index < tabs.length - 1 && <span style={{ color: 'var(--bb-text-secondary)' }}>|</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="bb-panel" style={{ padding: '24px', flex: 1 }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
