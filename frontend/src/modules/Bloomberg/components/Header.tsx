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
  { cmd: 'FAIL', desc: 'Failed Trades' },
  { cmd: 'CONF', desc: 'Trade Confirmations' },
  { cmd: 'SWIFT', desc: 'SWIFT Viewer (MT202/MT103)' },
  { cmd: 'MT103', desc: 'MT103 Message Viewer' },
  { cmd: 'MT202', desc: 'MT202 Message Viewer' },
  { cmd: 'MT202COV', desc: 'MT202COV Viewer' },
  { cmd: 'FIELDS', desc: 'SWIFT Field Dictionary' },
  { cmd: 'FIELD', desc: 'SWIFT Field Dictionary (Alias)' },
  { cmd: 'QUEUE', desc: 'Payment Queue' },
  { cmd: 'BREAK', desc: 'Break Monitor' },
  { cmd: 'BRK', desc: 'Break Monitor (Alias)' },
  { cmd: 'PORT', desc: 'Portfolio Summary' },
  { cmd: 'HELP', desc: 'Operations Help & Documentation' },
  { cmd: 'SEARCH', desc: 'Global Search' },
  { cmd: 'RECENT', desc: 'Recent Commands' },
  { cmd: 'NEWS', desc: 'Market News' },
  { cmd: 'ABOUT', desc: 'About SGB Terminal' }
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
  { cmd: 'HOL USA', desc: 'USA Holiday Calendar' }
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

const SCREENS: ScreenType[] = ['HOME', 'DES', 'SRCH', 'ENTITY', 'SSI', 'TRADE', 'LIFE', 'SETTLE', 'SWIFT', 'BREAK', 'PORT', 'HELP'];

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
            style={{ fontSize: '16px', cursor: 'pointer' }} 
            onClick={() => executeCommand('SEARCH')}
            title="Global Search"
          >
            ⌕
          </span>
          <span 
            style={{ cursor: 'pointer' }} 
            onClick={() => executeCommand('HELP')}
            title="Help & Options"
          >
            ≡ Options
          </span>
          <div 
            style={{ width: '20px', height: '20px', backgroundColor: '#999', borderRadius: '50%', cursor: 'pointer' }}
            onClick={() => executeCommand('ABOUT')}
            title="About Terminal"
          ></div>
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
          <div className="bb-autocomplete-dropdown">
            <div className="bb-autocomplete-header">RELATED FUNCTIONS</div>
            {filteredCommands.map((c, index) => (
              <div 
                key={c.cmd} 
                className={`bb-autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelectCommand(c.cmd)}
              >
                <span className="bb-autocomplete-cmd">{c.cmd}</span>
                <span className="bb-autocomplete-desc">{c.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
