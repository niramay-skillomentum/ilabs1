"use client";

import React, { useState } from 'react';

export default function TradeGeneratorScreen() {
  const [security, setSecurity] = useState('');
  const [entity, setEntity] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const handleGenerate = () => {
    // We would wire this up to the backend API here
    console.log('Generating trade...', { security, entity, counterparty, quantity, price });
  };

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>TGEN</span></div>
      </div>

      <div className="bb-screen-title" style={{ marginBottom: '24px' }}>
        TRADE GENERATOR
      </div>

      <div className="bb-form-grid">
        {/* Left Column */}
        <div>
          <div className="bb-form-group">
            <label>Security</label>
            <div style={{ position: 'relative' }}>
              <input type="text" value={security} onChange={e => setSecurity(e.target.value)} placeholder="e.g. Apple Inc (US0378331005)" />
              <span style={{ position: 'absolute', right: '8px', top: '6px', color: '#ccc', cursor: 'pointer' }}>Q</span>
            </div>
          </div>
          <div className="bb-form-group">
            <label>Entity (Buyer)</label>
            <div style={{ position: 'relative' }}>
              <input type="text" value={entity} onChange={e => setEntity(e.target.value)} placeholder="e.g. HSBC Bank plc" />
              <span style={{ position: 'absolute', right: '8px', top: '6px', color: '#ccc', cursor: 'pointer' }}>Q</span>
            </div>
          </div>
          <div className="bb-form-group">
            <label>Counterparty (Seller)</label>
            <div style={{ position: 'relative' }}>
              <input type="text" value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g. JPMorgan Chase & Co." />
              <span style={{ position: 'absolute', right: '8px', top: '6px', color: '#ccc', cursor: 'pointer' }}>Q</span>
            </div>
          </div>
          <div className="bb-form-group">
            <label>Quantity</label>
            <input type="text" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="10,000" />
          </div>
          <div className="bb-form-group">
            <label>Price</label>
            <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="175.2500" />
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="bb-form-group">
            <label>Trade Date</label>
            <input type="text" defaultValue="21-May-2024" />
          </div>
          <div className="bb-form-group">
            <label>Settlement Date</label>
            <input type="text" defaultValue="23-May-2024" />
          </div>
          <div className="bb-form-group">
            <label>Currency</label>
            <select>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
          <div className="bb-form-group">
            <label>Trade Type</label>
            <select>
              <option>Equity</option>
              <option>Bond</option>
              <option>FX</option>
            </select>
          </div>
          <div className="bb-form-group">
            <label>Settlement Method</label>
            <select>
              <option>DVP</option>
              <option>FOP</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '24px', justifyContent: 'flex-start' }}>
        <button className="bb-btn-orange" onClick={handleGenerate}>GENERATE TRADE</button>
        <button className="bb-btn-outline" onClick={() => {
          setSecurity(''); setEntity(''); setCounterparty(''); setQuantity(''); setPrice('');
        }}>RESET</button>
      </div>

      <div style={{ marginTop: '24px', color: 'var(--bb-text-secondary)', fontSize: '12px', borderTop: '1px solid #333', paddingTop: '8px' }}>
        MSG: Click GENERATE TRADE to create <span style={{float: 'right', color: '#ccc'}}>Server: SGB-OPS-01 &nbsp;&nbsp; ENV: UAT</span>
      </div>
    </div>
  );
}
