import React from 'react';
import { ALL_COMMANDS } from '../components/Header';

export default function HelpCenterScreen({ parameter }: { parameter?: string }) {
  const topics = [
    { id: 1, title: 'Commands' },
    { id: 2, title: 'Settlement Process' },
    { id: 3, title: 'SWIFT Messages' },
    { id: 4, title: 'Trade Lifecycle' },
    { id: 5, title: 'Break Types' },
    { id: 6, title: 'FAQs' },
  ];

  const paramNormalized = (parameter || '').toUpperCase().trim();
  const matchedTopic = topics.find(t => 
    t.id.toString() === paramNormalized || 
    t.title.toUpperCase() === paramNormalized
  );
  // Only default to topic 1 when NO parameter is provided;
  // if a parameter was given but didn't match, show an error.
  const isInvalidParam = paramNormalized !== '' && !matchedTopic;
  const activeTopic = matchedTopic || topics[0];

  const renderTopicContent = () => {
    if (activeTopic.id === 1) {
      const referenceCmds = ['DES', 'ISIN', 'SRCH', 'FX', 'PROD', 'RELS', 'ENTITY', 'ACC', 'CPTY', 'AGENT', 'SSI', 'BIC', 'CUT', 'HOL'];
      const opsCmds = ['TRADE', 'TRD', 'MO', 'CONF', 'SETTLE', 'RECON', 'LIFE', 'HIST', 'SWIFT', 'MT103', 'MT202', 'MT202COV', 'FIELDS', 'FIELD', 'QUEUE', 'BREAK', 'BRK', 'PORT', 'HELP'];
      const generalCmds = ['HOME', 'SEARCH', 'RECENT', 'NEWS', 'ABOUT'];

      const renderCategory = (title: string, cmds: string[]) => {
        const categoryCommands = ALL_COMMANDS.filter(c => cmds.includes(c.cmd));
        if (categoryCommands.length === 0) return null;
        return (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ color: '#ff9900', fontWeight: 'bold', marginBottom: '8px', paddingBottom: '4px' }}>{title}</div>
            <table className="bb-results-table bb-results-table-bordered" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Command</th>
                  <th style={{ width: '80%' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {categoryCommands.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#00ccff', fontWeight: 'bold' }}>{c.cmd}</td>
                    <td style={{ color: '#ccc' }}>{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      };

      return (
        <div style={{ padding: '16px 12px', overflowY: 'auto', flex: 1 }}>
          {renderCategory('Reference Data Commands', referenceCmds)}
          {renderCategory('Operations & SWIFT Commands', opsCmds)}
          {renderCategory('General Commands', generalCmds)}
        </div>
      );
    }
    
    if (activeTopic.id === 2) {
      return (
        <div style={{ padding: '24px 16px', color: '#ccc', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>Settlement Process Overview</div>
          <p>Settlement is the final step in the trade lifecycle where securities are exchanged for cash.</p>
          <ul style={{ paddingLeft: '24px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><strong>T+0 (Trade Date):</strong> The trade is executed and booked into the system.</li>
            <li><strong>T+1 (Enrichment & Confirmation):</strong> SSIs are applied and the trade is confirmed with the counterparty.</li>
            <li><strong>T+2 (Settlement Date):</strong> The actual exchange of assets occurs. If successful, trade moves to SETTLED. If not, it moves to FAILED.</li>
          </ul>
        </div>
      );
    }

    if (activeTopic.id === 3) {
      return (
        <div style={{ padding: '24px 16px', color: '#ccc', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>SWIFT Messaging Types</div>
          <p>SWIFT (Society for Worldwide Interbank Financial Telecommunication) messages are used to instruct cash and security movements.</p>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><strong style={{ color: '#ff9900' }}>MT202</strong>: General Financial Institution Transfer (Bank-to-Bank)</div>
            <div><strong style={{ color: '#00ccff' }}>MT202COV</strong>: Cover Payment</div>
            <div><strong style={{ color: '#ff5555' }}>MT103</strong>: Single Customer Credit Transfer</div>
          </div>
        </div>
      );
    }

    if (activeTopic.id === 4) {
      return (
        <div style={{ padding: '24px 16px', color: '#ccc', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>The Trade Lifecycle</div>
          <p>A trade transitions through various states from execution to settlement:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', fontFamily: 'Fira Code, monospace', fontSize: '13px' }}>
            <div>1. <span style={{ color: '#ff9900' }}>PENDING</span> - Waiting for SSI enrichment or validation</div>
            <div>2. <span style={{ color: '#00ccff' }}>CONFIRMED</span> - Agreed with counterparty</div>
            <div>3. <span style={{ color: '#00ffcc' }}>SETTLED</span> - Assets successfully exchanged</div>
            <div>4. <span style={{ color: '#ff5555' }}>FAILED</span> - Settlement failed on intended date</div>
            <div>5. <span style={{ color: '#ff5555' }}>CANCELLED</span> - Trade was cancelled before settlement</div>
          </div>
        </div>
      );
    }

    if (activeTopic.id === 5) {
      return (
        <div style={{ padding: '24px 16px', color: '#ccc', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>Break Types in Reconciliation</div>
          <p>Breaks occur when our internal records do not match the external statements.</p>
          <ul style={{ paddingLeft: '24px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><strong>Nostro Breaks:</strong> Cash reconciliation breaks (mismatch in bank statements).</li>
            <li><strong>Depot Breaks:</strong> Security reconciliation breaks (mismatch in custody statements).</li>
            <li><strong>Economic Breaks:</strong> Mismatches on price, quantity, or currency during confirmation.</li>
          </ul>
        </div>
      );
    }

    if (activeTopic.id === 6) {
      return (
        <div style={{ padding: '24px 16px', color: '#ccc', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>Frequently Asked Questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            <div>
              <strong style={{ color: '#00ccff' }}>Q: How do I view a SWIFT message?</strong>
              <div style={{ marginTop: '4px' }}>A: Run the SWIFT command followed by the Trade ID (e.g. <code>SWIFT TRD0001256</code>)</div>
            </div>

            <div>
              <strong style={{ color: '#00ccff' }}>Q: Where can I see trades that failed to settle?</strong>
              <div style={{ marginTop: '4px' }}>A: Run the <code>FAIL</code> command to open the failed trades monitor.</div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="bb-screen-header">
        <div className="bb-screen-title" style={{ marginBottom: '16px', color: '#ff9900' }}>
          OPERATIONS HELP (HELP)
        </div>
        <div className="bb-command-echo" style={{ marginBottom: '16px' }}>
          Command &gt; <span>HELP {parameter || ''}</span>
        </div>
      </div>

      {isInvalidParam ? (
        <div style={{ flex: 1, border: '1px solid #444', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold' }}>INVALID TOPIC</div>
          <div style={{ color: '#ccc', fontSize: '14px', textAlign: 'center', lineHeight: '1.6' }}>
            <span style={{ color: '#ff9900', fontWeight: 'bold' }}>HELP {parameter}</span> is not a valid help topic.<br/>
            Valid topics are <span style={{ color: '#00ccff' }}>1</span> through <span style={{ color: '#00ccff' }}>{topics.length}</span>, or use a topic name.
          </div>
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#888' }}>
            <div style={{ marginBottom: '8px', color: '#00ccff', fontWeight: 'bold' }}>Available Topics:</div>
            {topics.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#ff9900', width: '20px' }}>{t.id}</span>
                <span style={{ color: '#ccc' }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
        {/* Left Column - Topics */}
        <div style={{ flex: '0 0 300px', border: '1px solid #333' }}>
          <div style={{ color: '#00ccff', padding: '8px 12px', borderBottom: '1px solid #333', fontSize: '12px', fontWeight: 'bold' }}>
            TOPICS
          </div>
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {topics.map(t => {
              const isActive = activeTopic.id === t.id;
              return (
                <div key={t.id} style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div style={{ color: isActive ? '#00ccff' : '#ccc', width: '12px', fontWeight: isActive ? 'bold' : 'normal' }}>
                    {isActive ? '>' : t.id}
                  </div>
                  <div style={{ color: isActive ? '#00ccff' : '#fff', fontWeight: isActive ? 'bold' : 'normal' }}>
                    {t.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column - Dynamic Content */}
        <div style={{ flex: 1, border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#00ccff', padding: '8px 12px', borderBottom: '1px solid #333', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {activeTopic.id === 1 ? 'ALL COMMANDS' : activeTopic.title}
          </div>
          {renderTopicContent()}
        </div>
      </div>
      )}

      {/* Footer */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        borderTop: '1px solid #444', 
        marginTop: '32px', 
        paddingTop: '8px', 
        fontSize: '12px', 
        color: '#888' 
      }}>
        <div style={{ color: '#ccc', fontWeight: 'bold' }}>MSG: Help loaded</div>
        <div>Server: SGB-OPS-01 &nbsp;&nbsp;&nbsp; ENV: UAT</div>
      </div>
    </div>
  );
}
