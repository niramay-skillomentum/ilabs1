import { useState, useCallback } from 'react';

export type ScreenType = 'HOME' | 'DES' | 'SRCH' | 'ENTITY' | 'SSI' | 'TRADE' | 'TRD' | 'LIFE' | 'SETTLE' | 'SWIFT' | 'BREAK' | 'BRK' | 'PORT' | 'HELP' | 'ISIN' | 'RELS' | 'CPTY' | 'BIC' | 'AGENT' | 'CUT' | 'HOL' | 'FX' | 'PROD' | 'HIST' | 'CONF' | 'QUEUE' | 'MT103' | 'MT202' | 'MT202COV' | 'FIELDS' | 'FIELD' | 'SEARCH' | 'RECENT' | 'NEWS' | 'ABOUT' | 'MO' | 'RECON' | 'UNKNOWN';

export interface CommandState {
  screen: ScreenType;
  parameter: string | null;
}

export function useCommandEngine() {
  const [histState, setHistState] = useState({
    history: [{ screen: 'HOME', parameter: null } as CommandState],
    index: 0
  });

  const state = histState.history[histState.index];

  const updateState = useCallback((newState: CommandState) => {
    setHistState(prev => {
      const newHistory = prev.history.slice(0, prev.index + 1);
      newHistory.push(newState);
      return { history: newHistory, index: newHistory.length - 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setHistState(prev => ({ ...prev, index: Math.max(0, prev.index - 1) }));
  }, []);

  const goForward = useCallback(() => {
    setHistState(prev => ({ ...prev, index: Math.min(prev.history.length - 1, prev.index + 1) }));
  }, []);

  const canGoBack = histState.index > 0;
  const canGoForward = histState.index < histState.history.length - 1;

  const executeCommand = useCallback((cmdRaw: string) => {
    const cmd = cmdRaw.trim().toUpperCase();
    if (!cmd) return;

    const parts = cmd.split(' ');
    const commandBase = parts[0];
    const parameterRaw = parts.slice(1).join(' ');
    const parameter = parameterRaw ? parameterRaw.replace(/[\[\]]/g, '') : null;

    switch (commandBase) {
      case 'HOME':
      case 'DES':
      case 'SRCH':
      case 'ENTITY':
      case 'SSI':
      case 'TRADE':
      case 'TRD':
      case 'LIFE':
      case 'SETTLE':
      case 'SWIFT':
      case 'BREAK':
      case 'BRK':
      case 'PORT':
      case 'HELP':
      case 'ISIN':
      case 'RELS':
      case 'CPTY':
      case 'BIC':
      case 'AGENT':
      case 'CUT':
      case 'HOL':
      case 'FX':
      case 'PROD':
      case 'HIST':
      case 'CONF':
      case 'QUEUE':
      case 'MO':
      case 'RECON':
      case 'MT103':
      case 'MT202':
      case 'MT202COV':
      case 'FIELDS':
      case 'FIELD':
      case 'SEARCH':
      case 'RECENT':
      case 'NEWS':
      case 'ABOUT':
        updateState({ screen: commandBase as ScreenType, parameter });
        break;
      default:
        updateState({ screen: 'UNKNOWN', parameter: commandBase });
        break;
    }
  }, [updateState]);

  return { state, executeCommand, setScreen: updateState, goBack, goForward, canGoBack, canGoForward };
}
