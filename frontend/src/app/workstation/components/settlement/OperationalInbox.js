"use client";
import React from 'react';

export default function OperationalInbox({ events }) {
  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '100%', maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Operational Inbox</h3>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(!events || events.length === 0) ? (
          <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
            No recent operational events.
          </div>
        ) : (
          events.map((evt, i) => (
            <div key={i} style={{ padding: '10px', background: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '4px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>
                <strong>{evt.eventType}</strong>
                <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ color: '#334155' }}>
                {evt.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
