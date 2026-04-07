import { readSheetAsObjects } from "@/lib/google/sheets";
import { SHEETS } from "@/types/sheets";
import { Dimension, DimensionValue, DefaultDimension, DimensionFields } from "@/types/entities";
import { ValuePostingRule } from "@/types/enums";

// ── Resolve dimension values with 6-level inheritance priority ──
// Priority (highest to lowest):
//   1. User override (explicitly set on transaction)
//   2. Item default
//   3. Entity (Client/Vendor/Employee) default
//   4. Account default
//   5. Global default (Dimensions sheet Default_Value)
//   6. Blank (allowed only if Is_Required = FALSE)

export interface DimensionResolutionInput {
  userDimensions?: DimensionFields;
  itemId?: string;
  entityId?: string;
  accountCode?: string;
}

export async function resolveDimensions(input: DimensionResolutionInput): Promise<DimensionFields> {
  const [dimensions, defaultDims] = await Promise.all([
    readSheetAsObjects<Dimension>(SHEETS.Dimensions),
    readSheetAsObjects<DefaultDimension>(SHEETS.DefaultDimensions),
  ]);

  const resolved: DimensionFields = {};

  for (let slot = 1; slot <= 8; slot++) {
    const key = `Dimension_${slot}` as keyof DimensionFields;
    const dimConfig = dimensions.find((d) => d.Dim_Slot === slot);

    // 1. User override
    if (input.userDimensions?.[key]) {
      resolved[key] = input.userDimensions[key];
      continue;
    }

    // 2. Item default
    if (input.itemId) {
      const itemDefault = defaultDims.find(
        (d) => d.Table_Name === "Items" && d.Record_ID === input.itemId && d.Dim_Slot === slot
      );
      if (itemDefault?.Value_Code) {
        resolved[key] = itemDefault.Value_Code;
        continue;
      }
    }

    // 3. Entity default
    if (input.entityId) {
      const entityDefault = defaultDims.find(
        (d) =>
          (d.Table_Name === "Clients" ||
            d.Table_Name === "Vendors" ||
            d.Table_Name === "Employees") &&
          d.Record_ID === input.entityId &&
          d.Dim_Slot === slot
      );
      if (entityDefault?.Value_Code) {
        resolved[key] = entityDefault.Value_Code;
        continue;
      }
    }

    // 4. Account default
    if (input.accountCode) {
      const accountDefault = defaultDims.find(
        (d) => d.Table_Name === "Chart_of_Accounts" && d.Record_ID === input.accountCode && d.Dim_Slot === slot
      );
      if (accountDefault?.Value_Code) {
        resolved[key] = accountDefault.Value_Code;
        continue;
      }
    }

    // 5. Global default
    if (dimConfig?.Default_Value) {
      resolved[key] = dimConfig.Default_Value;
      continue;
    }

    // 6. Blank (acceptable if not required)
    resolved[key] = "";
  }

  return resolved;
}

// ── Validate dimensions on a posting ──
export interface DimensionValidationError {
  slot: number;
  code: string;
  message: string;
}

export async function validateDimensions(
  dims: DimensionFields
): Promise<DimensionValidationError[]> {
  const [dimensions, dimValues] = await Promise.all([
    readSheetAsObjects<Dimension>(SHEETS.Dimensions),
    readSheetAsObjects<DimensionValue>(SHEETS.DimensionValues),
  ]);

  const errors: DimensionValidationError[] = [];

  for (let slot = 1; slot <= 8; slot++) {
    const key = `Dimension_${slot}` as keyof DimensionFields;
    const value = dims[key];
    const dimConfig = dimensions.find((d) => d.Dim_Slot === slot);

    if (!dimConfig) continue;

    // Check required
    if (dimConfig.Is_Required && !value) {
      errors.push({
        slot,
        code: dimConfig.Dimension_Code,
        message: `Dimension ${slot} (${dimConfig.Dimension_Name}) is required`,
      });
      continue;
    }

    if (!value) continue;

    // Check value exists in Dimension_Values
    const dimVal = dimValues.find(
      (dv) => dv.Dim_Slot === slot && dv.Value_Code === value
    );

    if (!dimVal) {
      errors.push({
        slot,
        code: dimConfig.Dimension_Code,
        message: `Value '${value}' not found for dimension ${dimConfig.Dimension_Name}`,
      });
      continue;
    }

    // Check active
    if (!dimVal.Is_Active) {
      errors.push({
        slot,
        code: dimConfig.Dimension_Code,
        message: `Dimension value '${value}' is inactive`,
      });
      continue;
    }

    // Check not blocked
    if (dimVal.Blocked) {
      errors.push({
        slot,
        code: dimConfig.Dimension_Code,
        message: `Dimension value '${value}' is blocked`,
      });
    }
  }

  return errors;
}

// ── Extract dimension fields from any entity ──
export function extractDimensions(obj: DimensionFields): DimensionFields {
  return {
    Dimension_1: obj.Dimension_1 ?? "",
    Dimension_2: obj.Dimension_2 ?? "",
    Dimension_3: obj.Dimension_3 ?? "",
    Dimension_4: obj.Dimension_4 ?? "",
    Dimension_5: obj.Dimension_5 ?? "",
    Dimension_6: obj.Dimension_6 ?? "",
    Dimension_7: obj.Dimension_7 ?? "",
    Dimension_8: obj.Dimension_8 ?? "",
  };
}

// ── Build dimension array (ordered 1-8) for sheet row ──
export function dimensionArray(dims: DimensionFields): string[] {
  return [
    dims.Dimension_1 ?? "",
    dims.Dimension_2 ?? "",
    dims.Dimension_3 ?? "",
    dims.Dimension_4 ?? "",
    dims.Dimension_5 ?? "",
    dims.Dimension_6 ?? "",
    dims.Dimension_7 ?? "",
    dims.Dimension_8 ?? "",
  ];
}
