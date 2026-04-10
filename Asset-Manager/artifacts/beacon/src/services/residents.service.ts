import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "./api";

export interface Resident {
  residentId?: number | null;
  id?: number | null;
  caseControlNo?: string | null;
  internalCode?: string | null;
  residentCode?: string | null;
  safehouseId?: number | null;
  safehouseName?: string | null;
  caseStatus?: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
  birthStatus?: string | null;
  placeOfBirth?: string | null;
  religion?: string | null;
  dateOfAdmission?: string | null;
  admissionDate?: string | null;
  ageUponAdmission?: string | null;
  presentAge?: string | null;
  lengthOfStay?: string | null;
  dateClosed?: string | null;
  dischargeDate?: string | null;
  dateEnrolled?: string | null;
  caseCategory?: string | null;
  subCatOrphaned?: boolean | null;
  subCatTrafficked?: boolean | null;
  subCatChildLabor?: boolean | null;
  subCatPhysicalAbuse?: boolean | null;
  subCatSexualAbuse?: boolean | null;
  subCatOsaec?: boolean | null;
  subCatCicl?: boolean | null;
  subCatAtRisk?: boolean | null;
  subCatStreetChild?: boolean | null;
  subCatChildWithHiv?: boolean | null;
  isPwd?: boolean | null;
  pwdType?: string | null;
  hasSpecialNeeds?: boolean | null;
  specialNeedsDiagnosis?: string | null;
  familyIs4ps?: boolean | null;
  familySoloParent?: boolean | null;
  familyIndigenous?: boolean | null;
  familyParentPwd?: boolean | null;
  familyInformalSettler?: boolean | null;
  referralSource?: string | null;
  referringAgencyPerson?: string | null;
  dateColbRegistered?: string | null;
  dateColbObtained?: string | null;
  assignedSocialWorker?: string | null;
  assignedWorkerName?: string | null;
  initialCaseAssessment?: string | null;
  dateCaseStudyPrepared?: string | null;
  initialRiskLevel?: string | null;
  currentRiskLevel?: string | null;
  riskLevel?: string | null;
  reintegrationStatus?: string | null;
  reintegrationType?: string | null;
  notesRestricted?: string | null;
  createdAt?: string | null;
}

export interface ResidentStats {
  total?: number;
  active?: number;
  totalActive?: number;
  newAdmissions?: number;
  highRiskResidents?: number;
  casesNeedingUpdate?: number;
  byRisk?: Record<string, number>;
  riskDistribution?: { level: string; count: number }[];
  statusDistribution?: { status: string; count: number }[];
}

export interface EducationRecord {
  educationRecordId?: number | null;
  residentId?: number | null;
  recordDate?: string | null;
  educationLevel?: string | null;
  schoolName?: string | null;
  enrollmentStatus?: string | null;
  attendanceRate?: number | null;
  progressPercent?: number | null;
  completionStatus?: string | null;
  notes?: string | null;
}

export interface HealthRecord {
  healthRecordId?: number | null;
  residentId?: number | null;
  recordDate?: string | null;
  generalHealthScore?: number | null;
  nutritionScore?: number | null;
  sleepQualityScore?: number | null;
  energyLevelScore?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  medicalCheckupDone?: boolean | null;
  dentalCheckupDone?: boolean | null;
  psychologicalCheckupDone?: boolean | null;
  notes?: string | null;
}

export function useListResidents(params?: { page?: number; pageSize?: number; safehouseId?: number; caseStatus?: string }) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.safehouseId) search.set("safehouseId", String(params.safehouseId));
  if (params?.caseStatus) search.set("caseStatus", params.caseStatus);
  const qs = search.toString();
  return useQuery<{ data: Resident[]; total: number }>({
    queryKey: ["residents", params],
    queryFn: () => apiFetch(`/api/residents${qs ? `?${qs}` : ""}`),
  });
}

export function useGetResidentStats(params?: { safehouseId?: number }) {
  const search = new URLSearchParams();
  if (params?.safehouseId) search.set("safehouseId", String(params.safehouseId));
  const qs = search.toString();
  return useQuery<ResidentStats>({
    queryKey: ["residents", "stats", params],
    queryFn: () => apiFetch(`/api/residents/stats${qs ? `?${qs}` : ""}`),
  });
}

export function useGetResident(id: number | string | null) {
  return useQuery<Resident>({
    queryKey: ["residents", id],
    queryFn: () => apiFetch(`/api/residents/${id}`),
    enabled: !!id,
  });
}

export function useGetResidentTimeline(id: number | string | null) {
  return useQuery<unknown[]>({
    queryKey: ["residents", id, "timeline"],
    queryFn: () => apiFetch(`/api/residents/${id}/timeline`),
    enabled: !!id,
  });
}

export function useListEducationRecords(residentId: number | null) {
  return useQuery<{ data: EducationRecord[]; total: number }>({
    queryKey: ["education-records", residentId],
    queryFn: () => apiFetch(`/api/education-records?residentId=${residentId}&limit=100`),
    enabled: !!residentId,
  });
}

export function useListHealthRecords(residentId: number | null) {
  return useQuery<{ data: HealthRecord[]; total: number }>({
    queryKey: ["health-records", residentId],
    queryFn: () => apiFetch(`/api/health-records?residentId=${residentId}&limit=100`),
    enabled: !!residentId,
  });
}

export function useCreateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<Resident>("/api/residents", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["residents"] });
    },
  });
}

export function useUpdateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiPatch<Resident>(`/api/residents/${id}`, body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["residents", variables.id] });
      qc.invalidateQueries({ queryKey: ["residents", "stats"] });
    },
  });
}

export function useDeleteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/residents/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["residents", id] });
      qc.invalidateQueries({ queryKey: ["residents", "stats"] });
    },
  });
}
