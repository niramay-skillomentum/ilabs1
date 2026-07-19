// ======================================
// FO OFFLINE RESPONSES
// 200+ Templates for Front Office Replies
// Organized by Category -> Personality -> Variations
// ======================================

module.exports = {
  GREETING: {
    COOPERATIVE: [
      "Hi there! Thanks for reaching out about Trade {{tradeRef}}. Happy to help — what would you like us to look into?",
      "Hello! Let us know what you need regarding this trade and we'll get right on it.",
      "Hi! I see you're checking on Trade {{tradeRef}}. How can I assist?",
      "Greetings! We have Trade {{tradeRef}} up on our screen. What's the query?"
    ],
    EFFICIENT: [
      "Hi. What do you need on {{tradeRef}}?",
      "Hello. Please specify the issue with Trade {{tradeRef}}.",
      "Hi team, how can we assist with {{tradeRef}}?",
      "Checking {{tradeRef}}. What is the discrepancy?"
    ],
    FORMAL: [
      "Dear Operations Team, we acknowledge your message regarding Trade {{tradeRef}}. Please advise on the nature of your inquiry.",
      "Hello. We are reviewing Trade {{tradeRef}}. Kindly specify the details you would like us to check.",
      "Good day. How may the Front Office assist with Trade {{tradeRef}} today?",
      "Greetings. We have received your query for Trade {{tradeRef}}. Please provide further context."
    ],
    CAUTIOUS: [
      "Hi there. We see your message regarding {{tradeRef}}. Could you provide a bit more detail on what you're looking for?",
      "Hello. Before we proceed with {{tradeRef}}, please confirm exactly what needs to be checked.",
      "Hi. We are looking at Trade {{tradeRef}}. What seems to be the issue?",
      "Greetings. Can you clarify your request regarding {{tradeRef}}?"
    ],
    BUREAUCRATIC: [
      "To whom it may concern, regarding Trade {{tradeRef}}, please submit your specific query for our review.",
      "Hello. We require further details to process your inquiry for Trade {{tradeRef}}.",
      "Please state the nature of your request for Trade {{tradeRef}} so we may log it appropriately.",
      "Acknowledgment of message for Trade {{tradeRef}}. Please clarify the exact discrepancy."
    ]
  },

  THANKS: {
    COOPERATIVE: [
      "You're welcome! Don't hesitate to reach out if anything else comes up on this trade.",
      "Glad we could help! Let us know if you need anything else.",
      "No problem at all! Have a great day."
    ],
    EFFICIENT: [
      "Acknowledged. Thanks.",
      "Understood.",
      "Noted. Closing this out."
    ],
    FORMAL: [
      "Thank you for the confirmation. We appreciate your assistance.",
      "We acknowledge your message. Thank you.",
      "Noted with thanks. We will proceed accordingly."
    ],
    CAUTIOUS: [
      "Received, thank you. Please let us know if anything changes.",
      "Acknowledged. We will keep this on file.",
      "Thanks for confirming. We will monitor the situation."
    ],
    BUREAUCRATIC: [
      "Acknowledgment received. This inquiry is now closed.",
      "Thank you for the update. It has been recorded.",
      "Noted. No further action is required at this time."
    ]
  },

  ERROR_CHECK_WITH_ISSUES: {
    COOPERATIVE: [
      "Good catch! We've reviewed Trade {{tradeRef}} and found the following discrepancy:\n\n{{issueList}}\n\nWe will amend the booking accordingly.",
      "Thanks for asking us to check. It looks like there is indeed an issue:\n\n{{issueList}}\n\nWe will amend this on our side.",
      "We've taken a look at {{tradeRef}} and spotted a mismatch:\n\n{{issueList}}\n\nWe will get this corrected on our side.",
      "Appreciate the heads-up. We checked the details and found:\n\n{{issueList}}\n\nWe will process the amendment."
    ],
    EFFICIENT: [
      "Review complete for {{tradeRef}}. Discrepancies found:\n\n{{issueList}}\n\nWe will amend.",
      "Checked. Issues identified:\n\n{{issueList}}\n\nAction required.",
      "Discrepancy confirmed on {{tradeRef}}:\n\n{{issueList}}\n\nWe will update the booking.",
      "Errors found:\n\n{{issueList}}\n\nWe will rectify this."
    ],
    FORMAL: [
      "We have conducted a review of Trade {{tradeRef}} and identified the following discrepancies:\n\n{{issueList}}\n\nWe will process the necessary amendments.",
      "Upon review of Trade {{tradeRef}}, we note the following variances:\n\n{{issueList}}\n\nWe will adjust the booking to match our records.",
      "Our investigation into Trade {{tradeRef}} reveals the following issues:\n\n{{issueList}}\n\nWe will action the required corrections.",
      "Please be advised that Trade {{tradeRef}} contains the following errors:\n\n{{issueList}}\n\nWe will amend the trade."
    ],
    CAUTIOUS: [
      "We've looked into Trade {{tradeRef}} and it seems there might be a discrepancy:\n\n{{issueList}}\n\nCould you verify this and amend if necessary?",
      "Upon checking, we've noticed the following differences:\n\n{{issueList}}\n\nPlease review, and we will amend if appropriate.",
      "It appears there are some inconsistencies with {{tradeRef}}:\n\n{{issueList}}\n\nLet us know your thoughts.",
      "We've identified potential issues:\n\n{{issueList}}\n\nPlease investigate from your side."
    ],
    BUREAUCRATIC: [
      "A formal review of Trade {{tradeRef}} has been completed. The following discrepancies were recorded:\n\n{{issueList}}\n\nWe will process the required amendments.",
      "Reference Trade {{tradeRef}}. The following variances have been identified:\n\n{{issueList}}\n\nWe will align the booking with FO records.",
      "Discrepancy report for Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe will amend the booking.",
      "Official notification of trade errors on {{tradeRef}}:\n\n{{issueList}}\n\nWe will rectify immediately."
    ]
  },

  ERROR_CHECK_NO_ISSUES: {
    COOPERATIVE: [
      "We've reviewed Trade {{tradeRef}} thoroughly and everything looks correct on our end. No discrepancies identified. You're good to go!",
      "Checked {{tradeRef}} for you. All details match our FO systems perfectly. No action needed here.",
      "Looks clean from our side! No errors found on {{tradeRef}}.",
      "We verified the details for {{tradeRef}} and it all checks out. Proceed as normal."
    ],
    EFFICIENT: [
      "Trade {{tradeRef}} verified. No issues found. Proceed.",
      "Checked. Details match. No action required.",
      "Clean trade. No discrepancies.",
      "Verified. All good."
    ],
    FORMAL: [
      "We have reviewed Trade {{tradeRef}} and can confirm that all details are consistent with our records. No issues have been identified.",
      "Upon thorough checking, we confirm Trade {{tradeRef}} is correctly booked. Please proceed with standard processing.",
      "We find no discrepancies with Trade {{tradeRef}}. The booking is accurate.",
      "Formal confirmation: Trade {{tradeRef}} details have been verified and are correct."
    ],
    CAUTIOUS: [
      "We've reviewed Trade {{tradeRef}} and didn't spot any obvious issues on our end. Everything seems correct.",
      "Based on our current records, Trade {{tradeRef}} appears to be booked correctly. We don't see any discrepancies.",
      "We haven't found any errors with {{tradeRef}}, but please double-check if you suspect something is off.",
      "Everything looks okay from the FO side for now. No immediate issues detected."
    ],
    BUREAUCRATIC: [
      "Review of Trade {{tradeRef}} complete. No variances were identified between the FO system and the operations booking. Proceed with the workflow.",
      "This is to formally advise that Trade {{tradeRef}} has been verified. No errors were found.",
      "Reference Trade {{tradeRef}}: All parameters match authorized records. No further action is required from the Front Office.",
      "Verification complete. Trade {{tradeRef}} is deemed clean."
    ]
  },

  AMOUNT_MISMATCH: {
    COOPERATIVE: [
      "We've checked our records and can confirm the correct notional for this trade is {{truthAmount}} {{currency}}.\n\nIt appears the booking shows {{bookingAmount}} {{currency}}. We will amend the booking accordingly.",
      "Quick update — the correct amount should be {{truthAmount}} {{currency}}, not {{bookingAmount}} {{currency}}.\n\nWe will amend this.",
      "Hi, we noticed the amount discrepancy. The FO record is {{truthAmount}} {{currency}}. The booking of {{bookingAmount}} {{currency}} is incorrect. We will fix it.",
      "Just confirming the notional should be {{truthAmount}} {{currency}}. We see {{bookingAmount}} {{currency}} in the system. We will amend.",
      "Thanks for checking. The correct amount is indeed {{truthAmount}} {{currency}}. Please update the booked amount of {{bookingAmount}} {{currency}}."
    ],
    EFFICIENT: [
      "Correct notional: {{truthAmount}} {{currency}}.\nBooked: {{bookingAmount}} {{currency}}.\n\nWe will amend.",
      "Confirming trade amount is {{truthAmount}} {{currency}}. Current booking of {{bookingAmount}} {{currency}} requires correction.",
      "Amount mismatch. Correct value: {{truthAmount}} {{currency}}. Booked: {{bookingAmount}} {{currency}}. We will update this.",
      "Please amend amount to {{truthAmount}} {{currency}} (currently {{bookingAmount}} {{currency}}).",
      "We will update the amount to {{truthAmount}} {{currency}}."
    ],
    FORMAL: [
      "We wish to bring to your attention a discrepancy in the trade amount.\n\nAs per our trading records, the correct notional amount is {{truthAmount}} {{currency}}. However, the current booking reflects {{bookingAmount}} {{currency}}.\n\nWe will process the necessary amendment.",
      "Please be advised that the notional amount for this trade should read {{truthAmount}} {{currency}}.\n\nThe current booking of {{bookingAmount}} {{currency}} represents a variance.\n\nWe will action the correction.",
      "We confirm the authorized amount is {{truthAmount}} {{currency}}. The operations booking of {{bookingAmount}} {{currency}} is inaccurate. We will amend.",
      "Formal notification of amount discrepancy: FO records show {{truthAmount}} {{currency}}, operations booking shows {{bookingAmount}} {{currency}}. We will rectify this.",
      "We request an amendment to the trade amount. It should be {{truthAmount}} {{currency}}, not {{bookingAmount}} {{currency}}."
    ],
    CAUTIOUS: [
      "We have reviewed the trade details and believe there may be an amount discrepancy.\n\nOur records indicate the correct notional is {{truthAmount}} {{currency}}, whereas the booking shows {{bookingAmount}} {{currency}}.\n\nCould you please verify and confirm?",
      "Upon review, we note that the booked amount of {{bookingAmount}} {{currency}} does not match our expected notional of {{truthAmount}} {{currency}}.\n\nPlease investigate and advise.",
      "It seems the amount might be incorrect. We expect {{truthAmount}} {{currency}}, but see {{bookingAmount}} {{currency}}. Can you look into this?",
      "There appears to be a difference in the notional. We show {{truthAmount}} {{currency}}. Please verify against the {{bookingAmount}} {{currency}} booking.",
      "Could you double-check the amount? We have {{truthAmount}} {{currency}} on our side, differing from the {{bookingAmount}} {{currency}} booked."
    ],
    BUREAUCRATIC: [
      "This communication is to formally notify you of a discrepancy identified in the trade amount.\n\nPer our front office system, the authorised notional amount is {{truthAmount}} {{currency}}. The operations booking currently reflects {{bookingAmount}} {{currency}}.\n\nPlease process the required amendment and confirm completion.",
      "Reference: Trade {{tradeRef}}\n\nWe have identified a variance between the front office record ({{truthAmount}}) and the operations booking ({{bookingAmount}}).\n\nWe will amend accordingly.",
      "Discrepancy Logged: Amount variance on {{tradeRef}}. FO system: {{truthAmount}} {{currency}}. Booking: {{bookingAmount}} {{currency}}. We will amend.",
      "We will initiate an amendment workflow for the notional amount. Correct value is {{truthAmount}} {{currency}}; current booked value is {{bookingAmount}} {{currency}}.",
      "We will align operations booked amount ({{bookingAmount}} {{currency}}) with front office authorized amount ({{truthAmount}} {{currency}})."
    ]
  },

  VALUE_DATE_MISMATCH: {
    COOPERATIVE: [
      "Just flagging — the correct value date for this trade is {{truthVD}}.\n\nThe booking currently shows {{bookingVD}}. Please update when convenient.",
      "We confirm the value date should be {{truthVD}}, not {{bookingVD}} as currently booked.\n\nWe will amend.",
      "Hi, the value date seems off. Our system says {{truthVD}}, but the booking has {{bookingVD}}. Please correct this.",
      "Please amend the value date to {{truthVD}}. The current {{bookingVD}} is incorrect.",
      "Thanks for the heads up. You are right, the value date should be {{truthVD}}. Please change it from {{bookingVD}}."
    ],
    EFFICIENT: [
      "Value date correction required.\nCorrect: {{truthVD}}\nBooked: {{bookingVD}}\n\nPlease update.",
      "VD should be {{truthVD}}. Currently showing {{bookingVD}}. We will amend.",
      "We will update VD to {{truthVD}} (currently {{bookingVD}}).",
      "Mismatch on VD. Correct is {{truthVD}}. Booked is {{bookingVD}}. We will amend.",
      "We will amend VD to {{bookingVD}} to {{truthVD}}."
    ],
    FORMAL: [
      "We wish to advise that the value date for this trade requires amendment.\n\nThe correct value date as per our records is {{truthVD}}. The current booking reflects a value date of {{bookingVD}}.\n\nWe will process the necessary correction.",
      "Please note that the value date should read {{truthVD}} rather than {{bookingVD}} as currently recorded.\n\nWe will amend this at the earliest opportunity.",
      "We confirm the settlement date is {{truthVD}}. The booking of {{bookingVD}} is incorrect. We will amend.",
      "We will amend the value date to {{truthVD}} from the current {{bookingVD}}.",
      "The authorized value date is {{truthVD}}. We will align the operations booking ({{bookingVD}}) with this date."
    ],
    CAUTIOUS: [
      "We have identified a potential value date discrepancy.\n\nOur records show the trade should settle on {{truthVD}}, but the booking indicates {{bookingVD}}.\n\nCould you please review and confirm the correct date?",
      "Upon checking, we note the value date may need adjustment from {{bookingVD}} to {{truthVD}}.\n\nPlease verify and advise.",
      "It looks like the value date might be wrong. We expect {{truthVD}}, but see {{bookingVD}}. Can you check?",
      "There's a possible mismatch on the settlement date. We have {{truthVD}}. Please review against your {{bookingVD}}.",
      "Could you verify the VD? We show {{truthVD}}, differing from the booked {{bookingVD}}."
    ],
    BUREAUCRATIC: [
      "This is to formally notify you that the value date recorded for this trade is incorrect.\n\nAuthorised value date: {{truthVD}}\nCurrently booked value date: {{bookingVD}}\n\nPlease amend the booking and confirm once actioned.",
      "Reference: Trade {{tradeRef}}\n\nA value date discrepancy has been identified. The correct settlement date is {{truthVD}}, not {{bookingVD}} as booked.\n\nKindly rectify and revert with confirmation.",
      "Discrepancy Logged: Value Date variance on {{tradeRef}}. FO system: {{truthVD}}. Booking: {{bookingVD}}. We will amend.",
      "We will initiate an amendment workflow for the value date. Correct value is {{truthVD}}; current booked value is {{bookingVD}}.",
      "We will align operations booked value date ({{bookingVD}}) with front office authorized date ({{truthVD}})."
    ]
  },

  AMOUNT_CORRECT: {
    COOPERATIVE: [
      "I've checked the amount and it's spot on! {{truthAmount}} {{currency}} matches our records perfectly.",
      "Good news, the amount is correct. No issues found with the {{truthAmount}} {{currency}} booking.",
      "The notional is correct on our side. We confirm it's {{truthAmount}} {{currency}}."
    ],
    EFFICIENT: [
      "Amount verified. Correct.",
      "No amount mismatch. Booked correctly.",
      "Amount of {{truthAmount}} {{currency}} is correct."
    ],
    FORMAL: [
      "We confirm that the trade amount is correct. The booked notional of {{truthAmount}} {{currency}} matches our records.",
      "The amount has been verified and no discrepancies were identified.",
      "Please be advised that the amount is accurately booked."
    ],
    CAUTIOUS: [
      "We've reviewed the amount and it seems correct on our end.",
      "The notional appears to be correct.",
      "We don't see any discrepancy with the amount."
    ],
    BUREAUCRATIC: [
      "Review of the trade amount complete. No variances were identified.",
      "The amount parameter has been verified and authorized.",
      "Amount verification is complete. No further action is required."
    ]
  },

  VALUE_DATE_CORRECT: {
    COOPERATIVE: [
      "I've checked the value date and it's completely correct! It matches our records perfectly.",
      "Good news, the settlement date is correct. No issues found with the booking.",
      "The value date is correct on our side. We confirm there is no date mismatch."
    ],
    EFFICIENT: [
      "Value date verified. Correct.",
      "No date mismatch. Booked correctly.",
      "Value date is correct."
    ],
    FORMAL: [
      "We confirm that the value date is correct. The booked date matches our records.",
      "The settlement date has been verified and no discrepancies were identified.",
      "Please be advised that the value date is accurately booked."
    ],
    CAUTIOUS: [
      "We've reviewed the value date and it seems correct on our end.",
      "The settlement date appears to be correct.",
      "We don't see any discrepancy with the value date."
    ],
    BUREAUCRATIC: [
      "Review of the value date complete. No variances were identified.",
      "The value date parameter has been verified and authorized.",
      "Value date verification is complete. No further action is required."
    ]
  },

  CURRENCY_MISMATCH: {
    COOPERATIVE: [
      "We checked our records and the correct currency should be {{currency}}.\n\nWe will amend the booking accordingly.",
      "Just flagging — the currency seems to be booked incorrectly. It should be {{currency}}."
    ],
    EFFICIENT: [
      "Currency mismatch. Should be {{currency}}.",
      "Update currency to {{currency}}."
    ],
    FORMAL: [
      "Please be advised that the currency for this trade is incorrect. We will amend it to {{currency}}."
    ],
    CAUTIOUS: [
      "Could you please verify the currency? Our records show it should be {{currency}}."
    ],
    BUREAUCRATIC: [
      "Currency variance identified. Authorised currency is {{currency}}. We will amend."
    ]
  },

  COUNTERPARTY_MISMATCH: {
    COOPERATIVE: [
      "It looks like the counterparty is incorrect. The correct counterparty is {{counterparty}}.\n\nWe will amend the booking.",
      "We've noticed a mismatch on the counterparty. It should be {{counterparty}}."
    ],
    EFFICIENT: [
      "Counterparty mismatch. Correct is {{counterparty}}.",
      "We will amend counterparty to {{counterparty}}."
    ],
    FORMAL: [
      "We confirm that the counterparty on this trade should be {{counterparty}}. We will process the correction."
    ],
    CAUTIOUS: [
      "We have identified a potential mismatch in the counterparty. Our records indicate it is {{counterparty}}."
    ],
    BUREAUCRATIC: [
      "Counterparty discrepancy logged. Authorised counterparty is {{counterparty}}. We will amend."
    ]
  },

  CURRENCY_CORRECT: {
    COOPERATIVE: [
      "The currency is booked correctly as {{currency}}.",
      "No issues with the currency, it matches our records."
    ],
    EFFICIENT: [
      "Currency verified. Correct.",
      "No currency mismatch."
    ],
    FORMAL: [
      "We confirm that the currency is accurately booked."
    ],
    CAUTIOUS: [
      "The currency appears to be correct."
    ],
    BUREAUCRATIC: [
      "Currency verification is complete. No variances identified."
    ]
  },

  COUNTERPARTY_CORRECT: {
    COOPERATIVE: [
      "The counterparty is correct on our side.",
      "No mismatch found for the counterparty."
    ],
    EFFICIENT: [
      "Counterparty verified. Correct.",
      "No counterparty mismatch."
    ],
    FORMAL: [
      "We confirm that the counterparty is accurately booked."
    ],
    CAUTIOUS: [
      "The counterparty appears to be correct."
    ],
    BUREAUCRATIC: [
      "Counterparty verification is complete. No variances identified."
    ]
  },

  CLEAN_TRADE: {
    COOPERATIVE: [
      "We've reviewed the trade details and everything looks correct on our end.\n\nNo issues to flag — please proceed with processing.",
      "All good from our side. Trade details are confirmed as correct.\n\nPlease go ahead with the standard workflow.",
      "Checked it over, looks perfectly clean to us. Proceed as normal.",
      "No discrepancies found here. Thanks for checking. You can validate the trade."
    ],
    EFFICIENT: [
      "Trade details verified. No discrepancies found. Please proceed.",
      "Confirmed — all details match our records. No action required from FO.",
      "Clean trade. Proceed.",
      "Verified. OK to process."
    ],
    FORMAL: [
      "We have reviewed the trade in question and can confirm that all details are consistent with our front office records.\n\nNo amendments are required. Please proceed with the standard processing workflow.",
      "Upon review, we confirm that the trade details are accurate as booked.\n\nKindly continue with the usual processing.",
      "We find no variances. The trade is authorized for downstream processing.",
      "Formal confirmation: No discrepancies identified. Proceed."
    ],
    CAUTIOUS: [
      "We have carefully reviewed the trade details and, based on our records, we do not identify any discrepancies.\n\nHowever, please do verify on your end before proceeding.",
      "Our review indicates no issues with the current booking.\n\nPlease confirm from your side and proceed accordingly.",
      "It looks okay from what we can see. Double check your side, but we are good with it.",
      "We don't see any errors. Proceed if everything else aligns."
    ],
    BUREAUCRATIC: [
      "This is to confirm that the front office has reviewed the trade details as referenced above.\n\nNo discrepancies have been identified between our trading system and the operations booking.\n\nPlease proceed with the standard operational workflow.",
      "Reference: Trade {{tradeRef}}\n\nFormal confirmation: All trade parameters have been verified against front office records. No amendments are required.\n\nPlease continue processing.",
      "Verification complete. Trade is cleared for operations validation.",
      "No anomalies detected. Proceed with lifecycle management."
    ]
  },
  
  URGENCY: {
    COOPERATIVE: [
      "Thanks for flagging this. We understand the urgency and are looking into it right away. Will revert shortly.",
      "Got it, treating this as high priority. We'll get you the details ASAP.",
      "Understood, this is urgent. We are on it!"
    ],
    EFFICIENT: [
      "Acknowledged as urgent. Investigating now.",
      "High priority noted. Reverting soon.",
      "Urgent review in progress."
    ],
    FORMAL: [
      "We acknowledge the urgency of your request. The matter is currently under expedited review.",
      "Your urgent inquiry has been received and prioritized. We will respond promptly.",
      "Priority noted. An investigation has commenced."
    ],
    CAUTIOUS: [
      "We see you've marked this as urgent. We are carefully reviewing the details now to ensure accuracy.",
      "Understood regarding the timeline. We're looking into it as quickly and carefully as possible.",
      "Noted. We will try to expedite our review."
    ],
    BUREAUCRATIC: [
      "Priority request logged. Expedited review workflow initiated.",
      "Acknowledgment of urgent status. The front office will provide a determination as soon as practicable.",
      "Urgent status noted on Trade {{tradeRef}}. Review pending."
    ]
  },

  GENERIC_INVESTIGATION: {
    COOPERATIVE: [
      "Thanks for raising this. We're looking into it now and will get back to you shortly with the correct details.\n\nIn the meantime, please hold off on processing.",
      "Noted — we're investigating the flagged issue. Will revert with our findings.\n\nPlease keep the trade on hold.",
      "We're checking this against our systems now. Give us a moment and we'll reply.",
      "We are looking into this query. Please wait for our confirmation."
    ],
    EFFICIENT: [
      "Acknowledged. Under review. Will revert with findings shortly.",
      "Query received. Investigating now. Please hold processing.",
      "Checking details. Hold trade.",
      "Under investigation. Do not process yet."
    ],
    FORMAL: [
      "Thank you for bringing this to our attention. The front office is currently reviewing the trade details.\n\nWe will revert with our findings at the earliest opportunity. In the interim, please hold the trade.",
      "We acknowledge receipt of your query regarding this trade.\n\nAn investigation is underway and we will provide our response in due course.",
      "The matter is under formal review. We will provide instructions shortly.",
      "Please pend any further action on this trade until our investigation concludes."
    ],
    CAUTIOUS: [
      "We have received your query and are reviewing the trade details carefully.\n\nWe will provide a comprehensive response once our review is complete. Please do not process until we revert.",
      "Thank you for flagging this matter. We are conducting a thorough review.\n\nPlease await our response before taking any further action.",
      "We are taking a close look at this. Please stand by.",
      "Reviewing carefully. Do not proceed until we confirm."
    ],
    BUREAUCRATIC: [
      "Your query has been received and logged.\n\nThe front office trading desk has initiated a formal review of the trade parameters. A response will be issued upon completion of the investigation.\n\nPlease refrain from processing until further notice.",
      "Reference: Trade {{tradeRef}}\n\nAcknowledged. A formal investigation has been opened. The front office will provide its determination in accordance with standard procedures.\n\nPlease hold all processing.",
      "Investigation workflow started. Processing must be suspended.",
      "Query logged. Await formal response."
    ]
  },

  CLARIFICATION: {
    COOPERATIVE: [
      "I'm sorry, I didn't quite catch that. Could you clarify what you need regarding Trade {{tradeRef}}?",
      "Could you provide a bit more detail? We want to make sure we're checking the right thing for {{tradeRef}}.",
      "Hi! We received your message about {{tradeRef}}, but we're not exactly sure what you're asking. Can you elaborate?"
    ],
    EFFICIENT: [
      "Please clarify your request for {{tradeRef}}.",
      "Query unclear. Provide more details for {{tradeRef}}.",
      "Specify the exact discrepancy for {{tradeRef}}."
    ],
    FORMAL: [
      "We acknowledge your message regarding Trade {{tradeRef}}. However, the inquiry is unclear. Please provide further clarification.",
      "Kindly elaborate on your request for Trade {{tradeRef}} so we may assist you properly.",
      "We are unable to process your request as stated. Please clarify the issue with Trade {{tradeRef}}."
    ],
    CAUTIOUS: [
      "We received your message, but we need more information before proceeding. What exactly are you querying on {{tradeRef}}?",
      "Could you please clarify your question? We want to be certain before making any adjustments to {{tradeRef}}.",
      "Please provide more context for your request on Trade {{tradeRef}}."
    ],
    BUREAUCRATIC: [
      "The query submitted for Trade {{tradeRef}} is insufficiently detailed. Please resubmit with clear instructions.",
      "Action cannot be taken based on the current message. Clarification is required for Trade {{tradeRef}}.",
      "Please specify the nature of your inquiry in a clear manner so we can proceed with {{tradeRef}}."
    ]
  }
};
