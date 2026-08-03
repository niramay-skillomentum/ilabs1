import React from 'react';

export default function SystemAboutScreen({ isNews }: { isNews?: boolean }) {
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

      {/* Imitating the Bloomberg header tabs from the screenshot */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px', fontSize: '14px' }}>
        <span style={{ color: 'var(--bb-orange)', fontWeight: 'bold' }}>ABOUT</span>
        <span style={{ color: 'var(--bb-text-secondary)' }}>|</span>
        <span style={{ color: 'var(--bb-text-primary)' }}>Utility</span>
        <span style={{ color: 'var(--bb-text-secondary)' }}>|</span>
        <span style={{ color: 'var(--bb-text-primary)' }}>Terminal Information</span>
        <span style={{ color: 'var(--bb-text-secondary)' }}>|</span>
        <span style={{ color: 'var(--bb-text-primary)' }}>Version</span>
        <span style={{ color: 'var(--bb-text-secondary)' }}>|</span>
        <span style={{ color: 'var(--bb-text-primary)' }}>Support</span>
        <span style={{ color: 'var(--bb-text-secondary)' }}>|</span>
        <span style={{ color: 'var(--bb-text-primary)' }}>Internal</span>
      </div>

      <div className="bb-panel" style={{ padding: '24px' }}>
        <h1 style={{ color: 'var(--bb-text-primary)', fontSize: '24px', marginBottom: '8px', letterSpacing: '1px' }}>SGB TERMINAL</h1>
        <div style={{ color: 'var(--bb-text-tertiary)', fontSize: '14px', marginBottom: '4px' }}>Corporate & Institutional Banking Operations</div>
        <div style={{ color: 'var(--bb-text-secondary)', fontSize: '13px', marginBottom: '32px' }}>Build Version: 1.0.4 (Build 8832)</div>
        
        <table className="bb-results-table" style={{ width: '50%' }}>
          <tbody>
            <tr>
              <td style={{ color: 'var(--bb-text-secondary)', width: '40%' }}>API STATUS</td>
              <td style={{ color: '#00ffcc' }}>ONLINE (24ms)</td>
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
      </div>
    </div>
  );
}
