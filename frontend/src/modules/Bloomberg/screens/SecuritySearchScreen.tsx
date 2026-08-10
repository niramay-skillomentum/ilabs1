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
  const [product, setProduct] = useState('All');

  useEffect(() => {
    if (command === 'SRCH') {
      setKeywordFilter(parameter || '');
    } else if (command === 'ISIN') {
      setIsinFilter(parameter || '');
    }
  }, [parameter, command]);

  useEffect(() => {
    if (!parameter && (command === 'SRCH' || command === 'RELS')) return;



    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        let res;
        if (command === 'PROD') {
          res = await bloombergApi.getProducts();
        } else if (command === 'RELS') {
          res = await bloombergApi.getRelated(parameter || '');
        } else {
          const productFilter = command === 'FX' ? 'FX' : undefined;
          res = await bloombergApi.searchSecurity(parameter || '', productFilter);
        }
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
    
    if (keywordFilter) {
      if (command === 'PROD') {
        if (!sec.product?.toUpperCase().includes(keywordFilter.toUpperCase()) && 
            !sec.productType?.toUpperCase().includes(keywordFilter.toUpperCase())) {
          return false;
        }
      } else if (command === 'RELS') {
        if (!sec.entity?.toUpperCase().includes(keywordFilter.toUpperCase()) && 
            !sec.type?.toUpperCase().includes(keywordFilter.toUpperCase())) {
          return false;
        }
      } else {
        if (!sec.companyName?.toUpperCase().includes(keywordFilter.toUpperCase()) && 
            !sec.underlyer?.toUpperCase().includes(keywordFilter.toUpperCase())) {
          return false;
        }
      }
    }
    
    if (isinFilter && !sec.isin?.toUpperCase().includes(isinFilter.toUpperCase())) {
      return false;
    }
    
    if (product !== 'All' && sec.product !== product) {
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
            {filteredData.map((p, i) => (
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
            {filteredData.map((p, i) => (
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
            {filteredData.map((r, i) => (
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
                    <label className="bb-filter-label">Product</label>
                    <select className="bb-filter-input" value={product} onChange={e => setProduct(e.target.value)}>
                      <option>All</option>
                      <option>Equity</option>
                      <option>Derivative</option>
                      <option>Fixed Income</option>
                      <option>FX</option>
                    </select>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="bb-btn-orange">SEARCH</button>
                <button className="bb-btn-outline" onClick={() => {
                  setKeywordFilter(command === 'SRCH' ? parameter || '' : '');
                  setIsinFilter(command === 'ISIN' ? parameter || '' : '');
                  setProduct('All');
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
