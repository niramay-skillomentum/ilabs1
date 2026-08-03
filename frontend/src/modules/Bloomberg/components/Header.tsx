"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ScreenType } from '../hooks/useCommandEngine';

export const ALL_COMMANDS = [
  { cmd: 'HOME', desc: 'Home Dashboard' },
  { cmd: 'DES', desc: 'Security Description' },
  { cmd: 'ISIN', desc: 'ISIN Lookup' },
  { cmd: 'SRCH', desc: 'Security Search' },
  { cmd: 'FX', desc: 'FX Search' },
  { cmd: 'PROD', desc: 'Product Search' },
  { cmd: 'RELS', desc: 'Related Securities' },
  { cmd: 'ENTITY', desc: 'Entity Profile' },
  { cmd: 'ACC', desc: 'Settlement Accounts (Alias for ENTITY)' },
  { cmd: 'CPTY', desc: 'Counterparty Profile' },
  { cmd: 'AGENT', desc: 'Agent Bank Profile (Alias for CPTY)' },
  { cmd: 'SSI', desc: 'Settlement Instructions' },
  { cmd: 'BIC', desc: 'BIC Directory' },
  { cmd: 'CUT', desc: 'Currency Cut-off Times' },
  { cmd: 'HOL', desc: 'Holiday Calendar' },
  { cmd: 'TRADE', desc: 'Trade Inquiry' },
  { cmd: 'TRD', desc: 'Trade Inquiry (Alias for TRADE)' },
  { cmd: 'TGEN', desc: 'Trade Generator' },
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
}

const SCREENS: ScreenType[] = ['HOME', 'DES', 'SRCH', 'ENTITY', 'SSI', 'TRADE', 'LIFE', 'SETTLE', 'SWIFT', 'BREAK', 'PORT', 'HELP'];

export default function Header({ executeCommand, activeScreen, setScreen }: HeaderProps) {
  const [cmd, setCmd] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const allSearchable = [...ALL_COMMANDS, ...INPUT_SUGGESTIONS];
  
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px' }}>B</span>
            <span>Bloomberg Intelligence</span>
          </span>
          <span className="bb-tab-close">×</span>
        </div>
        <div className="bb-tab-add">+</div>
        <div className="bb-top-right">
          <span style={{ fontSize: '16px' }}>⌕</span>
          <span>≡ Options</span>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#999', borderRadius: '50%' }}></div>
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
          <span className="bb-arrow">{"< >"}</span>
          <span className="bb-ticker">RYMNZ 2.55 12/18/2026 Corp ▼</span>
          <span className="bb-divider">|</span>
          <span className="bb-menu-text">BI</span>
          <span className="bb-divider">|</span>
          <span className="bb-menu-text">Related Functions Menu ▼</span>
        </div>
        <div className="bb-info-right">
          <span className="bb-message-icon">✉ Message</span>
          <span className="bb-help-icon">?</span>
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
