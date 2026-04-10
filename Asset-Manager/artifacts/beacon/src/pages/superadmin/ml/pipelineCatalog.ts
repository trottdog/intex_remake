export type PipelineEvidenceLevel = "direct" | "adjacent" | "model_ops";
export type PipelineCaveatLevel = "normal" | "caution" | "high";
export type PipelineAuditStatus = "risk";

export interface PipelineRouteLink {
  label: string;
  href: string;
}

export interface PipelineCatalogEntry {
  internalName: string;
  publicName: string;
  displayName: string;
  family: "Supporters" | "Residents" | "Campaigns" | "Safehouses";
  taskType: "classification" | "regression";
  evidence: PipelineEvidenceLevel;
  caveat: PipelineCaveatLevel;
  summary: string;
  limitation?: string;
  links: PipelineRouteLink[];
  auditStatus: PipelineAuditStatus;
  complete: string;
  weak: string;
  missing: string;
  videoSafety: string;
  aliases?: string[];
}

export const PIPELINE_REVIEW_CATALOG: PipelineCatalogEntry[] = [
  {
    internalName: "donor_retention",
    publicName: "donor_churn_risk",
    displayName: "Donor Churn Risk",
    family: "Supporters",
    taskType: "classification",
    evidence: "direct",
    caveat: "caution",
    summary: "Surfaced directly in the supporter churn board.",
    limitation: "Validation and notebook evidence still need stronger proof, so demo it with caveat language.",
    links: [{ label: "Supporters: Churn Risk", href: "/superadmin/donors?tab=churn" }],
    auditStatus: "risk",
    complete: "Framing, predictive versus explanatory split, artifacts, and donor super-admin integration are present.",
    weak: "Notebook execution evidence is absent and the evaluate entrypoint is not implemented.",
    missing: "Reproducible executed notebook output and a real evaluation pipeline implementation.",
    videoSafety: "Safe to show with caveat language.",
  },
  {
    internalName: "donor_upgrade",
    publicName: "donor_upgrade_likelihood",
    displayName: "Donor Upgrade Likelihood",
    family: "Supporters",
    taskType: "classification",
    evidence: "direct",
    caveat: "caution",
    summary: "Surfaced directly in the supporter upgrade board.",
    limitation: "The app integration is solid, but evaluation proof still needs a stronger repeatable path.",
    links: [{ label: "Supporters: Upgrade", href: "/superadmin/donors?tab=upgrade" }],
    auditStatus: "risk",
    complete: "Framing, contract artifacts, metrics outputs, and donor super-admin integration are present.",
    weak: "There is no executed notebook proof and the evaluate entrypoint is still a stub.",
    missing: "Executable notebook run evidence and a robust scripted evaluation path.",
    videoSafety: "Safe to show with caveat language.",
  },
  {
    internalName: "next_donation_amount",
    publicName: "next_donation_amount",
    displayName: "Next Donation Amount",
    family: "Supporters",
    taskType: "regression",
    evidence: "adjacent",
    caveat: "high",
    summary: "Used as adjacent context for donor ask sizing rather than a dedicated routed board.",
    limitation: "Regression validation still needs stronger leakage checks before this should be treated as fully trusted.",
    links: [
      { label: "Supporters: Upgrade Context", href: "/superadmin/donors?tab=upgrade" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=next_donation_amount" },
    ],
    auditStatus: "risk",
    complete: "Framing, regression artifacts, and donor integration references are present.",
    weak: "Notebook execution evidence is missing and the evaluation path is still stub-level.",
    missing: "A robust regression validation script and executed notebook proof.",
    videoSafety: "Safe to show only with explicit limitations.",
  },
  {
    internalName: "resident_risk",
    publicName: "resident_regression_risk",
    displayName: "Resident Regression Risk",
    family: "Residents",
    taskType: "classification",
    evidence: "direct",
    caveat: "normal",
    summary: "Surfaced directly in the resident regression watchlist.",
    links: [{ label: "Residents: Regression", href: "/superadmin/residents?tab=regression" }],
    auditStatus: "risk",
    complete: "Framing, predictive setup, metrics, manifests, resident ML page integration, validation outputs, and executed notebooks are present.",
    weak: "No pipeline-specific implementation blockers are currently flagged.",
    missing: "No critical evidence gaps identified for this pipeline entry.",
    videoSafety: "Safe to show in routed UI demos.",
    aliases: ["resident_regression_risk"],
  },
  {
    internalName: "reintegration_readiness",
    publicName: "reintegration_readiness",
    displayName: "Reintegration Readiness",
    family: "Residents",
    taskType: "classification",
    evidence: "direct",
    caveat: "normal",
    summary: "Surfaced directly in the reintegration funnel and readiness table.",
    links: [{ label: "Residents: Reintegration", href: "/superadmin/residents?tab=reintegration" }],
    auditStatus: "risk",
    complete:
      "Framing, deployment notes, artifact outputs, resident super-admin integration, runtime evaluation automation, and executed notebook evidence are present.",
    weak: "No pipeline-specific implementation blockers are currently flagged.",
    missing: "No critical evidence gaps identified for this pipeline entry.",
    videoSafety: "Safe to show in routed UI demos.",
  },
  {
    internalName: "case_prioritization",
    publicName: "case_prioritization",
    displayName: "Case Prioritization",
    family: "Residents",
    taskType: "classification",
    evidence: "adjacent",
    caveat: "caution",
    summary: "Supported by resident decision workflows, but not yet called out as a dedicated routed board.",
    links: [
      { label: "Residents: Reintegration Context", href: "/superadmin/residents?tab=reintegration" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=case_prioritization" },
    ],
    auditStatus: "risk",
    complete:
      "Framing, manifests, metrics, resident integration references, runtime evaluation automation, and executed notebook evidence are present.",
    weak: "No pipeline-specific implementation blockers are currently flagged.",
    missing: "No critical evidence gaps identified for this pipeline entry.",
    videoSafety: "Cautious yes, with explicit limitations.",
  },
  {
    internalName: "counseling_progress",
    publicName: "counseling_progress",
    displayName: "Counseling Progress",
    family: "Residents",
    taskType: "classification",
    evidence: "adjacent",
    caveat: "caution",
    summary: "Visible through intervention context, not as a standalone routed score table.",
    links: [
      { label: "Residents: Interventions", href: "/superadmin/residents?tab=interventions" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=counseling_progress" },
    ],
    auditStatus: "risk",
    complete:
      "Framing, contract artifacts, resident integration references, runtime evaluation automation, and executed notebook evidence are present.",
    weak: "No pipeline-specific implementation blockers are currently flagged.",
    missing: "No critical evidence gaps identified for this pipeline entry.",
    videoSafety: "Cautious yes, with explicit limitations.",
  },
  {
    internalName: "education_improvement",
    publicName: "education_improvement",
    displayName: "Education Improvement",
    family: "Residents",
    taskType: "classification",
    evidence: "adjacent",
    caveat: "caution",
    summary: "Visible through intervention context, not as a dedicated routed score table.",
    links: [
      { label: "Residents: Interventions", href: "/superadmin/residents?tab=interventions" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=education_improvement" },
    ],
    auditStatus: "risk",
    complete: "Framing, metrics, manifests, and resident integration references are present.",
    weak: "The evaluate entrypoint is placeholder-level and there is no executed notebook evidence.",
    missing: "Real evaluation automation and notebook execution proof.",
    videoSafety: "Cautious yes, with explicit limitations.",
  },
  {
    internalName: "home_visitation_outcome",
    publicName: "home_visitation_outcome",
    displayName: "Home Visitation Outcome",
    family: "Residents",
    taskType: "classification",
    evidence: "adjacent",
    caveat: "caution",
    summary: "Supports reintegration planning context, but lacks a dedicated page-level widget.",
    links: [
      { label: "Residents: Reintegration Context", href: "/superadmin/residents?tab=reintegration" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=home_visitation_outcome" },
    ],
    auditStatus: "risk",
    complete:
      "Framing, artifacts, resident integration references, runtime evaluation automation, and executed notebook evidence are present.",
    weak: "No pipeline-specific implementation blockers are currently flagged.",
    missing: "No critical evidence gaps identified for this pipeline entry.",
    videoSafety: "Cautious yes, with explicit limitations.",
  },
  {
    internalName: "social_media_conversion",
    publicName: "social_post_conversion",
    displayName: "Social Post Conversion",
    family: "Campaigns",
    taskType: "classification",
    evidence: "direct",
    caveat: "caution",
    summary: "Surfaced directly in the social planner heatmap, recommendation card, and post table.",
    links: [{ label: "Campaigns: Social Planner", href: "/superadmin/campaigns?tab=social" }],
    auditStatus: "risk",
    complete:
      "Framing, manifest, metrics artifacts, campaigns super-admin integration, and executed notebook evidence are present.",
    weak: "No pipeline-specific execution-proof blockers are currently flagged.",
    missing: "No critical evidence gaps identified for this pipeline entry.",
    videoSafety: "Safe to show.",
    aliases: ["social_conversion"],
  },
  {
    internalName: "best_posting_time",
    publicName: "best_posting_time",
    displayName: "Best Posting Time",
    family: "Campaigns",
    taskType: "classification",
    evidence: "direct",
    caveat: "caution",
    summary:
      "Surfaced directly in the social planner heatmap and timing recommendation flow inside super-admin planning routes.",
    links: [
      { label: "Campaigns: Social Planner", href: "/superadmin/campaigns?tab=social" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=best_posting_time" },
    ],
    auditStatus: "risk",
    complete: "Framing, artifacts, campaigns page integration, and model-ops linkage are present.",
    weak: "The notebook remains unexecuted and the evaluate entrypoint is docstring-only.",
    missing: "Executable notebook proof and a real evaluation script.",
    videoSafety: "Safe to show with caveat language.",
  },
  {
    internalName: "capacity_pressure",
    publicName: "capacity_pressure",
    displayName: "Capacity Pressure",
    family: "Safehouses",
    taskType: "classification",
    evidence: "model_ops",
    caveat: "caution",
    summary: "Available for inspection in model ops, with adjacent safehouse context elsewhere.",
    links: [
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=capacity_pressure" },
      { label: "Residents: Safehouse Context", href: "/superadmin/residents?tab=safehouses" },
    ],
    auditStatus: "risk",
    complete: "Framing, artifacts, and resident super-admin integration references are present.",
    weak: "The evaluate entrypoint is still a placeholder and notebook execution proof is absent.",
    missing: "A runnable evaluation implementation and reproducible notebook execution evidence.",
    videoSafety: "Cautious yes, with explicit limitations.",
  },
  {
    internalName: "resource_demand",
    publicName: "resource_demand",
    displayName: "Resource Demand",
    family: "Safehouses",
    taskType: "regression",
    evidence: "model_ops",
    caveat: "high",
    summary: "Available for inspection in model ops, with adjacent safehouse context elsewhere.",
    links: [
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=resource_demand" },
      { label: "Residents: Safehouse Context", href: "/superadmin/residents?tab=safehouses" },
    ],
    auditStatus: "risk",
    complete: "Framing, manifest, regression metrics, and resident or safehouse integration references are present.",
    weak: "The evaluation entrypoint is placeholder-only, notebook execution proof is absent, and the perfect holdout signal remains in the artifacts.",
    missing: "Leakage and split validation hardening plus a non-stub evaluate flow with reproducible evidence.",
    videoSafety: "Only safe with strong caveat language.",
  },
];

export function getPipelineCatalogEntry(pipelineName: string | null | undefined) {
  if (!pipelineName) return null;
  return (
    PIPELINE_REVIEW_CATALOG.find(entry =>
      [entry.internalName, entry.publicName, ...(entry.aliases ?? [])].includes(pipelineName),
    ) ?? null
  );
}
