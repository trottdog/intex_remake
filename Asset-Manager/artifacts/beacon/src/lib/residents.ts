import type { Resident } from "@/services/residents.service";

type ResidentRiskSource = Pick<Resident, "currentRiskLevel" | "riskLevel">;
type ResidentStatusSource = Pick<Resident, "caseStatus">;

export function getResidentRiskLevel(resident: ResidentRiskSource): string | null {
  const riskLevel = resident.currentRiskLevel ?? resident.riskLevel;
  return riskLevel?.trim().toLowerCase() ?? null;
}

export function isHighOrCriticalRisk(resident: ResidentRiskSource): boolean {
  const riskLevel = getResidentRiskLevel(resident);
  return riskLevel === "high" || riskLevel === "critical";
}

export function isActiveResident(resident: ResidentStatusSource): boolean {
  return resident.caseStatus?.trim().toLowerCase() === "active";
}
