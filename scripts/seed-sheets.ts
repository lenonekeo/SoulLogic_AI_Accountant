// seed-sheets.ts — Initialize all 20 Google Sheets tabs with correct headers
// Run: npm run seed:sheets

import "dotenv/config";
import { initializeSheet } from "../src/lib/google/sheets";
import { SHEETS } from "../src/types/sheets";
import { runSeed } from "./target";

async function seedSheets() {
  const sheetNames = Object.values(SHEETS);
  console.log(`Initializing ${sheetNames.length} sheets...`);

  for (const sheetName of sheetNames) {
    try {
      await initializeSheet(sheetName);
      console.log(`✓ ${sheetName}`);
    } catch (err) {
      console.error(`✗ ${sheetName}:`, err);
    }
  }

  console.log("\nAll sheets initialized.");
}

runSeed(seedSheets).catch(console.error);
