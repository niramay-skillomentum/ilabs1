import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function BreakMonitorScreen({ parameter }: { parameter?: string }) {
  const filter = parameter ? parameter.toUpperCase() : '';
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await bloombergApi.getReconciliationItems();
        if (res.success && res.items) {
          setBreaks(res.items);
        }
      } catch (err) {
        console.error("Failed to fetch breaks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = filter ? breaks.filter(b => 
    (b.itemRef1 || '').includes(filter) || 
    b.itemId.includes(filter) || 
    b.source.includes(filter)
  ) : breaks;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>BREAK {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px', color: 'red' }}>
        OPERATIONAL BREAK MONITOR (BRK)
      </div>

      <div className="bb-panel" style={{ padding: 0 }}>
        <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444' }}>
          BREAKS ({filtered.length})
        </div>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Break ID</th>
              <th>Trade ID</th>
              <th>Source</th>
              <th>Break Type</th>
              <th>CCY</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Desk</th>
              <th>Status</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '16px' }}>Loading...</td></tr>
            ) : filtered.length > 0 ? (
              filtered.map((b, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-primary)' }}>{b.itemId}</td>
                  <td style={{ textDecoration: 'underline', cursor: 'pointer' }}>{b.itemRef1 || '-'}</td>
                  <td>{b.source}</td>
                  <td>{b.itemType || '-'}</td>
                  <td>{b.currency || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{b.amount != null ? b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                  <td>{b.reconDesk || '-'}</td>
                  <td style={{ color: b.status === 'Outstanding' ? 'red' : 'var(--bb-text-primary)' }}>{b.status}</td>
                  <td>{b.assignedTo || 'Unassigned'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '16px' }}>No breaks found matching {filter}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px', color: 'var(--bb-text-secondary)', fontSize: '12px' }}>
        MSG: Break Monitor loaded
      </div>
    </div>
  );
}
