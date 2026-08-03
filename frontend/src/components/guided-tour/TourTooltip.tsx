"use client";
import React from 'react';
import { TooltipRenderProps } from 'react-joyride';

export const TourTooltip: React.FC<TooltipRenderProps> = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
}) => {
  return (
    <div
      {...tooltipProps}
      style={{
        background: '#0f172a', // Sleek dark charcoal/navy
        borderRadius: '12px',
        padding: '24px',
        width: '440px',
        maxWidth: '90vw',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        fontFamily: "'Inter', sans-serif",
        color: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Guided Tutorial</span>
          <span>Step {index + 1} of {size}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i <= index ? '#3b82f6' : '#334155', // Vibrant blue for active, slate for inactive
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      <h3 style={{ margin: '0 0 10px 0', fontSize: '19px', fontWeight: 700, letterSpacing: '-0.01em', color: '#ffffff' }}>
        {step.title}
      </h3>
      
      <div style={{ fontSize: '14.5px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '28px' }}>
        {step.content}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          {...closeProps}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '8px 12px',
            fontWeight: 600,
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#cbd5e1')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          Skip Tour
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          {index > 0 && (
            <button
              {...backProps}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#475569'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#334155'; }}
            >
              Back
            </button>
          )}
          
          {!(step as any).spotlightClicks ? (
            <button
              {...primaryProps}
              style={{
                background: '#3b82f6',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          ) : (
            <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              Action Required ↗
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
