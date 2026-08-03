import React from 'react';

export default function WorkQueueScreen() {
  const mockTasks = [
    { id: 'TSK-1001', type: 'SSI_APPROVAL', ref: 'SSI-BNYM-EUR-8832', priority: 'HIGH', status: 'PENDING', owner: 'J. SMITH' },
    { id: 'TSK-1002', type: 'TRADE_EXCP', ref: 'TRD0001256', priority: 'HIGH', status: 'INVESTIGATING', owner: 'ME' },
    { id: 'TSK-1003', type: 'FEE_DISPUTE', ref: 'BRK-8923', priority: 'MEDIUM', status: 'PENDING', owner: 'A. JONES' },
    { id: 'TSK-1004', type: 'UNMATCHED', ref: 'TRD0000912', priority: 'CRITICAL', status: 'UNASSIGNED', owner: '' },
    { id: 'TSK-1005', type: 'SWIFT_NACK', ref: 'MSG-339210', priority: 'HIGH', status: 'PENDING', owner: 'ME' },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>QUEUE</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        OPERATIONS WORK QUEUE
      </div>

      <div className="bb-panel" style={{ padding: 0 }}>
        <table className="bb-results-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Task Type</th>
              <th>Reference</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mockTasks.map((t, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--bb-text-primary)' }}>{t.id}</td>
                <td>{t.type}</td>
                <td style={{ textDecoration: 'underline', cursor: 'pointer' }}>{t.ref}</td>
                <td style={{ 
                  color: t.priority === 'CRITICAL' ? 'red' : t.priority === 'HIGH' ? 'var(--bb-text-primary)' : 'var(--bb-text-tertiary)',
                  fontWeight: t.priority === 'CRITICAL' ? 'bold' : 'normal'
                }}>
                  {t.priority}
                </td>
                <td>{t.status}</td>
                <td style={{ color: t.owner === 'ME' ? 'var(--bb-text-primary)' : 'inherit', fontWeight: t.owner === 'ME' ? 'bold' : 'normal' }}>
                  {t.owner || '-'}
                </td>
                <td>
                  <button className="bb-btn-outline" style={{ padding: '2px 8px', fontSize: '11px' }}>
                    {t.owner === 'ME' ? 'WORK' : 'CLAIM'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
