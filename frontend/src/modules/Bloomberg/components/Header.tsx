"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ScreenType } from '../hooks/useCommandEngine';
import { bloombergApi } from '../services/api';

export const ALL_COMMANDS = [
  { cmd: 'HOME', desc: 'Home Dashboard' },
  { cmd: 'DES', desc: 'Security Description' },
  { cmd: 'ISIN', desc: 'ISIN Lookup' },
  { cmd: 'SRCH', desc: 'Security Search' },
  { cmd: 'FX', desc: 'FX Search' },
  { cmd: 'PROD', desc: 'Product Search' },
  { cmd: 'RELS', desc: 'Related Securities' },
  { cmd: 'ENTITY', desc: 'Entity Profile' },
  { cmd: 'CPTY', desc: 'Counterparty Profile' },
  { cmd: 'AGENT', desc: 'Agent Bank Profile (Alias for CPTY)' },
  { cmd: 'SSI', desc: 'Settlement Instructions' },
  { cmd: 'BIC', desc: 'BIC Directory' },
  { cmd: 'CUT', desc: 'Currency Cut-off Times' },
  { cmd: 'HOL', desc: 'Holiday Calendar' },
  { cmd: 'TRADE', desc: 'Trade Inquiry' },
  { cmd: 'TRD', desc: 'Trade Inquiry (Alias for TRADE)' },
  { cmd: 'LIFE', desc: 'Trade Lifecycle' },
  { cmd: 'HIST', desc: 'Trade History' },
  { cmd: 'SETTLE', desc: 'Settlement Screen' },
  { cmd: 'CONF', desc: 'Trade Confirmations' },
  { cmd: 'SWIFT', desc: 'SWIFT Viewer (MT202/MT103)' },
  { cmd: 'MT103', desc: 'MT103 Message Viewer' },
  { cmd: 'MT202', desc: 'MT202 Message Viewer' },
  { cmd: 'MT202COV', desc: 'MT202COV Viewer' },
  { cmd: 'FIELDS', desc: 'SWIFT Field Dictionary' },
  { cmd: 'FIELD', desc: 'SWIFT Field Dictionary (Alias)' },
  { cmd: 'QUEUE', desc: 'Global Work Queue' },
  { cmd: 'BREAK', desc: 'Break Monitor' },
  { cmd: 'BRK', desc: 'Break Monitor (Alias)' },
  { cmd: 'PORT', desc: 'Portfolio Summary' },
  { cmd: 'HELP', desc: 'Operations Help & Documentation' },
  { cmd: 'SEARCH', desc: 'Global Search' },
  { cmd: 'RECENT', desc: 'Recent Commands' },
  { cmd: 'NEWS', desc: 'Market News' },
  { cmd: 'ABOUT', desc: 'About SGB Terminal' },
  { cmd: 'MO', desc: 'Middle Office Trades Blotter' },
  { cmd: 'RECON', desc: 'Reconciliation Monitor' }
];

const INPUT_SUGGESTIONS = [
  { cmd: 'DES US0378331005', desc: 'Apple Inc - Security Description' },
  { cmd: 'ISIN US0378331005', desc: 'Apple Inc - ISIN Lookup' },
  { cmd: 'SRCH APPLE', desc: 'Search for Apple Securities' },
  { cmd: 'SEARCH APPLE', desc: 'Global Search for Apple' },
  { cmd: 'SEARCH MICROSOFT', desc: 'Global Search for Microsoft' },
  { cmd: 'SEARCH SBG', desc: 'Global Search for Skillomentum Bank' },
  { cmd: 'SEARCH CITI', desc: 'Global Search for Citi' },
  { cmd: 'SEARCH USD', desc: 'Global Search for USD Currency' },
  { cmd: 'ENTITY SKILLOMENTUM', desc: 'Skillomentum Global Bank Profile' },
  { cmd: 'CPTY BNY Mellon', desc: 'BNY Mellon Counterparty Profile' },
  { cmd: 'AGENT BNY Mellon', desc: 'BNY Mellon Agent Bank Profile' },
  { cmd: 'SSI BNY Mellon', desc: 'BNY Mellon Settlement Instructions' },
  { cmd: 'CUT ZAR', desc: 'ZAR Cut-off Times' },
  { cmd: 'HOL USA', desc: 'USA Holiday Calendar' },
  { cmd: 'TRADE TRD0001256', desc: 'Trade Inquiry for TRD0001256' },
  { cmd: 'HIST TRD0001256', desc: 'Audit History for TRD0001256' },
  { cmd: 'LIFE TRD0001256', desc: 'Lifecycle for TRD0001256' },
  { cmd: 'SWIFT TRD0001256', desc: 'SWIFT messages for TRD0001256' },
  { cmd: 'BREAK MO', desc: 'Middle Office Break Monitor' },
  { cmd: 'BREAK CONFIRMATION', desc: 'Confirmation Break Monitor' },
  { cmd: 'BREAK SETTLEMENT', desc: 'Settlement Break Monitor' },
  { cmd: 'FIELDS 52A', desc: 'SWIFT Field Dictionary for 52A' },
  { cmd: 'HELP 1', desc: 'Operations Help - Commands' }
];

interface HeaderProps {
  executeCommand: (cmd: string) => void;
  activeScreen: ScreenType;
  setScreen: (screen: ScreenType) => void;
  goBack?: () => void;
  goForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

const SCREENS: ScreenType[] = ['HOME', 'MO', 'CONF', 'SETTLE', 'TRADE', 'SWIFT', 'BREAK', 'RECON', 'PORT', 'SRCH', 'DES', 'HELP'];

export default function Header({ 
  executeCommand, 
  activeScreen, 
  setScreen, 
  goBack, 
  goForward, 
  canGoBack, 
  canGoForward 
}: HeaderProps) {
  const [cmd, setCmd] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<{cmd: string, desc: string}[]>([]);
  
  useEffect(() => {
    if (!cmd.includes(' ')) {
      setDynamicSuggestions([]);
      return;
    }
    
    const parts = cmd.split(' ');
    const baseCmd = parts[0].toUpperCase();
    const param = parts.slice(1).join(' ');
    
    if (param.length < 2) {
      setDynamicSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        let results: {cmd: string, desc: string}[] = [];
        if (baseCmd === 'ENTITY') {
          const res = await bloombergApi.searchEntity(param);
          if (res.success && res.data) {
            results = res.data.slice(0, 5).map((e: any) => ({
              cmd: `${baseCmd} ${e.entityCode}`,
              desc: `${e.entityName} - ${e.currency}`
            }));
          }
        } else if (baseCmd === 'SRCH' || baseCmd === 'DES' || baseCmd === 'ISIN') {
          const res = await bloombergApi.searchSecurity(param);
          if (res.success && res.data) {
            results = res.data.slice(0, 5).map((s: any) => ({
              cmd: `${baseCmd} ${s.isin || s.underlyer}`,
              desc: `${s.companyName || s.underlyer} - ${s.productType || s.product}`
            }));
          }
        } else if (baseCmd === 'FX') {
          const res = await bloombergApi.searchSecurity(param, 'FX');
          if (res.success && res.data) {
            results = res.data.slice(0, 5).map((s: any) => ({
              cmd: `${baseCmd} ${s.underlyer}`,
              desc: `${s.underlyer} - ${s.productType}`
            }));
          }
        } else if (baseCmd === 'PROD') {
          const res = await bloombergApi.getProducts();
          if (res.success && res.data) {
            const filtered = res.data.filter((p: any) => 
              p.product.toUpperCase().includes(param.toUpperCase()) || 
              p.productType.toUpperCase().includes(param.toUpperCase())
            );
            results = filtered.slice(0, 5).map((p: any) => ({
              cmd: `${baseCmd} ${p.productType.toUpperCase()}`,
              desc: `${p.product} - ${p.productType}`
            }));
          }
        } else if (baseCmd === 'RELS') {
          const res = await bloombergApi.getRelated(param);
          if (res.success && res.data) {
            results = res.data.slice(0, 5).map((r: any) => ({
              cmd: `${baseCmd} ${r.entity}`,
              desc: `${r.entity} - ${r.relation}`
            }));
          }
        }
        setDynamicSuggestions(results);
      } catch (e) {
        // Ignore fetch errors during typing
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cmd]);
  
  const allSearchable = [...ALL_COMMANDS, ...INPUT_SUGGESTIONS, ...dynamicSuggestions];
  
  const filteredCommands = cmd 
    ? allSearchable.filter(c => 
        c.cmd.toUpperCase().startsWith(cmd.toUpperCase()) || 
        (cmd.length > 2 && c.desc.toUpperCase().includes(cmd.toUpperCase()))
      )
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (showDropdown && filteredCommands.length > 0) {
        const safeIndex = Math.min(Math.max(selectedIndex, 0), filteredCommands.length - 1);
        const selected = filteredCommands[safeIndex]?.cmd;
        
        if (!selected) {
          executeCommand(cmd);
          setCmd('');
          setShowDropdown(false);
          return;
        }
        
        // If the selected suggestion contains a space (it's a full input) OR the user already typed a space
        if (selected.includes(' ') && !cmd.includes(' ')) {
          // User chose a full input suggestion from a base command
          executeCommand(selected);
          setCmd('');
          setShowDropdown(false);
        } else if (cmd.toUpperCase().trim() === selected) {
          executeCommand(cmd);
          setCmd('');
          setShowDropdown(false);
        } else if (!cmd.includes(' ')) {
          // Autocomplete base command and add space
          setCmd(selected + ' ');
        } else {
          // User typed a full command with parameter, just execute their raw input
          executeCommand(cmd);
          setCmd('');
          setShowDropdown(false);
        }
      } else {
        executeCommand(cmd);
        setCmd('');
        setShowDropdown(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCmd(e.target.value);
    setShowDropdown(true);
    setSelectedIndex(0);
  };

  const handleSelectCommand = (selectedCmd: string) => {
    if (selectedCmd.includes(' ')) {
      // It's a full input suggestion, execute immediately
      executeCommand(selectedCmd);
      setCmd('');
      setShowDropdown(false);
    } else {
      // It's a base command, add a space to prompt for parameter
      setCmd(selectedCmd + ' ');
    }
  };

  return (
    <div className="bb-header-container">
      {/* Top Bar */}
      <div className="bb-top-bar">
        <div className="bb-tab">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>SGB</span>
            <span>Terminal</span>
          </span>
        </div>
        <div className="bb-top-right">
          <span 
            style={{ 
              cursor: 'pointer', 
              color: 'var(--bb-alert)', 
              fontWeight: 'bold',
              border: '1px solid var(--bb-alert)',
              padding: '2px 8px',
              backgroundColor: '#0a0a0a',
            }}
            onClick={() => setShowExitModal(true)}
            title="Exit Terminal"
          >
            [X] EXIT
          </span>
        </div>
      </div>

      {/* Button Row */}
      <div className="bb-button-row">
        {SCREENS.map(screen => (
          <button 
            key={screen}
            className={`bb-btn ${screen === 'HOME' ? 'bb-btn-red' : 'bb-btn-green'}`}
            onClick={() => setScreen(screen)}
          >
            {screen}
          </button>
        ))}
      </div>

      {/* Path/Info Row */}
      <div className="bb-info-row">
        <div className="bb-path">
          <span className="bb-arrow">
            <span 
              style={{ cursor: canGoBack ? 'pointer' : 'default', opacity: canGoBack ? 1 : 0.5, marginRight: '8px' }} 
              onClick={canGoBack ? goBack : undefined}
              title="Go Back"
            >
              {"<"}
            </span>
            <span 
              style={{ cursor: canGoForward ? 'pointer' : 'default', opacity: canGoForward ? 1 : 0.5 }} 
              onClick={canGoForward ? goForward : undefined}
              title="Go Forward"
            >
              {">"}
            </span>
          </span>
          <span 
            className="bb-ticker" 
            style={{ cursor: 'pointer' }}
            onClick={() => executeCommand('RECENT')}
            title="View Recent Commands"
          >
            {activeScreen} ▼
          </span>
          <span className="bb-divider">|</span>
          <span className="bb-menu-text">
            {ALL_COMMANDS.find(c => c.cmd === activeScreen)?.desc || 'Global Operations'}
          </span>
          <span className="bb-divider">|</span>
          <span 
            className="bb-menu-text" 
            style={{ cursor: 'pointer' }}
            onClick={() => executeCommand('HELP')}
            title="Open Help Menu"
          >
            Related Functions Menu ▼
          </span>
        </div>
        <div className="bb-info-right">
        </div>
      </div>

      {/* Command Input Row */}
      <div className="bb-command-row" style={{ position: 'relative' }}>
        <div className="bb-prompt-container">
          <span className="bb-prompt">▶</span>
        </div>
        <input 
          autoFocus
          className="bb-command-input-new"
          value={cmd}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onFocus={() => cmd && setShowDropdown(true)}
        />
        
        {/* Autocomplete Dropdown */}
        {showDropdown && filteredCommands.length > 0 && (
          <div className="bb-autocomplete-dropdown" style={{ padding: '0', width: 'auto', minWidth: '600px' }}>
            <div className="bb-autocomplete-header" style={{ padding: '8px 12px', fontWeight: 'bold' }}>RELATED FUNCTIONS & COMMANDS</div>
            <table className="bb-results-table bb-results-table-bordered" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Command</th>
                  <th style={{ width: '70%' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommands.map((c, index) => (
                  <tr 
                    key={c.cmd} 
                    className={`bb-autocomplete-item-row ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => handleSelectCommand(c.cmd)}
                    style={{ cursor: 'pointer', backgroundColor: index === selectedIndex ? 'var(--bb-text-primary)' : 'transparent', color: index === selectedIndex ? '#000' : 'inherit' }}
                  >
                    <td style={{ fontWeight: 'bold', color: index === selectedIndex ? '#000' : '#00ccff' }}>{c.cmd}</td>
                    <td style={{ color: index === selectedIndex ? '#000' : 'var(--bb-text-tertiary)' }}>{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Custom Exit Toast Popup */}
      {showExitModal && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          backgroundColor: '#0a0a0a',
          border: '1px solid var(--bb-alert)',
          boxShadow: '0 4px 12px rgba(255, 85, 85, 0.3)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          fontFamily: 'var(--bb-font-mono)'
        }}>
          <div style={{
            backgroundColor: 'var(--bb-alert)',
            color: '#000',
            fontWeight: 'bold',
            padding: '4px 8px',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>SYSTEM WARNING</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setShowExitModal(false)}>X</span>
          </div>
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>
            Confirm exit terminal?
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '12px', 
            paddingBottom: '16px' 
          }}>
            <button 
              onClick={() => window.location.href = '/'}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--bb-alert)',
                color: 'var(--bb-alert)',
                padding: '4px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bb-alert)'; e.currentTarget.style.color = '#000'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--bb-alert)'; }}
            >
              YES
            </button>
            <button 
              onClick={() => setShowExitModal(false)}
              style={{
                backgroundColor: '#333',
                border: '1px solid #555',
                color: '#fff',
                padding: '4px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#444'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#333'}
            >
              NO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
