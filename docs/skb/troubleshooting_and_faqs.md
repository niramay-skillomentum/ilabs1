# Troubleshooting & FAQs

This document contains frequently asked questions about the simulator's mechanics, rules, and troubleshooting steps. The AI Assistant should use this to answer "Why" and "How" questions regarding simulator behavior.

## General Simulator Questions

**Q: Why can't I generate another desk queue?**
A: The simulator enforces a strict rule of "One active desk queue per user." You must finish processing your current active queue or current desk scenario before generating or moving to a new one.

**Q: How is my score calculated?**
A: Your score depends on four factors:
1. **Investigation Quality:** Identifying the exact field that caused the break.
2. **Communication:** Emailing the correct party with the correct template.
3. **Resolution Accuracy:** Amending the trade exactly as instructed.
4. **Time:** Processing the trade efficiently.

**Q: Why did my score go down?**
A: Scores decrease when you make "Bad Decisions." For example: 
- Clicking "Mark Validated" when the trade and ticket do not match.
- Amending a trade without Front Office approval.
- Escalating to the wrong party.
- Updating SSIs incorrectly during a Settlement Break.

**Q: Can a trade skip a desk?**
A: No. The simulator requires strict linearity. Every trade must follow the path: MO -> Confirmation -> Settlement.

**Q: Why is my queue empty?**
A: Either you have not generated any trades for this scenario, or all trades have successfully moved to the next desk. If you are in Confirmation and it is empty, ensure you have finished validating trades in the MO desk first.

---

## Middle Office (MO) Desk FAQs

**Q: What happens after I click "Raise Break"?**
A: The trade state changes to `MO Break`. You are now expected to investigate the discrepancy and click "Send Mail" to notify the Front Office (FO) about the issue.

**Q: What does "Mark Validated" do?**
A: It tells the simulator that you guarantee the Trade Details exactly match the Trade Ticket. If they do, the trade moves to `Confirmation Pending`. If they don't, you lose points, and the trade may be forced into an error state.

**Q: I sent an email to FO. Why haven't they responded?**
A: Check your simulated Mailbox. The FO responds automatically based on the scenario. If you selected the wrong email template or recipient, they might reply with confusion, or not at all. Ensure you use the correct escalation path.

**Q: What is the next step after FO approves an amendment?**
A: You must click "Amend Trade", apply the exact changes the FO instructed, save the changes, and then click "Mark Validated" to push the trade to the Confirmation Desk.

**Q: What if the FO says the Trade Ticket is wrong, not the Trade Details?**
A: Do not amend the trade. Simply accept the FO's clarification and click "Mark Validated" since the system details are correct as-is.

---

## Confirmation Desk FAQs

**Q: Why is my trade in Confirmation Break?**
A: When you clicked "Send Confirmation," the simulator compared your trade details with the counterparty's simulated truth. A mismatch was found (e.g., they booked a different price, quantity, or value date).

**Q: What should I do after receiving a Confirmation Break?**
A: You should click "Request Evidence" to get the counterparty's documentation. Once received, review it, and click "Escalate to FO" so the Front Office can decide if we need to amend our trade or if the counterparty is wrong.

**Q: What happens if I reject the counterparty claim (FO says we are correct)?**
A: If the FO tells you our booking is correct, do not amend the trade. You will communicate back to the counterparty (via the Mailbox) insisting they amend their side. Once they do (simulated), you can click "Reconfirm."

**Q: How do I resend a confirmation?**
A: Use the "Reconfirm" button. This is typically done after an amendment has been made or after the counterparty has corrected their side.

**Q: Why can't I access the Confirmation Desk?**
A: Confirmation starts only after MO completion. You must validate trades in the MO queue before they appear in the Confirmation queue.

---

## Settlement Desk FAQs

**Q: Why did my trade move to Settlement Break?**
A: A Settlement Break occurs if there is an issue executing the payment. In the simulator, this is usually caused by an SSI (Standard Settlement Instruction) mismatch or insufficient funds.

**Q: How do I resolve an SSI mismatch?**
A: Compare our SSIs with the Counterparty's SSIs in the workstation. Check the Mailbox/Audit log to see which is correct. If our Static Data is wrong, click "Update SSI" to fix it, then click "Retry Settlement".

**Q: Why is my trade still in Settlement Break after I clicked Retry?**
A: You likely did not resolve the root cause. For example, you may have updated the SSI with incorrect details, or you haven't received confirmation from the static data team that the change was approved. Review your Mailbox and Audit Timeline.

**Q: Why can't I approve settlement?**
A: The "Approve Settlement" button only becomes active when the trade is in the `Ready for Approval` state. If it is still in `Settlement Pending` or `Settlement Break`, you must resolve any issues and ensure the payment status shows as staged or matched.

**Q: How is Electronic Settlement simulated?**
A: Electronic Settlement is simulated via a matching utility dashboard. Instead of manual SSIs, you look at an Exception Queue. The simulator matches trades automatically unless a field is out of tolerance, in which case you must review the Exception Details and resolve it on the dashboard.

**Q: What happens if payment fails due to insufficient funds?**
A: This simulates a cash management break. You must navigate to the Mailbox, contact the Treasury or Cash Management team, and wait for them to fund the account before clicking "Retry Settlement".
