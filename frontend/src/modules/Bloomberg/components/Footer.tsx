import React from 'react';

export default function Footer() {
  return (
    <div className="bb-footer">
      <div>SGB TERMINAL v1.0</div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <span>ENV: PROD</span>
        <span style={{ color: 'var(--bb-text-secondary)' }}>CONNECTED</span>
      </div>
    </div>
  );
}
