import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function FailedTradesScreen({ parameter }: { parameter?: string }) {
  const filter = parameter ? parameter.toUpperCase() : '';
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await bloombergApi.getAllTrades();
        if (res.success && res.trades) {
          // Filter to show trades that are in a break/fail state
          const fails = res.trades.filter((t: any) => 
            t.currentStatus?.includes('BREAK') || 
            t.currentStatus?.includes('REJECTED') ||
            t.currentStatus?.includes('UNMATCHED')
          );
          setTrades(fails);
        }
      } catch (err) {
        console.error("Failed to fetch trades:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = filter ? trades.filter(f => 
    f.tradeRef?.includes(filter) || 
    f.counterparty?.includes(filter) || 
    f.underlyer?.includes(filter) ||
    f.currency?.includes(filter)
  ) : trades;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>FAIL {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px', color: 'red' }}>
        FAILED SETTLEMENTS DASHBOARD (FAIL)
      </div>

      <div className="bb-panel" style={{ padding: 0 }}>
        <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444' }}>
          FAILS ({filtered.length})
        </div>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Trade ID</th>
              <th>CPTY</th>
              <th>Asset</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>CCY</th>
              <th>Value Date</th>
              <th>Status</th>
              <th>Next Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '16px' }}>Loading...</td></tr>
            ) : filtered.length > 0 ? (
              filtered.map((f, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-primary)', textDecoration: 'underline', cursor: 'pointer' }}>{f.tradeRef}</td>
                  <td>{f.counterparty}</td>
                  <td>{f.underlyer}</td>
                  <td style={{ textAlign: 'right' }}>{f.amount != null ? f.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                  <td>{f.currency}</td>
                  <td>{f.valueDate ? new Date(f.valueDate).toISOString().split('T')[0] : ''}</td>
                  <td style={{ color: 'red', fontWeight: 'bold' }}>{f.currentStatus}</td>
                  <td>{f.nextDesk || 'Investigate'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '16px' }}>No failed trades found matching {filter}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px', color: 'var(--bb-text-secondary)', fontSize: '12px' }}>
        MSG: Failed settlements loaded
      </div>
    </div>
  );
}
