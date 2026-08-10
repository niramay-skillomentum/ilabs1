"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  command?: string;
}

export default function SwiftViewerScreen({ parameter, command }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!parameter) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getSwiftGlobal(parameter);
        if (res.success && res.messages && res.messages.length > 0) {
          let selectedMessage = null;
          if (command === 'MT103') {
            selectedMessage = res.messages.find((m: any) => m.messageType === 'MT103');
          } else if (command === 'MT202') {
            selectedMessage = res.messages.find((m: any) => m.messageType === 'MT202');
          } else if (command === 'MT202COV') {
            selectedMessage = res.messages.find((m: any) => m.messageType === 'MT202COV');
          } else {
            // For viewer, just take the first message if multiple exist
            selectedMessage = res.messages[0];
          }

          if (selectedMessage) {
            setData(selectedMessage);
          } else {
            setError(`${command || 'SWIFT'} message not found for this trade.`);
          }
        } else {
          setError('SWIFT message not found.');
        }
      } catch (err) {
        setError('Error fetching SWIFT message.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parameter]);

  if (!parameter) {
    return (
      <div style={{ padding: '16px' }}>
        <div className="bb-screen-header">
          <div className="bb-command-echo">Command &gt; <span>{command || 'SWIFT'}</span></div>
        </div>
        <div style={{ padding: '32px', color: 'var(--bb-alert)', fontSize: '16px', textAlign: 'center' }}>
          Please specify a Trade ID (e.g. {command || 'SWIFT'} TRD0001256) to view specific SWIFT messages.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px' }}>
        <div className="bb-screen-header">
          <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
            SWIFT VIEWER ({command || 'SWIFT'})
          </div>
          <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
            Command &gt; <span>{(command || 'SWIFT').toUpperCase()} {parameter?.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ padding: '32px', color: '#ff5555', textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data && !loading) {
    return null;
  }

  // Extract fields from data
  const msgType = data?.messageType || 'MT202';
  const direction = data?.paymentDirection === 'RECEIVE' ? 'Incoming' : 'Outgoing';
  const generatedAt = data?.generatedAt ? new Date(data.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit' }).replace(',', '') : '23-May-2024 10:30:22';
  const fieldMap = data?.fieldMap || {};
  const tags = Object.keys(fieldMap).sort((a, b) => {
    const order = ["20", "21", "23B", "32A", "33B", "50A", "50F", "50K", "52A", "52D", "53A", "53B", "54A", "54B", "56A", "56C", "57A", "57B", "57C", "58A", "59", "59A", "70", "71A", "72", "73", "77B"];
    let idxA = order.indexOf(a);
    let idxB = order.indexOf(b);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
          SWIFT VIEWER ({command || 'SWIFT'})
        </div>
        <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
          Command &gt; <span>{(command || 'SWIFT').toUpperCase()} {parameter.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: '#ccc', fontSize: '12px' }}>Message Type</div>
          <div style={{ border: '1px solid #555', padding: '4px 8px', color: '#fff' }}>{msgType}</div>
          
          <div style={{ color: '#ccc', fontSize: '12px', marginLeft: '16px' }}>Direction</div>
          <div style={{ border: '1px solid #555', padding: '4px 8px', color: '#00ccff' }}>{direction}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#ccc', fontSize: '12px' }}>Date/Time</div>
          <div style={{ color: '#fff', fontSize: '12px' }}>{generatedAt}</div>
        </div>
      </div>

      <div className="bb-data-grid bb-data-grid-2col">
        {/* Left Side: Raw Message */}
        <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '13px', lineHeight: '1.6' }}>
          {tags.map(tag => {
            const field = fieldMap[tag];
            const valueLines = String(field?.value || '').split('\n');
            const isOrangeValue = tag.startsWith('7');
            const valueColor = isOrangeValue ? '#ff9900' : '#00ccff';
            
            return (
              <div key={`left-${tag}`} style={{ color: valueColor, marginBottom: '4px' }}>
                <span style={{ color: '#ff9900' }}>:{tag}:</span>{' '}
                {valueLines[0]}
                {valueLines.length > 1 && valueLines.slice(1).map((line, i) => (
                  <React.Fragment key={i}>
                    <br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{line}
                  </React.Fragment>
                ))}
              </div>
            );
          })}
          {tags.length === 0 && (
            <div style={{ color: '#888' }}>No SWIFT fields loaded</div>
          )}
        </div>

        {/* Right Side: Field Descriptions */}
        <div className="bb-panel" style={{ backgroundColor: '#0a0a0a', border: 'none' }}>
          <div style={{ color: '#00ccff', fontSize: '12px', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '8px' }}>
            Field Description
          </div>
          <table className="bb-key-value-table">
            <tbody>
              {tags.map(tag => (
                <tr key={`right-${tag}`}>
                  <td style={{ color: '#fff', width: '30px', verticalAlign: 'top' }}>{tag}</td>
                  <td style={{ color: '#fff' }}>{fieldMap[tag]?.description || 'Unknown Field'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <div style={{ color: '#00ccff', fontWeight: 'bold' }}>MSG: SWIFT message loaded</div>
          <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
      </div>
    </div>
  );
}
