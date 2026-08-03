"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  command?: string;
}

export default function SettlementInstructionScreen({ parameter, command }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!parameter) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.getSSI(parameter);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('SSI not found.');
        }
      } catch (err) {
        setError('Error fetching SSI.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parameter]);

  if (!parameter) {
    return <div style={{ padding: '24px' }}>Please specify an SSI identifier (e.g. SSI HSBC).</div>;
  }

  if (loading) return <div style={{ padding: '24px' }}>Loading {parameter}...</div>;
  if (error) return <div style={{ padding: '24px', color: 'var(--bb-alert)' }}>{error}</div>;
  if (!data) return null;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>SSI {parameter.toUpperCase()}</span></div>
      </div>

      <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#00ccff', fontSize: '14px', textTransform: 'uppercase' }}>
        SETTLEMENT INSTRUCTIONS - {data.counterPartyName || data.groupCounterPartyName} {data.currency}
      </div>

      <div className="bb-data-grid bb-data-grid-2col">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="bb-panel">
            <h3 className="bb-panel-title-blue">Agent / Intermediary Bank</h3>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Agent Bank</td><td className="bb-field-value">{data.agentBank || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Agent SWIFT Code</td><td className="bb-field-value">{data.agentSwiftCode || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Account at Agent</td><td className="bb-field-value">{data.accountAtAgent || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bb-panel">
            <h3 className="bb-panel-title-blue">Beneficiary / Account With Institution</h3>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Account With Institution</td><td className="bb-field-value">{data.accountWithInstitution || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">SWIFT BIC Code</td><td className="bb-field-value">{data.swiftBicCode || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">ABA Routing Number</td><td className="bb-field-value">{data.abaRoutingNumber || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Account Number</td><td className="bb-field-value">{data.accountNumber || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Country</td><td className="bb-field-value">{data.country || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="bb-panel">
            <h3 className="bb-panel-title-blue">Additional Instructions</h3>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">Final Beneficiary</td><td className="bb-field-value">{data.finalBeneficiary || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Field 72</td><td className="bb-field-value">{data.field72 || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">SWIFT 71A</td><td className="bb-field-value">{data.swift71A || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bb-panel">
            <h3 className="bb-panel-title-blue">Instruction Details</h3>
            <table className="bb-results-table bb-results-table-bordered">
              <tbody>
                <tr><td className="bb-field-label">SSI ID</td><td className="bb-field-value">{data.ssiId || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Currency</td><td className="bb-field-value">{data.currency || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Default SWIFT</td><td className="bb-field-value">{data.defaultSwift || 'N/A'}</td></tr>
                <tr><td className="bb-field-label">Settlement Type</td><td className="bb-field-value">{data.settlementType || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
