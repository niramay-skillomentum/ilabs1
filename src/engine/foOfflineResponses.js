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
  },

  // ======================================
  // NEW MO-SPECIFIC CATEGORIES
  // 7 categories × 5 personalities × ~10 templates = 350+
  // ======================================

  HOLDING_MESSAGE: {
    COOPERATIVE: [
      "Hi team! Thanks for reaching out about Trade {{tradeRef}}. We're currently pulling up the details on our end — give us a few minutes and we'll get right back to you.",
      "Got your message on {{tradeRef}}. We're checking our records now. Hang tight — we'll have an answer for you shortly!",
      "Thanks for flagging Trade {{tradeRef}}! We're on it. Just need a moment to cross-reference our booking system.",
      "Hi! Just wanted to let you know we received your query on {{tradeRef}}. We're looking into it right now and will circle back soon.",
      "Hey team — checking Trade {{tradeRef}} against our execution records. Should have an update for you within the next 15 minutes.",
      "We're on the case! Trade {{tradeRef}} is being reviewed by our desk. Will revert shortly with the details.",
      "Thanks for the heads-up on {{tradeRef}}. Just pulling the trade ticket — we'll get back to you as soon as we've confirmed the details.",
      "Got it! We've flagged Trade {{tradeRef}} for immediate review. Expect our response shortly.",
      "Working on your query for {{tradeRef}} right now. We'll have the full picture for you in a few minutes.",
      "Appreciate you reaching out on {{tradeRef}}. We're cross-checking with the trader — will revert once confirmed."
    ],
    EFFICIENT: [
      "Checking {{tradeRef}} now. Will revert shortly.",
      "Received. Looking into Trade {{tradeRef}} — give us a few minutes.",
      "On it. Hold for response on {{tradeRef}}.",
      "Query noted for {{tradeRef}}. Reviewing details.",
      "Acknowledged. Pulling records for {{tradeRef}}.",
      "Under review. Expect response within 15 min.",
      "Trade {{tradeRef}} flagged for review. Stand by.",
      "Checking execution records for {{tradeRef}}. Hold.",
      "Looking into this. Will confirm shortly.",
      "Received your query. Reviewing {{tradeRef}} now."
    ],
    FORMAL: [
      "Dear Colleague, we acknowledge your query regarding Trade {{tradeRef}}. We are currently reviewing our internal records and will revert to you within the next 30 minutes. Kindly bear with us.",
      "Thank you for your message regarding Trade {{tradeRef}}. Our operations team is cross-referencing this with the trading desk. We will provide a detailed response shortly.",
      "We confirm receipt of your inquiry on Trade {{tradeRef}}. An investigation is underway and we will respond at the earliest opportunity.",
      "Good day. Your query regarding Trade {{tradeRef}} has been noted. We are reviewing the relevant booking data and will provide our findings in due course.",
      "Thank you for bringing Trade {{tradeRef}} to our attention. We are currently verifying the trade details with our execution team.",
      "Your inquiry has been received and logged. We are conducting a thorough review of Trade {{tradeRef}} and will revert upon completion.",
      "We have escalated your query on Trade {{tradeRef}} to our trading desk for review. A response will be forthcoming.",
      "Please be advised that Trade {{tradeRef}} is currently under internal review. We will provide a comprehensive response shortly.",
      "Your message concerning Trade {{tradeRef}} is receiving our prompt attention. We will furnish our response upon completion of the review.",
      "We are in receipt of your query. Trade {{tradeRef}} is being reviewed by the appropriate desk and a response will be issued shortly."
    ],
    CAUTIOUS: [
      "Hi, we've received your message about Trade {{tradeRef}}. Before we provide a response, we want to make sure we check all relevant records carefully. Please give us some time.",
      "Thanks for flagging Trade {{tradeRef}}. We're verifying the details with multiple sources before responding — this is to ensure accuracy.",
      "We've noted your query on {{tradeRef}}. We need to verify a few things internally before we can respond with confidence. Please bear with us.",
      "Your message about Trade {{tradeRef}} has been received. We want to make sure we give you accurate information, so we're double-checking our records.",
      "Hi — we're looking into Trade {{tradeRef}} but want to be thorough before responding. We'll get back to you once we've confirmed everything.",
      "We appreciate your patience on Trade {{tradeRef}}. We're taking care to verify all the details before providing our response.",
      "Thank you for your query on {{tradeRef}}. We're being careful to cross-reference all relevant systems before replying.",
      "We've received your message and are reviewing Trade {{tradeRef}} carefully. We want to ensure our response is complete and accurate.",
      "We're taking a close look at Trade {{tradeRef}}. We prefer to be thorough rather than hasty. Please expect a response within the hour.",
      "Your query is being handled with care. We're verifying Trade {{tradeRef}} against our full records set before responding."
    ],
    BUREAUCRATIC: [
      "Please be advised that your inquiry for Trade {{tradeRef}} has been received and is currently being processed by the Trade Support team. A formal response will be provided within the standard SLA of 2 business hours.",
      "Reference: Trade {{tradeRef}}. Your query has been logged under Case ID {{tradeRef}}-INQ. The Front Office will respond in accordance with standard operating procedures.",
      "Acknowledgment: Query received for Trade {{tradeRef}}. This matter has been assigned to the appropriate review team. Please await our formal response.",
      "Your request regarding Trade {{tradeRef}} has been entered into our query management system. Processing is underway per established protocols.",
      "Formal acknowledgment of receipt: Trade {{tradeRef}} inquiry noted. Response pending completion of mandatory internal review procedures.",
      "Your inquiry has been catalogued. Trade {{tradeRef}} is subject to standard verification workflows. Response will follow upon completion.",
      "Query ticket created for Trade {{tradeRef}}. The matter will be addressed in order of receipt and priority classification.",
      "Trade {{tradeRef}}: Inquiry received and logged. Formal response will be dispatched upon conclusion of the review process.",
      "This is to confirm that your query on Trade {{tradeRef}} has been registered. Our compliance and review procedures require verification before a response can be issued.",
      "Acknowledged. Your Trade {{tradeRef}} query is in the processing queue. Resolution timeline: standard 2-hour SLA."
    ]
  },

  BOOKING_CONFIRMED_MO: {
    COOPERATIVE: [
      "Hi! We've reviewed Trade {{tradeRef}} against our execution records and everything checks out. The booking looks good — {{currency}} {{amount}} with value date {{valueDate}}. You're all clear to proceed!",
      "Good news on Trade {{tradeRef}} — our records match the current booking. No discrepancies found. You can proceed with validation.",
      "We've double-checked Trade {{tradeRef}} and can confirm the booking is accurate. Amount, value date, and counterparty all match our trade ticket.",
      "Hey team — just finished reviewing {{tradeRef}}. All details are correct as per our execution system. Happy to confirm the booking is clean.",
      "Confirmed! Trade {{tradeRef}} is correctly booked. No issues on our end. Feel free to proceed.",
      "We've verified Trade {{tradeRef}} and it's all looking good. The trade was executed exactly as booked.",
      "Trade {{tradeRef}} verified against our execution log — no discrepancies found. You're good to go!",
      "Quick confirmation: Trade {{tradeRef}} booking is accurate. All parameters match our records.",
      "Everything looks clean on Trade {{tradeRef}}. Our records align with the booking. Proceed as normal.",
      "Just checked {{tradeRef}} — booking is confirmed correct. No action needed from our side."
    ],
    EFFICIENT: [
      "Trade {{tradeRef}} confirmed. Booking matches execution records. Proceed.",
      "Checked {{tradeRef}}. All clean. No discrepancies.",
      "Booking verified for {{tradeRef}}. No issues found.",
      "Trade {{tradeRef}}: confirmed correct. Proceed to validate.",
      "Reviewed. {{tradeRef}} is clean. No action required.",
      "Trade {{tradeRef}} matches our records. Good to go.",
      "Confirmed. {{tradeRef}} booked correctly.",
      "No issues found on {{tradeRef}}. Booking is correct.",
      "{{tradeRef}} verified. All parameters match.",
      "Clean trade. {{tradeRef}} confirmed."
    ],
    FORMAL: [
      "We are pleased to confirm that Trade {{tradeRef}} has been reviewed against our execution records and the current booking is accurate. The trade details — including amount, value date, and counterparty — are consistent with our records.",
      "Following a thorough review, we can confirm that the booking for Trade {{tradeRef}} is correct as per our trading system. No amendments are required.",
      "Dear Colleague, we have verified Trade {{tradeRef}} and can confirm that all booking parameters are accurate. You may proceed with your standard validation process.",
      "We wish to confirm that our review of Trade {{tradeRef}} has revealed no discrepancies. The booking is consistent with the original execution.",
      "Trade {{tradeRef}} has been verified against our internal records. We confirm that the booking details are correct and no amendments are warranted.",
      "We have completed our review of Trade {{tradeRef}}. The trade was executed as booked and we have no corrections to report.",
      "This is to confirm that Trade {{tradeRef}} is accurately reflected in our systems. No discrepancies have been identified.",
      "We confirm the accuracy of the booking for Trade {{tradeRef}}. All details are in order as per our execution records.",
      "Our review of Trade {{tradeRef}} is complete. We are satisfied that the booking is correct and consistent with our records.",
      "Please be advised that Trade {{tradeRef}} has been verified. The booking details correspond to our execution data."
    ],
    CAUTIOUS: [
      "We've carefully reviewed Trade {{tradeRef}} and, based on our current records, the booking appears to be correct. That said, if you notice anything else, please don't hesitate to flag it.",
      "After thorough checking, Trade {{tradeRef}} looks accurate. We've cross-referenced all key fields. If anything seems off, let us know.",
      "We've looked into Trade {{tradeRef}} carefully and we believe the booking is correct. We've checked amount, value date, and counterparty against our system.",
      "Based on our review, Trade {{tradeRef}} appears to be booked correctly. We have verified the key parameters against our records.",
      "We're fairly confident that Trade {{tradeRef}} is accurately booked. We've done a thorough check and found no discrepancies.",
      "Trade {{tradeRef}} has been reviewed and we believe it's correct. If you have any additional concerns, we're happy to look again.",
      "Our review suggests Trade {{tradeRef}} is clean. We've been thorough in our verification but please flag any concerns.",
      "We've gone through Trade {{tradeRef}} carefully and found no issues. The booking matches our execution records.",
      "After careful review, we're confirming that Trade {{tradeRef}} is booked correctly. We've checked all the key fields.",
      "We've verified Trade {{tradeRef}} and it appears accurate. Please proceed, but don't hesitate to reach out if something seems off."
    ],
    BUREAUCRATIC: [
      "Reference: Trade {{tradeRef}}. Following the standard verification procedure, we confirm that the booking details are consistent with our execution records. No amendments are required at this time.",
      "Trade {{tradeRef}} has been subjected to our mandatory review process. Conclusion: booking is accurate. No corrective action is warranted.",
      "Formal confirmation: Trade {{tradeRef}} has been verified per established protocols. All parameters are in compliance with our records.",
      "This communication serves as formal confirmation that Trade {{tradeRef}} has been reviewed and found to be accurately booked.",
      "Verification complete for Trade {{tradeRef}}. All booking parameters conform to our execution records. No further action required.",
      "Per our review process, Trade {{tradeRef}} has been assessed and confirmed as accurate. The trade is cleared for further processing.",
      "Trade {{tradeRef}}: Booking verification completed. Status: CONFIRMED. No amendments or corrections necessary.",
      "In accordance with our standard procedures, we have reviewed Trade {{tradeRef}} and confirm the booking is correct.",
      "Formal response: Trade {{tradeRef}} booking has been validated against our records. Result: No discrepancies.",
      "Trade {{tradeRef}} has undergone our standard review workflow. Outcome: Booking confirmed accurate."
    ]
  },

  BOOKING_DISCREPANCY_MO: {
    COOPERATIVE: [
      "Good catch! We've reviewed Trade {{tradeRef}} and found a discrepancy in our booking:\n\n{{issueList}}\n\nWe'll get this corrected on our side right away. An amendment will be raised.",
      "Thanks for asking us to check Trade {{tradeRef}}. We found an issue:\n\n{{issueList}}\n\nWe'll raise an amendment to correct this. Sorry about that!",
      "We've looked into Trade {{tradeRef}} and you're right — there's a mismatch:\n\n{{issueList}}\n\nWe'll fix this immediately. Thanks for catching it!",
      "After reviewing Trade {{tradeRef}}, we've identified a booking error:\n\n{{issueList}}\n\nWe'll process the amendment now. Appreciate the heads-up!",
      "You were right to flag this. Our review of Trade {{tradeRef}} shows:\n\n{{issueList}}\n\nWe're raising the amendment right now.",
      "We've confirmed there's a discrepancy on Trade {{tradeRef}}:\n\n{{issueList}}\n\nAmendment coming through shortly. Thanks for checking!",
      "Found the issue on Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe'll correct the booking on our end immediately.",
      "Our records show a mismatch on Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe're on it — amendment will be raised shortly.",
      "Thanks for highlighting this. Trade {{tradeRef}} has the following discrepancy:\n\n{{issueList}}\n\nWe'll amend accordingly.",
      "We've identified a booking error on Trade {{tradeRef}}:\n\n{{issueList}}\n\nCorrecting now. Will confirm once the amendment is processed."
    ],
    EFFICIENT: [
      "Discrepancy confirmed on Trade {{tradeRef}}:\n\n{{issueList}}\n\nAmendment being raised.",
      "Checked {{tradeRef}}. Error found:\n\n{{issueList}}\n\nWill amend.",
      "{{tradeRef}} has a booking error:\n\n{{issueList}}\n\nCorrecting now.",
      "Confirmed mismatch on {{tradeRef}}:\n\n{{issueList}}\n\nAmendment in progress.",
      "Error on {{tradeRef}}:\n\n{{issueList}}\n\nFixing immediately.",
      "Found issue:\n\n{{issueList}}\n\nAmendment for {{tradeRef}} being processed.",
      "Booking error confirmed:\n\n{{issueList}}\n\nWill correct {{tradeRef}}.",
      "Mismatch identified on {{tradeRef}}:\n\n{{issueList}}\n\nRaising amendment.",
      "{{tradeRef}} needs correction:\n\n{{issueList}}\n\nProcessing now.",
      "Verified. {{tradeRef}} error:\n\n{{issueList}}\n\nAmending."
    ],
    FORMAL: [
      "Following our review of Trade {{tradeRef}}, we wish to advise that a discrepancy has been identified in the current booking:\n\n{{issueList}}\n\nWe will raise an amendment to correct this matter promptly.",
      "Dear Colleague, upon verification of Trade {{tradeRef}}, we have identified the following booking error:\n\n{{issueList}}\n\nAn amendment will be processed accordingly.",
      "We acknowledge a discrepancy in the booking for Trade {{tradeRef}}:\n\n{{issueList}}\n\nCorrective action is being initiated by the Front Office.",
      "Our review has revealed a mismatch in Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe will amend the booking in our system and confirm once completed.",
      "Please be advised that Trade {{tradeRef}} contains a booking error:\n\n{{issueList}}\n\nThe Front Office will process the necessary amendment.",
      "Upon thorough review, Trade {{tradeRef}} has been found to contain the following discrepancy:\n\n{{issueList}}\n\nAmendment proceedings have been initiated.",
      "We regret to inform you that a booking error has been identified on Trade {{tradeRef}}:\n\n{{issueList}}\n\nCorrectional amendment is underway.",
      "This is to formally advise that Trade {{tradeRef}} requires amendment:\n\n{{issueList}}\n\nThe correction will be processed through our standard workflow.",
      "Our verification process has identified an error in Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe are taking immediate corrective action.",
      "Trade {{tradeRef}} has been reviewed and a discrepancy has been noted:\n\n{{issueList}}\n\nAmendment will be submitted per our standard procedures."
    ],
    CAUTIOUS: [
      "We've reviewed Trade {{tradeRef}} carefully and it appears there may be a discrepancy:\n\n{{issueList}}\n\nWe want to verify this thoroughly before raising an amendment. Please hold processing.",
      "After checking Trade {{tradeRef}}, we've noticed what appears to be a booking error:\n\n{{issueList}}\n\nWe're confirming with the trader before amending.",
      "Our review of Trade {{tradeRef}} suggests a mismatch:\n\n{{issueList}}\n\nWe're double-checking before raising the amendment. Will confirm shortly.",
      "We've identified a potential discrepancy on Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe want to make sure before amending — checking with our execution desk now.",
      "Trade {{tradeRef}} may have a booking error:\n\n{{issueList}}\n\nWe're verifying this against the original trade ticket before taking corrective action.",
      "We've found what looks like a discrepancy on Trade {{tradeRef}}:\n\n{{issueList}}\n\nConfirming with the trader before proceeding with amendment.",
      "Our review indicates a potential issue with Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe're being thorough — will confirm and raise amendment if needed.",
      "We've noticed a possible mismatch on Trade {{tradeRef}}:\n\n{{issueList}}\n\nWe'd like to verify before committing to an amendment.",
      "Trade {{tradeRef}} appears to have an error:\n\n{{issueList}}\n\nWe're cross-checking with execution records before confirming.",
      "After careful review, Trade {{tradeRef}} seems to have a discrepancy:\n\n{{issueList}}\n\nWe're verifying and will raise the amendment once confirmed."
    ],
    BUREAUCRATIC: [
      "Reference: Trade {{tradeRef}}\n\nA booking discrepancy has been identified during the standard verification process:\n\n{{issueList}}\n\nAn amendment request will be processed in accordance with established protocols.",
      "Trade {{tradeRef}}: Verification outcome — DISCREPANCY FOUND.\n\n{{issueList}}\n\nAmendment workflow initiated per standard operating procedures.",
      "Formal notification: Trade {{tradeRef}} has been found to contain a booking error:\n\n{{issueList}}\n\nCorrectional procedures have been engaged.",
      "This communication serves as formal notification that Trade {{tradeRef}} requires amendment:\n\n{{issueList}}\n\nThe matter is being handled through our standard correction process.",
      "Per our mandatory verification procedure, Trade {{tradeRef}} has been identified as containing discrepancies:\n\n{{issueList}}\n\nAmendment processing underway.",
      "Trade {{tradeRef}}: BOOKING ERROR IDENTIFIED.\n\nDetails:\n{{issueList}}\n\nAmendment to be processed through the standard workflow.",
      "Official determination for Trade {{tradeRef}}: booking error confirmed.\n\n{{issueList}}\n\nRemediation action initiated per protocol.",
      "Trade {{tradeRef}} — discrepancy report:\n\n{{issueList}}\n\nCorrective amendment is being processed through the prescribed channels.",
      "In accordance with our review procedures, Trade {{tradeRef}} has been flagged for amendment:\n\n{{issueList}}\n\nThe correction will be effected per standard SLA.",
      "Trade {{tradeRef}}: Formal discrepancy notification.\n\n{{issueList}}\n\nAmendment request has been submitted for processing."
    ]
  },

  LATE_RESPONSE_MO: {
    COOPERATIVE: [
      "Hi team — sorry for the delay on Trade {{tradeRef}}! We've been dealing with a high volume of queries today. Here's the update you've been waiting for.",
      "Apologies for the slow response on {{tradeRef}} — we had to coordinate with the trader before getting back to you. Here's what we found.",
      "Sorry for the wait on Trade {{tradeRef}}! We wanted to make sure we had the right answer before replying. Thanks for your patience.",
      "Hey — apologies for the delayed reply on {{tradeRef}}. Our desk has been particularly busy today. Here's our response.",
      "Sorry about the holdup on Trade {{tradeRef}}. We've now completed our review and can provide you with the details.",
      "Apologies for the late response. We needed extra time to verify Trade {{tradeRef}} with the execution desk.",
      "Hi! Sorry for taking a while to get back to you on {{tradeRef}}. We wanted to be thorough. Here's our update.",
      "Thanks for your patience on Trade {{tradeRef}}. We had to check a few things internally. Here's what we found.",
      "Sorry for the delay — Trade {{tradeRef}} required coordination with multiple teams. We now have the full picture.",
      "Apologies for the wait on {{tradeRef}}. Our team was finishing up another urgent matter. Here's our response."
    ],
    EFFICIENT: [
      "Delayed response — apologies. Here's the update on {{tradeRef}}.",
      "Sorry for the late reply on {{tradeRef}}. See below.",
      "Apologies for the wait. {{tradeRef}} review complete.",
      "Late reply on {{tradeRef}} — high volume today. Details follow.",
      "Delayed — sorry. {{tradeRef}} findings below.",
      "Sorry for the holdup. Here's your answer on {{tradeRef}}.",
      "Apologies. {{tradeRef}} took longer than expected. Update follows.",
      "Late getting back to you on {{tradeRef}}. Here's where we stand.",
      "Sorry. High priority matters delayed our response on {{tradeRef}}.",
      "Apologies for the slow turnaround on {{tradeRef}}. Here's the info."
    ],
    FORMAL: [
      "Please accept our apologies for the delayed response regarding Trade {{tradeRef}}. Due to the volume of queries and the need for internal coordination, there was an unavoidable delay. We are now able to address your inquiry.",
      "We apologise for the late reply on Trade {{tradeRef}}. The matter required consultation with the trading desk, which resulted in a longer response time than anticipated.",
      "Dear Colleague, we regret the delay in responding to your query regarding Trade {{tradeRef}}. We have now completed our review and wish to provide our findings.",
      "We acknowledge the delay in our response to your inquiry on Trade {{tradeRef}} and offer our sincere apologies. Our review is now complete.",
      "We wish to apologise for the delayed response concerning Trade {{tradeRef}}. The matter required careful verification which has now been concluded.",
      "Please accept our apologies for the tardiness of this response. Trade {{tradeRef}} has now been fully reviewed.",
      "We regret the delay in responding to your query. Trade {{tradeRef}} required additional verification time.",
      "Our apologies for the late reply on Trade {{tradeRef}}. The delay was due to necessary internal consultations.",
      "We apologise for the extended response time on Trade {{tradeRef}}. We have now completed our investigation.",
      "Dear Colleague, we regret the delay. Trade {{tradeRef}} has been reviewed and we can now provide our response."
    ],
    CAUTIOUS: [
      "We're sorry for the slow response on {{tradeRef}} — we had to coordinate internally before getting back to you. We wanted to make sure our answer was accurate before replying.",
      "Apologies for the delay on Trade {{tradeRef}}. We took extra time to verify the details carefully. Here's our response.",
      "We apologise for the extended response time on {{tradeRef}}. We preferred to be thorough rather than hasty.",
      "Sorry for the wait — we were being careful with Trade {{tradeRef}} to ensure accuracy. Here are our findings.",
      "Apologies for the slow turnaround. We wanted to double-check everything on {{tradeRef}} before responding.",
      "We're sorry this took longer than expected. We were verifying Trade {{tradeRef}} with multiple sources.",
      "Apologies for the delay. We wanted to be absolutely sure before providing our response on {{tradeRef}}.",
      "Sorry for the late reply. Trade {{tradeRef}} required careful verification before we could respond with confidence.",
      "We apologise for taking extra time. We wanted to ensure our response on {{tradeRef}} was complete and accurate.",
      "Delayed response — we apologise. We were being diligent in our review of {{tradeRef}}."
    ],
    BUREAUCRATIC: [
      "Reference: Trade {{tradeRef}}. We acknowledge the delay in our response, which was attributable to the standard internal review and coordination requirements. Our findings are provided below.",
      "Please accept our formal apologies for the delayed response on Trade {{tradeRef}}. The matter required escalation to the trading desk per established protocols.",
      "We note the extended response time for Trade {{tradeRef}}. This was necessitated by the complexity of the inquiry and the need for inter-desk coordination.",
      "Formal acknowledgment: response delay on Trade {{tradeRef}} was due to procedural requirements. Our review is now complete.",
      "Trade {{tradeRef}}: We regret the delay. Standard review protocols necessitated additional processing time.",
      "The delay in responding to your Trade {{tradeRef}} inquiry is acknowledged. The matter has now been resolved per established procedures.",
      "Apologies for the delayed response. Trade {{tradeRef}} required completion of the standard multi-desk review process.",
      "We acknowledge the extended processing time for Trade {{tradeRef}}. Internal coordination protocols have now been fulfilled.",
      "The response timeline for Trade {{tradeRef}} exceeded standard SLA due to inter-departmental review requirements.",
      "Trade {{tradeRef}}: formal apology for the delayed response. Standard verification procedures have now concluded."
    ]
  },

  ESCALATION_TO_TRADER: {
    COOPERATIVE: [
      "Hi team — this one needs the trader's input. We're escalating Trade {{tradeRef}} to the execution desk directly. We'll get back to you once we have their assessment.",
      "We need to check with the trader who executed Trade {{tradeRef}}. We're escalating this now and will relay their response as soon as we have it.",
      "Good question on Trade {{tradeRef}} — this is one we need to verify with the actual trader. Escalating now. We'll be back with their answer.",
      "We're pushing Trade {{tradeRef}} up to the trader for direct review. They'll have the most accurate information on this one.",
      "This needs the trader's direct input. We're escalating Trade {{tradeRef}} right now and will revert with their response.",
      "Escalating {{tradeRef}} to the trading desk. We want to make sure you get the most accurate response possible.",
      "The trader who booked {{tradeRef}} is the best person to answer this. We're reaching out to them now.",
      "We're looping in the trader on Trade {{tradeRef}}. Their direct input is needed to resolve this query.",
      "This one requires trader confirmation. We're escalating Trade {{tradeRef}} and will update you shortly.",
      "We've passed Trade {{tradeRef}} to the execution desk for their direct review. Will circle back with their response."
    ],
    EFFICIENT: [
      "Escalating {{tradeRef}} to trading desk. Will revert with their response.",
      "Trader input required for {{tradeRef}}. Escalated.",
      "Pushing {{tradeRef}} to execution desk for review.",
      "This needs trader confirmation. Escalated {{tradeRef}}.",
      "{{tradeRef}} escalated to trader. Awaiting response.",
      "Trader review required. {{tradeRef}} forwarded.",
      "Escalated. Will relay trader's response on {{tradeRef}}.",
      "Direct trader input needed for {{tradeRef}}. Escalating now.",
      "{{tradeRef}} forwarded to execution desk.",
      "Trader confirmation pending for {{tradeRef}}."
    ],
    FORMAL: [
      "We wish to advise that your query regarding Trade {{tradeRef}} has been escalated to the execution desk for the trader's direct review. We will relay their assessment to you upon receipt.",
      "This matter requires verification from the trader who executed Trade {{tradeRef}}. The query has been formally escalated to the trading desk.",
      "Dear Colleague, the complexity of the query on Trade {{tradeRef}} necessitates direct consultation with the execution trader. We have escalated accordingly.",
      "Please be advised that Trade {{tradeRef}} has been referred to the trading desk for their expert assessment. A response will be forthcoming.",
      "Your inquiry regarding Trade {{tradeRef}} requires trader-level verification. The matter has been escalated per our standard procedures.",
      "We are escalating Trade {{tradeRef}} to the execution desk for their direct review. This will ensure the most accurate response to your query.",
      "The nature of your query on Trade {{tradeRef}} requires input from the executing trader. Formal escalation has been initiated.",
      "Trade {{tradeRef}} has been referred to the relevant trader for review. We will communicate their findings to you promptly.",
      "We have determined that Trade {{tradeRef}} requires direct trader verification. The escalation is now in progress.",
      "This is to advise that your query on Trade {{tradeRef}} has been forwarded to the trading desk for their determination."
    ],
    CAUTIOUS: [
      "We've reviewed Trade {{tradeRef}} but we feel this needs the trader's direct input to be sure. We're escalating to the execution desk.",
      "Rather than risk providing inaccurate information, we're escalating Trade {{tradeRef}} to the trader who executed the deal.",
      "We want to be very careful with Trade {{tradeRef}}. We're checking with the actual trader before giving you a definitive answer.",
      "This query on Trade {{tradeRef}} requires more expertise than we can provide at the ops level. We're escalating to the trader.",
      "To ensure accuracy, we're consulting the trader who booked Trade {{tradeRef}}. We'll get back to you with their response.",
      "We'd rather get this right. Escalating Trade {{tradeRef}} to the execution desk for direct verification.",
      "We're not fully confident in our initial assessment of {{tradeRef}}. Escalating to the trader for clarification.",
      "Before we provide a final answer on {{tradeRef}}, we want the trader's confirmation. Escalating now.",
      "We think this needs the trader's expert opinion. Escalating Trade {{tradeRef}} to be safe.",
      "We're being cautious with {{tradeRef}} and escalating directly to the trader for their input."
    ],
    BUREAUCRATIC: [
      "Reference: Trade {{tradeRef}}. In accordance with our escalation protocol, this query has been forwarded to the execution desk for the trader's direct review and determination.",
      "Trade {{tradeRef}} has been formally escalated to the trading desk per the standard inter-desk escalation procedure. Response pending trader review.",
      "This matter has been escalated through the proper channels. Trade {{tradeRef}} is now under direct review by the execution team.",
      "Per established protocols, Trade {{tradeRef}} requires trader-level verification. The formal escalation process has been initiated.",
      "Escalation notice: Trade {{tradeRef}} has been referred to the execution desk as per the mandatory review escalation procedure.",
      "In accordance with our standard procedures, this query regarding Trade {{tradeRef}} has been escalated to the appropriate trading desk.",
      "Trade {{tradeRef}}: formal escalation initiated per protocol. Awaiting trader determination.",
      "Escalation protocol activated for Trade {{tradeRef}}. The matter is now with the execution team for their formal review.",
      "Per inter-desk escalation procedures, Trade {{tradeRef}} has been forwarded for trader-level review and resolution.",
      "This is a formal notification that Trade {{tradeRef}} has been escalated to the trading desk through the prescribed channels."
    ]
  },

  OUT_OF_OFFICE_MO: {
    COOPERATIVE: [
      "Hi! Thanks for your email regarding Trade {{tradeRef}}. I'm currently out of the office and will return on the next business day. Your message has been noted and a colleague will follow up if urgent. For immediate assistance, please contact the operations duty desk.",
      "Thanks for reaching out about {{tradeRef}}! I'm away from my desk today. Your query has been forwarded to the team. Someone will get back to you shortly.",
      "Hey — I'm out of office today. I've flagged your query on Trade {{tradeRef}} for the duty desk. They'll be in touch if it's urgent. Otherwise, I'll follow up when I'm back.",
      "Hi! I'm currently OOO but I've seen your message about {{tradeRef}}. The team is aware and will handle it in my absence.",
      "Thanks for your email on {{tradeRef}}. I'm out today but have passed your query to the team. They'll respond if action is needed.",
      "I'm out of the office today. Your query on Trade {{tradeRef}} has been forwarded to the on-duty team for handling.",
      "Hi! Not at my desk today. Trade {{tradeRef}} query has been noted — the team will pick it up.",
      "OOO today — but your query on {{tradeRef}} is being covered by the duty desk. Thanks for your patience!",
      "Currently out of office. Your message about Trade {{tradeRef}} has been flagged for the team.",
      "I'm away today but have ensured your {{tradeRef}} query is visible to the team. Someone will follow up."
    ],
    EFFICIENT: [
      "OOO. {{tradeRef}} query forwarded to duty desk.",
      "Out of office. Team will handle {{tradeRef}}.",
      "OOO today. Contact duty desk for urgent {{tradeRef}} queries.",
      "Away. {{tradeRef}} forwarded to on-duty team.",
      "OOO. Return: next business day. {{tradeRef}} noted.",
      "Currently OOO. Team has been notified about {{tradeRef}}.",
      "Out today. {{tradeRef}} covered by duty desk.",
      "OOO. Urgent: contact duty officer for {{tradeRef}}.",
      "Away from desk. {{tradeRef}} forwarded.",
      "Not available today. Team will respond on {{tradeRef}}."
    ],
    FORMAL: [
      "Thank you for your email regarding Trade {{tradeRef}}. I am currently out of the office and will return on the next business day. Your message has been forwarded to our operations duty officer. For urgent matters, please contact the operations desk directly.",
      "I acknowledge your query regarding Trade {{tradeRef}}. I am presently out of the office. Your message has been forwarded to the appropriate team for attention in my absence.",
      "Dear Colleague, thank you for your communication regarding Trade {{tradeRef}}. I am currently away from the office. An on-duty colleague has been made aware of your query.",
      "I am out of the office at this time. Your inquiry regarding Trade {{tradeRef}} has been noted and forwarded to the operations duty desk.",
      "Thank you for your message. I am currently unavailable. Your query on Trade {{tradeRef}} has been escalated to the duty team.",
      "I regret to advise that I am currently out of the office. Trade {{tradeRef}} will be attended to by the on-duty operations team.",
      "Please be advised that I am out of office. Your Trade {{tradeRef}} query has been forwarded to my designated cover.",
      "Thank you for your email. I am presently away. Trade {{tradeRef}} is being handled by the duty desk in my absence.",
      "I am currently on leave. Your query regarding Trade {{tradeRef}} has been forwarded to the appropriate contacts.",
      "Out of office notification: Your inquiry on Trade {{tradeRef}} has been redirected to the on-duty operations team."
    ],
    CAUTIOUS: [
      "Hi — I'm out of the office today, so I can't look into Trade {{tradeRef}} personally right now. I've forwarded your query to the duty desk to make sure it gets handled properly.",
      "I'm currently away. To be safe, I've forwarded your Trade {{tradeRef}} query to the on-duty team so it doesn't get missed.",
      "I'm OOO today. I want to make sure your query on {{tradeRef}} is properly handled, so I've alerted the duty officer.",
      "Not at my desk today. I've made sure your query on Trade {{tradeRef}} is visible to the team so nothing falls through the cracks.",
      "I'm out of office. To ensure your Trade {{tradeRef}} query receives proper attention, I've forwarded it to the duty desk.",
      "Away today — I've taken care to forward your {{tradeRef}} query to ensure it's handled appropriately.",
      "OOO today. I've made sure Trade {{tradeRef}} is on the team's radar so your query doesn't go unattended.",
      "I'm currently out. I want to be sure {{tradeRef}} gets the attention it needs, so I've flagged it for the duty team.",
      "Away from desk today. I've forwarded your {{tradeRef}} query to the on-duty team to be safe.",
      "I'm out today but have ensured your Trade {{tradeRef}} message is being monitored by the duty desk."
    ],
    BUREAUCRATIC: [
      "Auto-response: The recipient is currently out of office. Your inquiry regarding Trade {{tradeRef}} has been logged and forwarded to the operations duty desk. For urgent matters, please contact the duty officer directly.",
      "Out of office notification. This is an automated response. Your query regarding Trade {{tradeRef}} has been forwarded to the designated coverage team per standard absence protocols.",
      "The addressee is currently unavailable. Per established protocols, your query on Trade {{tradeRef}} has been redirected to the on-duty operations team.",
      "Auto-reply: Out of Office. Trade {{tradeRef}} inquiry noted and forwarded per standard operating procedures.",
      "OOO: This message is auto-generated. Your Trade {{tradeRef}} query will be handled by the designated cover per our absence management policy.",
      "Automated response: The recipient is on leave. Trade {{tradeRef}} has been referred to the duty desk per protocol.",
      "Out of office. Return: next business day. Your query (Trade {{tradeRef}}) has been forwarded per established procedures.",
      "Auto-response: Currently OOO. Trade {{tradeRef}} query routed to duty operations team.",
      "The recipient is currently out of office. Standard procedures have been followed to ensure your Trade {{tradeRef}} query is attended to.",
      "OOO notice: Your inquiry on Trade {{tradeRef}} has been auto-forwarded to the operations duty desk for processing."
    ]
  },

  GENERIC_SAFE_MO: {
    COOPERATIVE: [
      "Hi! Thanks for reaching out about Trade {{tradeRef}}. We're reviewing the details on our end and will get back to you shortly. Please hold processing until we confirm.",
      "Thanks for your message on {{tradeRef}}. We're looking into this and will provide a full response soon.",
      "Got your query on Trade {{tradeRef}}. We're on it! Will revert once we've reviewed everything.",
      "Hi team — your message about {{tradeRef}} is being reviewed. We'll have an update for you shortly.",
      "We're reviewing Trade {{tradeRef}} now. Thanks for your patience — we'll respond as soon as we can.",
      "Thanks for flagging {{tradeRef}}. Our team is looking into it and will circle back.",
      "We've received your query on Trade {{tradeRef}} and are reviewing it. Stand by for our response.",
      "Hi! We're working on your query for {{tradeRef}}. Will get back to you with our findings.",
      "Trade {{tradeRef}} is being reviewed by our desk. We'll update you shortly. Thanks!",
      "Your message on {{tradeRef}} has been received. We're checking and will respond soon."
    ],
    EFFICIENT: [
      "{{tradeRef}} under review. Will revert.",
      "Received. Reviewing {{tradeRef}} now.",
      "Noted. Response coming shortly for {{tradeRef}}.",
      "Query on {{tradeRef}} acknowledged. Reviewing.",
      "Looking into {{tradeRef}}. Stand by.",
      "{{tradeRef}} being checked. Will respond.",
      "Acknowledged. Under review.",
      "Checking {{tradeRef}}. Response to follow.",
      "{{tradeRef}} noted. Reviewing.",
      "On it. Will update on {{tradeRef}}."
    ],
    FORMAL: [
      "Thank you for your message regarding Trade {{tradeRef}}. We are reviewing the matter and will provide our response at the earliest opportunity. Please refrain from further processing until you hear from us.",
      "We acknowledge your inquiry on Trade {{tradeRef}}. Our team is reviewing the details and will revert in due course.",
      "Your query regarding Trade {{tradeRef}} has been received and is under review. A response will be provided shortly.",
      "We have noted your message concerning Trade {{tradeRef}}. A thorough review is underway.",
      "Thank you for bringing Trade {{tradeRef}} to our attention. We will respond once our review is complete.",
      "We acknowledge receipt of your inquiry. Trade {{tradeRef}} is being reviewed by the appropriate team.",
      "Your message has been noted. Trade {{tradeRef}} is under review and we will respond accordingly.",
      "We are in receipt of your query on Trade {{tradeRef}}. A response will be forthcoming.",
      "Thank you for your communication. We are reviewing Trade {{tradeRef}} and will provide our assessment shortly.",
      "Your inquiry on Trade {{tradeRef}} has been logged. We will revert upon completion of our review."
    ],
    CAUTIOUS: [
      "We've received your message about Trade {{tradeRef}}. We're going to review this carefully before responding to make sure we give you accurate information.",
      "Thanks for your query on {{tradeRef}}. We want to be thorough in our review, so please give us some time to respond properly.",
      "We're looking into Trade {{tradeRef}} but want to make sure we check all the relevant details before responding.",
      "Your query on {{tradeRef}} has been noted. We're being careful to verify everything before providing our answer.",
      "We've received your message and are reviewing Trade {{tradeRef}} carefully. We'll respond once we're confident in our findings.",
      "Thanks for reaching out on {{tradeRef}}. We're taking time to review this properly before responding.",
      "We're reviewing Trade {{tradeRef}} with care. We'll get back to you once we've verified all the details.",
      "Your query on {{tradeRef}} is being handled. We want to be sure of our response before sending it.",
      "We've noted your message on Trade {{tradeRef}}. Reviewing carefully and will respond when ready.",
      "Taking a careful look at Trade {{tradeRef}}. We'll respond once we're satisfied with our findings."
    ],
    BUREAUCRATIC: [
      "Your inquiry regarding Trade {{tradeRef}} has been received and logged. It is currently being processed in accordance with our standard review procedures. A formal response will be issued upon completion.",
      "Reference: Trade {{tradeRef}}. Your query has been entered into our processing queue. A response will be provided per standard operating procedures.",
      "Acknowledgment: Query received for Trade {{tradeRef}}. Processing underway per established protocols.",
      "Your message regarding Trade {{tradeRef}} has been logged in our query management system. Response pending standard review.",
      "Trade {{tradeRef}}: Inquiry noted and logged. Under review per standard procedures.",
      "Your query has been received and registered. Trade {{tradeRef}} is subject to our standard review workflow.",
      "Formal acknowledgment: Trade {{tradeRef}} query logged. Response will be issued per SLA.",
      "Trade {{tradeRef}}: Your inquiry is being processed through the established review channels.",
      "Received and logged. Trade {{tradeRef}} is in the standard review queue.",
      "Your Trade {{tradeRef}} query has been formally acknowledged and is under procedural review."
    ]
  }
};
