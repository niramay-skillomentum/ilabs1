import React from 'react';

export const WelcomePanel = () => {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-6 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-2xl font-semibold text-white mb-1">
            Welcome Back, <span className="text-blue-400">Analyst</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium mb-4 uppercase tracking-wider">
            Operations Analyst • Post Trade Operations Division
          </p>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              Every trade executed by traders must pass through Operations before reaching settlement.
            </p>
            <p>
              Your responsibility is to validate, investigate, communicate and ensure trades successfully complete the post-trade lifecycle.
            </p>
          </div>
        </div>

        <div className="md:w-1/3 bg-[#1e293b]/50 border border-[#334155]/50 rounded p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Operational Brief</h3>
          <p className="text-sm text-slate-300">
            Process incoming block trades, resolve any SSI discrepancies with counterparties, and ensure T+1 settlement deadlines are met without exceptions.
          </p>
        </div>
      </div>
    </div>
  );
};
