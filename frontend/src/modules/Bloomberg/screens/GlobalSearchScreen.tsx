"use client";

import React, { useState, useEffect, useRef } from 'react';
import { bloombergApi } from '../services/api';

interface Props {
  parameter: string | null;
}

const COMMON_DATA = [
  { keyword: 'Apple', type: 'Security / Equity' },
  { keyword: 'Microsoft', type: 'Security / Equity' },
  { keyword: 'Tesla', type: 'Security / Equity' },
  { keyword: 'SBG', type: 'Entity' },
  { keyword: 'JPMorgan', type: 'Entity' },
  { keyword: 'CITI', type: 'Entity / BIC' },
  { keyword: 'USD', type: 'Currency / FX' },
  { keyword: 'EUR/USD', type: 'FX Spot' }
];

export default function GlobalSearchScreen({ parameter }: Props) {
  const [securities, setSecurities] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(parameter || '');
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (parameter) {
      setQuery(parameter);
      performSearch(parameter);
    } else {
      // Auto-focus the search input when the screen loads with no parameter
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [parameter]);

  const performSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    setShowDropdown(false);
    
    try {
      const [secRes, entRes] = await Promise.all([
        bloombergApi.searchSecurity(trimmedQuery),
        bloombergApi.searchEntity(trimmedQuery)
      ]);
      
      if (secRes.success) setSecurities(secRes.data || []);
      if (entRes.success) setEntities(entRes.data || []);
    } catch (err) {
      setError('An error occurred while searching internal databases.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const filteredSuggestions = query 
    ? COMMON_DATA.filter(d => d.keyword.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If user actively navigated suggestions with arrows, pick the suggestion
      if (showDropdown && filteredSuggestions.length > 0 && selectedIndex > 0) {
        const safeIndex = Math.min(selectedIndex, filteredSuggestions.length - 1);
        const selected = filteredSuggestions[safeIndex]?.keyword;
        if (selected) {
          setQuery(selected);
          performSearch(selected);
          setShowDropdown(false);
          return;
        }
      }
      // Otherwise, search what the user typed
      setShowDropdown(false);
      performSearch(query);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowDropdown(true);
    setSelectedIndex(0);
    // If they clear the input, let's reset the search view
    if (e.target.value === '') {
      setHasSearched(false);
      setSecurities([]);
      setEntities([]);
    }
  };

  const handleSuggestionClick = (keyword: string) => {
    setQuery(keyword);
    performSearch(keyword);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>SEARCH {parameter ? parameter.toUpperCase() : ''}</span></div>
      </div>

      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bb-bg-surface)', border: '1px solid var(--bb-border)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--bb-text-primary)' }}>GLOBAL SEARCH - UNIVERSAL INTERNAL LOOKUP</h3>
        
        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--bb-text-secondary)', lineHeight: '1.4' }}>
          <strong>Instructions:</strong> Use this screen to perform a universal keyword search across all internal databases.
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Searchable Security Fields:</strong> Company Name, ISIN, Underlyer, or Security Description.</li>
            <li><strong>Searchable Entity Fields:</strong> Entity Name, Entity Code, or BIC/SWIFT.</li>
          </ul>
          <em>Note: Ensure you are using exact acronyms (e.g., "Apple Inc" instead of "AAPL") if the ticker is not stored in the database.</em>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <input 
            ref={inputRef}
            type="text" 
            className="bb-filter-input" 
            placeholder="Enter keyword (e.g., Apple, SBG, USD)..." 
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if(query) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ width: '400px', padding: '8px' }}
          />
          <button type="submit" className="bb-btn-orange">SEARCH</button>

          {/* Autocomplete Dropdown */}
          {showDropdown && filteredSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '400px',
              backgroundColor: 'var(--bb-bg-surface)',
              border: '1px solid var(--bb-border)',
              zIndex: 100,
              marginTop: '4px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
              {filteredSuggestions.map((s, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSuggestionClick(s.keyword)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    backgroundColor: idx === selectedIndex ? 'var(--bb-row-hover)' : 'transparent',
                    borderBottom: '1px solid var(--bb-border-subtle)'
                  }}
                >
                  <span style={{ color: 'var(--bb-text-primary)' }}>{s.keyword}</span>
                  <span style={{ color: 'var(--bb-text-secondary)', fontSize: '11px' }}>{s.type}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {!hasSearched && !loading && (
        <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--bb-border)' }}>
          <div className="bb-sidebar-title" style={{ borderBottom: 'none', marginBottom: '12px' }}>
            COMMON GLOBAL DATA SUGGESTIONS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {COMMON_DATA.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => handleSuggestionClick(item.keyword)}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bb-bg-panel)',
                  border: '1px solid var(--bb-border)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bb-row-hover)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--bb-bg-panel)'}
              >
                <span style={{ color: 'var(--bb-orange)', fontWeight: 'bold' }}>{item.keyword}</span>
                <span style={{ color: 'var(--bb-text-secondary)', fontSize: '11px' }}>{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div style={{ color: 'var(--bb-text-secondary)', padding: '16px' }}>Searching internal databases...</div>}
      {error && <div style={{ color: 'var(--bb-alert)', padding: '16px' }}>{error}</div>}

      {!loading && !error && hasSearched && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECURITIES RESULTS */}
          <div>
            <div className="bb-sidebar-title" style={{ borderBottom: 'none' }}>
              SECURITY RESULTS ({securities.length})
            </div>
            {securities.length > 0 ? (
              <table className="bb-results-table bb-results-table-bordered">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>ISIN</th>
                    <th>Underlyer</th>
                    <th>Company Name</th>
                    <th>Product</th>
                    <th>Product Type</th>
                    <th>Trade Type</th>
                    <th>Ccy</th>
                  </tr>
                </thead>
                <tbody>
                  {securities.map((sec, i) => (
                    <tr key={`sec-${i}`}>
                      <td style={{ color: 'var(--bb-accent)' }}>SECURITY</td>
                      <td style={{ fontWeight: 'bold' }}>{sec.isin || '-'}</td>
                      <td>{sec.underlyer}</td>
                      <td>{sec.companyName || '-'}</td>
                      <td>{sec.product}</td>
                      <td>{sec.productType}</td>
                      <td>{sec.tradeType}</td>
                      <td>{sec.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '8px', color: 'var(--bb-text-secondary)' }}>No internal security records matched your keyword.</div>
            )}
          </div>

          {/* ENTITIES RESULTS */}
          <div>
            <div className="bb-sidebar-title" style={{ borderBottom: 'none' }}>
              ENTITY RESULTS ({entities.length})
            </div>
            {entities.length > 0 ? (
              <table className="bb-results-table bb-results-table-bordered">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Entity Code</th>
                    <th>Entity Name</th>
                    <th>BIC / SWIFT</th>
                    <th>Currency</th>
                    <th>Region</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((ent, i) => (
                    <tr key={`ent-${i}`}>
                      <td style={{ color: 'var(--bb-orange)' }}>ENTITY</td>
                      <td style={{ fontWeight: 'bold' }}>{ent.entityCode}</td>
                      <td>{ent.entityName}</td>
                      <td>{ent.bic || '-'}</td>
                      <td>{ent.currency}</td>
                      <td>{ent.region || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '8px', color: 'var(--bb-text-secondary)' }}>No internal entity records matched your keyword.</div>
            )}
          </div>

          {securities.length === 0 && entities.length === 0 && (
             <div style={{ color: 'var(--bb-text-primary)' }}>No results found across internal databases.</div>
          )}

        </div>
      )}
    </div>
  );
}
