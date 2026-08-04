import { TourStep } from '../types';

export const confirmationDeskTourSteps: TourStep[] = [
  {
    target: '.topbar',
    title: 'Confirmation Operations',
    content: 'Welcome to the Confirmation Desk. Your role is to reconcile internal trade bookings against external counterparty records before initiating settlement.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.session-timer',
    title: 'Session Timer',
    content: 'Watch the simulation clock closely. Counterparty communication introduces real-world latency as you await replies, so manage your simulation session time efficiently!',
    placement: 'bottom',
  },
  {
    target: '#tour-generate-queue',
    title: 'Pull Confirmation Queue',
    content: 'Click "Generate Queue" to pull in trades validated by the Middle Office that are now awaiting counterparty confirmation.',
    placement: 'bottom',
    spotlightClicks: true,
    skipBeacon: true,
  },
  {
    target: '.table-container thead',
    title: 'Trade Queue Overview',
    content: 'Select a trade row to view its economics and activate your operational desk actions below.',
    placement: 'bottom',
  },
  {
    target: '#tour-mailbox',
    title: '1. Check Your Mailbox First',
    content: 'Before taking any action, always check your Mailbox! Often, the counterparty has already sent an email regarding trade confirmation or reported an economic discrepancy that you need to review.',
    placement: 'bottom-end',
  },
  {
    target: '#tour-send-cpty',
    title: '2. Liaise with CPTY (Send to CPTY)',
    content: 'Use "Send to CPTY" to reply to counterparty inquiries or to initiate outreach if no email has arrived yet. This transitions the trade to LIASING_WITH_CPTY and cues an AI response.',
    placement: 'top',
  },
  {
    target: '#tour-confirm-trade',
    title: '3a. Happy Path: Confirm Trade',
    content: 'If the counterparty email confirms all economics match, click "Confirm Trade" to pass the trade downstream to Settlement Operations.',
    placement: 'top',
  },
  {
    target: '#tour-confirm-break',
    title: '3b. Discrepancies: Raise Break',
    content: 'If the counterparty reports a mismatch, click "Confirmation Break" to formally record the operational discrepancy.',
    placement: 'top',
  },
  {
    target: '#tour-escalate-fo',
    title: '4. Internal Escalation (Escalate to FO)',
    content: 'When an economic break requires internal investigation or booking amendments, use "Escalate to FO" to communicate directly with our internal Front Office traders.',
    placement: 'top',
  },
  {
    target: '#tour-audit',
    title: 'Immutable Audit Trail',
    content: 'Every email sent, break raised, and dispute resolved is logged here. Regulators inspect this trail to verify external agreements.',
    placement: 'top',
  },
  {
    target: '#tour-tutorial',
    title: 'AI Tutor Support',
    content: 'If an AI counterparty is arguing stubbornly or you need procedural advice, consult the Socratic AI Tutor for guiding hints without spoilers. Let\'s get started!',
    placement: 'left',
  },
];
