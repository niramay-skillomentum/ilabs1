"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
}

export default function SecurityDescriptionScreen({ parameter }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    if (!parameter) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getSecurity(parameter);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('Security not found.');
        }
      } catch (err) {
        setError('Error fetching security.');
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
          <div className="bb-command-echo">Command &gt; <span>DES</span></div>
        </div>
        <div style={{ padding: '32px', color: 'var(--bb-alert)', fontSize: '16px', textAlign: 'center' }}>
          Please specify a Security ID (e.g. DES APPLE).
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: '24px' }}>Loading {parameter}...</div>;
  if (error) return <div style={{ padding: '24px', color: 'var(--bb-alert)' }}>{error}</div>;
  if (!data) return null;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>DES {parameter.toUpperCase()}</span></div>
      </div>

      <div className="bb-screen-title">
        {data.companyName || data.underlyer}
        <div className="bb-screen-title-right">
          <span style={{color: 'var(--bb-text-primary)'}}>ISIN</span> {data.isin}
        </div>
      </div>

      <div className="bb-subnav">
        <div className={`bb-subnav-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          <span className="num">1)</span> Details
        </div>
      </div>

      {activeTab === 1 && (
        <div className="bb-data-grid bb-data-grid-2col" style={{ marginTop: '16px' }}>
          <div>
            <table className="bb-key-value-table">
              <tbody>
                <tr><td className="bb-field-label">Security Name</td><td className="bb-field-value">{data.companyName || data.underlyer}</td></tr>
                <tr><td className="bb-field-label">ISIN</td><td className="bb-field-value">{data.isin || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Product (Asset Class)</td><td className="bb-field-value">{data.product || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Product Type</td><td className="bb-field-value">{data.productType || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Trade Type</td><td className="bb-field-value">{data.tradeType || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="bb-key-value-table">
              <tbody>
                <tr><td className="bb-field-label">Currency</td><td className="bb-field-value">{data.currency || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Issuing Country</td><td className="bb-field-value">{data.issuingCountry || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Underlyer</td><td className="bb-field-value">{data.underlyer || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Source System</td><td className="bb-field-value">{data.sheetName || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Description</td><td className="bb-field-value">{data.securityDescription || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
