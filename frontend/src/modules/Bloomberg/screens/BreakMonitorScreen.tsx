import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function BreakMonitorScreen({ parameter }: { parameter?: string }) {
  const filter = parameter ? parameter.toUpperCase() : '';
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDesk, setCurrentDesk] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Determine the user's currently logged-in desk
        const queueRes = await bloombergApi.getMyQueue();
        const desk = queueRes.success ? queueRes.desk : '';
        setCurrentDesk(desk);

        if (!desk) {
          setBreaks([]);
          return;
        }

        // 2. Fetch only break trades on the user's desk, assigned to them
        const res = await bloombergApi.getAllTrades({
          desk,
          assignedOnly: true,
          statusPattern: `${desk}_BREAK`
        });
        if (res.success && res.trades) {
          setBreaks(res.trades);
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
    (b.tradeRef || '').includes(filter) || 
    (b.counterparty || '').includes(filter) || 
    (b.currency || '').includes(filter)
  ) : breaks;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>BREAK {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px', color: 'red' }}>
        OPERATIONAL BREAK MONITOR (BRK)
      </div>

      {currentDesk && (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#00ccff' }}>
          Desk: <span style={{ fontWeight: 'bold', color: '#ff9900' }}>{currentDesk}</span>
        </div>
      )}

      <div className="bb-panel" style={{ padding: 0 }}>
        <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444' }}>
          OPEN BREAKS ({filtered.length})
        </div>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Trade ID</th>
              <th>CPTY</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>CCY</th>
              <th>Trade Date</th>
              <th>Value Date</th>
              <th>Status</th>
              <th>Direction</th>
              <th>Settlement</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '16px' }}>Loading...</td></tr>
            ) : filtered.length > 0 ? (
              filtered.map((b, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-primary)', textDecoration: 'underline', cursor: 'pointer' }}>{b.tradeRef}</td>
                  <td>{b.counterparty}</td>
                  <td style={{ textAlign: 'right' }}>{b.amount != null ? b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                  <td>{b.currency || '-'}</td>
                  <td>{b.tradeDate ? new Date(b.tradeDate).toISOString().split('T')[0] : '-'}</td>
                  <td>{b.valueDate ? new Date(b.valueDate).toISOString().split('T')[0] : '-'}</td>
                  <td style={{ color: 'red', fontWeight: 'bold' }}>{b.currentStatus}</td>
                  <td>{b.direction || '-'}</td>
                  <td>{b.settlementType || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '16px' }}>
                  {!currentDesk ? 'No active desk session found. Generate a queue first.' : `No open breaks found${filter ? ` matching ${filter}` : ''}`}
                </td>
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

