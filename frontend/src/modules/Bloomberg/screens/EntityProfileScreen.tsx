"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  command?: string;
}

export default function EntityProfileScreen({ parameter, command = 'ENTITY' }: Props) {
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
        const res = await bloombergApi.getEntity(parameter);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('Entity not found.');
        }
      } catch (err) {
        setError('Error fetching entity.');
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
          Please specify an Entity ID (e.g. {command} SBG).
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
        <div className="bb-command-echo">Command &gt; <span>{command.toUpperCase()} {parameter.toUpperCase()}</span></div>
      </div>

      <div className="bb-screen-title">
        {data.entityName}
        <div className="bb-screen-title-right">
          <span style={{color: '#00ccff'}}>BIC</span> {data.bic || data.entityCode}
        </div>
      </div>

      <div className="bb-subnav">
        <div className={`bb-subnav-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          <span className="num">1)</span> General
        </div>
        <div className={`bb-subnav-item ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
          <span className="num">2)</span> Accounts
        </div>
      </div>

      {activeTab === 1 && (
        <div className="bb-data-grid bb-data-grid-2col">
          <div>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Entity Name</td><td className="bb-field-value">{data.entityName}</td></tr>
                <tr><td className="bb-field-label">Entity Code</td><td className="bb-field-value">{data.entityCode}</td></tr>
                <tr><td className="bb-field-label">Currency</td><td className="bb-field-value">{data.currency}</td></tr>
                <tr><td className="bb-field-label">Region</td><td className="bb-field-value">{data.region || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Address</td><td className="bb-field-value">{data.address || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">BIC</td><td className="bb-field-value">{data.bic || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="bb-data-grid">
          <table className="bb-results-table bb-results-table-bordered">
            <thead>
              <tr>
                <th>Account Name / Beneficiary</th>
                <th>Account Number</th>
                <th>Account with Inst.</th>
                <th>Currency</th>
                <th>Region / Country</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{data.accountName || data.counterPartyName || data.entityName || 'N/A'}</td>
                <td>{data.accountNumber || 'N/A'}</td>
                <td>{data.accountWithInstitution || 'N/A'}</td>
                <td>{data.currency || 'N/A'}</td>
                <td>{data.region || data.country || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
