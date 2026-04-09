import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiPost, apiPatch, apiDelete } from "./api";

export interface SafehouseBreakdownItem {
  safehouseId?: number;
  name?: string | null;
  status?: string | null;
  region?: string | null;
  capacityGirls?: number;
  currentOccupancy?: number;
  occupancyPct?: number;
  activeResidents?: number;
  totalResidents?: number;
  highRiskCount?: number;
  openIncidents?: number;
  riskLow?: number;
  riskMedium?: number;
  riskHigh?: number;
  riskCritical?: number;
}

export interface RecentIncident {
  incidentId?: number;
  incidentDate?: string | null;
  incidentType?: string | null;
  severity?: string | null;
  status?: string | null;
  safehouseName?: string | null;
  residentId?: number | null;
}

export interface UpcomingConference {
  conferenceId?: number;
  conferenceDate?: string | null;
  conferenceType?: string | null;
  status?: string | null;
  residentId?: number | null;
}

export interface MlAlert {
  predictionId?: number;
  entityLabel?: string | null;
  predictionScore?: number | null;
  pipelineName?: string | null;
  createdAt?: string | null;
  contextJson?: unknown;
}

export interface ExecutiveDashboardSummary {
  // KPIs
  totalSafehouses?: number;
  activeSafehouses?: number;
  totalResidents?: number;
  activeResidents?: number;
  totalSupporters?: number;
  totalDonations?: number;
  totalDonationCount?: number;
  openIncidents?: number;
  incidentsThisWeek?: number;
  highRiskResidents?: number;
  admissionsThisMonth?: number;
  upcomingCaseConferences?: number;
  activeInterventionPlans?: number;
  processRecordingsThisMonth?: number;
  reintegrationRate?: number;
  reintegrationCount?: number;
  avgHealthScore?: number | null;
  avgEducationProgress?: number | null;
  // Breakdowns
  riskDistribution?: { low: number; medium: number; high: number; critical: number; unknown: number };
  reintegrationBreakdown?: { notStarted: number; inProgress: number; ready: number; completed: number };
  safehouseBreakdown?: SafehouseBreakdownItem[];
  donationTrend?: { month: string; year: string; label: string; amount: number; count: number }[];
  allocationByProgram?: { programArea: string; amount: number; percentage: number }[];
  donationByChannel?: { channel: string; amount: number }[];
  // Feeds
  recentIncidents?: RecentIncident[];
  upcomingConferences?: UpcomingConference[];
  mlAlerts?: MlAlert[];
}

export interface SafehouseOverviewItem {
  safehouseId?: number;
  name?: string | null;
  status?: string | null;
  currentOccupancy?: number;
  capacityGirls?: number;
  incidentCount?: number;
}

export interface Safehouse {
  safehouseId?: number | null;
  id?: number | null;
  safehouseCode?: string | null;
  name?: string | null;
  region?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  location?: string | null;
  openDate?: string | null;
  status?: string | null;
  capacityGirls?: number | null;
  capacityStaff?: number | null;
  capacity?: number | null;
  currentOccupancy?: number | null;
  notes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  programAreas?: string[] | null;
}

export interface Partner {
  partnerId?: number | null;
  id?: number | null;
  partnerName?: string | null;
  name?: string | null;
  partnerType?: string | null;
  roleType?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  email?: string | null;
  phone?: string | null;
  programArea?: string | null;
  region?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin?: string | null;
  mfaEnabled?: boolean | null;
  supporterId?: number | null;
  assignedSafehouses?: number[];
}

export type CreateUserPayload = Pick<User, "username" | "email" | "firstName" | "lastName"> & {
  password: string;
  role: User["role"];
  assignedSafehouses?: number[];
};

export type UpdateUserPayload = Partial<Pick<User, "email" | "firstName" | "lastName" | "role">> & {
  assignedSafehouses?: number[];
};

export function useGetExecutiveDashboardSummary(params?: { safehouseId?: number | null; months?: number }) {
  const qs = new URLSearchParams();
  if (params?.safehouseId) qs.set("safehouseId", String(params.safehouseId));
  if (params?.months) qs.set("months", String(params.months));
  const qstr = qs.toString();
  return useQuery<ExecutiveDashboardSummary>({
    queryKey: ["superadmin", "dashboard", params?.safehouseId ?? null, params?.months ?? 12],
    queryFn: () => apiFetch(`/api/dashboard/executive-summary${qstr ? `?${qstr}` : ""}`),
  });
}

export function useListSafehouses(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: Safehouse[]; total: number }>({
    queryKey: ["safehouses", params],
    queryFn: () => apiFetch(`/api/safehouses${qs ? `?${qs}` : ""}`),
  });
}

export function useGetSafehouse(id: number | string | null) {
  return useQuery<Safehouse>({
    queryKey: ["safehouses", id],
    queryFn: () => apiFetch(`/api/safehouses/${id}`),
    enabled: !!id,
  });
}

export async function createSafehouse(data: Partial<Safehouse>) {
  return apiPost("/api/safehouses", data);
}

export async function updateSafehouse(id: number, data: Partial<Safehouse>) {
  return apiPatch(`/api/safehouses/${id}`, data);
}

export async function deleteSafehouse(id: number) {
  return apiDelete(`/api/safehouses/${id}`);
}

export function useListPartners(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: Partner[]; total: number }>({
    queryKey: ["partners", params],
    queryFn: () => apiFetch(`/api/partners${qs ? `?${qs}` : ""}`),
  });
}

export async function createPartner(data: Partial<Partner>) {
  return apiPost("/api/partners", data);
}

export async function updatePartner(id: number, data: Partial<Partner>) {
  return apiPatch(`/api/partners/${id}`, data);
}

export async function deletePartner(id: number) {
  return apiDelete(`/api/partners/${id}`);
}

export function useListUsers(params?: { page?: number; pageSize?: number; role?: string }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.role) s.set("role", params.role);
  const qs = s.toString();
  return useQuery<{ data: User[]; total: number }>({
    queryKey: ["users", params],
    queryFn: () => apiFetch(`/api/users${qs ? `?${qs}` : ""}`),
  });
}

export async function createUser(data: CreateUserPayload) {
  return apiPost("/api/users", data);
}

export async function updateUser(id: number, data: UpdateUserPayload) {
  return apiPatch(`/api/users/${id}`, data);
}

export async function deleteUser(id: number) {
  return apiDelete(`/api/users/${id}`);
}

export async function disableUser(id: number) {
  return apiPost(`/api/users/${id}/disable`, {});
}

export async function enableUser(id: number) {
  return apiPost(`/api/users/${id}/enable`, {});
}

export interface AuditLog {
  id?: number | null;
  userId?: number | null;
  action?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  createdAt?: string | null;
  details?: Record<string, unknown> | null;
  actorName?: string | null;
  actorRole?: string | null;
}

export function useListAuditLogs(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: AuditLog[]; total: number }>({
    queryKey: ["audit-logs", params],
    queryFn: () => apiFetch(`/api/audit-logs${qs ? `?${qs}` : ""}`),
  });
}
