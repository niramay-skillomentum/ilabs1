import { TourStep } from '../types';

export const stccTourSteps: TourStep[] = [
  {
    target: '.stcc-header',
    title: '🌐 STCC Electronic Settlement',
    content: 'Welcome to the Securities & Trade Clearing Corporation (STCC) platform! This institutional network processes straight-through electronic settlement instructions generated from your Settlement Desk queue.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.stcc-status-filters',
    title: '1. Status Segment Filters',
    content: 'Monitor your queue counts across three operational states:\n• MATCHED: Instructions match counterparty records and are ready for immediate settlement.\n• UNMATCHED: Economic discrepancies detected between our system and counterparty records.\n• PENDING: Amended instructions awaiting automated verification bot review.',
    placement: 'bottom',
  },
  {
    target: '.stcc-search-filters',
    title: '2. Precision Search & Filtering',
    content: 'Filter instructions by Trade Ref, Trade/Value Date, Counterparty, Currency, or Direction to quickly locate specific operational breaks or candidate trades.',
    placement: 'bottom',
  },
  {
    target: '.stcc-table thead, .stcc-table-container',
    title: '3. Instruction Queue & Bilateral Constraints',
    content: 'Select a trade row to activate operational controls. Note: If a trade has a Bilateral settlement mode, action buttons here will be disabled! Bilateral trades must be manually verified via SWIFT and email in the main Workstation.',
    placement: 'bottom',
  },
  {
    target: '#tour-stcc-settle',
    title: '4a. Happy Path: Settle Matched Trades',
    content: 'When an electronic instruction is in MATCHED status, select it and click "⬆ Settle" to instantly execute electronic settlement across clearing accounts!',
    placement: 'bottom-start',
  },
  {
    target: '#tour-stcc-edit',
    title: '4b. Exception Path: Edit & Compare',
    content: 'When an instruction is in UNMATCHED status, select it and click "✎ Edit / Compare" to open the Side-by-Side Comparative Inspector.',
    placement: 'bottom',
  },
  {
    target: '#tour-stcc-edit',
    title: '5. Side-by-Side Comparison & Verification Bot',
    content: 'In the Comparison modal, compare our System Side against the read-only Counterparty Truth. Mismatched fields are highlighted in red! Correct our system inputs to match the counterparty truth and click "Save & Exit". Your trade will move to PENDING until an automated Verification Bot reviews and flips it to MATCHED!',
    placement: 'bottom',
  },
  {
    target: '.stcc-back-btn',
    title: '6. Return to Workstation',
    content: 'Once you settle all matched electronic instructions and resolve unmatched breaks, click here to return to your main Settlement Workstation!',
    placement: 'bottom-end',
  },
];
