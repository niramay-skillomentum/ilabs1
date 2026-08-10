import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

export default function PortfolioScreen() {
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getPortfolioGlobal();
        if (res.success) {
          setPortfolioData(res);
        } else {
          setError('Failed to load portfolio data');
        }
      } catch (err) {
        setError('Error fetching portfolio data. Server may be unreachable.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const getStatusColor = (status: string) => {
    if (status === 'Settled') return 'var(--bb-green)';
    if (status === 'Partial') return 'var(--bb-orange)';
    return 'var(--bb-text-primary)';
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div className="bb-screen-header">
        <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
          15. PORTFOLIO (PORT)
        </div>
        <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
          Command &gt; <span>PORT</span>
        </div>
      </div>

      {loading && <div style={{ padding: '16px', color: 'var(--bb-text-secondary)' }}>Loading portfolio data...</div>}
      {error && <div style={{ padding: '16px', color: 'var(--bb-alert)' }}>{error}</div>}

      {!loading && portfolioData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PORTFOLIO SUMMARY */}
          <div>
            <div style={{ color: '#00ccff', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
              PORTFOLIO SUMMARY
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Summary Box 1: Total Holdings */}
              <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ color: '#ccc', fontSize: '11px', marginBottom: '8px' }}>Total Holdings (USD)</div>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                  {formatNumber(portfolioData.summary?.totalHoldings || 0, 2)}
                </div>
              </div>
              
              {/* Summary Box 2: Total Trades */}
              <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ color: '#ccc', fontSize: '11px', marginBottom: '8px' }}>Total Trades</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                  {formatNumber(portfolioData.summary?.totalTrades || 0, 0)}
                </div>
              </div>

              {/* Summary Box 3: Settled Trades */}
              <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ color: '#ccc', fontSize: '11px', marginBottom: '8px' }}>Settled Trades</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                  {formatNumber(portfolioData.summary?.settledTrades || 0, 0)}
                </div>
              </div>

              {/* Summary Box 4: Pending Trades */}
              <div style={{ flex: 1, backgroundColor: 'var(--bb-bg-surface)', border: '1px solid #333', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ color: '#ccc', fontSize: '11px', marginBottom: '8px' }}>Pending Trades</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                  {formatNumber(portfolioData.summary?.pendingTrades || 0, 0)}
                </div>
              </div>
            </div>
          </div>

          {/* HOLDINGS */}
          <div>
            <div style={{ color: '#00ccff', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
              HOLDINGS
            </div>
            
            <div className="bb-panel" style={{ padding: 0, border: '1px solid #333' }}>
              <table className="bb-results-table bb-results-table-bordered">
                <thead style={{ backgroundColor: '#111' }}>
                  <tr>
                    <th>Security</th>
                    <th>ISIN</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Avg Price</th>
                    <th style={{ textAlign: 'right' }}>Market Value (USD)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.holdings && portfolioData.holdings.length > 0 ? (
                    portfolioData.holdings.map((h: any, i: number) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--bb-text-primary)' }}>{h.security}</td>
                        <td style={{ color: '#ccc' }}>{h.isin}</td>
                        <td style={{ textAlign: 'right', color: '#fff' }}>{formatNumber(h.quantity, 0)}</td>
                        <td style={{ textAlign: 'right', color: '#ccc' }}>{formatNumber(h.avgPrice, 4)}</td>
                        <td style={{ textAlign: 'right', color: '#fff' }}>{formatNumber(h.marketValue, 2)}</td>
                        <td style={{ color: getStatusColor(h.status) }}>{h.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#888' }}>
                        No holdings found for your desk.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}

      {/* Footer message */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: 'auto', 
        paddingTop: '16px', 
        fontSize: '12px', 
        color: '#888' 
      }}>
        <div style={{ color: '#00ccff' }}>MSG: Portfolio loaded</div>
        <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
      </div>
    </div>
  );
}
