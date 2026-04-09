import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  useGetResident, useListEducationRecords, useListHealthRecords,
  type Resident, type EducationRecord, type HealthRecord,
} from "@/services/residents.service";
import {
  useListCaseConferences, useListInterventionPlans,
  useListProcessRecordings, useListHomeVisitations, useListIncidents,
  type CaseConference, type InterventionPlan, type ProcessRecording,
  type HomeVisitation, type Incident,
} from "@/services/admin.service";
import {
  User, Calendar, Activity, FileText, Home, ShieldAlert,
  ArrowLeft, Loader2, AlertTriangle, Clock, BookOpen, Heart,
  CheckCircle2, Circle, BadgeAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "case-conferences", label: "Conferences", icon: Calendar },
  { id: "intervention-plans", label: "Intervention Plans", icon: Activity },
  { id: "process-recordings", label: "Process Recordings", icon: FileText },
  { id: "home-visits", label: "Home Visits", icon: Home },
  { id: "incidents", label: "Incidents", icon: ShieldAlert },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "health", label: "Health", icon: Heart },
  { id: "timeline", label: "Timeline", icon: Clock },
] as const;

type TabId = (typeof TABS)[number]["id"];

const RISK_COLORS: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Transferred: "bg-purple-100 text-purple-700",
};

const REINTEGRATION_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-500",
  "In Progress": "bg-blue-100 text-blue-700",
  "On Hold": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display = value === true ? "Yes" : value === false ? "No" : value ?? "—";
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{String(display)}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-xs font-bold text-[#0e2118] uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        {children}
      </div>
    </div>
  );
}

function BoolBadge({ active, label }: { active: boolean | null | undefined; label: string }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-[#e8f5ef] text-[#1a5e3f] border border-[#c8e6d4]">
      <CheckCircle2 className="w-3 h-3" /> {label}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm space-y-3">
      {children}
    </div>
  );
}

function ProfileTab({ r }: { r: Resident }) {
  const subcats: { flag: boolean | null | undefined; label: string }[] = [
    { flag: r.subCatTrafficked, label: "Trafficked" },
    { flag: r.subCatSexualAbuse, label: "Sexual Abuse" },
    { flag: r.subCatPhysicalAbuse, label: "Physical Abuse" },
    { flag: r.subCatOsaec, label: "OSAEC" },
    { flag: r.subCatChildLabor, label: "Child Labor" },
    { flag: r.subCatOrphaned, label: "Orphaned" },
    { flag: r.subCatCicl, label: "CICL" },
    { flag: r.subCatAtRisk, label: "At Risk" },
    { flag: r.subCatStreetChild, label: "Street Child" },
    { flag: r.subCatChildWithHiv, label: "Child w/ HIV" },
  ].filter(s => s.flag);

  const familyFlags: { flag: boolean | null | undefined; label: string }[] = [
    { flag: r.familyIs4ps, label: "4Ps Beneficiary" },
    { flag: r.familySoloParent, label: "Solo Parent Family" },
    { flag: r.familyIndigenous, label: "Indigenous People" },
    { flag: r.familyParentPwd, label: "Parent with PWD" },
    { flag: r.familyInformalSettler, label: "Informal Settler" },
  ].filter(s => s.flag);

  return (
    <div className="space-y-4">
      {/* Identification */}
      <SectionCard title="Case Identification">
        <Field label="Internal Code" value={r.internalCode} />
        <Field label="Case Control No." value={r.caseControlNo} />
        <Field label="Case Status" value={r.caseStatus} />
        <Field label="Safehouse" value={r.safehouseName ?? (r.safehouseId ? `Safehouse #${r.safehouseId}` : null)} />
        <Field label="Assigned Social Worker" value={r.assignedSocialWorker ?? r.assignedWorkerName} />
        <Field label="Referral Source" value={r.referralSource} />
        <Field label="Referring Agency / Person" value={r.referringAgencyPerson} />
        <Field label="Date Enrolled" value={r.dateEnrolled} />
        <Field label="Date Case Study Prepared" value={r.dateCaseStudyPrepared} />
        <Field label="Date COLB Registered" value={r.dateColbRegistered} />
        <Field label="Date COLB Obtained" value={r.dateColbObtained} />
        <Field label="Record Created" value={r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
        <Field label="System ID" value={r.residentId ?? r.id} />
      </SectionCard>

      {/* Demographics */}
      <SectionCard title="Demographics">
        <Field label="Sex" value={r.sex} />
        <Field label="Date of Birth" value={r.dateOfBirth} />
        <Field label="Age at Admission" value={r.ageUponAdmission} />
        <Field label="Present Age" value={r.presentAge} />
        <Field label="Length of Stay" value={r.lengthOfStay} />
        <Field label="Birth Status" value={r.birthStatus} />
        <Field label="Place of Birth" value={r.placeOfBirth} />
        <Field label="Religion" value={r.religion} />
      </SectionCard>

      {/* Case Classification */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-xs font-bold text-[#0e2118] uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">Case Classification</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Primary Category</p>
            <span className="text-sm font-semibold text-gray-800 capitalize">{r.caseCategory?.replace(/_/g, " ") ?? "—"}</span>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sub-Categories</p>
            {subcats.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subcats.map(s => (
                  <span key={s.label} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-700 border border-red-200">
                    <BadgeAlert className="w-3 h-3" /> {s.label}
                  </span>
                ))}
              </div>
            ) : <span className="text-sm text-gray-400">None flagged</span>}
          </div>
        </div>
      </div>

      {/* Special Needs & Family */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-[#0e2118] uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">Special Needs & Disability</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {r.isPwd ? <CheckCircle2 className="w-4 h-4 text-[#2a9d72]" /> : <Circle className="w-4 h-4 text-gray-300" />}
              <span className="text-sm text-gray-700">Person with Disability (PWD)</span>
            </div>
            {r.isPwd && r.pwdType && <Field label="PWD Type" value={r.pwdType} />}
            <div className="flex items-center gap-2">
              {r.hasSpecialNeeds ? <CheckCircle2 className="w-4 h-4 text-[#2a9d72]" /> : <Circle className="w-4 h-4 text-gray-300" />}
              <span className="text-sm text-gray-700">Has Special Needs</span>
            </div>
            {r.hasSpecialNeeds && r.specialNeedsDiagnosis && <Field label="Diagnosis" value={r.specialNeedsDiagnosis} />}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-[#0e2118] uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">Family & Social Context</h3>
          {familyFlags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {familyFlags.map(f => <BoolBadge key={f.label} active={f.flag} label={f.label} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No flags recorded</p>
          )}
        </div>
      </div>

      {/* Risk & Reintegration */}
      <SectionCard title="Risk Assessment & Reintegration">
        <Field label="Initial Risk Level" value={r.initialRiskLevel} />
        <Field label="Current Risk Level" value={r.currentRiskLevel} />
        <Field label="Reintegration Type" value={r.reintegrationType} />
        <Field label="Reintegration Status" value={r.reintegrationStatus} />
        <Field label="Date of Admission" value={r.dateOfAdmission ?? r.admissionDate} />
        <Field label="Date Closed" value={r.dateClosed ?? r.dischargeDate} />
      </SectionCard>

      {/* Case Assessment */}
      {r.initialCaseAssessment && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-[#0e2118] uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">Initial Case Assessment</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.initialCaseAssessment}</p>
        </div>
      )}

      {/* Restricted Notes */}
      {r.notesRestricted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">Restricted Notes</h3>
          <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{r.notesRestricted}</p>
        </div>
      )}
    </div>
  );
}

function ConferencesTab({ list, loading }: { list: CaseConference[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={Calendar} message="No case conferences on record." />;
  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.conferenceId ?? item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{item.conferenceType?.replace(/_/g, " ") ?? "Case Conference"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.conferenceDate ?? item.scheduledDate ?? "—"}</p>
            </div>
            {item.nextConferenceDate && (
              <span className="text-xs text-gray-500 whitespace-nowrap">Next: {item.nextConferenceDate}</span>
            )}
          </div>
          {item.summary && <p className="text-gray-700 text-sm"><span className="font-medium text-gray-500">Summary:</span> {item.summary}</p>}
          {item.decisionsMade && <p className="text-gray-700 text-sm"><span className="font-medium text-gray-500">Decisions:</span> {item.decisionsMade}</p>}
          {item.nextSteps && <p className="text-gray-700 text-sm"><span className="font-medium text-gray-500">Next Steps:</span> {item.nextSteps}</p>}
          {item.createdBy && <p className="text-xs text-gray-400">Recorded by: {item.createdBy}</p>}
        </Card>
      ))}
    </div>
  );
}

function InterventionPlansTab({ list, loading }: { list: InterventionPlan[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={Activity} message="No intervention plans found." />;
  const statusColor: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
    on_hold: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.planId ?? item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{item.planCategory?.replace(/_/g, " ") ?? "Intervention Plan"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Target Date: {item.targetDate ?? "—"}</p>
            </div>
            {item.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                {item.status.replace(/_/g, " ")}
              </span>
            )}
          </div>
          {item.planDescription && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Description:</span> {item.planDescription}</p>}
          {item.servicesProvided && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Services:</span> {item.servicesProvided}</p>}
          {(item.targetValue != null) && (
            <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Target Value:</span> {item.targetValue}</p>
          )}
          {item.caseConferenceDate && <p className="text-xs text-gray-400">Case conference date: {item.caseConferenceDate}</p>}
        </Card>
      ))}
    </div>
  );
}

function ProcessRecordingsTab({ list, loading }: { list: ProcessRecording[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={FileText} message="No process recordings found." />;
  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.recordingId ?? item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">{item.sessionDate ?? "—"}</p>
              <p className="text-xs text-gray-500">Type: {item.sessionType?.replace(/_/g, " ") ?? "—"} · Worker: {item.socialWorker ?? "—"}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {item.concernsFlagged && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Concern</span>
              )}
              {item.progressNoted && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Progress</span>
              )}
              {item.referralMade && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Referral</span>
              )}
            </div>
          </div>
          {item.emotionalStateObserved && (
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-500">Emotional state (start/end):</span>{" "}
              {item.emotionalStateObserved}{item.emotionalStateEnd ? ` → ${item.emotionalStateEnd}` : ""}
            </p>
          )}
          {item.sessionNarrative && (
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-medium text-gray-500">Narrative:</span> {item.sessionNarrative}
            </p>
          )}
          {item.interventionsApplied && (
            <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Interventions:</span> {item.interventionsApplied}</p>
          )}
          {item.followUpActions && (
            <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Follow-up:</span> {item.followUpActions}</p>
          )}
          {typeof item.sessionDurationMinutes === "number" && (
            <p className="text-xs text-gray-400">Duration: {item.sessionDurationMinutes} min</p>
          )}
        </Card>
      ))}
    </div>
  );
}

function HomeVisitsTab({ list, loading }: { list: HomeVisitation[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={Home} message="No home visits recorded." />;
  const outcomeColor: Record<string, string> = {
    favorable: "bg-green-100 text-green-700",
    unfavorable: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-600",
    ongoing: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.visitationId ?? item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">{item.visitDate ?? "—"}</p>
              <p className="text-xs text-gray-500">
                Worker: {item.socialWorker ?? "—"} · Type: {item.visitType?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {item.visitOutcome && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${outcomeColor[item.visitOutcome] ?? "bg-gray-100 text-gray-600"}`}>
                  {item.visitOutcome}
                </span>
              )}
              {item.safetyConcernsNoted && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Safety Concern</span>
              )}
            </div>
          </div>
          {item.locationVisited && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Location:</span> {item.locationVisited}</p>}
          {item.purpose && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Purpose:</span> {item.purpose}</p>}
          {item.familyMembersPresent && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Family present:</span> {item.familyMembersPresent}</p>}
          {item.observations && <p className="text-sm text-gray-700 leading-relaxed"><span className="font-medium text-gray-500">Observations:</span> {item.observations}</p>}
          {item.familyCooperationLevel && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Cooperation:</span> {item.familyCooperationLevel}</p>}
          {item.followUpNeeded && item.followUpNotes && (
            <p className="text-sm text-amber-700"><span className="font-medium">Follow-up needed:</span> {item.followUpNotes}</p>
          )}
        </Card>
      ))}
    </div>
  );
}

function IncidentsTab({ list, loading }: { list: Incident[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={ShieldAlert} message="No incidents reported." />;
  const sevColor: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };
  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.incidentId ?? item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{item.incidentType?.replace(/_/g, " ") ?? "Incident"}</p>
              <p className="text-xs text-gray-500">{item.incidentDate ?? "—"}{item.reportedBy ? ` · Reported by: ${item.reportedBy}` : ""}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0 items-center">
              {item.severity && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sevColor[item.severity] ?? "bg-gray-100 text-gray-600"}`}>
                  {item.severity}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.resolved ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"}`}>
                {item.resolved ? "Resolved" : "Open"}
              </span>
            </div>
          </div>
          {item.description && <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>}
          {item.responseTaken && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Response:</span> {item.responseTaken}</p>}
          {item.resolutionDate && <p className="text-xs text-gray-400">Resolved: {item.resolutionDate}</p>}
          {item.followUpRequired && (
            <p className="text-xs text-amber-600 font-medium">Follow-up required</p>
          )}
        </Card>
      ))}
    </div>
  );
}

function EducationTab({ list, loading }: { list: EducationRecord[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={BookOpen} message="No education records found." />;
  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.educationRecordId}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{item.educationLevel?.replace(/_/g, " ") ?? "Education Record"}</p>
              <p className="text-xs text-gray-500">{item.recordDate ?? "—"}</p>
            </div>
            {item.enrollmentStatus && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                item.enrollmentStatus === "enrolled" ? "bg-green-100 text-green-700" :
                item.enrollmentStatus === "not_enrolled" ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {item.enrollmentStatus.replace(/_/g, " ")}
              </span>
            )}
          </div>
          {item.schoolName && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">School:</span> {item.schoolName}</p>}
          {item.attendanceRate != null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Attendance Rate</span><span>{item.attendanceRate}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-[#2a9d72] h-1.5 rounded-full" style={{ width: `${Math.min(item.attendanceRate, 100)}%` }} />
              </div>
            </div>
          )}
          {item.progressPercent != null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span><span>{item.progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(item.progressPercent, 100)}%` }} />
              </div>
            </div>
          )}
          {item.completionStatus && <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Completion:</span> {item.completionStatus.replace(/_/g, " ")}</p>}
          {item.notes && <p className="text-sm text-gray-600 italic">{item.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

function HealthTab({ list, loading }: { list: HealthRecord[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (list.length === 0) return <EmptyState icon={Heart} message="No health records found." />;

  function ScoreBar({ label, value, color = "bg-[#2a9d72]" }: { label: string; value?: number | null; color?: string }) {
    if (value == null) return null;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-0.5">
          <span>{label}</span><span>{value}/10</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className={`${color} h-1.5 rounded-full`} style={{ width: `${(value / 10) * 100}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map(item => (
        <Card key={item.healthRecordId}>
          <div className="flex items-start justify-between gap-4">
            <p className="font-semibold text-gray-900">{item.recordDate ?? "Health Record"}</p>
            <div className="flex gap-1.5 text-xs flex-shrink-0">
              {item.medicalCheckupDone && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Medical</span>}
              {item.dentalCheckupDone && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Dental</span>}
              {item.psychologicalCheckupDone && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Psych</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {item.heightCm != null && <div><p className="text-xs text-gray-400">Height</p><p className="font-medium">{item.heightCm} cm</p></div>}
            {item.weightKg != null && <div><p className="text-xs text-gray-400">Weight</p><p className="font-medium">{item.weightKg} kg</p></div>}
            {item.bmi != null && <div><p className="text-xs text-gray-400">BMI</p><p className="font-medium">{item.bmi}</p></div>}
          </div>
          <div>
            <ScoreBar label="General Health" value={item.generalHealthScore} color="bg-[#2a9d72]" />
            <ScoreBar label="Nutrition" value={item.nutritionScore} color="bg-amber-500" />
            <ScoreBar label="Sleep Quality" value={item.sleepQualityScore} color="bg-blue-500" />
            <ScoreBar label="Energy Level" value={item.energyLevelScore} color="bg-purple-500" />
          </div>
          {item.notes && <p className="text-sm text-gray-600 italic">{item.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

export default function ResidentDetailPage() {
  const [location] = useLocation();
  const [, adminParams] = useRoute("/admin/residents/:id");
  const [, superParams] = useRoute("/superadmin/residents/:id");
  const params = adminParams ?? superParams;
  const portalBase = location.startsWith("/superadmin") ? "/superadmin" : "/admin";
  const backPath = `${portalBase}/residents`;
  const id = parseInt(params?.id ?? "0");
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const { data: resident, isLoading } = useGetResident(id);
  const resId = resident?.residentId ?? resident?.id ?? id;

  const { data: ccData, isLoading: ccLoading } = useListCaseConferences({ residentId: resId, pageSize: 100 });
  const { data: ipData, isLoading: ipLoading } = useListInterventionPlans({ residentId: resId, pageSize: 100 });
  const { data: prData, isLoading: prLoading } = useListProcessRecordings({ residentId: resId, pageSize: 100 });
  const { data: hvData, isLoading: hvLoading } = useListHomeVisitations({ residentId: resId, pageSize: 100 });
  const { data: incData, isLoading: incLoading } = useListIncidents({ pageSize: 100 });
  const { data: eduData, isLoading: eduLoading } = useListEducationRecords(resId);
  const { data: healthData, isLoading: healthLoading } = useListHealthRecords(resId);

  const ccList: CaseConference[] = ccData?.data ?? [];
  const ipList: InterventionPlan[] = ipData?.data ?? [];
  const prList: ProcessRecording[] = prData?.data ?? [];
  const hvList: HomeVisitation[] = hvData?.data ?? [];
  const incList: Incident[] = (incData?.data ?? []).filter(i => i.residentId === resId);
  const eduList: EducationRecord[] = eduData?.data ?? [];
  const healthList: HealthRecord[] = healthData?.data ?? [];

  const riskLevel = resident?.currentRiskLevel ?? resident?.riskLevel;

  const TAB_COUNTS: Partial<Record<TabId, number>> = {
    "case-conferences": ccList.length,
    "intervention-plans": ipList.length,
    "process-recordings": prList.length,
    "home-visits": hvList.length,
    "incidents": incList.length,
    "education": eduList.length,
    "health": healthList.length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading resident profile...
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-lg font-medium text-gray-600">Resident not found</p>
        <Link href={backPath}>
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Residents</Button>
        </Link>
      </div>
    );
  }

  const code = resident.caseControlNo ?? resident.internalCode ?? resident.residentCode ?? `CASE-${resId}`;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <Link href={backPath}>
        <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-gray-800 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Residents
        </Button>
      </Link>

      {/* Profile Header */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-xl bg-[#0e2118]/10 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-[#0e2118]/50" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{code}</h1>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">Protected Identity</span>
            </div>
            <p className="text-sm text-gray-500 mt-1 capitalize">
              {resident.caseCategory?.replace(/_/g, " ") ?? "—"}
              {resident.safehouseName ? ` · ${resident.safehouseName}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {riskLevel && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${RISK_COLORS[riskLevel] ?? "bg-gray-100 text-gray-600"}`}>
                  {riskLevel} Risk
                </span>
              )}
              {resident.caseStatus && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[resident.caseStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {resident.caseStatus}
                </span>
              )}
              {resident.reintegrationStatus && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${REINTEGRATION_COLORS[resident.reintegrationStatus] ?? "bg-purple-100 text-purple-700"}`}>
                  {resident.reintegrationStatus}
                </span>
              )}
              {resident.isPwd && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">PWD</span>
              )}
              {resident.assignedSocialWorker && (
                <span className="text-xs text-gray-500">Worker: {resident.assignedSocialWorker}</span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 flex-shrink-0">
            <p>Admitted</p>
            <p className="font-medium text-gray-700">{resident.dateOfAdmission ?? resident.admissionDate ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(tab => {
            const count = TAB_COUNTS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#2a9d72] text-[#2a9d72] bg-[#f0faf5]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {count != null && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-[#2a9d72] text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === "profile" && <ProfileTab r={resident} />}
          {activeTab === "case-conferences" && <ConferencesTab list={ccList} loading={ccLoading} />}
          {activeTab === "intervention-plans" && <InterventionPlansTab list={ipList} loading={ipLoading} />}
          {activeTab === "process-recordings" && <ProcessRecordingsTab list={prList} loading={prLoading} />}
          {activeTab === "home-visits" && <HomeVisitsTab list={hvList} loading={hvLoading} />}
          {activeTab === "incidents" && <IncidentsTab list={incList} loading={incLoading} />}
          {activeTab === "education" && <EducationTab list={eduList} loading={eduLoading} />}
          {activeTab === "health" && <HealthTab list={healthList} loading={healthLoading} />}
          {activeTab === "timeline" && (
            <div className="space-y-2">
              {[
                ...ccList.map(i => ({ date: i.conferenceDate ?? i.scheduledDate, label: `Case Conference${i.conferenceType ? ` (${i.conferenceType.replace(/_/g, " ")})` : ""}`, type: "conference" as const })),
                ...ipList.map(i => ({ date: i.targetDate, label: `Intervention Plan${i.planCategory ? ` — ${i.planCategory.replace(/_/g, " ")}` : ""}`, type: "plan" as const })),
                ...hvList.map(i => ({ date: i.visitDate, label: `Home Visit${i.visitType ? ` (${i.visitType.replace(/_/g, " ")})` : ""}`, type: "visit" as const })),
                ...incList.map(i => ({ date: i.incidentDate, label: `Incident — ${i.incidentType?.replace(/_/g, " ") ?? "Unknown"}`, type: "incident" as const })),
                ...prList.map(i => ({ date: i.sessionDate, label: `Session Recording${i.sessionType ? ` (${i.sessionType.replace(/_/g, " ")})` : ""}`, type: "recording" as const })),
                ...eduList.map(i => ({ date: i.recordDate, label: `Education Record — ${i.educationLevel?.replace(/_/g, " ") ?? ""}`, type: "education" as const })),
                ...healthList.map(i => ({ date: i.recordDate, label: "Health Record", type: "health" as const })),
              ]
                .filter(e => e.date)
                .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                .map((event, idx) => {
                  const dotColor: Record<typeof event.type, string> = {
                    incident: "bg-red-500",
                    conference: "bg-blue-500",
                    plan: "bg-purple-500",
                    visit: "bg-[#2a9d72]",
                    recording: "bg-amber-500",
                    education: "bg-sky-500",
                    health: "bg-rose-500",
                  };
                  return (
                    <div key={idx} className="flex gap-3 items-start bg-white rounded-xl p-4 border border-gray-100 text-sm">
                      <div className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 ${dotColor[event.type]}`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 capitalize">{event.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{event.date}</p>
                      </div>
                    </div>
                  );
                })}
              {ccList.length === 0 && ipList.length === 0 && hvList.length === 0 && incList.length === 0 && prList.length === 0 && (
                <EmptyState icon={Clock} message="No timeline events found." />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
