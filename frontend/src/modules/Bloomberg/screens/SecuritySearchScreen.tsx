"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
  command?: string; // SRCH, FX, PROD, RELS
}

export default function SecuritySearchScreen({ parameter, command = 'SRCH' }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Standard Filters
  const [keywordFilter, setKeywordFilter] = useState(command === 'SRCH' ? parameter || '' : '');
  const [isinFilter, setIsinFilter] = useState(command === 'ISIN' ? parameter || '' : '');
  const [assetClass, setAssetClass] = useState('All');
  const [country, setCountry] = useState('All');

  useEffect(() => {
    if (command === 'SRCH') {
      setKeywordFilter(parameter || '');
    } else if (command === 'ISIN') {
      setIsinFilter(parameter || '');
    }
  }, [parameter, command]);

  useEffect(() => {
    if (!parameter && (command === 'SRCH' || command === 'RELS')) return;

    // For PROD and FX, we might not need a parameter strictly, but we'll simulate data
    if (command === 'FX' || command === 'PROD' || command === 'RELS') {
      // Don't hit the DB for these placeholders, just render mock data
      setData([{ mock: true }]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await bloombergApi.searchSecurity(parameter!);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('No results found.');
        }
      } catch (err) {
        setError('Error fetching search results.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parameter, command]);

  if (!parameter && (command === 'SRCH' || command === 'RELS' || command === 'ISIN')) {
    return <div style={{ padding: '24px' }}>Please specify a keyword to search (e.g. {command} APPLE).</div>;
  }

  // --- FILTER DATA ---
  const filteredData = data.filter(sec => {
    if (sec.mock) return true;
    
    if (keywordFilter && 
        !sec.companyName?.toUpperCase().includes(keywordFilter.toUpperCase()) && 
        !sec.underlyer?.toUpperCase().includes(keywordFilter.toUpperCase())) {
      return false;
    }
    
    if (isinFilter && !sec.isin?.toUpperCase().includes(isinFilter.toUpperCase())) {
      return false;
    }
    
    if (assetClass !== 'All') {
      const isBond = assetClass === 'Bond' && sec.product === 'Fixed Income';
      const isEq = assetClass === 'Equity' && sec.product === 'Equity';
      if (!isBond && !isEq && sec.product !== assetClass) return false;
    }
    
    if (country !== 'All' && sec.issuingCountry !== country) {
      return false;
    }
    
    return true;
  });

  // --- RENDER SRCH RESULTS ---
  const renderSRCH = () => (
    <>
      <div className="bb-sidebar-title" style={{ borderBottom: 'none' }}>
        {command === 'ISIN' ? 'ISIN LOOKUP RESULTS' : 'RESULTS'} ({filteredData.length})
      </div>
      {!loading && !error && filteredData.length > 0 && !filteredData[0].mock && (
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>#</th>
              <th>ISIN</th>
              <th>Security Name</th>
              <th>Product (Asset Class)</th>
              <th>Product Type</th>
              <th>Trade Type</th>
              <th>Ccy</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((sec, i) => (
              <tr key={sec._id || i}>
                <td>{i + 1}</td>
                <td>{sec.isin || sec.underlyer}</td>
                <td>{sec.companyName || sec.underlyer}</td>
                <td>{sec.product || 'Equity'}</td>
                <td>{sec.productType}</td>
                <td>{sec.tradeType}</td>
                <td>{sec.currency}</td>
                <td>{sec.issuingCountry || 'USA'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  // --- RENDER FX RESULTS ---
  const renderFX = () => {
    const pairs = [
      { underlyer: 'FX EUR/USD', productType: 'FX Spot', tradeType: 'OTC', currency: 'USD' },
      { underlyer: 'FX GBP/USD', productType: 'FX Forward', tradeType: 'OTC', currency: 'USD' },
      { underlyer: 'FX USD/JPY', productType: 'FX Spot', tradeType: 'OTC', currency: 'JPY' },
      { underlyer: 'FX USD/CHF', productType: 'FX Spot', tradeType: 'OTC', currency: 'CHF' },
    ];
    return (
      <>
        <div className="bb-sidebar-title" style={{ borderBottom: 'none' }}>
          FX RATES - {parameter ? parameter.toUpperCase() : 'MAJOR PAIRS'}
        </div>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Underlyer</th>
              <th>Product Type</th>
              <th>Trade Type</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 'bold' }}>{p.underlyer}</td>
                <td style={{ color: 'var(--bb-text-primary)' }}>{p.productType}</td>
                <td>{p.tradeType}</td>
                <td>{p.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  // --- RENDER PROD RESULTS ---
  const renderPROD = () => {
    const products = [
      { product: 'Equity', productType: 'Equity', tradeType: 'Exchange' },
      { product: 'Fixed Income', productType: 'Corporate Bond', tradeType: 'OTC' },
      { product: 'Fixed Income', productType: 'Government Bond', tradeType: 'OTC' },
      { product: 'Derivatives', productType: 'Options', tradeType: 'Listed' },
      { product: 'FX', productType: 'FX Spot', tradeType: 'OTC' },
      { product: 'FX', productType: 'Forward', tradeType: 'OTC' },
    ];
    return (
      <>
        <div className="bb-sidebar-title" style={{ borderBottom: 'none' }}>
          PRODUCT UNIVERSE - {parameter ? parameter.toUpperCase() : 'ALL'}
        </div>
        <table className="bb-results-table bb-results-table-bordered">
          <thead>
            <tr>
              <th>Product</th>
              <th>Product Type</th>
              <th>Trade Type</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 'bold' }}>{p.product}</td>
                <td style={{ color: 'var(--bb-text-primary)' }}>{p.productType}</td>
                <td>{p.tradeType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  // --- RENDER RELS RESULTS ---
  const renderRELS = () => {
    const rels = [
      { entity: 'Apple Inc', type: 'Parent Entity', relation: 'Direct' },
      { entity: 'Apple Operations Int.', type: 'Child Entity', relation: 'Subsidiary' },
      { entity: 'US0378331005', type: 'Linked Asset', relation: 'Common Stock' },
      { entity: 'US037833AL42', type: 'Linked Asset', relation: 'Corporate Bond' },
    ];
    return (
      <>
        <div className="bb-sidebar-title" style={{ borderBottom: 'none' }}>
          RELATED ENTITIES & ASSETS - {parameter?.toUpperCase()}
        </div>
        <table className="bb-results-table">
          <thead>
            <tr>
              <th>Entity / Asset Identifier</th>
              <th>Relation Type</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rels.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 'bold' }}>{r.entity}</td>
                <td style={{ color: 'var(--bb-text-primary)' }}>{r.type}</td>
                <td>{r.relation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>{command} {parameter ? parameter.toUpperCase() : ''}</span></div>
      </div>

      <div className="bb-layout-sidebar">
        {/* Left Sidebar for Filters */}
        {(command === 'SRCH' || command === 'ISIN') && (
          <div className="bb-sidebar">
            <div className="bb-sidebar-title">FILTERS</div>
            <div className="bb-sidebar-content">
              {command === 'SRCH' && (
                <div className="bb-filter-group">
                  <label className="bb-filter-label">Keyword</label>
                  <input type="text" className="bb-filter-input" value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} />
                </div>
              )}
              {(command === 'SRCH' || command === 'ISIN') && (
                <>
                  <div className="bb-filter-group">
                    <label className="bb-filter-label">ISIN</label>
                    <input type="text" className="bb-filter-input" value={isinFilter} onChange={e => setIsinFilter(e.target.value)} />
                  </div>
                  <div className="bb-filter-group">
                    <label className="bb-filter-label">Asset Class</label>
                    <select className="bb-filter-input" value={assetClass} onChange={e => setAssetClass(e.target.value)}>
                      <option>All</option>
                      <option>Equity</option>
                      <option>Bond</option>
                    </select>
                  </div>
                  <div className="bb-filter-group">
                    <label className="bb-filter-label">Country</label>
                    <select className="bb-filter-input" value={country} onChange={e => setCountry(e.target.value)}>
                      <option>All</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                    </select>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="bb-btn-orange">SEARCH</button>
                <button className="bb-btn-outline" onClick={() => {
                  setKeywordFilter(command === 'SRCH' ? parameter || '' : '');
                  setIsinFilter(command === 'ISIN' ? parameter || '' : '');
                  setAssetClass('All');
                  setCountry('All');
                }}>RESET</button>
              </div>
            </div>
          </div>
        )}

        {/* Right Main Content for Results */}
        <div className="bb-main-content">
          {loading && <div>Loading...</div>}
          {error && <div style={{ color: 'var(--bb-alert)' }}>{error}</div>}

          {!loading && !error && (command === 'SRCH' || command === 'ISIN') && renderSRCH()}
          {!loading && !error && command === 'FX' && renderFX()}
          {!loading && !error && command === 'PROD' && renderPROD()}
          {!loading && !error && command === 'RELS' && renderRELS()}

          {!loading && !error && filteredData.length === 0 && (command === 'SRCH' || command === 'ISIN') && (
            <div>No matching results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
