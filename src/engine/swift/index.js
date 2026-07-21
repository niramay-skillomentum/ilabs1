// ======================================
// SWIFT MODULE ENTRY POINT
// Re-exports the public API of the SWIFT engine.
//
// Usage:
//   const swift = require("./engine/swift");
//   await swift.generateSwiftMessages(tradeRef, userId);
// ======================================

const SwiftEngine = require("./SwiftEngine");
const SwiftFactory = require("./SwiftFactory");
const SwiftRenderer = require("./renderers/SwiftRenderer");
const SwiftValidator = require("./validators/SwiftValidator");
const PaymentInstruction = require("./PaymentInstruction");

module.exports = {
  // Primary API
  generateSwiftMessages: SwiftEngine.generateSwiftMessages,
  getMessagesForTrade: SwiftEngine.getMessagesForTrade,
  getMessageById: SwiftEngine.getMessageById,
  regenerateSwiftMessages: SwiftEngine.regenerateSwiftMessages,

  // Submodules (for testing / advanced usage)
  SwiftEngine,
  SwiftFactory,
  SwiftRenderer,
  SwiftValidator,
  PaymentInstruction
};
