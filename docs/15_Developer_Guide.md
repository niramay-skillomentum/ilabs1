# 15. Developer Guide

This guide provides instructions for extending the SGB Operations Simulator.

## How to Add a New API Route

1. **Create the Controller File:**
   - Create a new file in `src/routes/` (e.g., `reportRoutes.js`).
   - Require `express` and instantiate a router: `const router = express.Router();`
2. **Mount the Route in `server.js`:**
   - Add `app.use("/api/reports", require("./src/routes/reportRoutes"));`
3. **Write the Endpoint:**
   - Use the auth middleware if the route should be protected.
   ```javascript
   const { authenticateToken } = require("../middleware/auth");
   router.get("/summary", authenticateToken, async (req, res) => {
       // Logic here. Use req.user.userId
       res.json({ success: true });
   });
   ```

## How to Add a New Database Model

1. **Create the Schema:**
   - Create a file in `src/models/` (e.g., `Report.js`).
   - Use Mongoose to define the schema.
   ```javascript
   const mongoose = require("mongoose");
   const ReportSchema = new mongoose.Schema({
       title: String,
       createdAt: { type: Date, default: Date.now }
   });
   module.exports = mongoose.model("Report", ReportSchema);
   ```
2. **Import and Use:**
   - Require it in your routes or engine files: `const Report = require("../models/Report");`

## How to Add a New Frontend Page

1. **Create the Route Folder:**
   - In `frontend/src/app/`, create a new folder (e.g., `reports/`).
2. **Create the Component:**
   - Inside that folder, create `page.js`.
   ```javascript
   "use client";
   import { useEffect, useState } from "react";
   
   export default function ReportsPage() {
       return <div>Reports Dashboard</div>;
   }
   ```
3. **Link to it:**
   - Use Next.js `<Link href="/reports">` or `router.push("/reports")`.

## Glossary

- **MO (Middle Office):** The desk responsible for validating trade economics and escalating breaks to the Front Office.
- **Confirmation Desk:** The desk responsible for matching trade economics with the external Counterparty via emails or electronic matching platforms.
- **Settlement Desk:** The desk responsible for ensuring cash/assets are correctly transferred on the Value Date.
- **FO (Front Office):** The trading desk. In this simulator, represented by an LLM that responds to internal escalations.
- **CPTY (Counterparty):** The external entity the bank traded with. Represented by an LLM.
- **TradeRef:** The unique identifier for a trade (e.g., "TRD_12345").
- **Truths:** Immutable data objects attached to a Trade model used to simulate what the actual correct data is versus what was erroneously booked into the system.
