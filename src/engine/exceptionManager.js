// ---------------------------------
// Exception Manager (V2)
// ---------------------------------

function handleException(trade, reason) {
  trade.settlementOperationalStatus = "FAILED_SETTLEMENT";
  
  // Here we would typically push an event to the Inbox
  return {
    message: "Trade moved to exception queue.",
    reason
  };
}

function resolveException(trade, resolutionAction) {
  // E.g., user updates account or resubmits
  trade.settlementOperationalStatus = "READY_TO_SETTLE";
  return {
    message: "Exception resolved, ready for retry."
  };
}

module.exports = {
  handleException,
  resolveException
};
