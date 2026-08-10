"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  command?: string;
}

export default function BicDirectoryScreen({ parameter, command }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [instFilter, setInstFilter] = useState('');
  
  useEffect(() => {
    if (parameter) {
      setInstFilter(parameter);
    }
  }, [parameter]);

  useEffect(() => {
    if (!parameter) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.searchEntity(parameter);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('No BIC results found.');
        }
      } catch (err) {
        setError('Error fetching BIC details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parameter]);

  if (!parameter) {
    return <div style={{ padding: '24px' }}>Please specify a BIC or SWIFT code (e.g. BIC CITIUS33).</div>;
  }

  const displayData = data || [];

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>BIC {parameter.toUpperCase()}</span></div>
      </div>

      <div className="bb-layout-sidebar">
        {/* Left Sidebar */}
        <div className="bb-sidebar">
          <div className="bb-sidebar-title" style={{ color: '#00ccff', fontSize: '12px' }}>FILTERS</div>
          
          <div className="bb-filter-group">
            <label className="bb-filter-label">Institution</label>
            <input 
              type="text" 
              className="bb-filter-input" 
              value={instFilter}
              onChange={(e) => setInstFilter(e.target.value)}
            />
          </div>
          
          <div className="bb-filter-group">
            <label className="bb-filter-label">Region/Country</label>
            <select className="bb-filter-input">
              <option>All</option>
              <option>USA</option>
              <option>UK</option>
              <option>Hong Kong</option>
            </select>
          </div>

          <button className="bb-btn-orange" style={{ width: '100%', marginTop: '8px' }}>SEARCH</button>
        </div>

        {/* Main Content */}
        <div className="bb-main-content">
          <div className="bb-panel-title-blue" style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '4px', marginBottom: '8px' }}>
            RESULTS ({displayData.length})
          </div>
          
          <table className="bb-results-table bb-results-table-bordered">
            <thead>
              <tr>
                <th>BIC / SWIFT</th>
                <th>Entity / Institution Name</th>
                <th>Entity Code</th>
                <th>Currency</th>
                <th>Region / Country</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-tertiary)' }}>{row.bic || row.swiftBicCode || 'N/A'}</td>
                  <td>{row.entityName || row.counterPartyName || row.groupCounterPartyName || 'N/A'}</td>
                  <td>{row.entityCode || 'N/A'}</td>
                  <td>{row.currency || 'N/A'}</td>
                  <td>{row.region || row.country || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
