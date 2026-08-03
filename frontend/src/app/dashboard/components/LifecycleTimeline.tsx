import React from 'react';
import { CheckCircle } from './Icons';
import { Card } from '../../../components/ui/Card';

interface LifecycleTimelineProps {
  hoveredStage: string | null;
}

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({ hoveredStage }) => {
  const stages = [
    { id: 'booking', label: 'Trade Booking', department: 'Front Office' },
    { id: 'mo', label: 'Trade Validation', department: 'Middle Office' },
    { id: 'confirmation', label: 'Confirmation', department: 'Back Office' },
    { id: 'settlement', label: 'Settlement', department: 'Back Office' },
    { id: 'tlm', label: 'Reconciliation Operations', department: 'Back Office' },
    { id: 'completed', label: 'Completed', department: '' },
  ];

  return (
    <Card className="mb-8 overflow-x-auto">
      <h3 className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider mb-8">Trade Lifecycle Workflow</h3>

      <div className="flex items-start justify-between min-w-[800px] px-4 pb-4">
        {stages.map((stage, index) => {
          const isHovered = hoveredStage === stage.id;
          const isCompleted = stage.id === 'completed';

          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center gap-4 relative z-10 w-28 group cursor-default pt-2">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isHovered
                    ? 'border-[var(--color-secondary)] bg-yellow-50 text-[var(--color-primary)] shadow-md scale-110'
                    : isCompleted
                      ? 'border-[var(--color-success)] bg-green-50 text-[var(--color-success)]'
                      : 'border-[var(--color-border)] bg-slate-50 text-[var(--color-text-muted)] group-hover:border-[var(--color-secondary)] group-hover:text-[var(--color-primary)]'
                  }
                `}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : <span className="text-base font-bold">{index + 1}</span>}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-sm font-medium text-center leading-tight transition-colors duration-300
                    ${isHovered ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'}
                  `}>
                    {stage.label}
                  </span>
                  {stage.department && (
                    <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-center">
                      {stage.department}
                    </span>
                  )}
                </div>
              </div>

              {index < stages.length - 1 && (
                <div className={`flex-1 h-0.5 relative top-8 mx-1 transition-colors duration-300 ${isHovered ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-border)]'}`}>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
};
