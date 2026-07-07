import React from 'react';
import { WorkstationCard } from './WorkstationCard';
import { workstationConfig } from '../workstationConfig';

interface WorkstationGridProps {
  onHover: (id: string | null) => void;
  onSelect: (route: string) => void;
}

export const WorkstationGrid: React.FC<WorkstationGridProps> = ({ onHover, onSelect }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Select Your Workstation</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {workstationConfig.map((workstation) => {
          const isWide = workstation.id === 'reporting';
          return (
            <WorkstationCard 
              key={workstation.id}
              workstation={workstation}
              onHover={onHover}
              onSelect={onSelect}
              isWide={isWide}
            />
          );
        })}
      </div>
    </div>
  );
};
