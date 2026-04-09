import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface AdminDashboardSummaryPriorityAlertsItem {
  type: string;
  message: string;
  severity: string;
  residentId?: number | null;
  entityId?: number | null;
}

export interface AdminDashboardSummary {
  totalResidents?: number;
  activeResidents: number;
  residentsByRisk: { riskLevel?: string; count?: number; safehouse?: string; low?: number; medium?: number; high?: number; critical?: number }[];
  openIncidents?: number;
  upcomingConferences?: number;
  upcomingCaseConferences?: number;
  priorityAlerts: AdminDashboardSummaryPriorityAlertsItem[];
  highRiskResidents?: number;
  incidentsThisWeek?: number;
  admissionsThisMonth?: number;
  overdueFollowUps?: number;
  socialReferralsThisMonth?: number;
  donationTotalThisMonth?: number;
  donationTrend?: { month: string; amount: number; count: number }[];
  mlAlerts?: import("./ml.service").MlPrediction[];
  reintegrationBreakdown?: { notStarted: number; inProgress: number; ready: number; completed: number };
  processRecordingsThisWeek?: number;
  activeInterventionPlans?: number;
}

export interface Incident {
  incidentId?: number | null;
  id?: number | null;
  residentId?: number | null;
  safehouseId?: number | null;
  incidentDate?: string | null;
  incidentType?: string | null;
  severity?: string | null;
  description?: string | null;
  responseTaken?: string | null;
  resolved?: boolean | null;
  resolutionDate?: string | null;
  reportedBy?: string | null;
  followUpRequired?: boolean | null;
  status?: string | null;
  safehouseName?: string | null;
  residentCode?: string | null;
}

export interface ProcessRecording {
  recordingId?: number | null;
  id?: number | null;
  residentId?: number | null;
  sessionDate?: string | null;
  socialWorker?: string | null;
  workerName?: string | null;
  sessionType?: string | null;
  sessionDurationMinutes?: number | null;
  emotionalStateObserved?: string | null;
  emotionalStateEnd?: string | null;
  sessionNarrative?: string | null;
  sessionNotes?: string | null;
  interventionsApplied?: string | null;
  followUpActions?: string | null;
  concernsFlagged?: boolean | null;
  concernFlag?: boolean | null;
  progressNoted?: boolean | null;
  referralMade?: boolean | null;
  residentCode?: string | null;
}

export interface HomeVisitation {
  visitationId?: number | null;
  id?: number | null;
  residentId?: number | null;
  visitDate?: string | null;
  socialWorker?: string | null;
  visitType?: string | null;
  locationVisited?: string | null;
  familyMembersPresent?: string | null;
  purpose?: string | null;
  observations?: string | null;
  familyCooperationLevel?: string | null;
  safetyConcernsNoted?: boolean | null;
  safetyConcern?: boolean | null;
  followUpNeeded?: boolean | null;
  followUpNotes?: string | null;
  visitOutcome?: string | null;
  notes?: string | null;
  outcome?: string | null;
}

export interface CaseConference {
  conferenceId?: number | null;
  id?: number | null;
  residentId?: number | null;
  conferenceDate?: string | null;
  scheduledDate?: string | null;
  conferenceType?: string | null;
  summary?: string | null;
  decisionsMade?: string | null;
  decisions?: string | null;
  nextSteps?: string | null;
  nextConferenceDate?: string | null;
  createdBy?: string | null;
  residentCode?: string | null;
  status?: string | null;
}

export interface InterventionPlan {
  planId?: number | null;
  id?: number | null;
  residentId?: number | null;
  planCategory?: string | null;
  planDescription?: string | null;
  category?: string | null;
  title?: string | null;
  servicesProvided?: string | null;
  targetValue?: number | null;
  targetDate?: string | null;
  status?: string | null;
  caseConferenceDate?: string | null;
  notes?: string | null;
  residentCode?: string | null;
}

export interface ReportAccomplishment {
  id?: number;
  period?: string;
  description?: string;
  title?: string | null;
  category?: string | null;
}

export function useGetAdminDashboardSummary() {
  return useQuery<AdminDashboardSummary>({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiFetch("/api/dashboard/admin-summary"),
  });
}

export function useListIncidents(params?: { page?: number; pageSize?: number; safehouseId?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.safehouseId) s.set("safehouseId", String(params.safehouseId));
  const qs = s.toString();
  return useQuery<{ data: Incident[]; total: number }>({
    queryKey: ["incidents", params],
    queryFn: () => apiFetch(`/api/incident-reports${qs ? `?${qs}` : ""}`),
  });
}

export function useListProcessRecordings(params?: { page?: number; pageSize?: number; residentId?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.residentId) s.set("residentId", String(params.residentId));
  const qs = s.toString();
  return useQuery<{ data: ProcessRecording[]; total: number }>({
    queryKey: ["process-recordings", params],
    queryFn: () => apiFetch(`/api/process-recordings${qs ? `?${qs}` : ""}`),
  });
}

export function useListHomeVisitations(params?: { page?: number; pageSize?: number; residentId?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.residentId) s.set("residentId", String(params.residentId));
  const qs = s.toString();
  return useQuery<{ data: HomeVisitation[]; total: number }>({
    queryKey: ["home-visitations", params],
    queryFn: () => apiFetch(`/api/home-visitations${qs ? `?${qs}` : ""}`),
  });
}

export function useListCaseConferences(params?: { page?: number; pageSize?: number; residentId?: number; status?: string }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.residentId) s.set("residentId", String(params.residentId));
  if (params?.status) s.set("status", params.status);
  const qs = s.toString();
  return useQuery<{ data: CaseConference[]; total: number }>({
    queryKey: ["case-conferences", params],
    queryFn: () => apiFetch(`/api/case-conferences${qs ? `?${qs}` : ""}`),
  });
}

export function useListInterventionPlans(params?: { page?: number; pageSize?: number; residentId?: number; status?: string }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.residentId) s.set("residentId", String(params.residentId));
  if (params?.status) s.set("status", params.status);
  const qs = s.toString();
  return useQuery<{ data: InterventionPlan[]; total: number }>({
    queryKey: ["intervention-plans", params],
    queryFn: () => apiFetch(`/api/intervention-plans${qs ? `?${qs}` : ""}`),
  });
}

export interface ReportReintegrationStat {
  status?: string;
  count?: number;
  percentage?: number;
  reintegrationType?: string;
}

export function useGetReportDonationTrends() {
  return useQuery<{ data: { month: string; total: number; count: number }[] }>({
    queryKey: ["reports", "donation-trends"],
    queryFn: () => apiFetch("/api/donations/trends"),
  });
}

export function useGetReportAccomplishments() {
  return useQuery<{ data: ReportAccomplishment[] }>({
    queryKey: ["reports", "accomplishments"],
    queryFn: () => apiFetch("/api/impact-snapshots"),
  });
}

export function useGetReportReintegrationStats() {
  return useQuery<{ data: ReportReintegrationStat[] }>({
    queryKey: ["reports", "reintegration-stats"],
    queryFn: () => apiFetch("/api/residents/stats"),
  });
}
