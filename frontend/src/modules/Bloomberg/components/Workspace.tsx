import React from 'react';
import { CommandState } from '../hooks/useCommandEngine';
import HomeScreen from '../screens/HomeScreen';
import SecurityDescriptionScreen from '../screens/SecurityDescriptionScreen';
import EntityProfileScreen from '../screens/EntityProfileScreen';
import TradeInquiryScreen from '../screens/TradeInquiryScreen';
import SettlementInstructionScreen from '../screens/SettlementInstructionScreen';
import ConfirmationMonitorScreen from '../screens/ConfirmationMonitorScreen';
import SwiftViewerScreen from '../screens/SwiftViewerScreen';
import SecuritySearchScreen from '../screens/SecuritySearchScreen';
import GlobalSearchScreen from '../screens/GlobalSearchScreen';
import RecentScreen from '../screens/RecentScreen';
import CounterpartyProfileScreen from '../screens/CounterpartyProfileScreen';
import BicDirectoryScreen from '../screens/BicDirectoryScreen';
import CutoffTimesScreen from '../screens/CutoffTimesScreen';
import HolidayCalendarScreen from '../screens/HolidayCalendarScreen';
import BreakMonitorScreen from '../screens/BreakMonitorScreen';
import WorkQueueScreen from '../screens/WorkQueueScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import SwiftFieldGuideScreen from '../screens/SwiftFieldGuideScreen';
import SystemAboutScreen from '../screens/SystemAboutScreen';
import PortfolioScreen from '../screens/PortfolioScreen';

interface WorkspaceProps {
  state: CommandState;
}

export default function Workspace({ state }: WorkspaceProps) {
  const renderScreen = () => {
    switch (state.screen) {
      case 'HOME':
        return <HomeScreen />;
      case 'DES':
        return <SecurityDescriptionScreen parameter={state.parameter} />;
      case 'ENTITY':
        return <EntityProfileScreen parameter={state.parameter} command={state.screen} />;
      case 'SRCH':
      case 'RELS':
      case 'FX':
      case 'PROD':
      case 'ISIN':
        return <SecuritySearchScreen parameter={state.parameter} command={state.screen} />;
      case 'CPTY':
      case 'AGENT':
        return <CounterpartyProfileScreen parameter={state.parameter} command={state.screen} />;
      case 'BIC':
        return <BicDirectoryScreen parameter={state.parameter} command={state.screen} />;
      case 'TRADE':
      case 'TRD':
      case 'LIFE':
      case 'HIST':
      case 'SETTLE':
      case 'MO':
        return <TradeInquiryScreen parameter={state.parameter} startTab={state.screen} />;
      case 'CONF':
        return <ConfirmationMonitorScreen parameter={state.parameter} />;
      case 'SSI':
        return <SettlementInstructionScreen parameter={state.parameter} command={state.screen} />;
      case 'SEARCH':
        return <GlobalSearchScreen parameter={state.parameter} />;
      case 'RECENT':
        return <RecentScreen parameter={state.parameter} />;
      case 'SWIFT':
      case 'MT103':
      case 'MT202':
      case 'MT202COV':
        return <SwiftViewerScreen parameter={state.parameter} command={state.screen} />;
      case 'CUT':
        return <CutoffTimesScreen parameter={state.parameter} command={state.screen} />;
      case 'HOL':
        return <HolidayCalendarScreen parameter={state.parameter} command={state.screen} />;
      case 'BREAK':
      case 'BRK':
        return <BreakMonitorScreen parameter={state.parameter} />;
      case 'QUEUE':
        return <WorkQueueScreen />;
      case 'PORT':
        return <PortfolioScreen />;
      case 'RECON':
        return <BreakMonitorScreen parameter={state.parameter} isRecon={true} />;
      case 'HELP':
        return <HelpCenterScreen parameter={state.parameter} />;
      case 'FIELDS':
      case 'FIELD':
        return <SwiftFieldGuideScreen parameter={state.parameter} />;
      case 'NEWS':
        return <SystemAboutScreen isNews={true} />;
      case 'ABOUT':
        return <SystemAboutScreen isNews={false} />;
      case 'UNKNOWN':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ color: 'var(--bb-alert)', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              Command Not Found
            </div>
            <p>The command <strong>'{state.parameter}'</strong> is not recognized by the terminal.</p>
            <p style={{ marginTop: '16px', color: 'var(--bb-text-secondary)' }}>Type <strong>HELP</strong> to view the operations manual and a list of valid commands.</p>
          </div>
        );
      default:
        return (
          <div style={{ padding: '24px' }}>
            <h2>{state.screen}</h2>
            <p>Parameter: {state.parameter || 'None'}</p>
            <p>This screen is under construction.</p>
          </div>
        );
    }
  };

  return (
    <div className="bb-workspace">
      {renderScreen()}
    </div>
  );
}
