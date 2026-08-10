import React from 'react';
import { ScreenType } from '../hooks/useCommandEngine';

interface RibbonProps {
  activeScreen: ScreenType;
  setScreen: (screen: ScreenType) => void;
}

const SCREENS: ScreenType[] = ['HOME', 'DES', 'SRCH', 'ENTITY', 'SSI', 'TRADE', 'LIFE', 'SETTLE', 'SWIFT', 'BREAK', 'PORT', 'HELP'];

export default function Ribbon({ activeScreen, setScreen }: RibbonProps) {
  return (
    <div className="bb-ribbon">
      {SCREENS.map(screen => (
        <div 
          key={screen} 
          className="bb-ribbon-item"
          style={{ color: activeScreen === screen ? 'var(--bb-text-primary)' : 'var(--bb-text-tertiary)' }}
          onClick={() => setScreen(screen)}
        >
          {screen}
        </div>
      ))}
    </div>
  );
}
