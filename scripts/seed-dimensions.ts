// seed-dimensions.ts — Seed the 8 default dimension slots
// Run: npm run seed:dimensions

import "dotenv/config";
import { appendRow } from "../src/lib/google/sheets";
import { SHEETS } from "../src/types/sheets";
import { runSeed } from "./target";

const today = new Date().toISOString().split("T")[0];

const DIMENSION_SEEDS = [
  ["1", "DEPT", "Department", "Business department or cost centre", "FALSE", "TRUE", "", "", today, ""],
  ["2", "PROJ", "Project", "Project or client engagement code", "FALSE", "TRUE", "", "", today, ""],
  ["3", "LOC", "Location", "Physical or operational location", "FALSE", "TRUE", "", "", today, ""],
  ["4", "CLASS", "Class", "Business classification", "FALSE", "TRUE", "", "", today, ""],
  ["5", "FUND", "Fund", "Funding source or grant", "FALSE", "TRUE", "", "", today, ""],
  ["6", "REGION", "Region", "Geographic region", "FALSE", "TRUE", "", "", today, ""],
  ["7", "PRODUCT", "Product Line", "Product or service line", "FALSE", "TRUE", "", "", today, ""],
  ["8", "CUSTOM1", "Custom 1", "User-defined dimension", "FALSE", "TRUE", "", "", today, ""],
];

async function seedDimensions() {
  console.log(`Seeding ${DIMENSION_SEEDS.length} dimension slots...`);

  for (const row of DIMENSION_SEEDS) {
    try {
      await appendRow(SHEETS.Dimensions, row);
      console.log(`✓ Slot ${row[0]}: ${row[2]}`);
    } catch (err) {
      console.error(`✗ Slot ${row[0]}:`, err);
    }
  }

  console.log("\nDimension slots seeded.");
}

runSeed(seedDimensions).catch(console.error);
