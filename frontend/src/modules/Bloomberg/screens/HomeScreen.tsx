"use client";

import React from 'react';

export default function HomeScreen() {
  const referenceCommands = [
    { cmd: 'DES', input: 'DES US0378331005', desc: 'Security Description', output: 'ISIN, Ticker, Description, Price, Currency' },
    { cmd: 'ISIN', input: 'ISIN US0378331005', desc: 'ISIN Lookup', output: 'ISIN, Ticker, Description, Price, Currency' },
    { cmd: 'SRCH', input: 'SRCH APPLE', desc: 'Security Search', output: 'Security Name, ISIN, Asset Class, Exchange' },
    { cmd: 'FX', input: 'FX USD', desc: 'FX Search', output: 'Currency Pairs, Spot Rates, Forward Rates' },
    { cmd: 'PROD', input: 'PROD EQUITY', desc: 'Product Search', output: 'Asset Classes, Product Types' },
    { cmd: 'RELS', input: 'RELS APPLE', desc: 'Related Securities', output: 'Parent/Child Entities, Linked Assets' },
    { cmd: 'ENTITY', input: 'ENTITY SKILLOMENTUM', desc: 'Entity Profile', output: 'Entity Name, Type, Country, LEI, BIC' },
    { cmd: 'ACC', input: 'ACC SKILLOMENTUM', desc: 'Settlement Accounts', output: 'Account Name, Number, Currency, Institution' },
    { cmd: 'CPTY', input: 'CPTY BNY Mellon', desc: 'Counterparty Profile', output: 'Counterparty Type, Credit Limit, Settlement Method' },
    { cmd: 'AGENT', input: 'AGENT BNY Mellon', desc: 'Agent Bank Profile', output: 'Agent Name, BIC, Branch, Regulators' },
    { cmd: 'SSI', input: 'SSI BNY Mellon', desc: 'Settlement Instructions', output: 'Agent Bank, Correspondent, Beneficiary details' },
    { cmd: 'BIC', input: 'BIC CITIUS33', desc: 'BIC Directory', output: 'Institution, BIC/SWIFT, Region, Branch' },
    { cmd: 'CUT', input: 'CUT ZAR', desc: 'Currency Cut-off Times', output: 'Currency, Product Type, Time (GMT)' },
    { cmd: 'HOL', input: 'HOL USA', desc: 'Holiday Calendar', output: 'Date, Country, Holiday Description' },
  ];

  const opsCommands = [
    { cmd: 'TRADE', input: 'TRADE TRD0001256', desc: 'Trade Inquiry', output: 'Trade ID, Status, Security, Qty, Value Date' },
    { cmd: 'TRD', input: 'TRD TRD0001256', desc: 'Trade Inquiry (Alias)', output: 'Trade ID, Status, Security, Qty, Value Date' },
    { cmd: 'TGEN', input: 'TGEN', desc: 'Trade Generator', output: 'Security, Buyer/Seller, Qty, Price, Dates' },
    { cmd: 'LIFE', input: 'LIFE TRD0001256', desc: 'Trade Lifecycle', output: 'Visual timeline: Booked, Confirmed, Matched' },
    { cmd: 'HIST', input: 'HIST TRD0001256', desc: 'Trade History', output: 'Audit trail of trade modifications' },
    { cmd: 'SETTLE', input: 'SETTLE TRD0001256', desc: 'Settlement Screen', output: 'Cash Movement (Dr/Cr), Security Movement' },
    { cmd: 'FAIL', input: 'FAIL', desc: 'Failed Trades', output: 'Trade Ref, Counterparty, Fail Reason, Status' },
    { cmd: 'CONF', input: 'CONF', desc: 'Trade Confirmations', output: 'Matching Status, Affirmation Details' },
    { cmd: 'SWIFT', input: 'SWIFT TRD0001256', desc: 'SWIFT Viewer', output: 'Raw MT Network Message Data' },
    { cmd: 'MT103', input: 'MT103 TRD0001256', desc: 'MT103 Message', output: 'Single Customer Credit Transfer tags' },
    { cmd: 'MT202', input: 'MT202 TRD0001256', desc: 'MT202 Message', output: 'General Financial Institution Transfer tags' },
    { cmd: 'MT202COV', input: 'MT202COV TRD0001256', desc: 'MT202COV Viewer', output: 'Cover Payment tags' },
    { cmd: 'FIELDS', input: 'FIELDS 52A', desc: 'SWIFT Field Dictionary', output: 'SWIFT Tag, Field Name, Description' },
    { cmd: 'QUEUE', input: 'QUEUE', desc: 'Payment Queue', output: 'Task ID, Reference, Priority, Owner' },
    { cmd: 'BREAK', input: 'BREAK', desc: 'Break Monitor', output: 'Break ID, Type, Expected/Actual Diff, Age' },
    { cmd: 'BRK', input: 'BRK', desc: 'Break Monitor (Alias)', output: 'Break ID, Type, Expected/Actual Diff, Age' },
    { cmd: 'PORT', input: 'PORT', desc: 'Portfolio Summary', output: 'Asset Allocation, Holdings, Valuations' },
    { cmd: 'HELP', input: 'HELP', desc: 'Operations Help', output: 'Command, Usage, Description, Details' }
  ];

  const generalCommands = [
    { cmd: 'HOME', input: 'HOME', desc: 'Home Dashboard', output: 'Command Directory, API Status' },
    { cmd: 'SEARCH', input: 'SEARCH', desc: 'Global Search', output: 'Search Results across all entities' },
    { cmd: 'RECENT', input: 'RECENT', desc: 'Recent Commands', output: 'Command History Log' },
    { cmd: 'NEWS', input: 'NEWS', desc: 'Market News', output: 'Timestamp, Headline, Details' },
    { cmd: 'ABOUT', input: 'ABOUT', desc: 'About SGB Terminal', output: 'Version, Connections, Architecture' }
  ];

  const renderTable = (title: string, commands: any[]) => (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ color: 'var(--bb-text-secondary)', borderBottom: '1px solid var(--bb-border)', paddingBottom: '4px', fontSize: '14px', textTransform: 'uppercase' }}>
        {title} ({commands.length})
      </h3>
      <table className="bb-results-table" style={{ fontSize: '12px', lineHeight: '1.5', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Command</th>
            <th style={{ width: '25%' }}>Description</th>
            <th style={{ width: '25%' }}>Example Input</th>
            <th style={{ width: '40%' }}>Output / Display</th>
          </tr>
        </thead>
        <tbody>
          {commands.map(c => (
            <tr key={c.cmd}>
              <td style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>{c.cmd}</td>
              <td>{c.desc}</td>
              <td><code style={{ color: '#00ccff' }}>{c.input}</code></td>
              <td style={{ color: 'var(--bb-text-tertiary)' }}>{c.output}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>HOME</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        SGB TERMINAL COMMAND DIRECTORY
        <div className="bb-screen-title-right">
          <span style={{color: 'var(--bb-text-secondary)'}}>API</span> ONLINE
        </div>
      </div>

      <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '24px' }}>
        Welcome to the SGB Terminal. Below is a complete catalogue of all {referenceCommands.length + opsCommands.length + generalCommands.length} available commands and expected inputs. Type any of these commands in the prompt above to navigate the system.
      </p>

      {renderTable('Reference Data Commands', referenceCommands)}
      {renderTable('Operations & SWIFT Commands', opsCommands)}
      {renderTable('General Commands', generalCommands)}

    </div>
  );
}
