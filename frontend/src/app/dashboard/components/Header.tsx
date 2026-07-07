import React from 'react';
import { Bell, UserIcon } from './Icons';

export const Header = () => {
  return (
    <header className="h-[60px] bg-[#0b1120] border-b border-[#1e293b] flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-6">
        <h2 className="text-white font-medium text-sm tracking-wide">Investment Banking Operations Simulator</h2>
        <div className="h-4 w-[1px] bg-[#1e293b]"></div>
        
        <div className="flex flex-row items-center gap-5 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Business Date</span>
            <span className="text-slate-300">T+0 (Today)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Simulation Time</span>
            <span className="text-slate-300">09:00 AM EST</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Market Status</span>
            <span className="text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              OPEN
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Settlement Cycle</span>
            <span className="text-slate-300">T+1</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Environment</span>
            <span className="text-amber-400 font-medium">SIMULATION</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="h-6 w-[1px] bg-[#1e293b]"></div>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserIcon className="w-4 h-4" />
          </div>
        </button>
      </div>
    </header>
  );
};
