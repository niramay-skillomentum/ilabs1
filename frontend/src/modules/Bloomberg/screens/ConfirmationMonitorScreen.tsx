import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function ConfirmationMonitorScreen({ parameter }: { parameter?: string }) {
  const filter = parameter ? parameter.toUpperCase() : '';
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getAllTradesGlobal({ desk: 'CONFIRMATION' });
        if (res.success && res.trades) {
          setTrades(res.trades);
        }
      } catch (err) {
        console.error("Failed to fetch trades:", err);
        setError('Error fetching confirmations from the server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = filter ? trades.filter(f => 
    f.tradeRef?.includes(filter) || 
    f.counterparty?.includes(filter) || 
    f.currency?.includes(filter)
  ) : trades;



  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
          CONFIRMATION MONITOR (CONF)
        </div>
        <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
          Command &gt; <span>CONF {parameter || ''}</span>
        </div>
      </div>
      
      <div className="bb-panel" style={{ padding: 0 }}>
        <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444', color: '#ff9900' }}>
          CONFIRMATIONS DASHBOARD
        </div>
        {error ? (
          <div style={{ padding: '24px', color: 'var(--bb-alert)', fontSize: '14px' }}>
            {error}
          </div>
        ) : (
          <table className="bb-results-table bb-results-table-bordered">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>CPTY</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>CCY</th>
                <th>Status</th>
                <th>Method</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '16px' }}>Loading...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((f, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--bb-text-primary)', textDecoration: 'underline', cursor: 'pointer' }}>{f.tradeRef}</td>
                    <td>{f.counterparty}</td>
                    <td style={{ textAlign: 'right' }}>{f.amount != null ? f.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                    <td>{f.currency}</td>
                    <td style={{ 
                      color: f.currentStatus?.includes('DISCREPANCY') || f.currentStatus?.includes('UNMATCHED') ? 'red' : 
                             f.currentStatus?.includes('MATCHED') ? '#33cc33' : 'white',
                      fontWeight: 'bold' 
                    }}>{f.currentStatus}</td>
                    <td>{f.settlementType || 'N/A'}</td>
                    <td>{f.nextDesk || 'None'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '16px' }}>No confirmations found matching {filter}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px solid #444', 
          marginTop: '32px', 
          paddingTop: '8px', 
          fontSize: '12px', 
          color: '#888' 
        }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Confirmations loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
      </div>
    </div>
  );
}
