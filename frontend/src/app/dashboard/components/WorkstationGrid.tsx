import React from 'react';
import { WorkstationCard } from './WorkstationCard';
import { workstationConfig } from '../workstationConfig';
import { SectionHeader } from '../../../components/ui/SectionHeader';

interface WorkstationGridProps {
  onHover: (id: string | null) => void;
  onSelect: (route: string) => void;
}

export const WorkstationGrid: React.FC<WorkstationGridProps> = ({ onHover, onSelect }) => {
  return (
    <div className="mt-12">
      <SectionHeader title="Select Your Workstation" />
      <div className="flex flex-col gap-8 max-w-5xl mx-auto mt-6">
        {workstationConfig.map((workstation) => {
          return (
            <WorkstationCard 
              key={workstation.id}
              workstation={workstation}
              onHover={onHover}
              onSelect={onSelect}
              isWide={true}
            />
          );
        })}
      </div>
    </div>
  );
};
