import React from 'react';

export default function CutoffTimesScreen({ parameter, command }: { parameter?: string, command?: string }) {
  const currencyFilter = parameter ? parameter.toUpperCase() : '';

  const cutoffData = [
    { ccy: 'USD', time: '18:00 ET' },
    { ccy: 'EUR', time: '16:00 ET' },
    { ccy: 'GBP', time: '16:00 ET' },
    { ccy: 'JPY', time: '14:00 ET' },
    { ccy: 'CHF', time: '16:00 ET' },
    { ccy: 'CAD', time: '15:30 ET' },
    { ccy: 'AUD', time: '14:30 ET' },
    { ccy: 'NZD', time: '13:30 ET' },
    { ccy: 'SEK', time: '16:00 ET' },
    { ccy: 'NOK', time: '16:00 ET' },
    { ccy: 'ZAR', time: '14:30 ET' },
    { ccy: 'HKD', time: '14:00 ET' }
  ];

  const filtered = currencyFilter ? cutoffData.filter(c => c.ccy.includes(currencyFilter)) : cutoffData;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>CUT {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        SETTLEMENT CUT-OFF TIMES
      </div>

      <div className="bb-panel" style={{ padding: 0 }}>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Cut-off Time (ET)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>{c.ccy}</td>
                  <td>{c.time}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', padding: '16px' }}>No cut-off times found for {currencyFilter}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
