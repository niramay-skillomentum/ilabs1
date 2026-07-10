'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Monitor } from './Icons';

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside 
      className={`h-[calc(100vh-32px)] my-4 ml-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-float flex flex-col pt-6 flex-shrink-0 transition-all duration-300 ease-in-out z-40 relative ${isExpanded ? 'w-[240px]' : 'w-[80px]'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={`px-4 mb-8 flex items-center ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <span className="text-[var(--color-primary)] font-bold text-xl leading-none">N</span>
        </div>
        <div className={`ml-3 transition-opacity duration-300 whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
          <h1 className="text-[var(--color-text-primary)] text-lg font-bold tracking-tight">Niramay</h1>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 uppercase tracking-wider font-semibold">Operations</p>
        </div>
      </div>

      <nav className="flex flex-col gap-3 px-3 flex-1 overflow-hidden">
        <a href="/dashboard" className="group relative flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-50 text-[var(--color-primary)] transition-colors duration-200">
          {/* Active indicator */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--color-primary)] rounded-r-full"></div>
          
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-secondary)] transition-colors">
            <Monitor className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <span className={`text-sm font-semibold whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Desk Selection</span>
        </a>

        <a href="/dashboard" className="group flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--color-text-secondary)] hover:bg-slate-50 hover:text-[var(--color-primary)] transition-colors duration-200">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Dashboard</span>
        </a>
      </nav>
    </aside>
  );
};
