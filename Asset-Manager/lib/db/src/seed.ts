import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  usersTable, safehousesTable, partnersTable, supportersTable,
  residentsTable, donationsTable, donationAllocationsTable,
  inKindDonationItemsTable, socialMediaPostsTable,
  processRecordingsTable, homeVisitationsTable, caseConferencesTable,
  interventionPlansTable, incidentReportsTable, educationRecordsTable,
  healthWellbeingRecordsTable, safehouseMonthlyMetricsTable,
  publicImpactSnapshotsTable, mlPipelineRunsTable, mlPredictionSnapshotsTable,
  staffSafehouseAssignmentsTable, campaignsTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  const pw = await bcrypt.hash("Admin@12345678!", 12);
  const donorPw = await bcrypt.hash("Donor@12345678!", 12);

  await db.delete(staffSafehouseAssignmentsTable);
  await db.delete(mlPredictionSnapshotsTable);
  await db.delete(mlPipelineRunsTable);
  await db.delete(publicImpactSnapshotsTable);
  await db.delete(safehouseMonthlyMetricsTable);
  await db.delete(healthWellbeingRecordsTable);
  await db.delete(educationRecordsTable);
  await db.delete(incidentReportsTable);
  await db.delete(interventionPlansTable);
  await db.delete(caseConferencesTable);
  await db.delete(homeVisitationsTable);
  await db.delete(processRecordingsTable);
  await db.delete(residentsTable);
  await db.delete(inKindDonationItemsTable);
  await db.delete(donationAllocationsTable);
  await db.delete(donationsTable);
  await db.delete(socialMediaPostsTable);
  await db.delete(campaignsTable);
  await db.delete(supportersTable);
  await db.delete(partnersTable);
  await db.delete(usersTable);
  await db.delete(safehousesTable);

  // ── USERS ─────────────────────────────────────────────────────────────────
  await db.insert(usersTable).values([
    { username: "superadmin", email: "superadmin@beacon.org", passwordHash: pw, firstName: "Maria", lastName: "Santos", role: "super_admin", isActive: true },
    { username: "admin",      email: "admin@beacon.org",      passwordHash: pw, firstName: "Jose",  lastName: "Reyes",  role: "admin",      isActive: true },
    { username: "staff1",     email: "staff1@beacon.org",     passwordHash: pw, firstName: "Ana",   lastName: "Cruz",   role: "staff",      isActive: true },
    { username: "staff2",     email: "staff2@beacon.org",     passwordHash: pw, firstName: "Carlo", lastName: "Diaz",   role: "staff",      isActive: true },
    { username: "donor1",     email: "donor@example.com",     passwordHash: donorPw, firstName: "James", lastName: "Miller", role: "donor", isActive: true },
  ]);
  console.log("Users inserted");

  // ── SAFEHOUSES ────────────────────────────────────────────────────────────
  const [sh1, sh2, sh3] = await db.insert(safehousesTable).values([
    { safehouseCode: "SH-MNL-01", name: "Tahanan ng Pag-Asa", region: "NCR", city: "Quezon City",     province: "Metro Manila",    country: "Philippines", openDate: "2018-03-15", status: "active", capacityGirls: 30, capacityStaff: 8, currentOccupancy: 18 },
    { safehouseCode: "SH-CGY-01", name: "Bahay Kalinga",       region: "X",   city: "Cagayan de Oro", province: "Misamis Oriental", country: "Philippines", openDate: "2020-07-01", status: "active", capacityGirls: 20, capacityStaff: 6, currentOccupancy: 12 },
    { safehouseCode: "SH-DAV-01", name: "Silangan Shelter",    region: "XI",  city: "Davao City",     province: "Davao del Sur",   country: "Philippines", openDate: "2021-01-20", status: "active", capacityGirls: 25, capacityStaff: 7, currentOccupancy: 15 },
  ]).returning();
  console.log("Safehouses inserted");

  // ── PARTNERS ──────────────────────────────────────────────────────────────
  await db.insert(partnersTable).values([
    { partnerName: "DSWD Region X",                partnerType: "government", roleType: "referral",      contactName: "Director Ramos", email: "dswd10@gov.ph",      region: "X",   status: "active", startDate: "2020-01-01" },
    { partnerName: "International Justice Mission", partnerType: "ngo",        roleType: "legal_support", contactName: "John Parker",    email: "jparker@ijm.org",    region: "NCR", status: "active", startDate: "2019-06-15" },
    { partnerName: "DepEd CDO",                    partnerType: "government", roleType: "education",     contactName: "Supt. Garcia",   email: "deped.cdo@gov.ph",   region: "X",   status: "active", startDate: "2021-01-01" },
  ]);

  // ── SUPPORTERS (with ML scores) ───────────────────────────────────────────
  const now = new Date();
  const [sup1, sup2, sup3, sup4, sup5, sup6] = await db.insert(supportersTable).values([
    {
      supporterType: "individual", displayName: "James Miller",     firstName: "James",  lastName: "Miller",
      email: "donor@example.com",  region: "NCR", country: "Philippines", status: "active",
      acquisitionChannel: "social_media", canLogin: true, recurringEnabled: true,
      churnRiskScore: 0.18, churnBand: "low",
      churnTopDrivers: [{ label: "Active recurring donor", weight: 0.6 }, { label: "Recent donation", weight: 0.4 }],
      churnRecommendedAction: "Maintain engagement; send impact report",
      churnScoreUpdatedAt: now,
      upgradeLikelihoodScore: 0.71, upgradeBand: "high",
      upgradeTopDrivers: [{ label: "Consistent giving pattern", weight: 0.55 }, { label: "High email open rate", weight: 0.45 }],
      upgradeRecommendedAskBand: "medium", upgradeScoreUpdatedAt: now,
    },
    {
      supporterType: "corporate", organizationName: "Ayala Foundation", displayName: "Ayala Foundation",
      email: "grants@ayalafoundation.org", region: "NCR", country: "Philippines", status: "active",
      acquisitionChannel: "direct", canLogin: false, recurringEnabled: false,
      churnRiskScore: 0.09, churnBand: "low",
      churnTopDrivers: [{ label: "Major grant donor", weight: 0.7 }],
      churnRecommendedAction: "Schedule quarterly impact briefing",
      churnScoreUpdatedAt: now,
      upgradeLikelihoodScore: 0.55, upgradeBand: "medium",
      upgradeTopDrivers: [{ label: "CSR mandate alignment", weight: 0.6 }],
      upgradeRecommendedAskBand: "high", upgradeScoreUpdatedAt: now,
    },
    {
      supporterType: "individual", displayName: "Maria Chen",       firstName: "Maria",  lastName: "Chen",
      email: "mchen@example.com",  region: "XI",  country: "Philippines", status: "active",
      acquisitionChannel: "event", canLogin: false, recurringEnabled: false,
      churnRiskScore: 0.72, churnBand: "high",
      churnTopDrivers: [{ label: "No donation in 180 days", weight: 0.65 }, { label: "Event-only donor", weight: 0.35 }],
      churnRecommendedAction: "Send personalized re-engagement message",
      churnScoreUpdatedAt: now,
      upgradeLikelihoodScore: 0.29, upgradeBand: "low",
      upgradeTopDrivers: [{ label: "Infrequent giving", weight: 0.7 }],
      upgradeRecommendedAskBand: "low", upgradeScoreUpdatedAt: now,
    },
    {
      supporterType: "individual", displayName: "Roberto Garcia",   firstName: "Roberto", lastName: "Garcia",
      email: "rgarcia@example.com", region: "VII", country: "Philippines", status: "active",
      acquisitionChannel: "online", canLogin: false, recurringEnabled: true,
      churnRiskScore: 0.44, churnBand: "medium",
      churnTopDrivers: [{ label: "Donation amount declining", weight: 0.5 }, { label: "Reduced email engagement", weight: 0.5 }],
      churnRecommendedAction: "Send mid-year impact update with matching opportunity",
      churnScoreUpdatedAt: now,
      upgradeLikelihoodScore: 0.63, upgradeBand: "high",
      upgradeTopDrivers: [{ label: "Recurring donor over 2 years", weight: 0.6 }, { label: "High responsiveness", weight: 0.4 }],
      upgradeRecommendedAskBand: "medium", upgradeScoreUpdatedAt: now,
    },
    {
      supporterType: "corporate", organizationName: "SM Foundation", displayName: "SM Foundation",
      email: "csr@smfoundation.org", region: "NCR", country: "Philippines", status: "active",
      acquisitionChannel: "direct", canLogin: false, recurringEnabled: false,
      churnRiskScore: 0.88, churnBand: "critical",
      churnTopDrivers: [{ label: "No donation in 365 days", weight: 0.75 }, { label: "Contact unresponsive", weight: 0.25 }],
      churnRecommendedAction: "Escalate to executive relationship manager",
      churnScoreUpdatedAt: now,
      upgradeLikelihoodScore: 0.12, upgradeBand: "low",
      upgradeTopDrivers: [{ label: "Lapsed major donor", weight: 0.8 }],
      upgradeRecommendedAskBand: "low", upgradeScoreUpdatedAt: now,
    },
    {
      supporterType: "individual", displayName: "Lena Tan",         firstName: "Lena",   lastName: "Tan",
      email: "lena.tan@example.com", region: "III", country: "Philippines", status: "active",
      acquisitionChannel: "referral", canLogin: false, recurringEnabled: true,
      churnRiskScore: 0.31, churnBand: "low",
      churnTopDrivers: [{ label: "Referred 3 donors", weight: 0.55 }, { label: "Monthly giving active", weight: 0.45 }],
      churnRecommendedAction: "Nominate as donor ambassador",
      churnScoreUpdatedAt: now,
      upgradeLikelihoodScore: 0.85, upgradeBand: "high",
      upgradeTopDrivers: [{ label: "High engagement score", weight: 0.65 }, { label: "Major event attendee", weight: 0.35 }],
      upgradeRecommendedAskBand: "high", upgradeScoreUpdatedAt: now,
    },
  ]).returning();

  // Link donor user to supporter
  const donorUser = await db.select().from(usersTable).where(eq(usersTable.username, "donor1")).limit(1);
  if (donorUser[0]) await db.update(usersTable).set({ supporterId: sup1.supporterId }).where(eq(usersTable.id, donorUser[0].id));
  console.log("Supporters inserted");

  // ── CAMPAIGNS ─────────────────────────────────────────────────────────────
  const [camp1, camp2, camp3] = await db.insert(campaignsTable).values([
    { title: "Pag-Asa Year-End Campaign", category: "fundraising",  goal: "500000", deadline: "2025-12-31", status: "active" },
    { title: "School Supplies Drive",     category: "in_kind",       goal: "150000", deadline: "2026-02-28", status: "active" },
    { title: "Bahay Kalinga Expansion",   category: "capital",       goal: "1000000",deadline: "2026-06-30", status: "draft" },
  ]).returning();

  // ── SOCIAL MEDIA POSTS (with ML scores) ───────────────────────────────────
  const [post1, post2, post3] = await db.insert(socialMediaPostsTable).values([
    {
      platform: "facebook", postType: "awareness", dayOfWeek: "Wednesday", postHour: 18,
      contentTopic: "trafficking_awareness", mediaType: "video",
      caption: "Help us protect vulnerable children. Every share counts.",
      campaignName: "Pag-Asa Campaign 2025",
      likes: 245, shares: 89, comments: 34, reach: 4200, impressions: 6800,
      engagementRate: "0.058", donationReferrals: 12, estimatedDonationValuePhp: "45000",
      conversionPredictionScore: 0.74, conversionBand: "high-converter",
      conversionTopDrivers: [{ label: "Video content", weight: 0.55 }, { label: "Evening post hour", weight: 0.45 }],
      conversionScoreUpdatedAt: now,
      predictedReferralCount: "9", predictedDonationValuePhp: "38000",
      createdAt: new Date("2026-03-01T18:00:00Z"),
    },
    {
      platform: "instagram", postType: "impact_story", dayOfWeek: "Friday", postHour: 20,
      contentTopic: "success_story", mediaType: "image",
      caption: "From shelter to strength — one girl at a time.",
      campaignName: "Stories of Hope",
      likes: 567, shares: 123, comments: 78, reach: 8900, impressions: 14200,
      engagementRate: "0.064", donationReferrals: 23, estimatedDonationValuePhp: "87500",
      conversionPredictionScore: 0.88, conversionBand: "high-converter",
      conversionTopDrivers: [{ label: "Impact story format", weight: 0.6 }, { label: "Weekend evening timing", weight: 0.4 }],
      conversionScoreUpdatedAt: now,
      predictedReferralCount: "18", predictedDonationValuePhp: "72000",
      createdAt: new Date("2026-03-15T20:00:00Z"),
    },
    {
      platform: "facebook", postType: "fundraising", dayOfWeek: "Tuesday", postHour: 10,
      contentTopic: "donation_appeal", mediaType: "image",
      caption: "Year-end giving — your donation changes lives before 2026.",
      campaignName: "Year-End Giving",
      likes: 102, shares: 41, comments: 15, reach: 2100, impressions: 3200,
      engagementRate: "0.049", donationReferrals: 5, estimatedDonationValuePhp: "18500",
      conversionPredictionScore: 0.41, conversionBand: "moderate-converter",
      conversionTopDrivers: [{ label: "Urgency messaging", weight: 0.5 }, { label: "Midweek timing", weight: 0.5 }],
      conversionScoreUpdatedAt: now,
      predictedReferralCount: "7", predictedDonationValuePhp: "25000",
      createdAt: new Date("2026-03-22T10:00:00Z"),
    },
  ]).returning();

  // ── DONATIONS ─────────────────────────────────────────────────────────────
  const [don1, don2, don3] = await db.insert(donationsTable).values([
    { supporterId: sup1.supporterId, donationType: "monetary",  donationDate: "2025-12-15", isRecurring: false, campaignName: "Year-End Giving",    channelSource: "online",  currencyCode: "PHP", amount: "25000",  referralPostId: post1.postId, attributedOutcomeScore: 0.76 },
    { supporterId: sup2.supporterId, donationType: "monetary",  donationDate: "2026-01-10", isRecurring: false, campaignName: "New Year Grant",      channelSource: "direct",  currencyCode: "PHP", amount: "500000", attributedOutcomeScore: 0.91 },
    { supporterId: sup3.supporterId, donationType: "in_kind",   donationDate: "2026-02-20", isRecurring: false, campaignName: "School Supplies Drive",channelSource: "event",   currencyCode: "PHP", estimatedValue: "15000", impactUnit: "school_kits", attributedOutcomeScore: 0.62 },
    { supporterId: sup1.supporterId, donationType: "monetary",  donationDate: "2025-09-20", isRecurring: true,  campaignName: "Monthly Giving",      channelSource: "online",  currencyCode: "PHP", amount: "5000",   attributedOutcomeScore: 0.71 },
    { supporterId: sup4.supporterId, donationType: "monetary",  donationDate: "2025-11-05", isRecurring: true,  campaignName: "Monthly Giving",      channelSource: "online",  currencyCode: "PHP", amount: "3000",   attributedOutcomeScore: 0.58 },
    { supporterId: sup4.supporterId, donationType: "monetary",  donationDate: "2025-08-05", isRecurring: true,  campaignName: "Monthly Giving",      channelSource: "online",  currencyCode: "PHP", amount: "4000",   attributedOutcomeScore: 0.54 },
    { supporterId: sup6.supporterId, donationType: "monetary",  donationDate: "2025-12-01", isRecurring: true,  campaignName: "Monthly Giving",      channelSource: "referral",currencyCode: "PHP", amount: "8000",   referralPostId: post2.postId, attributedOutcomeScore: 0.83 },
    { supporterId: sup6.supporterId, donationType: "monetary",  donationDate: "2025-11-01", isRecurring: true,  campaignName: "Monthly Giving",      channelSource: "referral",currencyCode: "PHP", amount: "8000",   attributedOutcomeScore: 0.80 },
  ]).returning();

  await db.insert(inKindDonationItemsTable).values([
    { donationId: don3.donationId, itemName: "School Bag", itemCategory: "educational", quantity: "30", unitOfMeasure: "pieces", estimatedUnitValue: "350", intendedUse: "School attendance", receivedCondition: "new" },
  ]);

  await db.insert(donationAllocationsTable).values([
    { donationId: don1.donationId, safehouseId: sh1.safehouseId, programArea: "psychosocial_support", amountAllocated: "15000", allocationDate: "2025-12-20" },
    { donationId: don2.donationId, safehouseId: sh1.safehouseId, programArea: "operations",           amountAllocated: "200000",allocationDate: "2026-01-12" },
    { donationId: don2.donationId, safehouseId: sh2.safehouseId, programArea: "education",            amountAllocated: "150000",allocationDate: "2026-01-12" },
  ]);
  console.log("Donations inserted");

  // ── RESIDENTS (with ML scores) ────────────────────────────────────────────
  const scoreNow = new Date("2026-01-15T08:00:00Z");
  const [r1, r2, r3, , r5] = await db.insert(residentsTable).values([
    {
      caseControlNo: "CC-2024-001", internalCode: "SH1-R001", safehouseId: sh1.safehouseId,
      caseStatus: "active", sex: "female", dateOfBirth: "2012-05-14", caseCategory: "trafficking",
      subCatTrafficked: true, dateOfAdmission: "2024-03-10", referralSource: "DSWD",
      assignedSocialWorker: "Ana Cruz", initialRiskLevel: "high", currentRiskLevel: "medium",
      reintegrationStatus: "in_progress", reintegrationStage: "In Planning",
      regressionRiskScore: 0.34, regressionRiskBand: "moderate",
      regressionRiskDrivers: [{ label: "Family instability concern", weight: 0.5 }, { label: "Peer influence risk", weight: 0.5 }],
      regressionRecommendedAction: "Increase family therapy sessions",
      regressionScoreUpdatedAt: scoreNow,
      reintegrationReadinessScore: 0.72, reintegrationReadinessBand: "high",
      reintegrationReadinessDrivers: { positive: [{ label: "Good therapy progress" }, { label: "Family cooperative" }], barriers: [{ label: "School re-entry pending" }] },
      reintegrationRecommendedAction: "Proceed with gradual reintegration plan",
      reintegrationScoreUpdatedAt: scoreNow,
      mlScoresRestricted: false,
    },
    {
      caseControlNo: "CC-2024-002", internalCode: "SH1-R002", safehouseId: sh1.safehouseId,
      caseStatus: "active", sex: "female", dateOfBirth: "2010-11-22", caseCategory: "abuse",
      subCatPhysicalAbuse: true, subCatSexualAbuse: true, dateOfAdmission: "2024-06-15",
      referralSource: "barangay_official", assignedSocialWorker: "Ana Cruz",
      initialRiskLevel: "critical", currentRiskLevel: "high", reintegrationStatus: "not_started",
      regressionRiskScore: 0.81, regressionRiskBand: "high",
      regressionRiskDrivers: [{ label: "Severe trauma history", weight: 0.65 }, { label: "Limited family support", weight: 0.35 }],
      regressionRecommendedAction: "Prioritize trauma-focused therapy; delay reintegration assessment",
      regressionScoreUpdatedAt: scoreNow,
      reintegrationReadinessScore: 0.18, reintegrationReadinessBand: "low",
      reintegrationReadinessDrivers: { positive: [], barriers: [{ label: "Ongoing trauma symptoms" }, { label: "Family safety unverified" }] },
      reintegrationRecommendedAction: "Complete safety assessment before planning",
      reintegrationScoreUpdatedAt: scoreNow,
      mlScoresRestricted: false,
    },
    {
      caseControlNo: "CC-2024-003", internalCode: "SH2-R001", safehouseId: sh2.safehouseId,
      caseStatus: "active", sex: "female", dateOfBirth: "2013-08-30", caseCategory: "child_labor",
      subCatChildLabor: true, dateOfAdmission: "2024-09-01", referralSource: "DSWD",
      assignedSocialWorker: "Carlo Diaz", initialRiskLevel: "medium", currentRiskLevel: "low",
      reintegrationStatus: "ready", reintegrationStage: "Eligible",
      regressionRiskScore: 0.14, regressionRiskBand: "stable",
      regressionRiskDrivers: [{ label: "Excellent school performance", weight: 0.7 }],
      regressionRecommendedAction: "Continue current program; prepare reintegration documentation",
      regressionScoreUpdatedAt: scoreNow,
      reintegrationReadinessScore: 0.91, reintegrationReadinessBand: "high",
      reintegrationReadinessDrivers: { positive: [{ label: "Family cooperative" }, { label: "Academic progress 85%" }, { label: "Stable household income" }], barriers: [] },
      reintegrationRecommendedAction: "Begin formal reintegration process this quarter",
      reintegrationScoreUpdatedAt: scoreNow,
      mlScoresRestricted: false,
    },
    {
      caseControlNo: "CC-2023-015", internalCode: "SH1-R003", safehouseId: sh1.safehouseId,
      caseStatus: "closed", sex: "female", dateOfBirth: "2009-02-18", caseCategory: "trafficking",
      subCatTrafficked: true, dateOfAdmission: "2023-04-20", dateClosed: "2025-01-15",
      assignedSocialWorker: "Ana Cruz", initialRiskLevel: "high", currentRiskLevel: "low",
      reintegrationStatus: "completed", reintegrationStage: "Reintegrated",
      regressionRiskScore: 0.08, regressionRiskBand: "stable",
      regressionRiskDrivers: [{ label: "Successful reintegration", weight: 0.9 }],
      regressionRecommendedAction: "Schedule 3-month post-reintegration follow-up",
      regressionScoreUpdatedAt: scoreNow,
      reintegrationReadinessScore: 0.97, reintegrationReadinessBand: "high",
      reintegrationReadinessDrivers: { positive: [{ label: "Successfully reintegrated" }], barriers: [] },
      reintegrationRecommendedAction: "Post-reintegration monitoring only",
      reintegrationScoreUpdatedAt: scoreNow,
      mlScoresRestricted: false,
    },
    {
      caseControlNo: "CC-2025-001", internalCode: "SH3-R001", safehouseId: sh3.safehouseId,
      caseStatus: "active", sex: "female", dateOfBirth: "2011-07-09", caseCategory: "osac",
      subCatOsaec: true, dateOfAdmission: "2025-01-08", referralSource: "police",
      assignedSocialWorker: "Carlo Diaz", initialRiskLevel: "critical", currentRiskLevel: "critical",
      reintegrationStatus: "not_started",
      regressionRiskScore: 0.93, regressionRiskBand: "critical",
      regressionRiskDrivers: [{ label: "Recent trauma exposure", weight: 0.7 }, { label: "No family contact", weight: 0.3 }],
      regressionRecommendedAction: "Immediate crisis intervention; no reintegration planning yet",
      regressionScoreUpdatedAt: scoreNow,
      reintegrationReadinessScore: 0.05, reintegrationReadinessBand: "low",
      reintegrationReadinessDrivers: { positive: [], barriers: [{ label: "Critical risk level" }, { label: "No family contact" }, { label: "Trauma stabilization ongoing" }] },
      reintegrationRecommendedAction: "Focus on stabilization; defer reintegration 6+ months",
      reintegrationScoreUpdatedAt: scoreNow,
      mlScoresRestricted: true,
    },
  ]).returning();
  console.log("Residents inserted");

  await db.insert(processRecordingsTable).values([
    { residentId: r1.residentId, sessionDate: "2025-12-10", socialWorker: "Ana Cruz",   sessionType: "individual_counseling", sessionNarrative: "Resident demonstrated improved emotional regulation.", progressNoted: true,  concernsFlagged: false, referralMade: false },
    { residentId: r2.residentId, sessionDate: "2025-12-08", socialWorker: "Ana Cruz",   sessionType: "trauma_processing",     sessionNarrative: "Session focused on trauma processing. Resident was tearful but cooperative.", progressNoted: false, concernsFlagged: true,  referralMade: true },
    { residentId: r3.residentId, sessionDate: "2025-12-12", socialWorker: "Carlo Diaz", sessionType: "life_skills",           sessionNarrative: "Resident completed budgeting and basic livelihood module.", progressNoted: true,  concernsFlagged: false, referralMade: false },
  ]);

  await db.insert(homeVisitationsTable).values([
    { residentId: r1.residentId, visitDate: "2025-11-20", socialWorker: "Ana Cruz", visitType: "pre_reintegration", locationVisited: "Family home, QC", familyMembersPresent: "Mother, aunt", observations: "Family is stable.", safetyConcernsNoted: false, followUpNeeded: false, visitOutcome: "favorable" },
    { residentId: r3.residentId, visitDate: "2025-12-05", socialWorker: "Carlo Diaz", visitType: "pre_reintegration", locationVisited: "Family home, CDO", familyMembersPresent: "Mother, father, sibling", observations: "Household cooperative and stable income.", safetyConcernsNoted: false, followUpNeeded: false, visitOutcome: "favorable" },
  ]);

  await db.insert(caseConferencesTable).values([
    { residentId: r1.residentId, conferenceDate: "2025-12-05", conferenceType: "reintegration_planning", summary: "Resident ready for gradual reintegration.", decisionsMade: "Begin monthly home visits.", nextConferenceDate: "2026-01-15", createdBy: "Ana Cruz" },
    { residentId: r2.residentId, conferenceDate: "2025-12-10", conferenceType: "safety_review",          summary: "Case reviewed due to high-risk status.", decisionsMade: "Increase therapy frequency.", createdBy: "Ana Cruz" },
  ]);

  await db.insert(interventionPlansTable).values([
    { residentId: r1.residentId, planCategory: "education",       planDescription: "Enroll in ALS to catch up on missed schooling.", servicesProvided: "ALS, tutoring, school supplies", targetValue: "100", targetDate: "2026-03-31", status: "in_progress", effectivenessOutcomeScore: 0.78, effectivenessBand: "high-impact" },
    { residentId: r2.residentId, planCategory: "psychosocial",    planDescription: "Intensive trauma-focused CBT.", servicesProvided: "TF-CBT, art therapy", targetValue: "80", targetDate: "2026-06-30", status: "active", effectivenessOutcomeScore: 0.52, effectivenessBand: "moderate" },
    { residentId: r3.residentId, planCategory: "reintegration",   planDescription: "Prepare for family reintegration.", servicesProvided: "Family therapy, life skills", targetValue: "100", targetDate: "2026-02-28", status: "in_progress", effectivenessOutcomeScore: 0.88, effectivenessBand: "high-impact" },
    { residentId: r1.residentId, planCategory: "legal",           planDescription: "Coordinate with IJM for legal documentation.", servicesProvided: "Legal aid, documentation", targetValue: "100", targetDate: "2026-04-30", status: "active", effectivenessOutcomeScore: 0.65, effectivenessBand: "moderate" },
  ]);

  await db.insert(incidentReportsTable).values([
    { residentId: r2.residentId, safehouseId: sh1.safehouseId, incidentDate: "2025-12-03", incidentType: "emotional_crisis", severity: "high",   description: "Resident experienced severe flashback episode.", responseTaken: "Immediate crisis counseling.", resolved: false, reportedBy: "Ana Cruz",   followUpRequired: true },
    { safehouseId: sh2.safehouseId,                             incidentDate: "2025-11-28", incidentType: "medical",          severity: "medium", description: "Resident complained of abdominal pain.", responseTaken: "Medical consultation done. Gastritis diagnosed.", resolved: true, resolutionDate: "2025-11-29", reportedBy: "Carlo Diaz" },
    { residentId: r5.residentId, safehouseId: sh3.safehouseId, incidentDate: "2026-01-10", incidentType: "behavioral",       severity: "high",   description: "Resident exhibited self-harm ideation.", responseTaken: "Crisis protocol activated. Psychiatrist consulted.", resolved: false, reportedBy: "Carlo Diaz", followUpRequired: true },
  ]);

  await db.insert(educationRecordsTable).values([
    { residentId: r1.residentId, recordDate: "2025-12-01", educationLevel: "elementary", schoolName: "ALS - Quezon City", enrollmentStatus: "enrolled", attendanceRate: "92.5", progressPercent: "68", completionStatus: "in_progress" },
    { residentId: r3.residentId, recordDate: "2025-12-01", educationLevel: "elementary", schoolName: "DepEd CDO ALS",     enrollmentStatus: "enrolled", attendanceRate: "97.0", progressPercent: "85", completionStatus: "in_progress" },
  ]);

  await db.insert(healthWellbeingRecordsTable).values([
    { residentId: r1.residentId, recordDate: "2025-12-01", generalHealthScore: "7.5", nutritionScore: "8",   sleepQualityScore: "7",   heightCm: "148", weightKg: "40.5", bmi: "18.5", medicalCheckupDone: true,  psychologicalCheckupDone: true },
    { residentId: r2.residentId, recordDate: "2025-12-01", generalHealthScore: "5.5", nutritionScore: "6",   sleepQualityScore: "4",   heightCm: "155", weightKg: "44.0", bmi: "18.3", medicalCheckupDone: true,  psychologicalCheckupDone: true },
    { residentId: r3.residentId, recordDate: "2025-12-01", generalHealthScore: "8.5", nutritionScore: "9",   sleepQualityScore: "8.5", heightCm: "140", weightKg: "36.0", bmi: "18.4", medicalCheckupDone: true,  psychologicalCheckupDone: true },
  ]);

  // ── SAFEHOUSE MONTHLY METRICS (with health scores) ────────────────────────
  await db.insert(safehouseMonthlyMetricsTable).values([
    { safehouseId: sh1.safehouseId, monthStart: "2025-10-01", monthEnd: "2025-10-31", activeResidents: 17, avgHealthScore: "6.8", avgEducationProgress: "70.0", processRecordingCount: 18, incidentCount: 2, compositeHealthScore: 0.62, healthBand: "moderate", peerRank: 2, trendDirection: "improving", healthScoreComputedAt: scoreNow },
    { safehouseId: sh1.safehouseId, monthStart: "2025-11-01", monthEnd: "2025-11-30", activeResidents: 18, avgHealthScore: "6.9", avgEducationProgress: "72.0", processRecordingCount: 19, incidentCount: 2, compositeHealthScore: 0.65, healthBand: "moderate", peerRank: 2, trendDirection: "improving", healthScoreComputedAt: scoreNow },
    { safehouseId: sh1.safehouseId, monthStart: "2025-12-01", monthEnd: "2025-12-31", activeResidents: 18, avgHealthScore: "7.1", avgEducationProgress: "74.0", processRecordingCount: 20, incidentCount: 1, compositeHealthScore: 0.70, healthBand: "good",     peerRank: 2, trendDirection: "improving", healthScoreComputedAt: scoreNow },
    { safehouseId: sh2.safehouseId, monthStart: "2025-10-01", monthEnd: "2025-10-31", activeResidents: 11, avgHealthScore: "7.8", avgEducationProgress: "78.0", processRecordingCount: 14, incidentCount: 1, compositeHealthScore: 0.78, healthBand: "good",     peerRank: 1, trendDirection: "stable",    healthScoreComputedAt: scoreNow },
    { safehouseId: sh2.safehouseId, monthStart: "2025-11-01", monthEnd: "2025-11-30", activeResidents: 12, avgHealthScore: "7.9", avgEducationProgress: "79.0", processRecordingCount: 14, incidentCount: 1, compositeHealthScore: 0.79, healthBand: "good",     peerRank: 1, trendDirection: "stable",    healthScoreComputedAt: scoreNow },
    { safehouseId: sh2.safehouseId, monthStart: "2025-12-01", monthEnd: "2025-12-31", activeResidents: 12, avgHealthScore: "8.0", avgEducationProgress: "80.5", processRecordingCount: 15, incidentCount: 1, compositeHealthScore: 0.81, healthBand: "good",     peerRank: 1, trendDirection: "stable",    healthScoreComputedAt: scoreNow },
    { safehouseId: sh3.safehouseId, monthStart: "2025-10-01", monthEnd: "2025-10-31", activeResidents: 14, avgHealthScore: "6.5", avgEducationProgress: "68.0", processRecordingCount: 16, incidentCount: 1, compositeHealthScore: 0.55, healthBand: "at-risk",  peerRank: 3, trendDirection: "declining",  healthScoreComputedAt: scoreNow },
    { safehouseId: sh3.safehouseId, monthStart: "2025-11-01", monthEnd: "2025-11-30", activeResidents: 15, avgHealthScore: "6.9", avgEducationProgress: "70.0", processRecordingCount: 17, incidentCount: 0, compositeHealthScore: 0.60, healthBand: "moderate", peerRank: 3, trendDirection: "improving",  healthScoreComputedAt: scoreNow },
    { safehouseId: sh3.safehouseId, monthStart: "2025-12-01", monthEnd: "2025-12-31", activeResidents: 15, avgHealthScore: "7.8", avgEducationProgress: "71.0", processRecordingCount: 18, incidentCount: 0, compositeHealthScore: 0.63, healthBand: "moderate", peerRank: 3, trendDirection: "improving",  healthScoreComputedAt: scoreNow },
  ]);

  // ── PUBLIC IMPACT SNAPSHOTS (with funding gap) ────────────────────────────
  await db.insert(publicImpactSnapshotsTable).values([
    {
      snapshotDate: "2025-12-31",
      headline: "2025: A Year of Resilience and Hope",
      summaryText: "Serving 45 residents across 3 safehouses, achieving 8 successful reintegrations.",
      metricPayloadJson: { residentsServed: 45, reintegrations: 8, donationsRaised: 620000, programsActive: 8 },
      isPublished: true, publishedAt: new Date("2026-01-05"),
      projectedGapPhp30d: "85000", fundingGapBand: "moderate",
      fundingGapUpdatedAt: new Date("2026-01-01"),
    },
    {
      snapshotDate: "2025-09-30",
      headline: "Q3 2025: Growing Impact Across Mindanao",
      summaryText: "New Davao safehouse opened, serving 15 additional residents.",
      metricPayloadJson: { residentsServed: 38, reintegrations: 5, donationsRaised: 340000 },
      isPublished: true, publishedAt: new Date("2025-10-10"),
      projectedGapPhp30d: "120000", fundingGapBand: "high",
      fundingGapUpdatedAt: new Date("2025-10-01"),
    },
    {
      snapshotDate: "2025-06-30",
      headline: "Mid-Year Progress Report",
      summaryText: "220 beneficiaries supported; psychosocial services expanded.",
      metricPayloadJson: { residentsServed: 32, reintegrations: 3, donationsRaised: 180000 },
      isPublished: true, publishedAt: new Date("2025-07-10"),
      projectedGapPhp30d: "210000", fundingGapBand: "critical",
      fundingGapUpdatedAt: new Date("2025-07-01"),
    },
  ]);

  // ── ML PIPELINE RUNS (all 9 pipelines with correct names) ─────────────────
  const featureImportanceChurn = [
    { feature: "days_since_last_donation", importance: 0.38, label: "Days Since Last Donation" },
    { feature: "donation_frequency",        importance: 0.24, label: "Donation Frequency" },
    { feature: "avg_donation_amount",        importance: 0.18, label: "Average Donation Amount" },
    { feature: "acquisition_channel",        importance: 0.12, label: "Acquisition Channel" },
    { feature: "recurring_enabled",          importance: 0.08, label: "Recurring Donor" },
  ];
  const featureImportanceReintegration = [
    { feature: "family_cooperation_score",   importance: 0.32, label: "Family Cooperation Score" },
    { feature: "therapy_progress_pct",       importance: 0.28, label: "Therapy Progress %" },
    { feature: "education_attendance_rate",  importance: 0.20, label: "Education Attendance Rate" },
    { feature: "length_of_stay_days",        importance: 0.12, label: "Length of Stay" },
    { feature: "incident_count_30d",         importance: 0.08, label: "Recent Incidents (30d)" },
  ];

  const [pipe1, pipe2, pipe3, pipe4] = await db.insert(mlPipelineRunsTable).values([
    {
      pipelineName: "donor_churn_risk",        displayName: "Donor Churn Risk",         modelName: "XGBoost Classifier",    status: "completed",
      trainedAt: new Date("2026-01-15"), dataSource: "donations_supporters",
      metricsJson: { accuracy: 0.847, auc: 0.913, f1: 0.821, precision: 0.834, recall: 0.809 },
      featureImportanceJson: featureImportanceChurn, scoredEntityCount: 6,
    },
    {
      pipelineName: "reintegration_readiness", displayName: "Reintegration Readiness",  modelName: "Random Forest",         status: "completed",
      trainedAt: new Date("2026-01-10"), dataSource: "residents_records",
      metricsJson: { accuracy: 0.791, auc: 0.865, f1: 0.778, precision: 0.801, recall: 0.756 },
      featureImportanceJson: featureImportanceReintegration, scoredEntityCount: 5,
    },
    {
      pipelineName: "regression_risk",         displayName: "Regression Risk",          modelName: "Gradient Boosting",     status: "completed",
      trainedAt: new Date("2026-01-12"), dataSource: "residents_interventions",
      metricsJson: { accuracy: 0.823, auc: 0.891, f1: 0.810, precision: 0.826, recall: 0.794 },
      featureImportanceJson: [
        { feature: "incident_severity_score", importance: 0.41, label: "Incident Severity Score" },
        { feature: "therapy_consistency",     importance: 0.29, label: "Therapy Consistency" },
        { feature: "family_support_index",    importance: 0.30, label: "Family Support Index" },
      ], scoredEntityCount: 5,
    },
    {
      pipelineName: "upgrade_likelihood",      displayName: "Upgrade Likelihood",       modelName: "Logistic Regression",   status: "completed",
      trainedAt: new Date("2026-01-14"), dataSource: "donations_supporters",
      metricsJson: { accuracy: 0.762, auc: 0.838, f1: 0.749, precision: 0.771, recall: 0.728 },
      featureImportanceJson: [
        { feature: "avg_quarterly_donation", importance: 0.35, label: "Avg Quarterly Donation" },
        { feature: "engagement_score",       importance: 0.30, label: "Engagement Score" },
        { feature: "tenure_months",          importance: 0.35, label: "Tenure Months" },
      ], scoredEntityCount: 6,
    },
    {
      pipelineName: "intervention_effectiveness", displayName: "Intervention Effectiveness", modelName: "Random Forest Regressor", status: "completed",
      trainedAt: new Date("2026-01-08"), dataSource: "intervention_plans",
      metricsJson: { rmse: 0.142, r2: 0.734 },
      featureImportanceJson: [
        { feature: "plan_category",         importance: 0.38, label: "Plan Category" },
        { feature: "session_frequency",     importance: 0.32, label: "Session Frequency" },
        { feature: "worker_experience",     importance: 0.30, label: "Worker Experience" },
      ], scoredEntityCount: 4,
    },
    {
      pipelineName: "social_conversion",      displayName: "Social Conversion",        modelName: "Neural Network",        status: "completed",
      trainedAt: new Date("2026-01-11"), dataSource: "social_media_posts",
      metricsJson: { accuracy: 0.806, auc: 0.874, f1: 0.793, precision: 0.814, recall: 0.773 },
      featureImportanceJson: [
        { feature: "media_type",      importance: 0.32, label: "Media Type" },
        { feature: "post_hour",       importance: 0.28, label: "Post Hour" },
        { feature: "content_topic",   importance: 0.22, label: "Content Topic" },
        { feature: "is_boosted",      importance: 0.18, label: "Is Boosted" },
      ], scoredEntityCount: 3,
    },
    {
      pipelineName: "safehouse_health",       displayName: "Safehouse Health Index",   modelName: "Weighted Composite",    status: "completed",
      trainedAt: new Date("2026-01-09"), dataSource: "safehouse_monthly_metrics",
      metricsJson: { rmse: 0.089, r2: 0.812 },
      featureImportanceJson: [
        { feature: "avg_health_score",       importance: 0.35, label: "Avg Health Score" },
        { feature: "incident_count",         importance: 0.30, label: "Incident Count (inverted)" },
        { feature: "avg_education_progress", importance: 0.35, label: "Avg Education Progress" },
      ], scoredEntityCount: 3,
    },
    {
      pipelineName: "funding_gap_predictor", displayName: "Funding Gap Predictor",   modelName: "Time-Series ARIMA",     status: "completed",
      trainedAt: new Date("2026-01-07"), dataSource: "donations_snapshots",
      metricsJson: { rmse: 12450.32, mape: 0.089 },
      featureImportanceJson: [
        { feature: "monthly_donation_trend", importance: 0.45, label: "Monthly Donation Trend" },
        { feature: "campaign_cycle",         importance: 0.30, label: "Campaign Cycle" },
        { feature: "seasonal_factor",        importance: 0.25, label: "Seasonal Factor" },
      ], scoredEntityCount: 3,
    },
    {
      pipelineName: "donor_attribution",    displayName: "Donor Attribution",       modelName: "Bayesian Network",      status: "completed",
      trainedAt: new Date("2026-01-06"), dataSource: "donations_posts_campaigns",
      metricsJson: { accuracy: 0.779, auc: 0.851 },
      featureImportanceJson: [
        { feature: "referral_post_id",   importance: 0.42, label: "Referral Post" },
        { feature: "channel_source",     importance: 0.33, label: "Channel Source" },
        { feature: "campaign_name",      importance: 0.25, label: "Campaign Name" },
      ], scoredEntityCount: 8,
    },
  ]).returning();

  // ── ML PREDICTION SNAPSHOTS ───────────────────────────────────────────────
  await db.insert(mlPredictionSnapshotsTable).values([
    // Churn risk — bands: low (<0.30), moderate (0.30–0.60), high (0.60–0.80), critical (>0.80)
    { runId: pipe1.runId, pipelineName: "donor_churn_risk", entityType: "supporter", entityId: sup1.supporterId, entityKey: `supporter_${sup1.supporterId}`, entityLabel: "James Miller",    predictionScore: 0.18, bandLabel: "low",      rankOrder: 1 },
    { runId: pipe1.runId, pipelineName: "donor_churn_risk", entityType: "supporter", entityId: sup2.supporterId, entityKey: `supporter_${sup2.supporterId}`, entityLabel: "Ayala Foundation", predictionScore: 0.09, bandLabel: "low",      rankOrder: 2 },
    { runId: pipe1.runId, pipelineName: "donor_churn_risk", entityType: "supporter", entityId: sup3.supporterId, entityKey: `supporter_${sup3.supporterId}`, entityLabel: "Maria Chen",       predictionScore: 0.72, bandLabel: "high",     rankOrder: 3, contextJson: { reason: "No donation in 180 days" } },
    { runId: pipe1.runId, pipelineName: "donor_churn_risk", entityType: "supporter", entityId: sup4.supporterId, entityKey: `supporter_${sup4.supporterId}`, entityLabel: "Roberto Garcia",   predictionScore: 0.44, bandLabel: "moderate", rankOrder: 4 },
    { runId: pipe1.runId, pipelineName: "donor_churn_risk", entityType: "supporter", entityId: sup5.supporterId, entityKey: `supporter_${sup5.supporterId}`, entityLabel: "SM Foundation",    predictionScore: 0.88, bandLabel: "critical", rankOrder: 5, contextJson: { reason: "No donation in 365 days" } },
    { runId: pipe1.runId, pipelineName: "donor_churn_risk", entityType: "supporter", entityId: sup6.supporterId, entityKey: `supporter_${sup6.supporterId}`, entityLabel: "Lena Tan",         predictionScore: 0.31, bandLabel: "moderate", rankOrder: 6 },
    // Reintegration readiness — bands: not-ready (<0.40), partially-ready (0.40–0.70), ready (>0.70)
    { runId: pipe2.runId, pipelineName: "reintegration_readiness", entityType: "resident", entityId: r1.residentId, entityKey: `resident_${r1.residentId}`, entityLabel: r1.caseControlNo, safehouseId: sh1.safehouseId, predictionScore: 0.72, bandLabel: "ready", predictionValue: 1, rankOrder: 1, contextJson: { reason: "Stable family, good therapy progress" } },
    { runId: pipe2.runId, pipelineName: "reintegration_readiness", entityType: "resident", entityId: r3.residentId, entityKey: `resident_${r3.residentId}`, entityLabel: r3.caseControlNo, safehouseId: sh2.safehouseId, predictionScore: 0.91, bandLabel: "ready", predictionValue: 1, rankOrder: 2, contextJson: { reason: "Family cooperative, excellent school performance" } },
    // Upgrade likelihood — bands: low (<0.40), moderate (0.40–0.70), high (>0.70)
    { runId: pipe4.runId, pipelineName: "upgrade_likelihood", entityType: "supporter", entityId: sup6.supporterId, entityKey: `supporter_${sup6.supporterId}`, entityLabel: "Lena Tan",       predictionScore: 0.85, bandLabel: "high",     rankOrder: 1 },
    { runId: pipe4.runId, pipelineName: "upgrade_likelihood", entityType: "supporter", entityId: sup1.supporterId, entityKey: `supporter_${sup1.supporterId}`, entityLabel: "James Miller",   predictionScore: 0.71, bandLabel: "high",     rankOrder: 2 },
    { runId: pipe4.runId, pipelineName: "upgrade_likelihood", entityType: "supporter", entityId: sup4.supporterId, entityKey: `supporter_${sup4.supporterId}`, entityLabel: "Roberto Garcia", predictionScore: 0.63, bandLabel: "moderate", rankOrder: 3 },
  ]);
  console.log("ML pipelines and snapshots inserted");

  // ── STAFF ASSIGNMENTS ─────────────────────────────────────────────────────
  const allUsers = await db.select().from(usersTable);
  const staff1 = allUsers.find(u => u.username === "staff1");
  const staff2 = allUsers.find(u => u.username === "staff2");
  const adminU  = allUsers.find(u => u.username === "admin");
  if (staff1 && staff2 && adminU) {
    await db.insert(staffSafehouseAssignmentsTable).values([
      { userId: String(staff1.id), safehouseId: sh1.safehouseId },
      { userId: String(staff2.id), safehouseId: sh2.safehouseId },
      { userId: String(staff2.id), safehouseId: sh3.safehouseId },
      { userId: String(adminU.id), safehouseId: sh1.safehouseId },
      { userId: String(adminU.id), safehouseId: sh2.safehouseId },
      { userId: String(adminU.id), safehouseId: sh3.safehouseId },
    ]);
  }

  console.log("\nSeed complete!");
  console.log("  superadmin / Admin@12345678!");
  console.log("  admin      / Admin@12345678!");
  console.log("  staff1     / Admin@12345678!");
  console.log("  donor1     / Donor@12345678!");
  process.exit(0);
}

seed().catch(err => { console.error("Seed failed:", err); process.exit(1); });
