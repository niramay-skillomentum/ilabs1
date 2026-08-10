"use client";

import React, { useState, useEffect } from 'react';
import { bloombergApi } from '../services/api';
import DraggableNewsWidget from '../components/DraggableNewsWidget';

export default function HomeScreen() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    bloombergApi.getTradeStats().then(res => {
      if (res.success) setStats(res);
    }).catch(err => console.error("Stats fetch error:", err));
    
    // Auto-refresh every 5 seconds for that "Live" feel
    const interval = setInterval(() => {
      bloombergApi.getTradeStats().then(res => {
        if (res.success) setStats(res);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div style={{ padding: '16px', color: 'var(--bb-text-secondary)', textAlign: 'center', marginTop: '100px' }}>
        CONNECTING TO SGB SIMULATOR NODE...
      </div>
    );
  }

  // Derived metrics
  const total = stats.totalTrades || 1; // avoid div by 0
  
  // Quadrant 1: Lifecycle Donut Data
  const lifecycleData = [
    { label: 'SETTLED', value: stats.settledCount || 0, color: '#33cc33' },
    { label: 'PENDING', value: stats.pendingCount || 0, color: '#ff9900' },
    { label: 'FAILS/BREAKS', value: (stats.failedCount || 0) + (stats.breakCount || 0), color: '#ff5555' }
  ];

  // Helper for SVG Donut
  let cumulativePercent = 0;
  
  // Quadrant 2: Currency
  const ccyData = (stats.byCurrency || []).slice(0, 5); // top 5
  const maxCcyVal = Math.max(...ccyData.map((d: any) => d.totalAmount || 0), 1);

  // Quadrant 3: Desk Heatmap
  const deskData = (stats.byDesk || []).filter((d: any) => d.desk !== 'UNASSIGNED');
  const maxDeskVal = Math.max(...deskData.map((d: any) => d.count || 0), 1);

  // Quadrant 4: Products
  const prodData = (stats.byProduct || []).slice(0, 5);
  const maxProdVal = Math.max(...prodData.map((d: any) => d.count || 0), 1);

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DraggableNewsWidget />
      <div className="bb-screen-header">
        <div className="bb-command-echo">Command &gt; <span>HOME</span></div>
      </div>
      
      <div className="bb-screen-title" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <div>SGB TERMINAL :: GLOBAL DASHBOARD</div>
        <div style={{ fontSize: '14px', color: '#33cc33' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#33cc33', borderRadius: '50%', marginRight: '6px', animation: 'blink 2s infinite' }}></span>
          LIVE
        </div>
      </div>

      {/* 2x2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '16px', flex: 1, minHeight: '600px' }}>
        
        {/* QUADRANT 1: LIFECYCLE */}
        <div className="bb-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px', marginBottom: '16px', color: '#ff9900', fontWeight: 'bold' }}>
            GLOBAL TRADE LIFECYCLE
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* Custom SVG Donut Chart */}
            <div style={{ width: '160px', height: '160px', position: 'relative' }}>
              <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {lifecycleData.map(slice => {
                  if (slice.value === 0) return null;
                  const slicePercent = slice.value / total;
                  
                  const dasharray = `${slicePercent * 3.14159} 3.14159`;
                  const offset = -(cumulativePercent * 3.14159);
                  cumulativePercent += slicePercent;
                  
                  return (
                    <circle
                      key={slice.label}
                      r="0.5"
                      cx="0"
                      cy="0"
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="0.8"
                      strokeDasharray={dasharray}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{stats.totalTrades}</span>
                <span style={{ fontSize: '10px', color: '#888' }}>TOTAL</span>
              </div>
            </div>
            
            <div style={{ marginLeft: '32px', flex: 1 }}>
              {lifecycleData.map(slice => (
                <div key={slice.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: slice.color, marginRight: '8px' }}></div>
                    {slice.label}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>{slice.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QUADRANT 2: CURRENCY EXPOSURE */}
        <div className="bb-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px', marginBottom: '16px', color: '#00ccff', fontWeight: 'bold' }}>
            NOTIONAL EXPOSURE BY CURRENCY
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
            {ccyData.length === 0 ? <div style={{ color: '#555' }}>No Data</div> : ccyData.map((c: any) => {
              const width = Math.max((c.totalAmount / maxCcyVal) * 100, 2);
              return (
                <div key={c.currency} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#fff' }}>{c.currency}</span>
                    <span style={{ color: '#aaa' }}>{c.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: '#222', height: '12px' }}>
                    <div style={{ width: `${width}%`, backgroundColor: '#00ccff', height: '100%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUADRANT 3: DESK BOTTLENECKS */}
        <div className="bb-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px', marginBottom: '16px', color: '#ff5555', fontWeight: 'bold' }}>
            OPERATIONS BOTTLENECK (QUEUE DEPTH)
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
            {deskData.length === 0 ? <div style={{ color: '#555' }}>All Clear</div> : deskData.map((d: any) => {
              const width = Math.max((d.count / maxDeskVal) * 100, 2);
              // Color codes based on depth
              const barColor = width > 75 ? '#ff5555' : width > 40 ? '#ff9900' : '#33cc33';
              return (
                <div key={d.desk} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#fff' }}>{d.desk}</span>
                    <span style={{ color: barColor, fontWeight: 'bold' }}>{d.count} items</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: '#222', height: '12px' }}>
                    <div style={{ width: `${width}%`, backgroundColor: barColor, height: '100%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUADRANT 4: VOLUME BY PRODUCT */}
        <div className="bb-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--bb-border)', paddingBottom: '8px', marginBottom: '16px', color: '#fff', fontWeight: 'bold' }}>
            TRADE VOLUME BY ASSET CLASS
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: '20px' }}>
            {prodData.length === 0 ? <div style={{ color: '#555' }}>No Data</div> : prodData.map((p: any) => {
              const height = Math.max((p.count / maxProdVal) * 100, 5);
              return (
                <div key={p.product} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '40px' }}>
                  <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>{p.count}</div>
                  <div style={{ width: '30px', height: `${height}%`, backgroundColor: '#444', borderTop: '2px solid #fff' }}></div>
                  <div style={{ color: '#fff', fontSize: '10px', marginTop: '8px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', width: '100%', textAlign: 'left', overflow: 'visible' }}>
                    <span style={{ marginLeft: '-15px', display: 'inline-block', width: '50px' }}>{p.product}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      
      <div style={{ marginTop: '16px', color: 'var(--bb-text-secondary)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <div>MSG: Real-time telemetry established. Note: Type HELP to view command directory.</div>
        <div>SYS: OK</div>
      </div>

    </div>
  );
}
