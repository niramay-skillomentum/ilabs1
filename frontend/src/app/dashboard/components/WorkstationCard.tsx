import React from 'react';
import { Workstation } from '../workstationConfig';
import * as Icons from './Icons';

interface WorkstationCardProps {
  workstation: Workstation;
  onHover: (id: string | null) => void;
  onSelect: (route: string) => void;
  isWide?: boolean;
}

export const WorkstationCard: React.FC<WorkstationCardProps> = ({ workstation, onHover, onSelect, isWide }) => {
  const IconComponent = (Icons as any)[workstation.icon] || Icons.Monitor;

  const colorMap: Record<string, { border: string, bgHover: string, text: string, buttonBg: string, buttonHover: string, iconBg: string }> = {
    blue: { border: 'group-hover:border-blue-500/50', bgHover: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]', text: 'text-blue-400', buttonBg: 'bg-blue-600', buttonHover: 'hover:bg-blue-500', iconBg: 'bg-blue-500/10' },
    purple: { border: 'group-hover:border-purple-500/50', bgHover: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]', text: 'text-purple-400', buttonBg: 'bg-purple-600', buttonHover: 'hover:bg-purple-500', iconBg: 'bg-purple-500/10' },
    green: { border: 'group-hover:border-green-500/50', bgHover: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]', text: 'text-green-400', buttonBg: 'bg-green-600', buttonHover: 'hover:bg-green-500', iconBg: 'bg-green-500/10' },
    cyan: { border: 'group-hover:border-cyan-500/50', bgHover: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]', text: 'text-cyan-400', buttonBg: 'bg-cyan-600', buttonHover: 'hover:bg-cyan-500', iconBg: 'bg-cyan-500/10' },
    amber: { border: 'group-hover:border-amber-500/50', bgHover: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]', text: 'text-amber-400', buttonBg: 'bg-amber-600', buttonHover: 'hover:bg-amber-500', iconBg: 'bg-amber-500/10' },
  };

  const colors = colorMap[workstation.accentColor] || colorMap.blue;

  return (
    <div 
      className={`group bg-[#0f172a] border border-[#1e293b] rounded-lg p-6 flex flex-col transition-all duration-150 ${colors.bgHover} ${colors.border} ${isWide ? 'md:col-span-2' : ''}`}
      onMouseEnter={() => onHover(workstation.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-md ${colors.iconBg} ${colors.text} flex-shrink-0`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white tracking-wide">{workstation.title}</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{workstation.description}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 gap-y-6 gap-x-6 mt-2 mb-6">
        <div className={isWide ? 'grid grid-cols-3 gap-6' : 'flex flex-col gap-6'}>
          <div className="flex flex-col gap-2">
            <h4 className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>Responsibilities</h4>
            <ul className="flex flex-col gap-1.5">
              {workstation.responsibilities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className={`mt-0.5 ${colors.text}`}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>What You Will Explore</h4>
            <ul className="flex flex-col gap-1.5">
              {workstation.exploreItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>Experience Includes</h4>
            <ul className="flex flex-col gap-1.5">
              {workstation.experienceItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onSelect(workstation.navigationRoute)}
        className={`w-full py-2.5 rounded text-sm font-medium text-white transition-colors duration-150 ${colors.buttonBg} ${colors.buttonHover}`}
      >
        {workstation.buttonLabel}
      </button>
    </div>
  );
};
