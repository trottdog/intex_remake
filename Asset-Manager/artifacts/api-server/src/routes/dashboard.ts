import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  residentsTable, donationsTable, incidentReportsTable, caseConferencesTable,
  supportersTable, publicImpactSnapshotsTable, donationAllocationsTable,
  safehousesTable, mlPredictionSnapshotsTable, socialMediaPostsTable,
  healthWellbeingRecordsTable, educationRecordsTable,
  processRecordingsTable, interventionPlansTable,
} from "@workspace/db/schema";
import { requireAuth, requireRoles, getUserSafehouses } from "../middleware/auth";

const router = Router();

router.get("/dashboard/admin-summary", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const allowedSafehouses = getUserSafehouses(req.user);
    const allResidents = await db.select().from(residentsTable);
    const residents = allowedSafehouses
      ? allResidents.filter(r => r.safehouseId !== null && allowedSafehouses.includes(r.safehouseId!))
      : allResidents;
    const active = residents.filter(r => r.caseStatus === "active");
    const allowedResidentIds = new Set(residents.map(r => r.residentId));
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const newAdmissions = active.filter(r => r.dateOfAdmission && r.dateOfAdmission >= thirtyDaysAgo).length;
    const highRisk = active.filter(r => r.currentRiskLevel === "high" || r.currentRiskLevel === "critical").length;

    const allIncidents = await db.select().from(incidentReportsTable);
    const incidents = allowedSafehouses
      ? allIncidents.filter(i => (i.safehouseId !== null && allowedSafehouses.includes(i.safehouseId!)) || (i.residentId !== null && allowedResidentIds.has(i.residentId!)))
      : allIncidents;
    const openIncidents = incidents.filter(i => i.status === "open" || i.status === "under_review" || i.status === "investigating").length;
    const incidentsThisWeek = incidents.filter(i => i.incidentDate && i.incidentDate >= sevenDaysAgo).length;

    const allConferences = await db.select().from(caseConferencesTable);
    const conferences = allowedSafehouses
      ? allConferences.filter(c => c.residentId !== null && allowedResidentIds.has(c.residentId!))
      : allConferences;
    const upcomingConferences = conferences.filter(c =>
      c.conferenceDate && c.conferenceDate >= todayStr && c.conferenceDate <= sevenDaysAhead
    ).length;
    const overdueFollowUps = conferences.filter(c =>
      c.conferenceDate && c.conferenceDate < todayStr && c.status !== "completed" && c.status !== "cancelled"
    ).length;

    const donations = await db.select().from(donationsTable);
    const monthTotal = donations
      .filter(d => d.donationDate && d.donationDate >= thirtyDaysAgo)
      .reduce((s, d) => s + parseFloat(d.amount || "0"), 0);

    const socialPosts = await db.select().from(socialMediaPostsTable);
    const socialReferrals = socialPosts.filter(p => p.createdAt && p.createdAt >= new Date(thirtyDaysAgo)).length;

    const mlPredictions = await db.select().from(mlPredictionSnapshotsTable).limit(5);
    const safehouses = await db.select().from(safehousesTable);

    const residentsByRisk = safehouses.map(sh => {
      const shResidents = active.filter(r => r.safehouseId === sh.safehouseId);
      return {
        safehouse: sh.name,
        low: shResidents.filter(r => r.currentRiskLevel === "low").length,
        medium: shResidents.filter(r => r.currentRiskLevel === "medium").length,
        high: shResidents.filter(r => r.currentRiskLevel === "high").length,
        critical: shResidents.filter(r => r.currentRiskLevel === "critical").length,
      };
    });

    const reintegrationBreakdown = {
      notStarted: active.filter(r => !r.reintegrationStatus || r.reintegrationStatus === "not_started").length,
      inProgress: active.filter(r => r.reintegrationStatus === "in_progress").length,
      ready: active.filter(r => r.reintegrationStatus === "ready").length,
      completed: residents.filter(r => r.reintegrationStatus === "completed").length,
    };

    const donationTrend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - i));
      const monthStr = d.toISOString().slice(0, 7);
      const total = donations
        .filter(don => don.donationDate && String(don.donationDate).startsWith(monthStr))
        .reduce((s, don) => s + parseFloat(don.amount || "0"), 0);
      return {
        month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        amount: parseFloat(total.toFixed(2)),
        count: donations.filter(don => don.donationDate && String(don.donationDate).startsWith(monthStr)).length,
      };
    });

    const allProcessRecordings = await db.select().from(processRecordingsTable);
    const processRecordingsFiltered = allowedSafehouses
      ? allProcessRecordings.filter(r => r.residentId !== null && allowedResidentIds.has(r.residentId!))
      : allProcessRecordings;
    const processRecordingsThisWeek = processRecordingsFiltered.filter(r =>
      r.createdAt && r.createdAt >= new Date(sevenDaysAgo)
    ).length;

    const allInterventionPlans = await db.select().from(interventionPlansTable);
    const interventionPlansFiltered = allowedSafehouses
      ? allInterventionPlans.filter(p => p.residentId !== null && allowedResidentIds.has(p.residentId!))
      : allInterventionPlans;
    const activeInterventionPlans = interventionPlansFiltered.filter(p => p.status === "active").length;

    const priorityAlerts: { type: string; message: string; entityId: number; severity: string }[] = [];
    if (highRisk > 0) {
      priorityAlerts.push({ type: "risk", message: `${highRisk} resident${highRisk > 1 ? "s" : ""} at high or critical risk level`, entityId: 0, severity: "high" });
    }
    if (openIncidents > 0) {
      priorityAlerts.push({ type: "incident", message: `${openIncidents} open incident${openIncidents > 1 ? "s" : ""} require follow-up`, entityId: 0, severity: openIncidents > 2 ? "high" : "medium" });
    }
    if (overdueFollowUps > 0) {
      priorityAlerts.push({ type: "conference", message: `${overdueFollowUps} case conference${overdueFollowUps > 1 ? "s" : ""} overdue`, entityId: 0, severity: "medium" });
    }

    return res.json({
      activeResidents: active.length,
      admissionsThisMonth: newAdmissions,
      highRiskResidents: highRisk,
      openIncidents,
      incidentsThisWeek,
      upcomingCaseConferences: upcomingConferences,
      overdueFollowUps,
      donationTotalThisMonth: parseFloat(monthTotal.toFixed(2)),
      socialReferralsThisMonth: socialReferrals,
      donationTrend,
      residentsByRisk,
      reintegrationBreakdown,
      processRecordingsThisWeek,
      activeInterventionPlans,
      priorityAlerts,
      mlAlerts: mlPredictions.map(p => ({ ...p, createdAt: p.createdAt?.toISOString?.() ?? p.createdAt })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load admin dashboard" });
  }
});

router.get("/dashboard/donor-summary", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    const supporterId = req.user!.supporterId;
    if (!supporterId) return res.status(404).json({ error: "Donor profile not found" });

    const donations = await db.select().from(donationsTable).where(eq(donationsTable.supporterId, supporterId));
    const sortedDonations = [...donations].sort((a, b) => String(b.donationDate ?? "").localeCompare(String(a.donationDate ?? "")));
    const lastDonation = sortedDonations[0];
    const totalGiven = donations.reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
    const now = new Date();
    const yearStr = now.getFullYear().toString();
    const thisYear = donations.filter(d => d.donationDate && String(d.donationDate).startsWith(yearStr)).reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
    const campaigns = [...new Set(donations.map(d => d.campaignName).filter(Boolean))];

    const givingTrend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      const monthStr = d.toISOString().slice(0, 7);
      const total = donations.filter(don => don.donationDate && String(don.donationDate).startsWith(monthStr)).reduce((s, don) => s + parseFloat(don.amount || "0"), 0);
      return { month: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), amount: parseFloat(total.toFixed(2)) };
    });

    const myDonationIds = donations.map(d => d.donationId);
    const allocations = myDonationIds.length > 0 ? await db.select().from(donationAllocationsTable) : [];
    const myAllocations = allocations.filter(a => myDonationIds.includes(a.donationId));

    const allocByProgram: Record<string, number> = {};
    for (const alloc of myAllocations) {
      const prog = alloc.programArea ?? "General Fund";
      allocByProgram[prog] = (allocByProgram[prog] ?? 0) + parseFloat(alloc.amountAllocated || "0");
    }
    const totalAllocated = Object.values(allocByProgram).reduce((s, v) => s + v, 0) || totalGiven;
    const allocationBreakdown = Object.entries(allocByProgram).map(([programArea, amount]) => ({
      programArea: programArea.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      amount: parseFloat(amount.toFixed(2)),
      percentage: parseFloat(((amount / totalAllocated) * 100).toFixed(1)),
    }));
    if (allocationBreakdown.length === 0 && totalGiven > 0) {
      allocationBreakdown.push({ programArea: "General Fund", amount: totalGiven, percentage: 100 });
    }

    const residents = await db.select().from(residentsTable);
    const safehouses = await db.select().from(safehousesTable);
    const reintegrated = residents.filter(r => r.reintegrationStatus === "completed").length;
    const activeResidents = residents.filter(r => r.caseStatus === "active").length;

    const snapshots = await db.select().from(publicImpactSnapshotsTable).where(eq(publicImpactSnapshotsTable.isPublished, true));
    const healthRecords = await db.select().from(healthWellbeingRecordsTable);
    const eduRecords = await db.select().from(educationRecordsTable);
    const avgHealth = healthRecords.length > 0
      ? parseFloat((healthRecords.reduce((s, r) => s + parseFloat(r.generalHealthScore || "0"), 0) / healthRecords.length).toFixed(1))
      : null;
    const avgEduProgress = eduRecords.length > 0
      ? parseFloat((eduRecords.reduce((s, r) => s + parseFloat(r.progressPercent || "0"), 0) / eduRecords.length).toFixed(1))
      : null;

    const mlPredictions = await db.select().from(mlPredictionSnapshotsTable);
    const reintegrationPreds = mlPredictions.filter(p => p.pipelineName === "reintegration_predictor_v1")
      .sort((a, b) => (b.predictionScore ?? 0) - (a.predictionScore ?? 0))
      .slice(0, 3);

    return res.json({
      lifetimeGiving: parseFloat(totalGiven.toFixed(2)),
      givingThisYear: parseFloat(thisYear.toFixed(2)),
      donationCount: donations.length,
      lastDonationDate: lastDonation?.donationDate ?? null,
      lastDonationAmount: lastDonation?.amount ? parseFloat(lastDonation.amount) : null,
      campaignsSupported: campaigns.length,
      givingTrend,
      allocationBreakdown,
      recentDonations: sortedDonations.slice(0, 5).map(d => ({
        donationId: d.donationId,
        donationType: d.donationType,
        donationDate: d.donationDate,
        campaignName: d.campaignName,
        currencyCode: d.currencyCode,
        amount: d.amount ? parseFloat(d.amount) : null,
        channelSource: d.channelSource,
      })),
      impactStats: {
        activeResidents,
        totalResidentsServed: residents.length,
        safehouses: safehouses.length,
        reintegrations: reintegrated,
        avgHealthScore: avgHealth,
        avgEducationProgress: avgEduProgress,
      },
      recentSnapshots: snapshots.slice(0, 3).map(s => ({
        snapshotId: s.snapshotId,
        snapshotDate: s.snapshotDate,
        headline: s.headline,
        summaryText: s.summaryText,
        metricPayloadJson: s.metricPayloadJson,
        publishedAt: s.publishedAt?.toISOString?.() ?? null,
      })),
      mlReintegrationReadiness: reintegrationPreds.map(p => ({
        predictionId: p.predictionId,
        entityLabel: p.entityLabel,
        predictionScore: p.predictionScore,
        contextJson: p.contextJson,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load donor dashboard" });
  }
});

router.get("/dashboard/executive-summary", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const filterSafehouseId = req.query.safehouseId ? parseInt(req.query.safehouseId as string) : null;
    const months = req.query.months ? Math.max(1, Math.min(24, parseInt(req.query.months as string))) : 12;

    const allSafehouses = await db.select().from(safehousesTable);
    const allResidents = await db.select().from(residentsTable);
    const allDonations = await db.select().from(donationsTable);
    const allIncidents = await db.select().from(incidentReportsTable);
    const allSupporters = await db.select().from(supportersTable);
    const allConferences = await db.select().from(caseConferencesTable);
    const allAllocations = await db.select().from(donationAllocationsTable);
    const allHealth = await db.select().from(healthWellbeingRecordsTable);
    const allEducation = await db.select().from(educationRecordsTable);
    const allMl = await db.select().from(mlPredictionSnapshotsTable);
    const allIp = await db.select().from(interventionPlansTable);
    const allPr = await db.select().from(processRecordingsTable);

    // Apply safehouse filter
    const safehouses = filterSafehouseId
      ? allSafehouses.filter(s => s.safehouseId === filterSafehouseId)
      : allSafehouses;
    const safehouseIds = new Set(safehouses.map(s => s.safehouseId));

    const residents = filterSafehouseId
      ? allResidents.filter(r => r.safehouseId !== null && safehouseIds.has(r.safehouseId))
      : allResidents;
    const residentIds = new Set(residents.map(r => r.residentId));

    const active = residents.filter(r => (r.caseStatus ?? "").toLowerCase() === "active");
    const incidents = filterSafehouseId
      ? allIncidents.filter(i => (i.safehouseId !== null && safehouseIds.has(i.safehouseId!)) || (i.residentId !== null && residentIds.has(i.residentId!)))
      : allIncidents;
    const conferences = filterSafehouseId
      ? allConferences.filter(c => c.residentId !== null && residentIds.has(c.residentId!))
      : allConferences;
    const ip = filterSafehouseId
      ? allIp.filter(p => p.residentId !== null && residentIds.has(p.residentId!))
      : allIp;
    const pr = filterSafehouseId
      ? allPr.filter(p => p.residentId !== null && residentIds.has(p.residentId!))
      : allPr;
    const health = filterSafehouseId
      ? allHealth.filter(h => h.residentId !== null && residentIds.has(h.residentId!))
      : allHealth;
    const education = filterSafehouseId
      ? allEducation.filter(e => e.residentId !== null && residentIds.has(e.residentId!))
      : allEducation;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // KPI aggregates
    const totalDonationsAmt = allDonations.reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
    const openIncidents = incidents.filter(i => i.status === "open" || i.status === "under_review" || i.status === "investigating").length;
    const highRisk = active.filter(r => r.currentRiskLevel === "high" || r.currentRiskLevel === "critical").length;
    const admissionsThisMonth = active.filter(r => r.dateOfAdmission && r.dateOfAdmission >= thirtyDaysAgo).length;
    const upcomingConfs = conferences.filter(c => c.conferenceDate && c.conferenceDate >= todayStr && c.conferenceDate <= sevenDaysAhead).length;
    const activeIp = ip.filter(p => p.status === "active").length;
    const prThisMonth = pr.filter(p => p.createdAt && p.createdAt >= new Date(thirtyDaysAgo)).length;
    const reintegrated = residents.filter(r => r.reintegrationStatus === "completed").length;
    const reintegrationRate = active.length > 0 ? reintegrated / (reintegrated + active.length) : 0;
    const avgHealth = health.length > 0
      ? parseFloat((health.reduce((s, r) => s + parseFloat(r.generalHealthScore || "0"), 0) / health.length).toFixed(1))
      : null;
    const avgEdu = education.length > 0
      ? parseFloat((education.reduce((s, r) => s + parseFloat(r.progressPercent || "0"), 0) / education.length).toFixed(1))
      : null;

    // Donation trend
    const donationTrend = Array.from({ length: months }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (months - 1 - i));
      const monthStr = d.toISOString().slice(0, 7);
      const filtered = allDonations.filter(don => don.donationDate && String(don.donationDate).startsWith(monthStr));
      return {
        month: d.toLocaleString("default", { month: "short" }),
        year: d.getFullYear().toString().slice(-2),
        label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        amount: parseFloat(filtered.reduce((s, don) => s + parseFloat(don.amount || "0"), 0).toFixed(2)),
        count: filtered.length,
      };
    });

    // Risk distribution
    const riskDistribution = {
      low: active.filter(r => r.currentRiskLevel === "low").length,
      medium: active.filter(r => r.currentRiskLevel === "medium").length,
      high: active.filter(r => r.currentRiskLevel === "high").length,
      critical: active.filter(r => r.currentRiskLevel === "critical").length,
      unknown: active.filter(r => !r.currentRiskLevel).length,
    };

    // Reintegration pipeline
    const reintegrationBreakdown = {
      notStarted: active.filter(r => !r.reintegrationStatus || r.reintegrationStatus === "not_started").length,
      inProgress: active.filter(r => r.reintegrationStatus === "in_progress").length,
      ready: active.filter(r => r.reintegrationStatus === "ready").length,
      completed: residents.filter(r => r.reintegrationStatus === "completed").length,
    };

    // Per-safehouse breakdown
    const safehouseBreakdown = allSafehouses.map(sh => {
      const shResidents = allResidents.filter(r => r.safehouseId === sh.safehouseId);
      const shActive = shResidents.filter(r => (r.caseStatus ?? "").toLowerCase() === "active");
      const shResidentIds = new Set(shResidents.map(r => r.residentId));
      const shIncidents = allIncidents.filter(i => i.safehouseId === sh.safehouseId || (i.residentId !== null && shResidentIds.has(i.residentId!)));
      const shOpenIncidents = shIncidents.filter(i => i.status === "open" || i.status === "under_review" || i.status === "investigating").length;
      const shDonorIds = allDonations.filter(d => d.channelSource === sh.name || d.notes?.includes(sh.name ?? "")).map(d => d.donationId);
      const shAllocations = allAllocations.filter(a => shResidentIds.has(a.donationId ?? -1) || a.programArea === sh.name);
      const shDonationsTotal = allDonations.filter(d => {
        const alloc = allAllocations.find(a => a.donationId === d.donationId && (a.programArea ?? "").toLowerCase().includes((sh.name ?? "").toLowerCase().split(" ")[0] ?? ""));
        return !!alloc;
      }).reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
      const cap = sh.capacityGirls ?? 0;
      const occ = sh.currentOccupancy ?? shActive.length;
      return {
        safehouseId: sh.safehouseId,
        name: sh.name,
        status: sh.status,
        region: sh.region,
        capacityGirls: cap,
        currentOccupancy: occ,
        occupancyPct: cap > 0 ? Math.round((occ / cap) * 100) : 0,
        activeResidents: shActive.length,
        totalResidents: shResidents.length,
        highRiskCount: shActive.filter(r => r.currentRiskLevel === "high" || r.currentRiskLevel === "critical").length,
        openIncidents: shOpenIncidents,
        riskLow: shActive.filter(r => r.currentRiskLevel === "low").length,
        riskMedium: shActive.filter(r => r.currentRiskLevel === "medium").length,
        riskHigh: shActive.filter(r => r.currentRiskLevel === "high").length,
        riskCritical: shActive.filter(r => r.currentRiskLevel === "critical").length,
      };
    });

    // Recent incidents (last 10, sorted by date desc)
    const recentIncidents = [...incidents]
      .sort((a, b) => String(b.incidentDate ?? "").localeCompare(String(a.incidentDate ?? "")))
      .slice(0, 10)
      .map(i => {
        const sh = allSafehouses.find(s => s.safehouseId === i.safehouseId);
        return {
          incidentId: i.incidentId,
          incidentDate: i.incidentDate,
          incidentType: i.incidentType,
          severity: i.severity,
          status: i.status,
          safehouseName: sh?.name ?? null,
          residentId: i.residentId,
        };
      });

    // Upcoming case conferences (next 7 days)
    const upcomingConferences = [...conferences]
      .filter(c => c.conferenceDate && c.conferenceDate >= todayStr && c.conferenceDate <= sevenDaysAhead)
      .sort((a, b) => String(a.conferenceDate ?? "").localeCompare(String(b.conferenceDate ?? "")))
      .slice(0, 8)
      .map(c => ({
        conferenceId: c.conferenceId,
        conferenceDate: c.conferenceDate,
        conferenceType: c.conferenceType,
        status: c.status,
        residentId: c.residentId,
      }));

    // ML alerts (top high-risk predictions)
    const mlAlerts = [...allMl]
      .filter(p => p.predictionScore !== null)
      .sort((a, b) => (b.predictionScore ?? 0) - (a.predictionScore ?? 0))
      .slice(0, 6)
      .map(p => ({
        predictionId: p.predictionId,
        entityLabel: p.entityLabel,
        predictionScore: p.predictionScore,
        pipelineName: p.pipelineName,
        createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
        contextJson: p.contextJson,
      }));

    // Donation allocation by program
    const allocByProgram: Record<string, number> = {};
    for (const a of allAllocations) {
      const prog = a.programArea ?? "General Fund";
      allocByProgram[prog] = (allocByProgram[prog] ?? 0) + parseFloat(a.amountAllocated || "0");
    }
    const totalAllocated = Object.values(allocByProgram).reduce((s, v) => s + v, 0) || totalDonationsAmt;
    const allocationByProgram = Object.entries(allocByProgram)
      .map(([programArea, amount]) => ({
        programArea: programArea.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        amount: parseFloat(amount.toFixed(2)),
        percentage: parseFloat(((amount / totalAllocated) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Donor channel breakdown
    const channelMap: Record<string, number> = {};
    for (const d of allDonations) {
      const ch = d.channelSource ?? "Other";
      channelMap[ch] = (channelMap[ch] ?? 0) + parseFloat(d.amount || "0");
    }
    const donationByChannel = Object.entries(channelMap)
      .map(([channel, amount]) => ({ channel, amount: parseFloat(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    return res.json({
      // Core KPIs
      totalSafehouses: allSafehouses.length,
      activeSafehouses: allSafehouses.filter(s => s.status === "active").length,
      totalResidents: residents.length,
      activeResidents: active.length,
      totalSupporters: allSupporters.length,
      totalDonations: parseFloat(totalDonationsAmt.toFixed(2)),
      totalDonationCount: allDonations.length,
      openIncidents,
      incidentsThisWeek: incidents.filter(i => i.incidentDate && i.incidentDate >= sevenDaysAgo).length,
      highRiskResidents: highRisk,
      admissionsThisMonth,
      upcomingCaseConferences: upcomingConfs,
      activeInterventionPlans: activeIp,
      processRecordingsThisMonth: prThisMonth,
      reintegrationRate: parseFloat(reintegrationRate.toFixed(4)),
      reintegrationCount: reintegrated,
      avgHealthScore: avgHealth,
      avgEducationProgress: avgEdu,
      // Breakdowns
      riskDistribution,
      reintegrationBreakdown,
      safehouseBreakdown,
      donationTrend,
      allocationByProgram,
      donationByChannel,
      // Feeds
      recentIncidents,
      upcomingConferences,
      mlAlerts,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load executive dashboard" });
  }
});

router.get("/dashboard/public-impact", async (_req, res) => {
  try {
    const snapshots = await db.select().from(publicImpactSnapshotsTable).where(eq(publicImpactSnapshotsTable.isPublished, true));
    const residents = await db.select().from(residentsTable);
    const donations = await db.select().from(donationsTable);
    const safehouses = await db.select().from(safehousesTable);
    const supporters = await db.select().from(supportersTable);
    const totalDonations = donations.reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
    const reintegrated = residents.filter(r => r.reintegrationStatus === "completed").length;
    return res.json({
      residentsServedTotal: residents.length,
      totalDonationsRaised: parseFloat(totalDonations.toFixed(2)),
      reintegrationCount: reintegrated,
      safehouseCount: safehouses.length,
      programAreasActive: 8,
      recentSnapshots: snapshots.slice(0, 3).map(s => ({ ...s, publishedAt: s.publishedAt?.toISOString?.() ?? null })),
      milestones: [
        { title: "Residents Served", value: `${residents.length}+`, description: "Individuals supported since founding" },
        { title: "Reintegrations", value: `${reintegrated}`, description: "Successful community reintegrations" },
        { title: "Partner Organizations", value: `${supporters.length}+`, description: "Active partner network" },
      ],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load public impact" });
  }
});

export default router;
