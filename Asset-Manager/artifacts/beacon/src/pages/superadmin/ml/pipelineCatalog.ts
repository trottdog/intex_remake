export type PipelineEvidenceLevel = "direct" | "adjacent" | "model_ops";
export type PipelineCaveatLevel = "normal" | "caution" | "high";

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
  limitation: string;
  links: PipelineRouteLink[];
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
  },
  {
    internalName: "resident_risk",
    publicName: "resident_regression_risk",
    displayName: "Resident Regression Risk",
    family: "Residents",
    taskType: "classification",
    evidence: "direct",
    caveat: "caution",
    summary: "Surfaced directly in the resident regression watchlist.",
    limitation: "The routed UI is in place, but notebook execution and fuller validation evidence are still incomplete.",
    links: [{ label: "Residents: Regression", href: "/superadmin/residents?tab=regression" }],
    aliases: ["resident_regression_risk"],
  },
  {
    internalName: "reintegration_readiness",
    publicName: "reintegration_readiness",
    displayName: "Reintegration Readiness",
    family: "Residents",
    taskType: "classification",
    evidence: "direct",
    caveat: "caution",
    summary: "Surfaced directly in the reintegration funnel and readiness table.",
    limitation: "Evaluation automation and executable notebook proof still need tightening.",
    links: [{ label: "Residents: Reintegration", href: "/superadmin/residents?tab=reintegration" }],
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
    limitation: "UI proof is still indirect and should be demonstrated through adjacent resident workflows or model ops.",
    links: [
      { label: "Residents: Reintegration Context", href: "/superadmin/residents?tab=reintegration" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=case_prioritization" },
    ],
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
    limitation: "Current proof is mostly contract-level rather than a dedicated page-level surface.",
    links: [
      { label: "Residents: Interventions", href: "/superadmin/residents?tab=interventions" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=counseling_progress" },
    ],
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
    limitation: "The routed UI still needs clearer page-level proof for this pipeline specifically.",
    links: [
      { label: "Residents: Interventions", href: "/superadmin/residents?tab=interventions" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=education_improvement" },
    ],
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
    limitation: "Endpoint-to-widget proof is still indirect in the active routed app flow.",
    links: [
      { label: "Residents: Reintegration Context", href: "/superadmin/residents?tab=reintegration" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=home_visitation_outcome" },
    ],
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
    limitation: "Notebook execution proof is still missing, so keep the demo language practical rather than overclaiming.",
    links: [{ label: "Campaigns: Social Planner", href: "/superadmin/campaigns?tab=social" }],
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
    summary: "Surfaced directly in the social planner heatmap and timing recommendation flow.",
    limitation: "Show this in the social planner or control-center context, not as a separate end-user route.",
    links: [
      { label: "Campaigns: Social Planner", href: "/superadmin/campaigns?tab=social" },
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=best_posting_time" },
    ],
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
    limitation: "There is still no strong pipeline-specific action flow in the routed UI, so keep it in model-ops context.",
    links: [
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=capacity_pressure" },
      { label: "Residents: Safehouse Context", href: "/superadmin/residents?tab=safehouses" },
    ],
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
    limitation: "Observed perfect holdout metrics are a leakage-risk signal, so this should only be demoed with a strong caveat.",
    links: [
      { label: "ML Control Center", href: "/superadmin/ml?pipeline=resource_demand" },
      { label: "Residents: Safehouse Context", href: "/superadmin/residents?tab=safehouses" },
    ],
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
