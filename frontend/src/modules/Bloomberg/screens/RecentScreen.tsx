import React from 'react';
import { ALL_COMMANDS } from '../components/Header';

export default function RecentScreen({ parameter }: { parameter: string | null }) {
  // Mock history of recent commands using only internal valid commands
  const recentHistory = [
    { time: '14:32:45', cmd: 'SEARCH APPLE', category: 'General', desc: 'Global Search for Apple' },
    { time: '14:28:12', cmd: 'DES US0378331005', category: 'Reference Data', desc: 'Security Description' },
    { time: '14:15:05', cmd: 'SSI BNY Mellon', category: 'Reference Data', desc: 'Settlement Instructions' },
    { time: '13:50:22', cmd: 'TRADE TRD0001256', category: 'Operations', desc: 'Trade Inquiry' },
    { time: '13:45:11', cmd: 'SWIFT TRD0001256', category: 'SWIFT', desc: 'SWIFT Viewer' },
    { time: '11:20:00', cmd: 'ENTITY SKILLOMENTUM', category: 'Reference Data', desc: 'Entity Profile' },
    { time: '10:05:33', cmd: 'HELP', category: 'General', desc: 'Operations Help' },
    { time: '09:30:15', cmd: 'HOME', category: 'General', desc: 'Home Dashboard' },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>RECENT</span></div>
      </div>

      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        RECENT COMMANDS HISTORY
        <div className="bb-screen-title-right">
          <span style={{color: 'var(--bb-text-secondary)'}}>SESSIONS</span> INTERNAL
        </div>
      </div>

      {/* Header tabs showing only the active recent session */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px' }}>
        <span style={{ color: 'var(--bb-orange)', fontWeight: 'bold' }}>RECENT</span>
      </div>

      <table className="bb-results-table bb-results-table-bordered">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>Time</th>
            <th style={{ width: '25%' }}>Command</th>
            <th style={{ width: '20%' }}>Category</th>
            <th style={{ width: '40%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {recentHistory.map((row, idx) => (
            <tr key={idx}>
              <td style={{ color: 'var(--bb-text-secondary)' }}>{row.time}</td>
              <td style={{ color: '#00ccff', fontWeight: 'bold' }}>{row.cmd}</td>
              <td style={{ color: 'var(--bb-text-tertiary)' }}>{row.category}</td>
              <td>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
