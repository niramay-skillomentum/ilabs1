import React from 'react';
import { Bell, UserIcon } from './Icons';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export const Header = () => {
  return (
    <header className="h-[72px] sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--color-border)] flex items-center justify-between px-8 flex-shrink-0 transition-all duration-300">
      <div className="flex items-center gap-8">
        {/* Logo area */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white font-bold text-lg leading-none">N</span>
          </div>
          <h2 className="text-[var(--color-primary)] font-bold text-lg tracking-tight hidden md:block">Skillomentum</h2>
        </div>
        
        <div className="h-6 w-[1px] bg-[var(--color-border)] hidden md:block"></div>
        
        {/* Navigation / Info */}
        <div className="hidden lg:flex flex-row items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">Business Date</span>
            <span className="text-[var(--color-text-primary)] font-medium">T+0 (Today)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">Simulation Time</span>
            <span className="text-[var(--color-text-primary)] font-medium">09:00 AM EST</span>
          </div>
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">Market Status</span>
            <Badge variant="active" className="text-[10px] px-2 py-0.5 min-h-[20px]">OPEN</Badge>
          </div>
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">Environment</span>
            <Badge variant="pending" className="text-[10px] px-2 py-0.5 min-h-[20px]">SIMULATION</Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-[var(--color-text-secondary)]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-danger)] border border-white"></span>
        </Button>
        <div className="h-6 w-[1px] bg-[var(--color-border)]"></div>
        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-slate-50">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] shadow-sm">
            <UserIcon className="w-5 h-5" />
          </div>
        </button>
      </div>
    </header>
  );
};
