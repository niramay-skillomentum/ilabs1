import { TourStep } from '../types';

export const reconciliationDeskTourSteps: TourStep[] = [
  {
    target: '.topbar',
    title: '⚖️ Reconciliation Operations Desk',
    content: 'Welcome to Cash Reconciliation! Once trades are settled by operations, your responsibility is to reconcile internal bank books against external clearing bank statements to ensure zero cash variance.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.table-container thead',
    title: '1. Anatomy of the Reconciliation Queue',
    content: 'Your queue displays a live allocation of items—both internal Ledger records and incoming bank Statement wires. Each row spans 28 data columns containing internal trade references and raw SWIFT wire tags like Field 20, 56A, 72, and 70.',
    placement: 'bottom',
  },
  {
    target: '.table-container thead',
    title: '2. Accounting Color-Coding (Critical!)',
    content: 'Notice the distinct text coloring on every row based on its double-entry accounting type:\n• Black: Ledger Credit (LC)\n• Red: Statement Debit (SD)\n• Blue: Ledger Debit (LD)\n• Purple: Statement Credit (SC)\nRemember: You must pair opposite sides! Match Ledger Credit strictly with Statement Debit, or Ledger Debit with Statement Credit.',
    placement: 'bottom',
  },
  {
    target: '#tour-filter-bar',
    title: '3. Multi-Parameter Query & Filtering',
    content: 'With 28 columns of dense data, finding matching candidates visually can be overwhelming. Use the Filter Bar to segment by Status (Outstanding vs. Matched), Source (Ledger vs. Statement), Operations Region (APAC, EMEA, AMER), or narrow down by exact Currency, Date, and Amount ranges. Click "Execute Query" to filter.',
    placement: 'bottom',
  },
  {
    target: '#tour-match-tray',
    title: '4. The Action Menu (Match Tray)',
    content: 'To execute a match, click a row\'s checkbox to select exactly ONE Ledger item and ONE Statement item. Observe the live status chips in the tray ("Ledger: REC000001" and "Statement: REC000002"). Once both chips fill up, click "🔗 Match" to permanently link them under a shared Match ID!',
    placement: 'bottom',
  },
  {
    target: '#tour-gcms-btn',
    title: '5. Exception Handling & SWIFT Investigation (GCMS)',
    content: 'Frequently, bank statements arrive from external correspondent banks with missing or unassigned Trade References, preventing matching. To resolve these orphans, click "GCMS" to open the Global Cash Management System! Inside GCMS, inspect real-time MT103 and MT202 SWIFT wires to locate the true Transaction Reference (Field 20) and matching cash amounts.',
    placement: 'bottom-end',
  },
  {
    target: '#tour-apply-trade-btn',
    title: '6. Applying Trade IDs to Orphans',
    content: 'Once you discover the correct Trade Ref inside GCMS, switch back here, select the orphaned Statement row, and click "Apply Trade ID". Input the discovered Trade Ref in the popup to formally link the reference, making the pair ready for matching!',
    placement: 'bottom-end',
  },
  {
    target: '#tour-match-tray',
    title: '7. Auditing & Reversing Matches',
    content: 'If you select an already-matched item, click "👁 View Match" to open a side-by-side comparative inspector of the paired records. If you ever identify an erroneous pairing, select the matched item and click "🔓 Unmatch" to reverse the match and return both items to Outstanding status.',
    placement: 'bottom',
  },
  {
    target: '#tour-dashboard-btn',
    title: '8. Complete Reconciliation',
    content: 'Your shift goal is to clear every single Outstanding row in your queue until zero variance remains. Once all items transition to green Matched status, click "← Dashboard" to finalize operations!',
    placement: 'bottom-end',
  },
];
