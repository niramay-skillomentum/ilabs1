import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function WorkQueueScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getTradeStats();
        if (res.success) {
          setStats(res);
        } else {
          setError('Failed to load queue statistics.');
        }
      } catch (err: any) {
        setError('Error fetching queue statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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

      {!loading && !error && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#ccc', fontSize: '12px', marginBottom: '8px' }}>Total Trades</div>
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{stats.totalTrades}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#ccc', fontSize: '12px', marginBottom: '8px' }}>Pending</div>
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{stats.pendingCount}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#ccc', fontSize: '12px', marginBottom: '8px' }}>Settled</div>
              <div style={{ color: '#33cc33', fontSize: '24px', fontWeight: 'bold' }}>{stats.settledCount}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#ccc', fontSize: '12px', marginBottom: '8px' }}>Exceptions</div>
              <div style={{ color: 'var(--bb-alert)', fontSize: '24px', fontWeight: 'bold' }}>{(stats.failedCount || 0) + (stats.breakCount || 0)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div className="bb-panel" style={{ flex: 1, padding: 0 }}>
              <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444' }}>
                QUEUE BY DESK
              </div>
              <table className="bb-results-table bb-results-table-bordered">
                <thead>
                  <tr>
                    <th>Desk</th>
                    <th style={{ textAlign: 'right' }}>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byDesk?.map((d: any, i: number) => (
                    <tr key={i}>
                      <td>{d.desk}</td>
                      <td style={{ textAlign: 'right' }}>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bb-panel" style={{ flex: 1, padding: 0 }}>
              <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444' }}>
                QUEUE BY STATUS
              </div>
              <table className="bb-results-table bb-results-table-bordered">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byStatus?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td>{s.status}</td>
                      <td style={{ textAlign: 'right' }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Global queue overview loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
        </div>
      )}
    </div>
  );
}
