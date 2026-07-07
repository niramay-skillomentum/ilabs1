import React from 'react';
import { LayoutDashboard, Monitor } from './Icons';

export const Sidebar = () => {
  return (
    <aside className="w-[220px] h-full bg-[#0b1120] border-r border-[#1e293b] flex flex-col pt-6 flex-shrink-0">
      <div className="px-6 mb-8">
        <h1 className="text-white text-lg font-semibold tracking-wide">Niramay</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Operations</p>
      </div>

      <nav className="flex flex-col gap-2 px-4">
        <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#1e293b] text-white transition-colors duration-150">
          <Monitor className="w-4 h-4 text-slate-300" />
          <span className="text-sm font-medium">Desk Selection</span>
        </a>
        {/* We keep Dashboard as requested, though it might point to the same or a generic view */}
        <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:bg-[#1e293b]/50 hover:text-white transition-colors duration-150">
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </a>
      </nav>
    </aside>
  );
};
