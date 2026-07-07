'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { WelcomePanel } from './WelcomePanel';
import { LifecycleTimeline } from './LifecycleTimeline';
import { WorkstationGrid } from './WorkstationGrid';
import { useRouter } from 'next/navigation';

export const DeskSelectionPage = () => {
  const router = useRouter();
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const handleSelect = (route: string) => {
    // Keep existing routing mechanism
    router.push(`/workstation?desk=${encodeURIComponent(route)}`);
  };

  return (
    <div className="flex h-screen bg-[#0b1120] text-slate-300 font-sans overflow-hidden selection:bg-blue-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto pb-12">
            <WelcomePanel />
            <LifecycleTimeline hoveredStage={hoveredStage} />
            <WorkstationGrid onHover={setHoveredStage} onSelect={handleSelect} />
          </div>
        </main>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0b1120;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}} />
    </div>
  );
};
