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
    { id: 'reporting', label: 'Performance and Reporting', department: 'Management' },
    { id: 'completed', label: 'Completed', department: '' },
  ];

  return (
    <Card className="mb-8">
      <h3 className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Trade Lifecycle Workflow</h3>

      <div className="flex flex-col px-4 pb-4">
        {stages.map((stage, index) => {
          const isHovered = hoveredStage === stage.id;
          const isCompleted = stage.id === 'completed';

          return (
            <div key={stage.id} className="flex flex-row items-start gap-4 group cursor-default">
              <div className="flex flex-col items-center">
                <div className={`
                  w-9 h-9 shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isHovered
                    ? 'border-[var(--color-secondary)] bg-yellow-50 text-[var(--color-primary)] shadow-md scale-110'
                    : isCompleted
                      ? 'border-[var(--color-success)] bg-green-50 text-[var(--color-success)]'
                      : 'border-[var(--color-border)] bg-slate-50 text-[var(--color-text-muted)] group-hover:border-[var(--color-secondary)] group-hover:text-[var(--color-primary)]'
                  }
                `}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                </div>
                {index < stages.length - 1 && (
                  <div className={`w-0.5 h-6 my-1 transition-colors duration-300 ${isHovered ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-border)]'}`}>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col justify-center pt-1">
                <span className={`text-sm font-medium leading-tight transition-colors duration-300
                  ${isHovered ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'}
                `}>
                  {stage.label}
                </span>
                {stage.department && (
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">
                    {stage.department}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
