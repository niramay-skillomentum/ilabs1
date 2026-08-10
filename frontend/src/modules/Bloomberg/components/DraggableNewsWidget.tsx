"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function DraggableNewsWidget() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Draggable State
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [page, setPage] = useState(1);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Initial position safe check
    setPosition({ x: Math.max(20, window.innerWidth - 380), y: 80 });

    const fetchNews = async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.marketaux.com/v1/news/all?api_token=vFqMQ4Y79HzPZP0MeAtb9gdtBIapay7FCCZC6Sta&symbols=AAPL,MSFT&language=en&page=${pageNum}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data && data.data) {
          setNews(data.data.slice(0, 10)); // Top 10
        } else {
          setError('Invalid API response format.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch news.');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchNews(page);
    
    // Auto-respawn every 2 minutes
    const interval = setInterval(() => {
      setPage(prev => {
        const nextPage = prev + 1;
        fetchNews(nextPage);
        return nextPage;
      });
      setIsVisible(true);
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // Calculate new position
    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;
    
    // Basic bounds checking (keep mostly on screen)
    newX = Math.max(0, Math.min(newX, window.innerWidth - 300));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 100));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="bb-panel"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '350px',
        maxHeight: '400px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0,0,0,0.9)',
        border: '1px solid #444',
        backgroundColor: '#0a0a0a',
        userSelect: 'none'
      }}
    >
      {/* Draggable Header */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          padding: '8px 12px',
          backgroundColor: '#333',
          borderBottom: '1px solid #555',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ color: '#ff9900', fontWeight: 'bold', fontSize: '13px' }}>
          LIVE NEWS & ADS
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: loading ? '#ff9900' : '#33cc33' }}></div>
          <div 
            onClick={() => setIsVisible(false)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ 
              color: '#888', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              marginLeft: '4px',
              padding: '0 4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ff5555'}
            onMouseOut={(e) => e.currentTarget.style.color = '#888'}
          >
            ×
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        style={{ 
          padding: '12px', 
          overflowY: 'auto', 
          flex: 1,
          backgroundColor: 'var(--bb-bg-surface)',
          userSelect: 'text'
        }}
      >
        {/* Video Ad Section */}
        <div style={{ marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#ff9900', marginBottom: '8px', fontWeight: 'bold' }}>
            SPONSORED
          </div>
          <video 
            src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
            controls 
            autoPlay 
            loop 
            style={{ width: '100%', borderRadius: '4px', border: '1px solid #444' }}
          />
        </div>

        {loading && <div style={{ color: '#aaa', fontSize: '12px' }}>Connecting to News Node...</div>}
        {error && <div style={{ color: 'var(--bb-alert)', fontSize: '12px' }}>{error}</div>}
        
        {!loading && !error && news.length === 0 && (
          <div style={{ color: '#aaa', fontSize: '12px' }}>No news available at this time.</div>
        )}

        {!loading && !error && news.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#00ccff', marginBottom: '4px' }}>
              {new Date(item.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {item.source}
            </div>
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'block', marginBottom: '6px' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ff9900')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#fff')}
            >
              {item.title}
            </a>
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt="thumbnail" 
                referrerPolicy="no-referrer"
                style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px', border: '1px solid #333' }}
              />
            )}
            <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>
              {item.snippet}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
