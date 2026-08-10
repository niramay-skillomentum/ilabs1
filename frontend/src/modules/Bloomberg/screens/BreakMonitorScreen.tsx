import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function BreakMonitorScreen({ parameter, isRecon = false }: { parameter?: string, isRecon?: boolean }) {
  const filter = parameter ? parameter.toUpperCase() : '';
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await bloombergApi.getAllTradesGlobal({
          statusPattern: 'BREAK'
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

  // Map known parameters to desk names
  const deskFilters: Record<string, string[]> = {
    'MO': ['MIDDLE OFFICE', 'MO_'],
    'SETTLE': ['SETTLEMENT'],
    'SETTLEMENT': ['SETTLEMENT'],
    'CONFIRM': ['CONFIRMATION'],
    'CONF': ['CONFIRMATION'],
    'CONFIRMATION': ['CONFIRMATION']
  };

  const isDeskFilter = Object.keys(deskFilters).includes(filter);

  const filtered = breaks.filter(b => {
    if (!filter) return true;
    
    if (isDeskFilter) {
      const matchTerms = deskFilters[filter];
      const status = (b.currentStatus || '').toUpperCase();
      const desk = (b.nextDesk || '').toUpperCase();
      return matchTerms.some(term => status.includes(term) || desk.includes(term));
    }
    
    // Default search across text fields
    return (b.tradeRef || '').includes(filter) || 
           (b.counterparty || '').includes(filter) || 
           (b.currency || '').includes(filter);
  });

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>BREAK {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px', color: 'red' }}>
        {isRecon ? 'RECONCILIATION MONITOR (RECON)' : 'OPERATIONAL BREAK MONITOR (BRK)'}
      </div>

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
                  {breaks.length === 0 ? 'No open breaks found' : `No open breaks found${filter ? ` matching ${filter}` : ''}`}
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

