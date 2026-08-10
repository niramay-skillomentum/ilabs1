import React from 'react';

export default function HolidayCalendarScreen({ parameter, command }: { parameter?: string, command?: string }) {
  const filter = parameter ? parameter.toUpperCase() : '';

  const mockHolidays = [
    { date: '2026-01-01', ccy: 'ALL', holiday: 'New Year\'s Day' },
    { date: '2026-01-19', ccy: 'USD', holiday: 'Martin Luther King Jr. Day' },
    { date: '2026-02-16', ccy: 'USD', holiday: 'Presidents\' Day' },
    { date: '2026-04-03', ccy: 'GBP, EUR, AUD', holiday: 'Good Friday' },
    { date: '2026-04-06', ccy: 'GBP, EUR, AUD', holiday: 'Easter Monday' },
    { date: '2026-05-04', ccy: 'GBP', holiday: 'Early May Bank Holiday' },
    { date: '2026-05-25', ccy: 'USD, GBP', holiday: 'Memorial Day / Spring Bank Holiday' },
    { date: '2026-07-03', ccy: 'USD', holiday: 'Independence Day (Observed)' },
    { date: '2026-09-07', ccy: 'USD, CAD', holiday: 'Labor Day' },
    { date: '2026-11-26', ccy: 'USD', holiday: 'Thanksgiving Day' },
    { date: '2026-12-25', ccy: 'ALL', holiday: 'Christmas Day' },
    { date: '2026-12-28', ccy: 'GBP, EUR, CAD, AUD', holiday: 'Boxing Day (Observed)' },
  ];

  const filtered = filter ? mockHolidays.filter(h => h.ccy.includes(filter) || h.ccy === 'ALL') : mockHolidays;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>HOL {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        MARKET HOLIDAY CALENDAR 2026
      </div>

      <div className="bb-panel" style={{ padding: 0 }}>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Date</th>
              <th>Currency</th>
              <th>Holiday Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((h, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-primary)' }}>{h.date}</td>
                  <td style={{ fontWeight: 'bold' }}>{h.ccy}</td>
                  <td style={{ color: 'var(--bb-text-tertiary)' }}>{h.holiday}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '16px' }}>No holidays found matching {filter}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
