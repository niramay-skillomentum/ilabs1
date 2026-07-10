import React from 'react';
import { Workstation } from '../workstationConfig';
import * as Icons from './Icons';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface WorkstationCardProps {
  workstation: Workstation;
  onHover: (id: string | null) => void;
  onSelect: (route: string) => void;
  isWide?: boolean;
}

export const WorkstationCard: React.FC<WorkstationCardProps> = ({ workstation, onHover, onSelect, isWide }) => {
  const IconComponent = (Icons as any)[workstation.icon] || Icons.Monitor;

  const colorMap: Record<string, { text: string, iconBg: string }> = {
    blue: { text: 'text-blue-600', iconBg: 'bg-blue-50' },
    purple: { text: 'text-purple-600', iconBg: 'bg-purple-50' },
    green: { text: 'text-green-600', iconBg: 'bg-green-50' },
    cyan: { text: 'text-cyan-600', iconBg: 'bg-cyan-50' },
    amber: { text: 'text-amber-600', iconBg: 'bg-amber-50' },
  };

  const colors = colorMap[workstation.accentColor] || colorMap.blue;

  return (
    <div className={isWide ? 'md:col-span-2' : ''}>
      <Card 
        accentColor={workstation.accentColor as any} 
        className="h-full flex flex-col cursor-pointer"
        onMouseEnter={() => onHover(workstation.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(workstation.navigationRoute)}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-xl ${colors.iconBg} ${colors.text} flex-shrink-0`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-card-title text-[var(--color-text-primary)] mb-1">{workstation.title}</h3>
            <p className="text-body text-[var(--color-text-secondary)] leading-relaxed">{workstation.description}</p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-y-6 gap-x-6 mb-8">
          <div className={isWide ? 'grid grid-cols-3 gap-6' : 'flex flex-col gap-6'}>
            <div className="flex flex-col gap-3">
              <h4 className={`text-caption uppercase tracking-wider ${colors.text}`}>Responsibilities</h4>
              <ul className="flex flex-col gap-2">
                {workstation.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span className={`mt-0.5 ${colors.text}`}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className={`text-caption uppercase tracking-wider ${colors.text}`}>What You Will Explore</h4>
              <ul className="flex flex-col gap-2">
                {workstation.exploreItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)]"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className={`text-caption uppercase tracking-wider ${colors.text}`}>Experience Includes</h4>
              <ul className="flex flex-col gap-2">
                {workstation.experienceItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)]"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <Button 
            variant="primary"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(workstation.navigationRoute);
            }}
          >
            {workstation.buttonLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
};
