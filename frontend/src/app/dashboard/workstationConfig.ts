export interface Workstation {
  id: string;
  title: string;
  description: string;
  icon: string; // We'll pass SVG paths or an identifier
  accentColor: string; // Tailwind color class modifier (e.g. 'blue', 'purple')
  responsibilities: string[];
  exploreItems: string[];
  experienceItems: string[];
  buttonLabel: string;
  navigationRoute: string;
}

export const workstationConfig: Workstation[] = [
  {
    id: "mo",
    title: "Middle Office Operations",
    description: "Validate newly booked trades and ensure operational accuracy before confirmation begins.",
    icon: "ShieldCheck",
    accentColor: "blue",
    responsibilities: [
      "Validate trade economics",
      "Investigate booking discrepancies",
      "Review trade details",
      "Resolve operational breaks",
      "Coordinate with Front Office",
      "Prepare trades for confirmation"
    ],
    exploreItems: [
      "Trade Queue",
      "Trade Details",
      "Break Investigation",
      "Front Office Communication",
      "Audit Timeline"
    ],
    experienceItems: [
      "Trade Validation",
      "Trade Investigation",
      "Front Office Communication",
      "Trade Amendment",
      "Break Resolution",
      "Audit Logging"
    ],
    buttonLabel: "Enter Middle Office",
    navigationRoute: "MO" // Handled by goDesk function as ?desk=MO
  },
  {
    id: "confirmation",
    title: "Confirmation Operations",
    description: "Ensure both counterparties agree on every trade before settlement.",
    icon: "FileSignature",
    accentColor: "purple",
    responsibilities: [
      "Review confirmations",
      "Compare trade economics",
      "Resolve confirmation breaks",
      "Counterparty communication",
      "Approve confirmed trades"
    ],
    exploreItems: [
      "Confirmation Queue",
      "Trade Comparison",
      "Counterparty Messages",
      "Communication Center",
      "Audit Timeline"
    ],
    experienceItems: [
      "Confirmation Matching",
      "Counterparty Communication",
      "Break Resolution",
      "Trade Investigation",
      "Audit Tracking"
    ],
    buttonLabel: "Enter Confirmation Desk",
    navigationRoute: "CONFIRMATION"
  },
  {
    id: "settlement",
    title: "Settlement Operations",
    description: "Ensure securities and cash settle successfully on value date.",
    icon: "Briefcase",
    accentColor: "green",
    responsibilities: [
      "Review settlement instructions",
      "Validate SSI",
      "Validate Cash Instructions",
      "Monitor settlements",
      "Resolve settlement exceptions",
      "Complete settlements"
    ],
    exploreItems: [
      "Settlement Queue",
      "SSI Database",
      "Cash Instructions",
      "Settlement Monitor",
      "Exception Queue"
    ],
    experienceItems: [
      "Settlement Processing",
      "SSI Validation",
      "Cash Movement",
      "Settlement Resolution",
      "Lifecycle Completion"
    ],
    buttonLabel: "Enter Settlement Desk",
    navigationRoute: "SETTLEMENT"
  },
  {
    id: "tlm",
    title: "Reconciliation Desk",
    description: "Match ledger entries against SWIFT statements to ensure every trade is accounted for across all settlement channels.",
    icon: "Network",
    accentColor: "cyan",
    responsibilities: [
      "View ledger reconciliation items",
      "View statement reconciliation items",
      "Run configurable matching engine",
      "Investigate outstanding breaks",
      "Review matched pairs",
      "Monitor reconciliation by desk"
    ],
    exploreItems: [
      "Ledger Items",
      "Statement Items",
      "Matching Engine",
      "Outstanding Breaks",
      "Match Pairs",
      "Recon Configuration"
    ],
    experienceItems: [
      "Ledger vs Statement Matching",
      "Break Investigation",
      "Configurable Matching Rules",
      "Cross-Desk Reconciliation",
      "Enterprise Cash Recon"
    ],
    buttonLabel: "Open Reconciliation Desk",
    navigationRoute: "RECONCILIATION"
  },
  {
    id: "reporting",
    title: "Performance & Reporting",
    description: "Review completed simulations and understand every operational decision through detailed analytics and AI-generated feedback.",
    icon: "LineChart",
    accentColor: "amber",
    responsibilities: [
      "Review completed sessions",
      "Analyze investigations",
      "Read AI feedback",
      "Review trade logs",
      "Compare historical sessions",
      "Track improvement"
    ],
    exploreItems: [
      "Simulation Reports",
      "Trade Logs",
      "Decision Timeline",
      "AI Feedback",
      "Operational Summary",
      "Performance History"
    ],
    experienceItems: [
      "Performance Review",
      "Operational Analytics",
      "Learning Insights",
      "Decision Analysis",
      "Historical Comparison"
    ],
    buttonLabel: "Open Reports",
    navigationRoute: "REPORTING"
  }
];
