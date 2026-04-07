import { IntentResult } from "@/types/api";
import { fuzzyMatch } from "./fuzzy-match";
import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Client, Vendor, Employee, Item } from "@/types/entities";

export interface ResolvedEntities {
  clientId?: string;
  clientName?: string;
  vendorId?: string;
  vendorName?: string;
  employeeId?: string;
  employeeName?: string;
  itemId?: string;
  itemName?: string;
  amount?: number;
}

// ── Resolve entity names from intent result to actual IDs ──
export async function resolveEntities(intent: IntentResult): Promise<ResolvedEntities> {
  const resolved: ResolvedEntities = {};

  if (intent.entities.amount) {
    resolved.amount = intent.entities.amount;
  }

  if (intent.entities.client_name) {
    const clients = await readSheetAsObjects<Client>(SHEETS.Clients);
    const match = fuzzyMatch(
      intent.entities.client_name,
      clients.map((c) => ({ id: c.Client_ID, name: c.Company_Name }))
    );
    if (match) {
      resolved.clientId = match.id;
      resolved.clientName = match.name;
    }
  }

  if (intent.entities.vendor_name) {
    const vendors = await readSheetAsObjects<Vendor>(SHEETS.Vendors);
    const match = fuzzyMatch(
      intent.entities.vendor_name,
      vendors.map((v) => ({ id: v.Vendor_ID, name: v.Company_Name }))
    );
    if (match) {
      resolved.vendorId = match.id;
      resolved.vendorName = match.name;
    }
  }

  if (intent.entities.employee_name) {
    const employees = await readSheetAsObjects<Employee>(SHEETS.Employees);
    const match = fuzzyMatch(
      intent.entities.employee_name,
      employees.map((e) => ({ id: e.Employee_ID, name: `${e.First_Name} ${e.Last_Name}` }))
    );
    if (match) {
      resolved.employeeId = match.id;
      resolved.employeeName = match.name;
    }
  }

  if (intent.entities.item_name) {
    const items = await readSheetAsObjects<Item>(SHEETS.Items);
    const match = fuzzyMatch(
      intent.entities.item_name,
      items.map((i) => ({ id: i.Item_ID, name: i.Item_Name }))
    );
    if (match) {
      resolved.itemId = match.id;
      resolved.itemName = match.name;
    }
  }

  return resolved;
}
