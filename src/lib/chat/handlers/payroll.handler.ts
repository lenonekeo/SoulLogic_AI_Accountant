import { IntentResult } from "@/types/api";
import { ChatContext, HandlerResult } from "../router";
import { resolveEntities } from "@/lib/voice/entity-extractor";

export async function handlePayroll(intent: IntentResult, ctx: ChatContext): Promise<HandlerResult> {
  const en = ctx.language !== "fr";
  const entities = await resolveEntities(intent);

  if (!entities.employeeId) {
    return { message: en ? "Which employee is this payroll for?" : "Pour quel employé est cette paie?" };
  }

  return {
    message: en
      ? `Creating payroll run for ${entities.employeeName}. Please specify: pay period start, end, and hours worked.`
      : `Création d'une fiche de paie pour ${entities.employeeName}. Veuillez préciser: début et fin de la période de paie, et les heures travaillées.`,
    requiresConfirmation: false,
    data: { employeeId: entities.employeeId, employeeName: entities.employeeName },
  };
}
