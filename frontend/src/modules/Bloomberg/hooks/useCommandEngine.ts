import { useState, useCallback } from 'react';

export type ScreenType = 'HOME' | 'DES' | 'SRCH' | 'ENTITY' | 'SSI' | 'TRADE' | 'TRD' | 'TGEN' | 'LIFE' | 'SETTLE' | 'SWIFT' | 'BREAK' | 'BRK' | 'PORT' | 'HELP' | 'ISIN' | 'RELS' | 'CPTY' | 'BIC' | 'ACC' | 'AGENT' | 'CUT' | 'HOL' | 'FX' | 'PROD' | 'HIST' | 'FAIL' | 'CONF' | 'QUEUE' | 'MT103' | 'MT202' | 'MT202COV' | 'FIELDS' | 'FIELD' | 'SEARCH' | 'RECENT' | 'NEWS' | 'ABOUT';

export interface CommandState {
  screen: ScreenType;
  parameter: string | null;
}

export function useCommandEngine() {
  const [state, setState] = useState<CommandState>({ screen: 'HOME', parameter: null });

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
      case 'TGEN':
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
      case 'ACC':
      case 'AGENT':
      case 'CUT':
      case 'HOL':
      case 'FX':
      case 'PROD':
      case 'HIST':
      case 'FAIL':
      case 'CONF':
      case 'QUEUE':
      case 'MT103':
      case 'MT202':
      case 'MT202COV':
      case 'FIELDS':
      case 'SEARCH':
      case 'RECENT':
      case 'NEWS':
      case 'ABOUT':
        setState({ screen: commandBase as ScreenType, parameter });
        break;
      default:
        // Attempt to guess if it's just a ticker, etc., or show help
        // For now, if unrecognized, fallback to search
        setState({ screen: 'SRCH', parameter: cmd });
        break;
    }
  }, []);

  return { state, executeCommand, setScreen: setState };
}
