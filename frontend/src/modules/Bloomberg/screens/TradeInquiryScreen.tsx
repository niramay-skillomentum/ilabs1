"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  startTab?: string;
}

export default function TradeInquiryScreen({ parameter, startTab }: Props) {
  let initialTab = 1;
  if (startTab) {
    if (startTab === 'LIFE' || startTab === 'HIST') initialTab = 4;
    if (startTab === 'SETTLE' || startTab === 'CONF') initialTab = 3;
  }

  const [data, setData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (startTab === 'LIFE' || startTab === 'HIST') setActiveTab(4);
    else if (startTab === 'SETTLE' || startTab === 'CONF') setActiveTab(3);
    else setActiveTab(1);
  }, [startTab]);
  useEffect(() => {
    if (!parameter) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getTrade(parameter);
        if (res.success && (res.trade || res.data)) {
          setData(res.trade || res.data);
          if (res.allowedTransitions) setAllowedTransitions(res.allowedTransitions);
          if (startTab === 'HIST') {
            try {
              const histRes = await bloombergApi.getTradeHistory(parameter);
              if (histRes.trail) {
                setHistoryData(histRes.trail);
              }
            } catch (histErr) {
              console.error("Failed to fetch history:", histErr);
            }
          }
        } else {
          setError('Trade not found.');
        }
      } catch (err) {
        setError('Error fetching trade.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parameter]);

  if (!parameter) {
    return <div style={{ padding: '24px' }}>Please specify a Trade ID (e.g. TRD TRD0001256).</div>;
  }

  if (loading) return <div style={{ padding: '24px' }}>Loading {parameter}...</div>;
  if (error) return <div style={{ padding: '24px', color: 'var(--bb-alert)' }}>{error}</div>;
  if (!data) return null;

  const tDate = data.tradeDate ? new Date(data.tradeDate) : new Date();
  const sDate = data.valueDate || data.settlementDate ? new Date(data.valueDate || data.settlementDate) : new Date(tDate.getTime() + 2*24*60*60*1000);
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const tDateStr = `${pad(tDate.getDate())}-${tDate.toLocaleString('default', { month: 'short' })}-${tDate.getFullYear()} ${pad(tDate.getHours())}:${pad(tDate.getMinutes())}`;
  const sDateStr = `${pad(sDate.getDate())}-${sDate.toLocaleString('default', { month: 'short' })}-${sDate.getFullYear()}`;

  const getLogicalStage = (status: string) => {
    if (!status) return 0;
    if (status.includes('MO_') || status === 'NEW' || status === 'PENDING_FO_RESPONSE') return 1;
    if (status.includes('CONFIRMATION_') || status.includes('LIASING_')) return 2;
    if (status.includes('SETTLEMENT_') || status.includes('AMEND') || status.includes('APPROVAL')) return 3;
    if (status === 'SETTLED' || status.includes('RECON_') || status === 'UNMATCHED_BY_USER') return 4;
    if (status === 'CLOSED' || status === 'RECON_CLEARED') return 5;
    return 1;
  };

  const renderNode = (num: number, label: string, timeStr: string, logicalStage: number) => {
    let color = '#666'; 
    let borderColor = '#666';
    let isCurrent = false;

    if (logicalStage > num) {
      color = '#33cc33'; // green
      borderColor = '#33cc33';
    } else if (logicalStage === num) {
      color = '#ff9900'; // orange
      borderColor = '#ff9900';
      isCurrent = true;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100px', zIndex: 2 }}>
        <div style={{
          width: isCurrent ? '40px' : '32px',
          height: isCurrent ? '40px' : '32px',
          borderRadius: '50%',
          border: `2px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          fontSize: isCurrent ? '18px' : '14px',
          fontWeight: 'bold',
          backgroundColor: '#000'
        }}>
          {num}
        </div>
        <div style={{ marginTop: '12px', color: color, fontWeight: 'bold', fontSize: '14px' }}>{label}</div>
        <div style={{ marginTop: '8px', color: '#ccc', fontSize: '12px', textAlign: 'center', lineHeight: '1.4' }}>
          {timeStr && timeStr !== '--:--' ? timeStr.split(' ').map((p,i)=><div key={i}>{p}</div>) : '--:--'}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>{startTab || 'TRADE'} {parameter.toUpperCase()}</span></div>
      </div>

      {startTab !== 'LIFE' && startTab !== 'SETTLE' && (
        <div className="bb-screen-title" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <div>Trade ID &nbsp;&nbsp;&nbsp;{data.tradeRef || parameter.toUpperCase()}</div>
          <div>
            <span style={{color: '#00ccff', fontSize: '14px', marginRight: '8px'}}>Status</span> 
            <span className="text-green" style={{fontWeight: 'bold'}}>{data.currentStatus || 'UNKNOWN'}</span>
          </div>
        </div>
      )}

      {startTab === 'LIFE' && (
        <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
          Trade ID &nbsp;&nbsp;&nbsp;{data.tradeRef || parameter.toUpperCase()}
        </div>
      )}
      
      {startTab === 'SETTLE' && (
        <>
          <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
            12. SETTLEMENT SCREEN (SETTLE)
          </div>
          <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
            Command &gt; <span>SETTLE {parameter || ''}</span>
          </div>
        </>
      )}

      {startTab === 'HIST' && (
        <div className="bb-screen-title" style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
          <span>Trade ID &nbsp;&nbsp;&nbsp;{data.tradeRef || parameter.toUpperCase()}</span>
          <span style={{ color: '#00ccff' }}>LIFECYCLE DB</span>
        </div>
      )}

      {(!startTab || startTab === 'TRADE') && (
        <div className="bb-subnav">
          <div className={`bb-subnav-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
            <span className="num">1)</span> Trade Details
          </div>
          <div className={`bb-subnav-item ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
            <span className="num">2)</span> Parties
          </div>
          <div className={`bb-subnav-item ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>
            <span className="num">3)</span> Settlement
          </div>
          <div className={`bb-subnav-item ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>
            <span className="num">4)</span> Lifecycle
          </div>
          <div className={`bb-subnav-item ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}>
            <span className="num">5)</span> SWIFT
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Security</td><td className="bb-field-value">{data.underlyer || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Trade Value</td><td className="bb-field-value">{data.amount?.toLocaleString(undefined, {minimumFractionDigits: 2})} {data.currency}</td></tr>
                <tr><td className="bb-field-label">Trade Date</td><td className="bb-field-value">{tDateStr}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1 }}>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Settlement Date</td><td className="bb-field-value">{sDateStr}</td></tr>
                <tr><td className="bb-field-label">Currency</td><td className="bb-field-value">{data.currency}</td></tr>
                <tr><td className="bb-field-label">Settlement Method</td><td className="bb-field-value">{data.settlementType || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Created By</td><td className="bb-field-value">{data.originType || (data.isAutoGenerated ? 'AUTO_GENERATED' : 'SYSTEM')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Counterparty</td><td className="bb-field-value">{data.counterparty}</td></tr>
                <tr><td className="bb-field-label">Counterparty Group</td><td className="bb-field-value">{data.counterpartyGroup || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Entity</td><td className="bb-field-value">{data.entity}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1 }}>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Direction</td><td className="bb-field-value">{data.direction}</td></tr>
                <tr><td className="bb-field-label">Product / Type</td><td className="bb-field-value">{data.product} / {data.productType}</td></tr>
                <tr><td className="bb-field-label">Trade Type</td><td className="bb-field-value">{data.tradeType}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="bb-data-grid bb-data-grid-2col">
          <div>
             <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Trade ID</td><td className="bb-field-value">{data.tradeRef || parameter.toUpperCase()}</td></tr>
                <tr><td className="bb-field-label">Settlement Date</td><td className="bb-field-value">{sDateStr}</td></tr>
                <tr><td className="bb-field-label">Settlement Status</td><td className="bb-field-value">{data.currentStatus}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td colSpan={2} style={{ color: '#00ccff', paddingBottom: '8px' }}>Cash Movement</td></tr>
                <tr>
                  <td className="bb-field-label">Debit</td>
                  <td className="bb-field-value" style={{textAlign: 'right'}}>{data.direction === 'BUY' ? `${data.amount?.toLocaleString(undefined, {minimumFractionDigits: 2})} ${data.currency}` : '-'}</td>
                </tr>
                <tr>
                  <td className="bb-field-label">Credit</td>
                  <td className="bb-field-value" style={{textAlign: 'right'}}>{data.direction === 'SELL' ? `${data.amount?.toLocaleString(undefined, {minimumFractionDigits: 2})} ${data.currency}` : '-'}</td>
                </tr>
                
                <tr><td colSpan={2} style={{ color: '#00ccff', paddingBottom: '8px', paddingTop: '16px' }}>Security Movement</td></tr>
                <tr>
                  <td className="bb-field-label">Debit</td>
                  <td className="bb-field-value" style={{textAlign: 'right'}}>{data.direction === 'SELL' ? `${data.underlyer || 'N/A'}` : '-'}</td>
                </tr>
                <tr>
                  <td className="bb-field-label">Credit</td>
                  <td className="bb-field-value" style={{textAlign: 'right'}}>{data.direction === 'BUY' ? `${data.underlyer || 'N/A'}` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div style={{ padding: '8px 16px' }}>
          
          <div style={{ position: 'relative', margin: '48px 24px 24px 24px' }}>
            <div style={{ position: 'absolute', top: '16px', left: '50px', right: '50px', height: '2px', display: 'flex', zIndex: 1 }}>
              <div style={{ flex: 1, backgroundColor: getLogicalStage(data?.currentStatus) > 1 ? '#33cc33' : '#333' }}></div>
              <div style={{ flex: 1, backgroundColor: getLogicalStage(data?.currentStatus) > 2 ? '#33cc33' : '#333' }}></div>
              <div style={{ flex: 1, backgroundColor: getLogicalStage(data?.currentStatus) > 3 ? '#33cc33' : '#333' }}></div>
              <div style={{ flex: 1, backgroundColor: getLogicalStage(data?.currentStatus) > 4 ? '#33cc33' : '#333' }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {renderNode(1, 'Booked', tDateStr, getLogicalStage(data?.currentStatus))}
              {renderNode(2, 'Confirmed', getLogicalStage(data?.currentStatus) >= 2 ? tDateStr.split(' ')[0] : '--:--', getLogicalStage(data?.currentStatus))}
              {renderNode(3, 'Matched', getLogicalStage(data?.currentStatus) >= 3 ? tDateStr : '--:--', getLogicalStage(data?.currentStatus))}
              {renderNode(4, 'Settled', getLogicalStage(data?.currentStatus) >= 4 ? sDateStr : '--:--', getLogicalStage(data?.currentStatus))}
              {renderNode(5, 'Closed', getLogicalStage(data?.currentStatus) >= 5 ? sDateStr : '--:--', getLogicalStage(data?.currentStatus))}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            border: '1px solid #333', 
            backgroundColor: '#0a0a0a', 
            marginTop: '64px',
            padding: '16px'
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #333' }}>
              <span style={{ color: '#aaa', marginRight: '16px' }}>Current Stage</span>
              <span style={{ color: '#ff9900', fontWeight: 'bold' }}>{data.currentStatus || 'UNKNOWN'}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '16px', textAlign: 'center' }}>
              <span style={{ color: '#aaa', marginRight: '16px' }}>Allowed Next Stages</span>
              <span style={{ color: '#fff' }}>{allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'None'}</span>
            </div>
          </div>
        </div>
      )}

      {startTab === 'HIST' && (
        <div style={{ marginTop: '16px' }}>
          <table className="bb-results-table bb-results-table-bordered">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Action</th>
                <th>Desk</th>
                <th>User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {historyData.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px' }}>No lifecycle history found.</td></tr>
              ) : (
                historyData.map((item, idx) => {
                  const d = new Date(item.timestamp);
                  const dateStr = `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                  return (
                    <tr key={idx}>
                      <td>{dateStr}</td>
                      <td>{item.action}</td>
                      <td>{item.desk || 'SYSTEM'}</td>
                      <td>{item.userId || 'SYSTEM'}</td>
                      <td>{item.details}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}



      {(activeTab === 5) && (
        <div style={{ color: '#666', fontStyle: 'italic', padding: '24px' }}>
          This sub-view is not currently populated with trade data. Please return to 1) Trade Details.
        </div>
      )}

      {(!startTab || startTab === 'TRADE') && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px solid #444', 
          marginTop: '32px', 
          paddingTop: '8px', 
          fontSize: '12px', 
          color: '#888' 
        }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Trade details loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
        </div>
      )}

      {startTab === 'LIFE' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px solid #444', 
          marginTop: '32px', 
          paddingTop: '8px', 
          fontSize: '12px', 
          color: '#888' 
        }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Lifecycle loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
        </div>
      )}

      {startTab === 'HIST' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px solid #444', 
          marginTop: '32px', 
          paddingTop: '8px', 
          fontSize: '12px', 
          color: '#888' 
        }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Trade history loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
        </div>
      )}

      {startTab === 'SETTLE' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px solid #444', 
          marginTop: '32px', 
          paddingTop: '8px', 
          fontSize: '12px', 
          color: '#888' 
        }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: Settlement details loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
        </div>
      )}
    </div>
  );
}
