import { TourStep } from '../types';

export const settlementDeskTourSteps: TourStep[] = [
  {
    target: '.topbar',
    title: 'Settlement Operations',
    content: 'Welcome to the Settlement Desk. By this stage, all core trade economics are assumed correct. Your role is strictly to reconcile Standard Settlement Instructions (SSIs) and authorize final cash and security transfers.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.session-timer',
    title: '⏰ Currency Cut-offs (Critical!)',
    content: 'Unlike upstream desks, Settlement is governed by strict Currency Cut-off Times (e.g., JPY, EUR, USD deadlines). Watch the simulation clock! If a cut-off passes, action buttons disable, and unapproved trades freeze into a Missed Value Date break until the next simulated day.',
    placement: 'bottom',
  },
  {
    target: '#tour-generate-queue',
    title: 'Pull Settlement Queue',
    content: 'Click "Generate Queue" to load trades awaiting settlement execution.',
    placement: 'bottom',
    spotlightClicks: true,
    skipBeacon: true,
  },
  {
    target: '#tour-stcc-btn',
    title: 'Electronic vs. Bilateral Trades',
    content: 'Check the "Settlement Mode" column in your queue. If a trade is Electronic, regular desktop action buttons are disabled! You must open the STCC Electronic Settlement ↗ platform to execute electronic workflows.',
    placement: 'bottom',
  },
  {
    target: '#tour-mailbox',
    title: '1. Check Mailbox First (Proactive Emails)',
    content: 'For manual Bilateral trades, always open your Mailbox first before clicking action buttons! Counterparties frequently send proactive settlement emails the moment a trade lands in your queue.',
    placement: 'bottom-end',
  },
  {
    target: '#tour-view-ssi-col',
    title: '2a. SELL Direction (Receiving Funds)',
    content: 'When direction is SELL, the counterparty proactively emails stating the bank details they plan to wire money to. Click "View SSI" on the trade row to load our bank\'s authentic Entity SSI, and verify whether the details in their email are correct!',
    placement: 'bottom',
  },
  {
    target: '#tour-settlement-approve',
    title: '2b. Acknowledge or Send SSI (SELL Trades)',
    content: 'If the counterparty\'s email matches our Entity SSI, reply in the Mailbox confirming agreement ("Please proceed"), which enables Approve Settlement. If their email contains incorrect routing, use the Send SSI form in the Mailbox to supply our correct bank instructions!',
    placement: 'top',
  },
  {
    target: '#tour-mail-cpty',
    title: '3a. BUY Direction (Outgoing Inquiry)',
    content: 'When direction is BUY (paying funds), if no incoming instructions exist in your Mailbox, select the trade row and click "Mail CPTY" to formally request their settlement instructions (LIASING_WITH_CPTY).',
    placement: 'top',
  },
  {
    target: '#tour-ssi-db-btn',
    title: '3b. Verify BUY Details (Codes vs. Raw Email)',
    content: 'When CPTY sends BUY instructions, notice they reply in one of two ways:\n• Reference Codes: If they give an Alert Code and Acronym Code, open the SSI Database ↗ and input BOTH codes to retrieve verified routing.\n• Raw Email SSI: Frequently, they don\'t send codes at all and instead state raw bank routing directly in the email text! Verify either source against our booked View SSI.',
    placement: 'bottom',
  },
  {
    target: '#tour-settlement-approve',
    title: '4a. Happy Path: Approve Settlement',
    content: 'Once SSI routing is matched and confirmed across either SELL or BUY flows, click "Approve Settlement". An automated verification bot will settle the trade and unlock the official View SWIFT ↗ financial confirmation receipt.',
    placement: 'top',
  },
  {
    target: '#tour-settlement-break',
    title: '4b. Discrepancies: Setts Break & Amendment',
    content: 'If booked SSI details are incorrect on a BUY trade, click "Setts Break". To amend it, open View SSI, choose the correct SSI ID from the dropdown, and submit an amendment request. When corrected by the backend, a confirmation notice arrives in the System Mailbox ↗ (AMENDED), allowing you to approve!',
    placement: 'top',
  },
  {
    target: '#tour-tutorial',
    title: 'Audit & AI Tutor Support',
    content: 'Every email exchange, SSI lookup, code verification, and amendment is immutably stamped in the Audit Trail. If you ever get stuck on matching rules or cut-off timers, consult the Socratic AI Tutor for hints!',
    placement: 'left',
  },
];
