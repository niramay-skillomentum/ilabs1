import React from 'react';
import { CheckCircle } from './Icons';

interface LifecycleTimelineProps {
  hoveredStage: string | null;
}

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({ hoveredStage }) => {
  const stages = [
    { id: 'booking', label: 'Trade Booking' },
    { id: 'mo', label: 'Middle Office' },
    { id: 'confirmation', label: 'Confirmation' },
    { id: 'settlement', label: 'Settlement' },
    { id: 'tlm', label: 'Trade Lifecycle Manager' },
    { id: 'recon', label: 'Reconciliation' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-6 shadow-sm mb-8 overflow-x-auto">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Trade Lifecycle Workflow</h3>
      
      <div className="flex items-center justify-between min-w-[800px]">
        {stages.map((stage, index) => {
          const isHovered = hoveredStage === stage.id;
          const isCompleted = stage.id === 'completed';
          
          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center gap-3 relative z-10 w-24">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-150
                  ${isHovered 
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                    : isCompleted
                      ? 'border-green-500/50 bg-green-500/10 text-green-500'
                      : 'border-[#334155] bg-[#1e293b] text-slate-400'
                  }
                `}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-semibold">{index + 1}</span>}
                </div>
                <span className={`text-xs font-medium text-center leading-tight transition-colors duration-150
                  ${isHovered ? 'text-blue-400' : 'text-slate-400'}
                `}>
                  {stage.label}
                </span>
              </div>
              
              {index < stages.length - 1 && (
                <div className="flex-1 h-[2px] bg-[#334155] relative -top-4 mx-2">
                  {/* Highlight the connection if hovered? (Optional) */}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
