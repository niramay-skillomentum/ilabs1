export const getDeskInstructions = (desk) => {
  const instructions = {
    MO: {
      title: "Middle Office (MO) Workflow",
      steps: [
        { title: "Review Details", desc: "Compare the system trade details against the original Termsheet (📄 View Termsheet)." },
        { title: "Validate Trade", desc: "If all details match perfectly, click 'MO Validate' to pass the trade downstream." },
        { title: "Raise Break", desc: "If there is any discrepancy, click 'MO Raise Break'. Then, use 'Send to FO' to email the Front Office for clarification." }
      ],
      tips: "Always check the direction (Buy/Sell) and Amount carefully. Mistakes here propagate to all other desks."
    },
    CONFIRMATION: {
      title: "Confirmation Desk Workflow",
      steps: [
        { title: "Compare Bookings", desc: "Ensure our internal booking matches the Counterparty's expectations (check emails via 📧 Mailbox)." },
        { title: "Confirm Trade", desc: "If both sides agree on the economics, click 'Confirm Trade'." },
        { title: "Handle Discrepancies", desc: "If they disagree, click 'Confirmation Break'. Reach out to the Counterparty ('Send to CPTY'). If disputed, 'Escalate to FO'." }
      ],
      tips: "Counterparties might take some time to reply. Keep refreshing your queue to see incoming responses."
    },
    SETTLEMENT: {
      title: "Settlement Desk Workflow",
      steps: [
        { title: "1. Mail CPTY", desc: "Select a trade in SETTLEMENT_PENDING and click 'Mail CPTY' to request settlement reference codes from the Counterparty." },
        { title: "2. Receive Codes", desc: "The Counterparty will reply with an Alert Code (6-char alphanumeric) and an Acronym Code (6-digit numeric). Check your 📧 Mailbox." },
        { title: "3. Search SSI Database", desc: "Open the 'SSI Database' and enter BOTH codes to retrieve the standard settlement instructions." },
        { title: "4. Compare SSI", desc: "Compare the SSI Database results against the trade's SSI (use 'View SSI' button on the trade row)." },
        { title: "5a. Match → Approve", desc: "If all fields match, click 'Approve Settlement'. The system bot will verify and settle the trade automatically." },
        { title: "5b. Mismatch → Break", desc: "If there are discrepancies, click 'Setts Break'. Then open 'View SSI' and click 'Send to System for Amendment'. The system will correct the trade and notify you." },
        { title: "6. Post-Amendment", desc: "After amendment, the trade becomes AMENDED. Click 'Approve Settlement' to send for verification again." }
      ],
      tips: "Always search the SSI Database using BOTH codes from the Counterparty. Pay close attention to Beneficiary Name, BIC, Account Number, and Settlement Method."
    },
    TLM: {
      title: "TLM Desk Workflow",
      steps: [
        { title: "Reconciliation", desc: "Reconcile expected cash flows against actual Nostro account movements." }
      ],
      tips: "More instructions will be added as this module evolves."
    },
    REPORTING: {
      title: "Reporting Desk Workflow",
      steps: [
        { title: "Regulatory Check", desc: "Ensure trades are reported to the relevant regulatory bodies within T+1." }
      ],
      tips: "More instructions will be added as this module evolves."
    }
  };

  return instructions[desk] || {
    title: `${desk} Workflow`,
    steps: [{ title: "General", desc: "Process the trades for your current desk." }],
    tips: "Follow standard operational procedures."
  };
};
