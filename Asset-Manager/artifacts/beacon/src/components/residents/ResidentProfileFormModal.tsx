import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, User, X } from "lucide-react";
import type { Resident } from "@/services/residents.service";

type SafehouseOption = {
  safehouseId?: number | null;
  id?: number | null;
  name?: string | null;
};

type ResidentForm = {
  caseControlNo: string;
  safehouseId: string;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  birthStatus: string;
  placeOfBirth: string;
  religion: string;
  caseCategory: string;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
  isPwd: boolean;
  pwdType: string;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string;
  familyIs4ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  ageUponAdmission: string;
  presentAge: string;
  lengthOfStay: string;
  referralSource: string;
  referringAgencyPerson: string;
  dateColbRegistered: string;
  dateColbObtained: string;
  assignedSocialWorker: string;
  initialCaseAssessment: string;
  dateCaseStudyPrepared: string;
  reintegrationType: string;
  reintegrationStatus: string;
  initialRiskLevel: string;
  currentRiskLevel: string;
  dateEnrolled: string;
  dateClosed: string;
  notesRestricted: string;
};

const CASE_STATUS_OPTIONS = ["Active", "Closed", "Transferred"];
const CASE_CATEGORY_OPTIONS = ["Abandoned", "Foundling", "Surrendered", "Neglected"];
const BIRTH_STATUS_OPTIONS = ["Marital", "Non-Marital"];
const REFERRAL_SOURCE_OPTIONS = ["Government Agency", "NGO", "Police", "Self-Referral", "Community", "Court Order"];
const REINTEGRATION_TYPE_OPTIONS = [
  "Family Reunification",
  "Foster Care",
  "Adoption (Domestic)",
  "Adoption (Inter-Country)",
  "Independent Living",
  "None",
];
const REINTEGRATION_STATUS_OPTIONS = ["Not Started", "On Hold", "In Progress", "Completed"];
const RISK_LEVEL_OPTIONS = ["Low", "Medium", "High", "Critical"];
const SEX_OPTIONS = [{ value: "F", label: "Female" }];

const SUBCATEGORY_OPTIONS: Array<{ key: keyof ResidentForm; label: string }> = [
  { key: "subCatOrphaned", label: "Orphaned" },
  { key: "subCatTrafficked", label: "Trafficked" },
  { key: "subCatChildLabor", label: "Child Labor" },
  { key: "subCatPhysicalAbuse", label: "Physical Abuse" },
  { key: "subCatSexualAbuse", label: "Sexual Abuse" },
  { key: "subCatOsaec", label: "OSAEC / CSAEM" },
  { key: "subCatCicl", label: "Child In Conflict with the Law" },
  { key: "subCatAtRisk", label: "At Risk" },
  { key: "subCatStreetChild", label: "Street Child" },
  { key: "subCatChildWithHiv", label: "Child With HIV" },
];

const FAMILY_FLAG_OPTIONS: Array<{ key: keyof ResidentForm; label: string }> = [
  { key: "familyIs4ps", label: "4Ps Beneficiary" },
  { key: "familySoloParent", label: "Solo Parent Family" },
  { key: "familyIndigenous", label: "Indigenous Family" },
  { key: "familyParentPwd", label: "Parent With PWD" },
  { key: "familyInformalSettler", label: "Informal Settler / Homeless" },
];

const TABS = [
  { id: "profile", label: "Case Profile" },
  { id: "demographics", label: "Demographics" },
  { id: "family", label: "Family & Needs" },
  { id: "planning", label: "Risk & Reintegration" },
  { id: "notes", label: "Notes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const EMPTY_FORM: ResidentForm = {
  caseControlNo: "",
  safehouseId: "",
  caseStatus: "Active",
  sex: "F",
  dateOfBirth: "",
  birthStatus: "",
  placeOfBirth: "",
  religion: "",
  caseCategory: "",
  subCatOrphaned: false,
  subCatTrafficked: false,
  subCatChildLabor: false,
  subCatPhysicalAbuse: false,
  subCatSexualAbuse: false,
  subCatOsaec: false,
  subCatCicl: false,
  subCatAtRisk: false,
  subCatStreetChild: false,
  subCatChildWithHiv: false,
  isPwd: false,
  pwdType: "",
  hasSpecialNeeds: false,
  specialNeedsDiagnosis: "",
  familyIs4ps: false,
  familySoloParent: false,
  familyIndigenous: false,
  familyParentPwd: false,
  familyInformalSettler: false,
  dateOfAdmission: new Date().toISOString().slice(0, 10),
  ageUponAdmission: "",
  presentAge: "",
  lengthOfStay: "",
  referralSource: "",
  referringAgencyPerson: "",
  dateColbRegistered: "",
  dateColbObtained: "",
  assignedSocialWorker: "",
  initialCaseAssessment: "",
  dateCaseStudyPrepared: "",
  reintegrationType: "",
  reintegrationStatus: "Not Started",
  initialRiskLevel: "Low",
  currentRiskLevel: "Low",
  dateEnrolled: "",
  dateClosed: "",
  notesRestricted: "",
};

function toResidentForm(resident?: Resident | null): ResidentForm {
  if (!resident) {
    return EMPTY_FORM;
  }

  return {
    caseControlNo: resident.caseControlNo ?? "",
    safehouseId: resident.safehouseId != null ? String(resident.safehouseId) : "",
    caseStatus: resident.caseStatus ?? "Active",
    sex: resident.sex ?? "F",
    dateOfBirth: resident.dateOfBirth ?? "",
    birthStatus: resident.birthStatus ?? "",
    placeOfBirth: resident.placeOfBirth ?? "",
    religion: resident.religion ?? "",
    caseCategory: resident.caseCategory ?? "",
    subCatOrphaned: resident.subCatOrphaned === true,
    subCatTrafficked: resident.subCatTrafficked === true,
    subCatChildLabor: resident.subCatChildLabor === true,
    subCatPhysicalAbuse: resident.subCatPhysicalAbuse === true,
    subCatSexualAbuse: resident.subCatSexualAbuse === true,
    subCatOsaec: resident.subCatOsaec === true,
    subCatCicl: resident.subCatCicl === true,
    subCatAtRisk: resident.subCatAtRisk === true,
    subCatStreetChild: resident.subCatStreetChild === true,
    subCatChildWithHiv: resident.subCatChildWithHiv === true,
    isPwd: resident.isPwd === true,
    pwdType: resident.pwdType ?? "",
    hasSpecialNeeds: resident.hasSpecialNeeds === true,
    specialNeedsDiagnosis: resident.specialNeedsDiagnosis ?? "",
    familyIs4ps: resident.familyIs4ps === true,
    familySoloParent: resident.familySoloParent === true,
    familyIndigenous: resident.familyIndigenous === true,
    familyParentPwd: resident.familyParentPwd === true,
    familyInformalSettler: resident.familyInformalSettler === true,
    dateOfAdmission: resident.dateOfAdmission ?? resident.admissionDate ?? "",
    ageUponAdmission: resident.ageUponAdmission ?? "",
    presentAge: resident.presentAge ?? "",
    lengthOfStay: resident.lengthOfStay ?? "",
    referralSource: resident.referralSource ?? "",
    referringAgencyPerson: resident.referringAgencyPerson ?? "",
    dateColbRegistered: resident.dateColbRegistered ?? "",
    dateColbObtained: resident.dateColbObtained ?? "",
    assignedSocialWorker: resident.assignedSocialWorker ?? resident.assignedWorkerName ?? "",
    initialCaseAssessment: resident.initialCaseAssessment ?? "",
    dateCaseStudyPrepared: resident.dateCaseStudyPrepared ?? "",
    reintegrationType: resident.reintegrationType ?? "",
    reintegrationStatus: resident.reintegrationStatus ?? "Not Started",
    initialRiskLevel: resident.initialRiskLevel ?? resident.currentRiskLevel ?? resident.riskLevel ?? "Low",
    currentRiskLevel: resident.currentRiskLevel ?? resident.riskLevel ?? resident.initialRiskLevel ?? "Low",
    dateEnrolled: resident.dateEnrolled ?? resident.dateOfAdmission ?? resident.admissionDate ?? "",
    dateClosed: resident.dateClosed ?? resident.dischargeDate ?? "",
    notesRestricted: resident.notesRestricted ?? "",
  };
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toResidentPayload(form: ResidentForm): Record<string, unknown> {
  return {
    caseControlNo: toNullableString(form.caseControlNo),
    safehouseId: form.safehouseId ? Number(form.safehouseId) : null,
    caseStatus: form.caseStatus || null,
    sex: form.sex || null,
    dateOfBirth: form.dateOfBirth || null,
    birthStatus: form.birthStatus || null,
    placeOfBirth: toNullableString(form.placeOfBirth),
    religion: toNullableString(form.religion),
    caseCategory: form.caseCategory || null,
    subCatOrphaned: form.subCatOrphaned,
    subCatTrafficked: form.subCatTrafficked,
    subCatChildLabor: form.subCatChildLabor,
    subCatPhysicalAbuse: form.subCatPhysicalAbuse,
    subCatSexualAbuse: form.subCatSexualAbuse,
    subCatOsaec: form.subCatOsaec,
    subCatCicl: form.subCatCicl,
    subCatAtRisk: form.subCatAtRisk,
    subCatStreetChild: form.subCatStreetChild,
    subCatChildWithHiv: form.subCatChildWithHiv,
    isPwd: form.isPwd,
    pwdType: form.isPwd ? toNullableString(form.pwdType) : null,
    hasSpecialNeeds: form.hasSpecialNeeds,
    specialNeedsDiagnosis: form.hasSpecialNeeds ? toNullableString(form.specialNeedsDiagnosis) : null,
    familyIs4ps: form.familyIs4ps,
    familySoloParent: form.familySoloParent,
    familyIndigenous: form.familyIndigenous,
    familyParentPwd: form.familyParentPwd,
    familyInformalSettler: form.familyInformalSettler,
    dateOfAdmission: form.dateOfAdmission || null,
    ageUponAdmission: toNullableString(form.ageUponAdmission),
    presentAge: toNullableString(form.presentAge),
    lengthOfStay: toNullableString(form.lengthOfStay),
    referralSource: form.referralSource || null,
    referringAgencyPerson: toNullableString(form.referringAgencyPerson),
    dateColbRegistered: form.dateColbRegistered || null,
    dateColbObtained: form.dateColbObtained || null,
    assignedSocialWorker: toNullableString(form.assignedSocialWorker),
    initialCaseAssessment: toNullableString(form.initialCaseAssessment),
    dateCaseStudyPrepared: form.dateCaseStudyPrepared || null,
    reintegrationType: form.reintegrationType || null,
    reintegrationStatus: form.reintegrationStatus || null,
    initialRiskLevel: form.initialRiskLevel || null,
    currentRiskLevel: form.currentRiskLevel || null,
    dateEnrolled: form.dateEnrolled || form.dateOfAdmission || null,
    dateClosed: form.dateClosed || null,
    notesRestricted: toNullableString(form.notesRestricted),
  };
}

function ensureOption(value: string, options: string[]): string[] {
  if (!value || options.includes(value)) {
    return options;
  }

  return [value, ...options];
}

function ensureSexOption(value: string): Array<{ value: string; label: string }> {
  if (!value || SEX_OPTIONS.some((option) => option.value === value)) {
    return SEX_OPTIONS;
  }

  return [{ value, label: value }, ...SEX_OPTIONS];
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors cursor-pointer ${
        checked
          ? "border-[#2a9d72] bg-[#eff8f3] text-[#175b40]"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
          checked ? "border-[#2a9d72] bg-[#2a9d72] text-white" : "border-gray-300"
        }`}
      >
        {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      </span>
      <span>{label}</span>
    </label>
  );
}

export function ResidentProfileFormModal({
  open,
  mode,
  resident,
  safehouses,
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  resident?: Resident | null;
  safehouses: SafehouseOption[];
  isPending?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [form, setForm] = useState<ResidentForm>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("profile");
    setLocalError(null);
    setForm(toResidentForm(resident));
  }, [open, resident]);

  const caseCategoryOptions = useMemo(
    () => ensureOption(form.caseCategory, CASE_CATEGORY_OPTIONS),
    [form.caseCategory],
  );
  const referralSourceOptions = useMemo(
    () => ensureOption(form.referralSource, REFERRAL_SOURCE_OPTIONS),
    [form.referralSource],
  );
  const birthStatusOptions = useMemo(
    () => ensureOption(form.birthStatus, BIRTH_STATUS_OPTIONS),
    [form.birthStatus],
  );
  const reintegrationTypeOptions = useMemo(
    () => ensureOption(form.reintegrationType, REINTEGRATION_TYPE_OPTIONS),
    [form.reintegrationType],
  );
  const reintegrationStatusOptions = useMemo(
    () => ensureOption(form.reintegrationStatus, REINTEGRATION_STATUS_OPTIONS),
    [form.reintegrationStatus],
  );
  const sexOptions = useMemo(() => ensureSexOption(form.sex), [form.sex]);

  if (!open) {
    return null;
  }

  const fieldClassName =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#2a9d72] focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20";
  const labelClassName = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  function setField<K extends keyof ResidentForm>(key: K, value: ResidentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) {
      return;
    }

    if (!form.safehouseId) {
      setLocalError("Please select a safehouse before saving.");
      setActiveTab("profile");
      return;
    }

    setLocalError(null);
    onSubmit(toResidentPayload(form));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <form
        onSubmit={handleSubmit}
        className="relative flex h-[90vh] min-h-[760px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="shrink-0 bg-[#0e2118] px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-1 flex items-center gap-2">
            {mode === "create" ? <Plus className="h-4 w-4 text-[#7bc5a6]" /> : <User className="h-4 w-4 text-[#7bc5a6]" />}
            <span className="text-xs font-semibold uppercase tracking-wide text-[#7bc5a6]">
              {mode === "create" ? "New Resident" : "Edit Resident"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            {mode === "create" ? "Add Resident Case Profile" : resident?.internalCode ?? resident?.residentCode ?? resident?.caseControlNo ?? "Edit Resident"}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Capture the resident's full case profile, family context, and reintegration details in one place.
          </p>
        </div>

        <div className="shrink-0 border-b border-gray-100 bg-white px-4">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-[#2a9d72] bg-[#f4fbf7] text-[#2a9d72]"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f8faf8] px-6 py-5">
          <div className="min-h-full">
          {mode === "create" ? (
            <div className="mb-5 rounded-2xl border border-[#cfe7dc] bg-[#f5fbf8] px-4 py-3 text-sm text-[#245844]">
              Internal code is generated automatically when the resident is created.
            </div>
          ) : null}

          {activeTab === "profile" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Safehouse</label>
                  <select
                    className={fieldClassName}
                    value={form.safehouseId}
                    onChange={(event) => setField("safehouseId", event.target.value)}
                  >
                    <option value="">Select safehouse...</option>
                    {safehouses.map((safehouse) => (
                      <option
                        key={safehouse.safehouseId ?? safehouse.id}
                        value={safehouse.safehouseId ?? safehouse.id ?? ""}
                      >
                        {safehouse.name ?? `Safehouse #${safehouse.safehouseId ?? safehouse.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Case Status</label>
                  <select
                    className={fieldClassName}
                    value={form.caseStatus}
                    onChange={(event) => setField("caseStatus", event.target.value)}
                  >
                    {CASE_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Case Control No.</label>
                  <input
                    className={fieldClassName}
                    value={form.caseControlNo}
                    onChange={(event) => setField("caseControlNo", event.target.value)}
                    placeholder="e.g. C0073"
                  />
                </div>
                <div>
                  <label className={labelClassName}>Case Category</label>
                  <select
                    className={fieldClassName}
                    value={form.caseCategory}
                    onChange={(event) => setField("caseCategory", event.target.value)}
                  >
                    <option value="">Select category...</option>
                    {caseCategoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Date Of Admission</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateOfAdmission}
                    onChange={(event) => setField("dateOfAdmission", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Date Enrolled</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateEnrolled}
                    onChange={(event) => setField("dateEnrolled", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Referral Source</label>
                  <select
                    className={fieldClassName}
                    value={form.referralSource}
                    onChange={(event) => setField("referralSource", event.target.value)}
                  >
                    <option value="">Select referral source...</option>
                    {referralSourceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Referring Agency / Person</label>
                  <input
                    className={fieldClassName}
                    value={form.referringAgencyPerson}
                    onChange={(event) => setField("referringAgencyPerson", event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClassName}>Assigned Social Worker</label>
                  <input
                    className={fieldClassName}
                    value={form.assignedSocialWorker}
                    onChange={(event) => setField("assignedSocialWorker", event.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-[#0e2118]">Sub-Categories</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {SUBCATEGORY_OPTIONS.map((option) => (
                    <CheckboxChip
                      key={option.key}
                      checked={form[option.key] as boolean}
                      label={option.label}
                      onChange={(checked) => setField(option.key, checked as ResidentForm[typeof option.key])}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "demographics" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Sex</label>
                  <select
                    className={fieldClassName}
                    value={form.sex}
                    onChange={(event) => setField("sex", event.target.value)}
                  >
                    {sexOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Birth Status</label>
                  <select
                    className={fieldClassName}
                    value={form.birthStatus}
                    onChange={(event) => setField("birthStatus", event.target.value)}
                  >
                    <option value="">Select birth status...</option>
                    {birthStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Date Of Birth</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateOfBirth}
                    onChange={(event) => setField("dateOfBirth", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Place Of Birth</label>
                  <input
                    className={fieldClassName}
                    value={form.placeOfBirth}
                    onChange={(event) => setField("placeOfBirth", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Religion</label>
                  <input
                    className={fieldClassName}
                    value={form.religion}
                    onChange={(event) => setField("religion", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Age Upon Admission</label>
                  <input
                    className={fieldClassName}
                    value={form.ageUponAdmission}
                    onChange={(event) => setField("ageUponAdmission", event.target.value)}
                    placeholder="e.g. 13 Years 2 months"
                  />
                </div>
                <div>
                  <label className={labelClassName}>Present Age</label>
                  <input
                    className={fieldClassName}
                    value={form.presentAge}
                    onChange={(event) => setField("presentAge", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Length Of Stay</label>
                  <input
                    className={fieldClassName}
                    value={form.lengthOfStay}
                    onChange={(event) => setField("lengthOfStay", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>COLB Registered Date</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateColbRegistered}
                    onChange={(event) => setField("dateColbRegistered", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>COLB Obtained Date</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateColbObtained}
                    onChange={(event) => setField("dateColbObtained", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Case Study Prepared Date</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateCaseStudyPrepared}
                    onChange={(event) => setField("dateCaseStudyPrepared", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Date Closed</label>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={form.dateClosed}
                    onChange={(event) => setField("dateClosed", event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "family" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-[#0e2118]">Special Needs & Disability</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <CheckboxChip
                    checked={form.isPwd}
                    label="Person With Disability (PWD)"
                    onChange={(checked) => setField("isPwd", checked)}
                  />
                  <CheckboxChip
                    checked={form.hasSpecialNeeds}
                    label="Has Special Needs"
                    onChange={(checked) => setField("hasSpecialNeeds", checked)}
                  />
                  <div>
                    <label className={labelClassName}>PWD Type</label>
                    <input
                      className={fieldClassName}
                      disabled={!form.isPwd}
                      value={form.pwdType}
                      onChange={(event) => setField("pwdType", event.target.value)}
                      placeholder="Describe disability type"
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Special Needs Diagnosis</label>
                    <input
                      className={fieldClassName}
                      disabled={!form.hasSpecialNeeds}
                      value={form.specialNeedsDiagnosis}
                      onChange={(event) => setField("specialNeedsDiagnosis", event.target.value)}
                      placeholder="Diagnosis or developmental need"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-[#0e2118]">Family Context</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {FAMILY_FLAG_OPTIONS.map((option) => (
                    <CheckboxChip
                      key={option.key}
                      checked={form[option.key] as boolean}
                      label={option.label}
                      onChange={(checked) => setField(option.key, checked as ResidentForm[typeof option.key])}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "planning" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Initial Risk Level</label>
                  <select
                    className={fieldClassName}
                    value={form.initialRiskLevel}
                    onChange={(event) => setField("initialRiskLevel", event.target.value)}
                  >
                    {RISK_LEVEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Current Risk Level</label>
                  <select
                    className={fieldClassName}
                    value={form.currentRiskLevel}
                    onChange={(event) => setField("currentRiskLevel", event.target.value)}
                  >
                    {RISK_LEVEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Reintegration Type</label>
                  <select
                    className={fieldClassName}
                    value={form.reintegrationType}
                    onChange={(event) => setField("reintegrationType", event.target.value)}
                  >
                    <option value="">Select reintegration type...</option>
                    {reintegrationTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Reintegration Status</label>
                  <select
                    className={fieldClassName}
                    value={form.reintegrationStatus}
                    onChange={(event) => setField("reintegrationStatus", event.target.value)}
                  >
                    {reintegrationStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClassName}>Initial Case Assessment</label>
                <textarea
                  className={`${fieldClassName} min-h-32 resize-y`}
                  value={form.initialCaseAssessment}
                  onChange={(event) => setField("initialCaseAssessment", event.target.value)}
                  placeholder="Record the intake assessment, placement intent, and recommended interventions."
                />
              </div>
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div className="space-y-5">
              <div>
                <label className={labelClassName}>Restricted Notes</label>
                <textarea
                  className={`${fieldClassName} min-h-40 resize-y`}
                  value={form.notesRestricted}
                  onChange={(event) => setField("notesRestricted", event.target.value)}
                  placeholder="Sensitive internal notes for staff and admin access."
                />
              </div>
            </div>
          ) : null}

          {(localError || error) ? (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localError ?? error}</span>
            </div>
          ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <div className="text-xs text-gray-500">
            {mode === "create"
              ? "Resident profile values follow the current schema and data dictionary."
              : "Updates apply directly to the resident profile and related case attributes."}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#2a9d72] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#23856a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? <Plus className="h-4 w-4" /> : null}
              {isPending ? "Saving..." : mode === "create" ? "Create Resident" : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
