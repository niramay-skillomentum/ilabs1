import { Step } from "react-joyride";

export interface TourStep extends Step {
  title?: string | React.ReactNode;
  spotlightClicks?: boolean;
}

export interface GuidedTourContextType {
  startTour: (tourId: string, steps: TourStep[]) => void;
  stopTour: () => void;
  resetTour: () => void;
  nextStep: () => void;
  isActive: boolean;
}
