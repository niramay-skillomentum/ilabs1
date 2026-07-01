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
        { title: "Verify SSI", desc: "Check the Standard Settlement Instructions using the 'SSI Database'. Ensure the Beneficiary details and methods match." },
        { title: "Select Type", desc: "Click 'Select Settlement Type' to categorize as Bilateral or Electronic." },
        { title: "Final Approval", desc: "If correct, 'Approve Settlement'. If the SSIs are incorrect, raise a 'Setts Break' and 'Follow-up' with the Counterparty." }
      ],
      tips: "Pay special attention to the Currency and Settlement Method. A wrong SSI leads to failed payments."
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
