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
    if (startTab === 'LIFE') initialTab = 4;
    if (startTab === 'HIST') initialTab = 6;
    if (startTab === 'SETTLE' || startTab === 'CONF') initialTab = 3;
    if (startTab === 'MO') initialTab = 1;
  }

  const [data, setData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allError, setAllError] = useState('');
  
  // Derive desk filter from startTab command
  const deskFilter = startTab === 'MO' ? 'MO' : startTab === 'CONF' ? 'CONFIRMATION' : startTab === 'SETTLE' ? 'SETTLEMENT' : undefined;

  useEffect(() => {
    if (startTab === 'LIFE') setActiveTab(4);
    else if (startTab === 'HIST') setActiveTab(6);
    else if (startTab === 'SETTLE' || startTab === 'CONF') setActiveTab(3);
    else if (startTab === 'MO') setActiveTab(1);
    else setActiveTab(1);
  }, [startTab]);

  useEffect(() => {
    if (!parameter) {
      if (startTab === 'LIFE' || startTab === 'HIST') return;

      const fetchAllTrades = async () => {
        setLoadingAll(true);
        setAllError('');
        try {
          const res = await bloombergApi.getAllTradesGlobal({ desk: deskFilter });
          if (res.success && res.trades) {
            setAllTrades(res.trades);
          } else {
            setAllError('Failed to load trades from the backend.');
          }
        } catch (err) {
          setAllError('Error fetching trades. The server may be unreachable.');
        } finally {
          setLoadingAll(false);
        }
      };
      fetchAllTrades();
      return;
    }

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
              // History may not exist for all trades
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
  }, [parameter, startTab, deskFilter]);

  if (!parameter && (startTab === 'LIFE' || startTab === 'HIST')) {
    return (
      <div style={{ padding: '16px' }}>
        <div className="bb-screen-header">
          <div className="bb-command-echo">Command &gt; <span>{startTab}</span></div>
        </div>
        <div style={{ padding: '32px', color: 'var(--bb-alert)', fontSize: '16px', textAlign: 'center' }}>
          Please specify a Trade ID (e.g. {startTab} TRD0001256).
        </div>
      </div>
    );
  }

  if (!parameter) {
    if (loadingAll) return <div style={{ padding: '24px' }}>Loading trades...</div>;
    if (allError) return <div style={{ padding: '24px', color: 'var(--bb-alert)' }}>{allError}</div>;
    
    return (
      <div style={{ padding: '16px' }}>
        <div className="bb-screen-header">
          <div className="bb-command-echo">Command &gt; <span>{startTab || 'TRADE'}</span></div>
        </div>
        <div className="bb-screen-title" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <div>{deskFilter ? `${deskFilter} DESK BLOTTER` : 'TRADE BLOTTER'}</div>
          <div style={{ fontSize: '14px', color: '#00ccff' }}>Total: {allTrades.length} trades</div>
        </div>
        <div className="bb-panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bb-results-table bb-results-table-bordered">
            <thead>
              <tr>
                <th>Select</th>
                <th>Trade Ref</th>
                <th>Status</th>
                <th>Next Desk</th>
                <th>Age</th>
                <th>Trade Date</th>
                <th>Value Date</th>
                <th>CP Group</th>
                <th>Counterparty</th>
                <th>Entity</th>
                <th>Region</th>
                <th>Product</th>
                <th>Product Type</th>
                <th>Trade Type</th>
                <th>Underlyer</th>
                <th>Settlement Mode</th>
                <th>Direction</th>
                <th>Currency</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {allTrades.map((t, i) => {
                const tDate = t.tradeDate ? new Date(t.tradeDate) : new Date();
                const vDate = t.valueDate ? new Date(t.valueDate) : null;
                const pad = (n: number) => n.toString().padStart(2, '0');
                const tDateStr = `${tDate.getFullYear()}-${pad(tDate.getMonth()+1)}-${pad(tDate.getDate())}`;
                const vDateStr = vDate ? `${vDate.getFullYear()}-${pad(vDate.getMonth()+1)}-${pad(vDate.getDate())}` : 'N/A';
                
                const ageDays = Math.floor((new Date().getTime() - tDate.getTime()) / (1000 * 3600 * 24));
                
                const statusStr = t.currentStatus || '';
                let nextDesk = 'N/A';
                if (statusStr.includes('CONFIRMATION')) nextDesk = 'CONFIRMATION';
                else if (statusStr.includes('SETTLEMENT') || statusStr.includes('AMEND') || statusStr.includes('APPROVAL')) nextDesk = 'SETTLEMENT';
                else if (statusStr.includes('MO_')) nextDesk = 'MIDDLE OFFICE';
                else if (statusStr === 'NEW' || statusStr === 'PENDING_FO_RESPONSE') nextDesk = 'FRONT OFFICE';
                else if (statusStr.includes('RECON_') || statusStr === 'UNMATCHED_BY_USER') nextDesk = 'RECONCILIATION';

                return (
                  <tr key={i}>
                    <td></td>
                    <td style={{ color: 'var(--bb-text-primary)' }}>{t.tradeRef}</td>
                    <td>{statusStr}</td>
                    <td>{nextDesk}</td>
                    <td>{ageDays > 0 ? ageDays : 0}</td>
                    <td>{tDateStr}</td>
                    <td>{vDateStr}</td>
                    <td>{t.counterparty || 'N/A'}</td>
                    <td>{t.counterparty || 'N/A'}</td>
                    <td>{t.entity || 'N/A'}</td>
                    <td>AMER</td>
                    <td>Fixed Income</td>
                    <td>Treasury Note</td>
                    <td>{t.tradeType || 'N/A'}</td>
                    <td>{t.currency || 'USD'}</td>
                    <td>ELECTRONIC</td>
                    <td>{t.direction || 'BUY'}</td>
                    <td>{t.currency || 'USD'}</td>
                    <td style={{ textAlign: 'right' }}>{t.amount?.toLocaleString(undefined, {minimumFractionDigits: 0})}</td>
                  </tr>
                );
              })}
              {allTrades.length === 0 && (
                <tr>
                  <td colSpan={19} style={{ textAlign: 'center', padding: '16px' }}>No trades found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
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
            SETTLEMENT SCREEN (SETTLE)
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

      {(!startTab || startTab === 'TRADE' || startTab === 'TRD' || activeTab === 1) && (
        <div style={{ marginBottom: (!startTab || startTab === 'TRADE' || startTab === 'TRD') ? '32px' : '0' }}>
          {(!startTab || startTab === 'TRADE' || startTab === 'TRD') && <div className="bb-screen-title" style={{ color: '#00ccff', borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '16px', fontSize: '14px' }}>1) TRADE DETAILS</div>}
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
        </div>
      )}

      {(!startTab || startTab === 'TRADE' || startTab === 'TRD' || activeTab === 2) && (
        <div style={{ marginBottom: (!startTab || startTab === 'TRADE' || startTab === 'TRD') ? '32px' : '0' }}>
          {(!startTab || startTab === 'TRADE' || startTab === 'TRD') && <div className="bb-screen-title" style={{ color: '#00ccff', borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '16px', fontSize: '14px' }}>2) PARTIES</div>}
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
        </div>
      )}

      {(activeTab === 3) && (
        <div style={{ marginBottom: '0' }}>
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
        </div>
      )}

      {(activeTab === 4) && (
        <div style={{ marginBottom: '0' }}>
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
        </div>
      )}

      {startTab === 'HIST' && (() => {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<AuditTrail tradeRef="${data.tradeRef || parameter?.toUpperCase()}" generatedAt="${new Date().toISOString()}">\n`;
        xml += `  <TradeInfo>\n`;
        xml += `    <TradeRef>${data.tradeRef || parameter?.toUpperCase()}</TradeRef>\n`;
        xml += `    <Product>${data.product || 'N/A'}</Product>\n`;
        xml += `    <ProductType>${data.productType || 'N/A'}</ProductType>\n`;
        xml += `    <TradeType>${data.tradeType || 'N/A'}</TradeType>\n`;
        xml += `    <Underlyer>${data.underlyer || 'N/A'}</Underlyer>\n`;
        xml += `    <Direction>${data.direction || 'BUY'}</Direction>\n`;
        xml += `    <Currency>${data.currency || 'USD'}</Currency>\n`;
        xml += `    <Amount>${data.amount || 0}</Amount>\n`;
        xml += `    <Counterparty>${data.counterparty || 'N/A'}</Counterparty>\n`;
        xml += `    <Entity>${data.entity || 'N/A'}</Entity>\n`;
        xml += `    <TradeDate>${data.tradeDate || new Date().toISOString()}</TradeDate>\n`;
        xml += `    <ValueDate>${data.valueDate || data.settlementDate || new Date().toISOString()}</ValueDate>\n`;
        xml += `    <CurrentStatus>${data.currentStatus || 'UNKNOWN'}</CurrentStatus>\n`;
        xml += `  </TradeInfo>\n`;
        xml += `  <Events>\n`;
        historyData.forEach((item, idx) => {
          xml += `    <Event>\n`;
          xml += `      <EventId>EVT_${data.tradeRef || parameter?.toUpperCase()}_${(idx + 1).toString().padStart(3, '0')}</EventId>\n`;
          xml += `      <Timestamp>${new Date(item.timestamp).toISOString()}</Timestamp>\n`;
          xml += `      <Actor>${item.userId || item.desk || 'SYSTEM'}</Actor>\n`;
          xml += `      <Action>${item.action}</Action>\n`;
          xml += `      <Details>${item.details}</Details>\n`;
          
          let resultingStatus = item.action;
          if (item.action.includes('CAPTURED')) resultingStatus = 'NEW';
          else if (item.action.includes('VALIDATED') && item.desk === 'COMPLIANCE') resultingStatus = 'COMPLIANCE_CLEARED';
          else if (item.action.includes('ASSESSED') && item.desk === 'RISK') resultingStatus = 'RISK_CLEARED';
          else if (item.action.includes('VALIDATED')) resultingStatus = 'BOOKING_VALIDATED';
          else if (item.action.includes('ROUTED')) resultingStatus = 'MO_PENDING';
          
          xml += `      <ResultingStatus>${resultingStatus}</ResultingStatus>\n`;
          xml += `    </Event>\n`;
        });
        xml += `  </Events>\n`;
        xml += `</AuditTrail>`;

        return (
          <div style={{ marginTop: '16px', backgroundColor: '#f8f9fa', color: '#333', padding: '16px', borderRadius: '4px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'normal', color: '#1f2937' }}>Audit Trail</h2>
            <div style={{ 
              backgroundColor: '#1e293b', 
              padding: '16px', 
              color: '#e2e8f0', 
              fontFamily: 'Consolas, monospace', 
              whiteSpace: 'pre-wrap', 
              overflowX: 'auto', 
              fontSize: '13px',
              lineHeight: '1.4',
              borderRadius: '4px',
              maxHeight: '250px',
              overflowY: 'auto',
              marginBottom: '24px'
            }}>
              {xml}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {historyData.map((item, idx) => {
                const d = new Date(item.timestamp);
                const dateStr = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}, ${d.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', second:'2-digit'})}`;
                return (
                  <div key={idx} style={{ 
                    borderLeft: '4px solid #3b82f6', 
                    paddingLeft: '12px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      <span>{item.userId || item.desk || 'system@skillomentum.com'}</span>
                      <span>{dateStr}</span>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>{item.action}</div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>{item.details}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '32px', textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <span style={{ cursor: 'pointer', color: '#1f2937', fontSize: '14px' }}>Close</span>
            </div>
          </div>
        );
      })()}



      {(activeTab === 5) && (
        <div style={{ marginBottom: '0' }}>
          <div style={{ color: '#666', fontStyle: 'italic', padding: '24px' }}>
            This section is not currently populated with trade data. 
          </div>
        </div>
      )}

      {(!startTab || startTab === 'TRADE' || startTab === 'TRD') && (
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
