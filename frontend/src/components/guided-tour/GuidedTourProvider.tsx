"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { EventData, STATUS, useJoyride } from 'react-joyride';
import { GuidedTourContextType, TourStep } from './types';
import { TourTooltip } from './TourTooltip';

const GuidedTourContext = createContext<GuidedTourContextType | undefined>(undefined);

export const GuidedTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);

  const controlsRef = React.useRef<any>(null);

  const startTour = useCallback((tourId: string, tourSteps: TourStep[]) => {
    setSteps(tourSteps);
    setActiveTourId(tourId);
    setRun(true);
    setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.start(0);
      }
    }, 10);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(`guidedTour.middleOffice.completed`);
  }, []);

  const handleJoyrideCallback = useCallback((data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (activeTourId) {
        localStorage.setItem(`guidedTour.${activeTourId}.completed`, 'true');
        setActiveTourId(null);
      }
    }
  }, [activeTourId]);

  const { Tour, controls } = useJoyride({
    steps,
    run,
    onEvent: handleJoyrideCallback,
    continuous: true,
    scrollToFirstStep: true,
    tooltipComponent: TourTooltip,
    options: {
      buttons: ['back', 'close', 'primary', 'skip'], // equivalent to showSkipButton={true}
      showProgress: false,
      overlayClickAction: false, // Prevent interaction with unrelated UI
      zIndex: 10000,
      primaryColor: '#3b82f6', // matches our button color
    },
    styles: {
      overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker, clear overlay (no blur)
      },
      spotlight: {
        // Very clear, sharp cut-out
      }
    }
  });

  React.useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const nextStep = useCallback(() => {
    controls.next();
  }, [controls]);

  return (
    <GuidedTourContext.Provider value={{ startTour, stopTour, resetTour, nextStep, isActive: run }}>
      {children}
      {Tour}
    </GuidedTourContext.Provider>
  );
};

export const useGuidedTour = (): GuidedTourContextType => {
  const context = useContext(GuidedTourContext);
  if (context === undefined) {
    throw new Error('useGuidedTour must be used within a GuidedTourProvider');
  }
  return context;
};
