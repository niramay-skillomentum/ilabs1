import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function WorkQueueScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [desk, setDesk] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQueue = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getMyQueue();
        if (res.success) {
          setTasks(res.trades || []);
          setDesk(res.desk || '');
        } else {
          setError(res.error || 'No active queue found. Please generate a queue for your desk.');
        }
      } catch (err: any) {
        setError('No active queue found. Please generate a queue for your desk.');
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
          OPERATIONS WORK QUEUE
        </div>
        <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
          Command &gt; <span>QUEUE</span>
        </div>
      </div>

      {desk && (
        <div style={{ marginBottom: '16px', fontSize: '13px', color: '#00ccff' }}>
          Active Session: <span style={{ fontWeight: 'bold', color: '#ff9900' }}>{desk}</span>
        </div>
      )}

      {loading && <div style={{ padding: '16px', color: 'var(--bb-text-secondary)' }}>Loading your queue...</div>}
      {error && <div style={{ padding: '16px', color: 'var(--bb-alert)' }}>{error}</div>}

      {!loading && !error && (
        <div className="bb-panel" style={{ padding: 0 }}>
          <table className="bb-results-table bb-results-table-bordered">
            <thead style={{ backgroundColor: '#111' }}>
              <tr>
                <th>Trade Ref</th>
                <th>Status</th>
                <th>Counterparty</th>
                <th>Direction</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>CCY</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? (
                tasks.map((t, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--bb-text-primary)', textDecoration: 'underline', cursor: 'pointer' }}>{t.tradeRef}</td>
                    <td>{t.currentStatus || 'PENDING'}</td>
                    <td>{t.counterparty || 'N/A'}</td>
                    <td>{t.direction || 'BUY'}</td>
                    <td style={{ textAlign: 'right' }}>{t.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{t.currency || 'USD'}</td>
                    <td style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>
                      ME
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#888' }}>
                    Your queue is currently empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {!loading && !error && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '32px', 
          paddingTop: '8px', 
          borderTop: '1px solid #444',
          fontSize: '12px', 
          color: '#888' 
        }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Queue loaded ({tasks.length} items)</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
        </div>
      )}
    </div>
  );
}
