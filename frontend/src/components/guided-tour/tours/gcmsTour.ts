import { TourStep } from '../types';

export const gcmsTourSteps: TourStep[] = [
  {
    target: '.gcms-header',
    title: '📡 Global Cash Management System (GCMS)',
    content: 'Welcome to Skillomentum GCMS! This institutional portal provides real-time access to incoming and outgoing SWIFT financial wire traffic across international clearing networks.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.gcms-sidebar-footer',
    title: '1. Network & Crypto Status',
    content: 'Monitor real-time infrastructure integrity: verify that the SWIFT network is operational, HSM crypto encryption keys are active, and message queues (MQ) are bound.',
    placement: 'top-start',
  },
  {
    target: '#tour-gcms-filters',
    title: '2. Multi-Parameter SWIFT Search',
    content: 'Locate orphan wires or specific settlement transactions by filtering on Currency, Sender/Receiver BICs (Bank Identifier Codes), Account Numbers, Value Dates, and exact Cash Amounts. Click "EXECUTE QUERY" to search.',
    placement: 'bottom',
  },
  {
    target: '.data-table thead, #tour-gcms-ledger',
    title: '3. Message Ledger & Status Badges',
    content: 'The ledger lists matched SWIFT traffic with industry standard processing badges:\n• ACSP: Accepted Settlement In-Process\n• PDNG: Pending Clearing / Validation\n• RJCT: Rejected Wire\nClick on any row to select a transaction!',
    placement: 'bottom',
  },
  {
    target: '.data-table thead, #tour-gcms-ledger',
    title: '4. Opening the SWIFT Payee Inspector',
    content: 'When a message row is selected, an "Open" action button appears in the far-right column. Click "Open" to launch the detailed SWIFT Payee Inspector panel!',
    placement: 'bottom',
  },
  {
    target: '.data-table thead, #tour-gcms-ledger',
    title: '5. Decoding Raw SWIFT Tags',
    content: 'The Inspector reveals the raw, authenticated SWIFT payload (MT103 / MT202) with highlighted field tags:\n• Field 20: Transaction Reference (contains the internal Trade Ref!)\n• Field 50K / 59: Ordering & Beneficiary Customers\n• Field 56A / 57A: Intermediary and Account With Institutions\nUse Field 20 to discover missing Trade IDs for your Reconciliation Desk!',
    placement: 'bottom',
  },
  {
    target: '#tour-gcms-back-btn',
    title: '6. Return to Operations Desk',
    content: 'Once you have extracted the required SWIFT references or validated wire clearing status, click here to return to your Operations Desk!',
    placement: 'bottom-start',
  },
];
