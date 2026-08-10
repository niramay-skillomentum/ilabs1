import React from 'react';

export default function SwiftFieldGuideScreen({ parameter }: { parameter?: string }) {
  const filter = parameter ? parameter.toUpperCase() : '';

  const fields = [
    { tag: ':20:', name: 'Transaction Reference Number', desc: 'Unique reference assigned by the sender.' },
    { tag: ':21:', name: 'Related Reference', desc: 'Reference of the underlying transaction.' },
    { tag: ':23B:', name: 'Bank Operation Code', desc: 'Identifies the type of operation (e.g. CRED).' },
    { tag: ':32A:', name: 'Value Date, Currency Code, Amount', desc: 'The date, currency, and interbank settled amount.' },
    { tag: ':33B:', name: 'Currency/Original Ordered Amount', desc: 'Currency and amount of the underlying customer transfer.' },
    { tag: ':50K:', name: 'Ordering Customer', desc: 'The customer ordering the transaction.' },
    { tag: ':52A:', name: 'Ordering Institution', desc: 'The financial institution ordering the transaction.' },
    { tag: ':53A:', name: 'Sender\'s Correspondent', desc: 'The agent bank of the sender.' },
    { tag: ':54A:', name: 'Receiver\'s Correspondent', desc: 'The agent bank of the receiver.' },
    { tag: ':56A:', name: 'Intermediary Institution', desc: 'A financial institution between the receiver\'s correspondent and the account with institution.' },
    { tag: ':57A:', name: 'Account With Institution', desc: 'The financial institution where the beneficiary maintains its account.' },
    { tag: ':58A:', name: 'Beneficiary Institution', desc: 'The ultimate financial institution to be credited.' },
    { tag: ':59:', name: 'Beneficiary Customer', desc: 'The ultimate customer to be credited.' },
    { tag: ':70:', name: 'Remittance Information', desc: 'Information to be passed to the beneficiary.' },
    { tag: ':71A:', name: 'Details of Charges', desc: 'Indicates who bears the charges (e.g. SHA, BEN, OUR).' },
    { tag: ':72:', name: 'Sender to Receiver Information', desc: 'Additional information for the receiver.' },
  ];

  const filtered = filter ? fields.filter(f => f.tag.includes(filter) || f.name.toUpperCase().includes(filter)) : fields;

  return (
    <div style={{ padding: '16px' }}>
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>FIELDS {parameter || ''}</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px' }}>
        SWIFT MT FIELD DICTIONARY
      </div>

      <div className="bb-panel" style={{ padding: 0 }}>
        <table className="bb-results-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>SWIFT Tag</th>
              <th style={{ width: '35%' }}>Field Name</th>
              <th style={{ width: '50%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((f, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bb-text-primary)', fontWeight: 'bold' }}>{f.tag}</td>
                  <td>{f.name}</td>
                  <td style={{ color: 'var(--bb-text-tertiary)' }}>{f.desc}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '16px' }}>No SWIFT fields found for {filter}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
