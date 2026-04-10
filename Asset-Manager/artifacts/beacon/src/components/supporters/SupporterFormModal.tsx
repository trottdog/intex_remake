import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPatch, apiPost } from "@/services/api";
import type { Supporter } from "@/services/supporters.service";

export const SUPPORTER_TYPE_OPTIONS = [
  "MonetaryDonor",
  "InKindDonor",
  "Volunteer",
  "SkillsContributor",
  "SocialMediaAdvocate",
  "PartnerOrganization",
] as const;

export const RELATIONSHIP_TYPE_OPTIONS = [
  "Local",
  "International",
  "PartnerOrganization",
] as const;

export const ACQUISITION_CHANNEL_OPTIONS = [
  "Website",
  "SocialMedia",
  "Event",
  "WordOfMouth",
  "PartnerReferral",
  "Church",
] as const;

export const SUPPORTER_STATUS_OPTIONS = [
  "Active",
  "Inactive",
] as const;

type ModalMode = "create" | "edit";

interface SupporterFormModalProps {
  open: boolean;
  mode: ModalMode;
  supporter?: Supporter | null;
  onClose: () => void;
  onSaved?: (supporter: Supporter) => void;
}

interface FormState {
  supporterType: string;
  displayName: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  relationshipType: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  firstDonationDate: string;
  acquisitionChannel: string;
  createdAt: string;
  recurringEnabled: boolean;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60_000));
    return local.toISOString().slice(0, 16);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }

  const offset = parsed.getTimezoneOffset();
  return new Date(parsed.getTime() - (offset * 60_000)).toISOString().slice(0, 16);
}

function toIsoString(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function getInitialFormState(supporter?: Supporter | null): FormState {
  return {
    supporterType: supporter?.supporterType ?? supporter?.supportType ?? "MonetaryDonor",
    displayName: supporter?.displayName ?? "",
    organizationName: supporter?.organizationName ?? supporter?.organization ?? "",
    firstName: supporter?.firstName ?? "",
    lastName: supporter?.lastName ?? "",
    relationshipType: supporter?.relationshipType ?? "Local",
    region: supporter?.region ?? "",
    country: supporter?.country ?? "",
    email: supporter?.email ?? "",
    phone: supporter?.phone ?? "",
    status: supporter?.status ?? "Active",
    firstDonationDate: toDateInput(supporter?.firstDonationDate ?? supporter?.donorSince),
    acquisitionChannel: supporter?.acquisitionChannel ?? "Website",
    createdAt: toDateTimeLocal(supporter?.createdAt),
    recurringEnabled: supporter?.recurringEnabled ?? supporter?.isRecurring ?? supporter?.hasRecurring ?? false,
  };
}

export function SupporterFormModal({
  open,
  mode,
  supporter,
  onClose,
  onSaved,
}: SupporterFormModalProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => getInitialFormState(supporter));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(getInitialFormState(supporter));
    setFormError(null);
  }, [open, supporter]);

  const title = useMemo(() => mode === "create" ? "Add Supporter" : "Edit Supporter", [mode]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        supporterType: form.supporterType || null,
        displayName: form.displayName || null,
        organizationName: form.organizationName || null,
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        relationshipType: form.relationshipType || null,
        region: form.region || null,
        country: form.country || null,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status || null,
        firstDonationDate: form.firstDonationDate || null,
        acquisitionChannel: form.acquisitionChannel || null,
        createdAt: toIsoString(form.createdAt),
        recurringEnabled: form.recurringEnabled,
      };

      if (mode === "create") {
        return apiPost<Supporter>("/api/supporters", payload, token ?? undefined);
      }

      if (!supporter?.supporterId && !supporter?.id) {
        throw new Error("Supporter ID is required");
      }

      return apiPatch<Supporter>(`/api/supporters/${supporter.supporterId ?? supporter.id}`, payload, token ?? undefined);
    },
    onSuccess: (savedSupporter) => {
      void queryClient.invalidateQueries({ queryKey: ["supporters"] });
      void queryClient.invalidateQueries({ queryKey: ["supporters", "stats"] });
      if (savedSupporter.supporterId ?? savedSupporter.id) {
        void queryClient.invalidateQueries({ queryKey: ["supporters", savedSupporter.supporterId ?? savedSupporter.id] });
        void queryClient.invalidateQueries({ queryKey: ["supporters", savedSupporter.supporterId ?? savedSupporter.id, "profile"] });
      }
      onSaved?.(savedSupporter);
      onClose();
    },
    onError: (error: unknown) => {
      setFormError((error as { message?: string })?.message ?? "Failed to save supporter");
    },
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={!mutation.isPending ? onClose : undefined} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create or update supporter records using the schema-backed fields.</p>
          </div>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Supporter Type">
              <select
                value={form.supporterType}
                onChange={(event) => setForm((current) => ({ ...current, supporterType: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              >
                {SUPPORTER_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              >
                {SUPPORTER_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Display Name">
              <input
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
                placeholder="Name shown in communications"
              />
            </Field>

            <Field label="Organization Name">
              <input
                value={form.organizationName}
                onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
                placeholder="Partner or organization name"
              />
            </Field>

            <Field label="First Name">
              <input
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="Last Name">
              <input
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="Relationship Type">
              <select
                value={form.relationshipType}
                onChange={(event) => setForm((current) => ({ ...current, relationshipType: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              >
                {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Acquisition Channel">
              <select
                value={form.acquisitionChannel}
                onChange={(event) => setForm((current) => ({ ...current, acquisitionChannel: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              >
                {ACQUISITION_CHANNEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Region">
              <input
                value={form.region}
                onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="Country">
              <input
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="First Donation Date">
              <input
                type="date"
                value={form.firstDonationDate}
                onChange={(event) => setForm((current) => ({ ...current, firstDonationDate: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <Field label="Created At">
              <input
                type="datetime-local"
                value={form.createdAt}
                onChange={(event) => setForm((current) => ({ ...current, createdAt: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
              />
            </Field>

            <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-[#f8faf9] px-4 py-3">
              <input
                type="checkbox"
                checked={form.recurringEnabled}
                onChange={(event) => setForm((current) => ({ ...current, recurringEnabled: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-[#2a9d72] focus:ring-[#2a9d72]"
              />
              <div>
                <div className="text-sm font-semibold text-gray-800">Recurring enabled</div>
                <div className="text-xs text-gray-500">Marks whether this supporter currently has a recurring giving commitment.</div>
              </div>
            </label>
          </div>

          {formError && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-xl bg-[#2a9d72] px-4 py-2 text-sm font-bold text-white hover:bg-[#23856a] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : mode === "create" ? "Create Supporter" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}
