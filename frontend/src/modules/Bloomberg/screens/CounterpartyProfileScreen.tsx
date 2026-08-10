"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  command?: string;
}

export default function CounterpartyProfileScreen({ parameter, command = 'CPTY' }: Props) {
  const [ssis, setSsis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    if (!parameter) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getSsiGroup(parameter);
        if (res.success && res.ssis) {
          setSsis(res.ssis);
        } else {
          setError('Counterparty not found or has no SSIs.');
        }
      } catch (err) {
        setError('Error fetching counterparty data.');
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
          <div className="bb-command-echo">Command &gt; <span>{command}</span></div>
        </div>
        <div style={{ padding: '32px', color: 'var(--bb-alert)', fontSize: '16px', textAlign: 'center' }}>
          Please specify a Counterparty ID (e.g. {command} BNYM).
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: '24px' }}>Loading {parameter}...</div>;
  if (error) return <div style={{ padding: '24px', color: 'var(--bb-alert)' }}>{error}</div>;
  if (ssis.length === 0) return null;

  // Extract data from first SSI record
  const firstSsi = ssis[0];
  const cptyName = firstSsi.counterPartyName || firstSsi.groupCounterPartyName;
  const primaryBic = firstSsi.swiftBicCode || firstSsi.agentSwiftCode || 'N/A';
  
  // Extract unique currencies
  const uniqueCurrencies = Array.from(new Set(ssis.map(s => s.currency))).sort();

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>{command} {parameter.toUpperCase()}</span></div>
      </div>

      <div className="bb-screen-title">
        {cptyName}
        <div className="bb-screen-title-right">
          <span style={{color: '#00ccff'}}>BIC</span> {primaryBic}
        </div>
      </div>

      <div className="bb-subnav">
        <div className={`bb-subnav-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          <span className="num">1)</span> General
        </div>
      </div>

      {activeTab === 1 && command === 'AGENT' && (
        <div className="bb-data-grid">
          <table className="bb-results-table bb-results-table-bordered">
            <thead>
              <tr>
                <th>Currency</th>
                <th>Agent Bank</th>
                <th>Agent Swift Code</th>
                <th>Account at Agent</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {ssis.map((ssi, idx) => (
                <tr key={ssi.ssiId || idx}>
                  <td>{ssi.currency || 'N/A'}</td>
                  <td>{ssi.agentBank || 'N/A'}</td>
                  <td>{ssi.agentSwiftCode || 'N/A'}</td>
                  <td>{ssi.accountAtAgent || 'N/A'}</td>
                  <td>{ssi.country || ssi.registeredCountry || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 1 && command !== 'AGENT' && (
        <div className="bb-data-grid bb-data-grid-2col">
          <div>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Counterparty Name</td><td className="bb-field-value">{firstSsi.counterPartyName || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Group Counterparty Name</td><td className="bb-field-value">{firstSsi.groupCounterPartyName || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Counterparty Type</td><td className="bb-field-value">{firstSsi.counterpartyType || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Type Code</td><td className="bb-field-value">{firstSsi.typeCode || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Registered Country</td><td className="bb-field-value">{firstSsi.registeredCountry || firstSsi.country || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
          
          <div>
            <table className="bb-results-table bb-results-table-bordered" style={{ marginBottom: '16px' }}>
              <tbody>
                <tr><td className="bb-field-label">Alert Acronym</td><td className="bb-field-value">{firstSsi.alertAcronym || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Alert Code</td><td className="bb-field-value">{firstSsi.alertCode || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">SSI On Alert</td><td className="bb-field-value">{firstSsi.ssiOnAlert || 'N/A'}</td></tr>
              </tbody>
            </table>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr>
                  <td className="bb-field-label">Supported Currencies</td>
                  <td className="bb-field-value">{uniqueCurrencies.join(', ')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
