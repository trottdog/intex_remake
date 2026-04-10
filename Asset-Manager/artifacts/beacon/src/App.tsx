import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsent } from "@/components/CookieConsent";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import NotFound from "@/pages/not-found";

// Layouts
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { DonorLayout } from "@/components/layouts/DonorLayout";

// Public pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import PrivacyPage from "@/pages/PrivacyPage";
import PublicImpactPage from "@/pages/PublicImpactPage";
import AboutPage from "@/pages/AboutPage";
import SocialsPage from "@/pages/SocialsPage";
import DonatePage from "@/pages/DonatePage";
import ForbiddenPage from "@/pages/ForbiddenPage";

// Admin / Staff pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ResidentsPage from "@/pages/admin/ResidentsPage";
import DonorsPage from "@/pages/admin/DonorsPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import IncidentsPage from "@/pages/admin/IncidentsPage";
import CaseloadPage from "@/pages/admin/CaseloadPage";
import ResidentDetailPage from "@/pages/admin/ResidentDetailPage";
import ProcessRecordingsPage from "@/pages/admin/ProcessRecordingsPage";
import HomeVisitationsPage from "@/pages/admin/HomeVisitationsPage";
import CaseConferencesPage from "@/pages/admin/CaseConferencesPage";
import InterventionPlansPage from "@/pages/admin/InterventionPlansPage";
import AdminSafehousesPage from "@/pages/admin/AdminSafehousesPage";
import TasksAlertsPage from "@/pages/admin/TasksAlertsPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminPartnersPage from "@/pages/admin/PartnersPage";
import AdminDonationsPage from "@/pages/admin/DonationsPage";
import SocialOutreachPage from "@/pages/admin/SocialOutreachPage";

// Super Admin pages
import SuperAdminDashboard from "@/pages/superadmin/SuperAdminDashboard";
import MLModelOpsPage from "@/pages/superadmin/MLModelOpsPage";
import MLDonorsPage from "@/pages/superadmin/MLDonorsPage";
import MLCampaignsPage from "@/pages/superadmin/MLCampaignsPage";
import MLResidentsPage from "@/pages/superadmin/MLResidentsPage";
import UsersPage from "@/pages/superadmin/UsersPage";
import AuditLogsPage from "@/pages/superadmin/AuditLogsPage";
import SecurityCompliancePage from "@/pages/superadmin/SecurityCompliancePage";
import SafehousesPage from "@/pages/superadmin/SafehousesPage";
import SuperAdminPartnersPage from "@/pages/superadmin/PartnersPage";
import ImpactSnapshotsManagementPage from "@/pages/superadmin/ImpactSnapshotsManagementPage";
import DonationsOverviewPage from "@/pages/superadmin/DonationsOverviewPage";
import SystemSettingsPage from "@/pages/superadmin/SystemSettingsPage";
import CampaignsManagementPage from "@/pages/superadmin/CampaignsManagementPage";
import ProgramUpdatesManagementPage from "@/pages/superadmin/ProgramUpdatesManagementPage";
import OrgCaseManagementPage from "@/pages/superadmin/OrgCaseManagementPage";

// Donor pages
import DonorDashboard from "@/pages/donor/DonorDashboard";
import GivingHistoryPage from "@/pages/donor/GivingHistoryPage";
import ImpactPage from "@/pages/donor/ImpactPage";
import CampaignsPage from "@/pages/donor/CampaignsPage";
import UpdatesPage from "@/pages/donor/UpdatesPage";
import ProfilePage from "@/pages/donor/ProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* ── Public Routes ──────────────────────────────────────────── */}
      <Route path="/"><LandingPage /></Route>
      <Route path="/about"><AboutPage /></Route>
      <Route path="/impact"><PublicImpactPage /></Route>
      <Route path="/socials"><SocialsPage /></Route>
      <Route path="/donate"><DonatePage /></Route>
      <Route path="/privacy"><PrivacyPage /></Route>
      <Route path="/forbidden"><ForbiddenPage /></Route>
      <Route path="/login">
        <PublicRoute><LoginPage /></PublicRoute>
      </Route>

      {/* ── Admin / Staff Routes ───────────────────────────────────── */}
      <Route path="/admin">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/residents/:id">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><ResidentDetailPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/residents">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><ResidentsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/caseload">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><CaseloadPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/process-recordings">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><ProcessRecordingsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/home-visits">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><HomeVisitationsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/case-conferences">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><CaseConferencesPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/intervention-plans">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><InterventionPlansPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/incidents">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><IncidentsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/donors">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><DonorsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><ReportsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/safehouses">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><AdminSafehousesPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/partners">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><AdminPartnersPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/donations">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><AdminDonationsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/tasks-alerts">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><TasksAlertsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><AdminSettingsPage /></AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* ── Super Admin Routes ─────────────────────────────────────── */}
      <Route path="/superadmin">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/users">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><UsersPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/safehouses">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SafehousesPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/partners">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SuperAdminPartnersPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/impact">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><ImpactSnapshotsManagementPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/fundraising">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><DonationsOverviewPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/campaigns">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><MLCampaignsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/program-updates">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><ProgramUpdatesManagementPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/program-updates">
        <ProtectedRoute roles={["admin", "staff"]}>
          <AdminLayout><ProgramUpdatesManagementPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/ml">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><MLModelOpsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/audit">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><AuditLogsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/settings">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SystemSettingsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/security">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SecurityCompliancePage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>

      {/* ── Super Admin — Org-wide Operations (API scopes data by role automatically) */}
      <Route path="/superadmin/residents/:id">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><ResidentDetailPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/residents">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><ResidentsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/caseload">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><CaseloadPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/incidents">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><IncidentsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/case-management">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><OrgCaseManagementPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/donors">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><MLDonorsPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/superadmin/social-outreach">
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SocialOutreachPage /></SuperAdminLayout>
        </ProtectedRoute>
      </Route>

      {/* ── Donor Routes ───────────────────────────────────────────── */}
      <Route path="/donor">
        <ProtectedRoute roles={["donor"]}>
          <DonorLayout><DonorDashboard /></DonorLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/donor/giving">
        <ProtectedRoute roles={["donor"]}>
          <DonorLayout><GivingHistoryPage /></DonorLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/donor/impact">
        <ProtectedRoute roles={["donor"]}>
          <DonorLayout><ImpactPage /></DonorLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/donor/campaigns">
        <ProtectedRoute roles={["donor"]}>
          <DonorLayout><CampaignsPage /></DonorLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/donor/updates">
        <ProtectedRoute roles={["donor"]}>
          <DonorLayout><UpdatesPage /></DonorLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/donor/profile">
        <ProtectedRoute roles={["donor"]}>
          <DonorLayout><ProfilePage /></DonorLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <CookieConsent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
