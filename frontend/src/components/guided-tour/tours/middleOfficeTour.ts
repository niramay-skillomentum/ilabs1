import { TourStep } from '../types';

export const middleOfficeTourSteps: TourStep[] = [
  {
    target: '.topbar',
    title: 'Middle Office Desk',
    content: 'Welcome to the Middle Office. Your role is to perform operational validation on trades executed by the Front Office before they proceed to Confirmation.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.session-timer',
    title: 'Session Timer',
    content: 'Keep an eye on the simulation clock. Monitor your progress closely as you validate trades and investigate operational breaks within your allotted session time.',
    placement: 'bottom',
  },
  {
    target: '#tour-generate-queue',
    title: 'Pull Trades',
    content: 'Click "Generate Queue" to pull in new trades. (The tour will advance automatically once you click it).',
    placement: 'bottom',
    spotlightClicks: true,
    skipBeacon: true,
  },
  {
    target: '.table-container thead',
    title: 'Trade Queue',
    content: 'This queue contains trades awaiting your action. Select a row to inspect trade economics, value dates, and settlement instructions.',
    placement: 'bottom',
  },
  {
    target: '#tour-termsheet',
    title: 'View Termsheet',
    content: 'Click on View Termsheet to verify the underlying trade truth and thoroughly check all economic details before proceeding.',
    placement: 'bottom',
  },
  {
    target: '#tour-mo-validate',
    title: 'Validate Trade',
    content: 'If all trade details are accurate and complete, validate the trade to move it downstream.',
    placement: 'top',
  },
  {
    target: '#tour-mo-break',
    title: 'Raise Break',
    content: 'If mandatory information is missing or incorrect, raise an operational break immediately.',
    placement: 'top',
  },
  {
    target: '#tour-send-fo',
    title: 'Send to FO',
    content: 'After raising a break, escalate the issue to the Front Office via email for resolution.',
    placement: 'top',
  },
  {
    target: '#tour-audit',
    title: 'Immutable Audit Trail',
    content: 'Every action and automated system event is recorded here. Middle Office is responsible for maintaining a clear audit history.',
    placement: 'top',
  },
  {
    target: '#tour-mailbox',
    title: 'Communications',
    content: 'Check your mailbox for emails from the Front Office, counterparties, or system alerts regarding trade amendments.',
    placement: 'bottom-end',
  },
  {
    target: '#tour-tutorial',
    title: 'AI Tutor',
    content: 'Access the AI Tutor at any time to understand complex banking concepts or review desk instructions. You are now ready to begin!',
    placement: 'left',
  },
];
