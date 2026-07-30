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
    // Reconciliation Desk has its own dedicated page
    if (route === "RECONCILIATION") {
      router.push("/reconciliation-desk");
      return;
    }
    // Keep existing routing mechanism for other desks
    router.push(`/workstation?desk=${encodeURIComponent(route)}`);
  };

  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans overflow-hidden selection:bg-[var(--color-secondary)] selection:text-[var(--color-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-12">
            <WelcomePanel />
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-3/4 xl:w-4/5">
                <WorkstationGrid onHover={setHoveredStage} onSelect={handleSelect} />
              </div>
              <div className="w-full lg:w-1/4 xl:w-1/5 shrink-0 lg:sticky lg:top-8 self-start">
                <LifecycleTimeline hoveredStage={hoveredStage} />
              </div>
            </div>
          </div>
        </main>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
      `}} />
    </div>
  );
};
