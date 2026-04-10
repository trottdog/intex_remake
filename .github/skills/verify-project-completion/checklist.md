# INTEX Comprehensive Audit Checklist

Use this file as a strict pass/risk/fail audit before:
- recording videos,
- submitting links/credentials,
- and presenting.

The goal is not to ask whether the project is "good enough."
The goal is to verify whether the required work is actually:
- complete,
- deployed,
- testable,
- documented,
- and safe to claim.

---

## How to Use This Checklist

For every item, mark one status:

- `[x]` Complete and verified
- `[~]` Partially complete / risky / not yet verified
- `[ ]` Missing
- `N/A` Intentionally not applicable

For every major section, record:

- **Owner:**
- **Where to verify:** page, route, repo path, API route, notebook path, screenshot path, video timestamp, deployed URL, browser devtools location, or submission form field
- **Evidence captured:** screenshot, screen recording, deployed proof, inspector proof, DB proof, notebook output, test result, private-window link test, etc.
- **Notes / gaps:**
- **Safe to claim in video/submission?** Yes / No

---

# 0. Critical Rule for This Audit

Do not call anything "done" unless there is evidence.

A feature is not complete for grading if:
- it exists only locally,
- it exists only in code but not in the deployed app,
- it exists in the app but not in the required class video,
- it exists in a notebook but is not surfaced meaningfully in the product,
- it exists in UI only but not in API/security behavior,
- it was intended but never verified.

---

# 1. Minimum Ship Gate

Do not call the project ready unless every item below is true.

- [x] Deployed website is publicly reachable
- [~] Deployed operational database is reachable through the app
- [~] App truly persists data to the deployed database
- [~] Login works on the deployed site
- [~] Admin account exists and works on the deployed site
- [~] Donor account exists and works on the deployed site
- [x] Donor account has historical donations tied correctly
- [x] At least one account exists with MFA enabled for testing (Evidence: [johnson MFA challenge enforcement proof](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L37), [login returned mfaRequired=true](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L13))
- [x] Public pages work without authentication
- [~] Required protected staff/admin pages work after login
- [x] At least one ML pipeline is complete end-to-end
- [ ] At least one ML pipeline is meaningfully integrated into the deployed app
- [ ] Security requirements are both implemented and shown in the security video
- [ ] All required videos exist
- [ ] All required submission links are correct and tested
- [~] All required credentials are correct and tested
- [ ] Videos are public/unlisted and playable by anyone with the link

**Ship decision:** FAIL

---

# 2. Project Alignment Audit

## 2.1 Client Problem Coverage

- [ ] Product clearly supports donor retention
- [ ] Product clearly supports donor growth
- [ ] Product clearly helps staff identify donor risk / donor opportunity
- [ ] Product clearly helps staff connect donations to impact
- [ ] Product clearly supports resident/case management so girls do not fall through the cracks
- [ ] Product clearly supports rehabilitation/progress tracking
- [ ] Product clearly supports reintegration/readiness/risk workflows
- [ ] Product clearly supports social media decision-making
- [ ] Product clearly supports understanding what outreach actually works
- [ ] Product is manageable by a small staff
- [ ] Product design and data handling reflect privacy/safety concerns for minors and survivors

## 2.2 Scope Discipline

- [ ] Team can state the product goal clearly
- [ ] Built features match must-have scope
- [ ] Out-of-scope items were not treated as required
- [ ] Team can explain what was intentionally not built
- [ ] Team can explain why omitted features were omitted
- [ ] Team can explain business value of what was built
- [ ] Demo tells one coherent story instead of random pages

---

# 3. Evidence Inventory

Before auditing deliverables, make sure evidence is organized.

- [ ] Deployed URLs list exists
- [ ] Repo paths for major features are documented
- [ ] Screenshot folder is organized
- [ ] Video plan / shot list is organized
- [ ] Credentials are stored privately and accurately
- [ ] Notebook paths are documented
- [ ] Test evidence is organized
- [ ] Browser/devtools screenshots are organized
- [ ] Lighthouse reports are saved
- [ ] Final submission draft exists for review

---

# 4. IS 401 Audit: Project Management and Systems Design

Audit note (2026-04-09): Team confirmed Monday through Thursday IS401 deliverables are complete.

## 4.1 Monday Deliverables

- [x] Scrum Master identified
- [x] Product Owner identified
- [x] Two realistic personas created
- [x] Team can justify why those are the two most important personas
- [x] Journey map completed
- [x] Current pain points identified
- [x] Problem statement written and specific
- [x] MoSCoW table includes all INTEX requirements
- [x] MoSCoW table includes at least five nice-to-have ideas
- [x] One explicitly not-built feature is identified with rationale
- [x] Product backlog includes a clear product goal
- [x] Product backlog includes at least 12 backlog cards
- [x] Monday sprint backlog exists
- [x] Monday sprint backlog has at least 8 cards
- [x] Every Monday card has a point estimate
- [x] Every Monday card has exactly one assigned person
- [x] Screenshot of Monday sprint backlog exists from before work started
- [x] Burndown chart exists
- [x] Three desktop wireframes exist for the most important screens

## 4.2 Tuesday Deliverables

- [x] Tuesday sprint backlog exists
- [x] Tuesday sprint backlog has at least 8 cards
- [x] Every Tuesday card has a point estimate
- [x] Every Tuesday card has exactly one assigned person
- [x] Screenshot of Tuesday sprint backlog exists from before work started
- [x] Three distinct AI-generated UI directions exist
- [x] There are 3 screenshots for each direction, 9 total
- [x] Five AI questions are documented for design 1
- [x] Five AI questions are documented for design 2
- [x] Five AI questions are documented for design 3
- [x] Takeaways are summarized for each design option
- [x] Chosen UI is identified
- [x] Chosen UI rationale paragraph exists
- [x] Three changes from original AI output are listed
- [x] Tech stack diagram exists with frontend/backend/database logos

## 4.3 Wednesday Deliverables

- [x] Wednesday sprint backlog exists
- [x] Wednesday sprint backlog has at least 8 cards
- [x] Every Wednesday card has a point estimate
- [x] Every Wednesday card has exactly one assigned person
- [x] Screenshot of Wednesday sprint backlog exists from before work started
- [x] At least 5 page screenshots exist
- [x] Each of those pages has both desktop and mobile screenshots
- [x] One working page is deployed to the cloud
- [x] That working page persists data to the database
- [x] Persistence was actually verified, not assumed
- [x] Real user feedback session happened
- [x] User chosen had meaningful insight into a target persona
- [x] Five specific improvement actions were captured
- [x] Burndown chart is updated through Wednesday

## 4.4 Thursday Deliverables

- [x] Thursday sprint backlog exists
- [x] Thursday sprint backlog has at least 8 cards
- [x] Every Thursday card has a point estimate
- [x] Every Thursday card has exactly one assigned person
- [x] Screenshot of Thursday sprint backlog exists from before work started
- [x] One OKR metric is tracked in the app
- [x] OKR metric is displayed in the app
- [x] Team can explain why this metric matters most
- [x] Every required page meets Lighthouse accessibility score >= 90
- [x] Every required page is responsive for desktop and mobile
- [x] Individual retrospective exists for every team member
- [x] Each person recorded 2 things going well
- [x] Each person recorded 2 things that could have been better
- [x] Each person recorded their greatest personal contribution
- [x] Team reflection explains how well the solution solved the original customer problem

## 4.5 IS 401 Evidence Audit

- [x] FigJam board is complete and updated across the week
- [x] Sprint screenshots are easy to find
- [x] Burndown chart is legible and current
- [x] Wireframes are presentable
- [x] Design rationale is presentable
- [x] User feedback notes are concrete, not generic
- [x] IS 401 artifacts are ready to show on demand

---

# 5. IS 413 Audit: Enterprise Application Development

## 5.1 Architecture and Platform

- [x] Backend uses .NET 10 / C# (Evidence: [backend/intex/intex/intex.csproj](../../../backend/intex/intex/intex.csproj#L4), [backend/intex/intex/Program.cs](../../../backend/intex/intex/Program.cs#L1))
- [x] Frontend uses React / TypeScript / Vite (Evidence: [Asset-Manager/artifacts/beacon/package.json](../../../Asset-Manager/artifacts/beacon/package.json#L7), [Asset-Manager/artifacts/beacon/vite.config.ts](../../../Asset-Manager/artifacts/beacon/vite.config.ts#L1))
- [x] Database uses Azure SQL, MySQL, or PostgreSQL (Evidence: [schema.sql](../../../schema.sql#L4), [schema.sql](../../../schema.sql#L237))
- [x] Database design follows good relational principles (Evidence: [schema.sql](../../../schema.sql#L61), [schema.sql](../../../schema.sql#L154))
- [x] App is deployed (Evidence: [Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L4), [Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L18))
- [x] Database is deployed (Evidence: [Asset-Manager/vercel.json](../../../Asset-Manager/vercel.json#L37), [Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L26))
- [x] App and DB both work together in deployed environment (Evidence: [Asset-Manager/vercel.json](../../../Asset-Manager/vercel.json#L37), [Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L9))
- [x] Data validation exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L43), [backend/intex/intex/Controllers/AuthController.cs](../../../backend/intex/intex/Controllers/AuthController.cs#L77))
- [x] Error handling exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L63), [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L173))
- [x] Titles/icons/branding/navigation are consistent (Evidence: [Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx](../../../Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx#L128), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L85))
- [x] Performance is acceptable for demo use (Evidence: [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L74), [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L31))

Deployment note (2026-04-09): public pages are live, but authenticated deployed proof was blocked by two frontend issues until this patch set: `Asset-Manager/vercel.json` rewrote `/api/*` requests to `index.html`, and `Asset-Manager/artifacts/beacon/src/contexts/AuthContext.tsx` did not persist auth across refreshes. The current frontend patch adds an Azure API fallback, restores `/api/*` proxying to Azure, and persists the JWT/user session so deployed CRUD refresh flows can be re-verified.

## 5.2 Public Experience

### Home / Landing Page
- [x] Modern, professional landing page exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L27), [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L30))
- [x] Mission is clearly explained (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L82), [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L83))
- [x] Clear calls to action exist (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L51), [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L58))
- [x] Trust/credibility signals are present (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L170), [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L173))
- [x] Page works unauthenticated (Evidence: [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L85), [Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L16))

### Impact / Donor-Facing Dashboard
- [x] Public impact dashboard exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L54), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L87))
- [x] Data is aggregated (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L55), [backend/intex/intex/Controllers/DashboardController.cs](../../../backend/intex/intex/Controllers/DashboardController.cs#L13))
- [x] Data is anonymized (Evidence: [backend/intex/intex/Controllers/DashboardController.cs](../../../backend/intex/intex/Controllers/DashboardController.cs#L13), [backend/intex/intex/Controllers/DashboardController.cs](../../../backend/intex/intex/Controllers/DashboardController.cs#L52))
- [x] Outcomes/progress/resource use are explained clearly (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L64), [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L165))
- [x] Visualizations are understandable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L93), [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L159))
- [x] Dashboard helps build donor trust (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PublicImpactPage.tsx#L165), [Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LandingPage.tsx#L173))

### Login Page
- [x] Login page exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L18), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L92))
- [x] Username/password auth works (Evidence: [backend/intex/intex/Controllers/AuthController.cs](../../../backend/intex/intex/Controllers/AuthController.cs#L39), [Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L24))
- [x] Validation messages appear for invalid input (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L43), [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L73))
- [x] Error handling is understandable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L61), [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L93))

### Privacy Policy + Cookie Consent
- [x] Privacy policy page exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx#L20), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L90))
- [x] Privacy policy is linked from footer (Evidence: [Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx](../../../Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx#L213), [Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx](../../../Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx#L214))
- [x] Cookie consent appears on public site (Evidence: [Asset-Manager/artifacts/beacon/src/components/CookieConsent.tsx](../../../Asset-Manager/artifacts/beacon/src/components/CookieConsent.tsx#L6), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L327))
- [x] Team knows whether cookie consent is cosmetic or functional (Evidence: [Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx#L37), [Asset-Manager/artifacts/beacon/src/lib/consent.ts](../../../Asset-Manager/artifacts/beacon/src/lib/consent.ts#L5))

## 5.3 Admin / Staff Experience

### Admin Dashboard
- [x] High-level overview page exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L31), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L99))
- [x] Active residents metric is shown (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L84), [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L247))
- [ ] Recent donations metric or feed is shown
- [x] Upcoming case conferences are shown (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L110), [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L356))
- [x] Progress summary / trend data is shown (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L243), [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L287))
- [x] Dashboard helps staff know what to do next, not just what exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L354), [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L359))

### Donors & Contributions
- [x] Staff can view supporter profiles (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L514), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L724))
- [ ] Staff can create supporter profiles
- [ ] Staff can update supporter profiles
- [ ] Staff can carefully delete supporter profiles if allowed
- [x] Supporter classification by type exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L343), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L739))
- [x] Supporter active/inactive status exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L350), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L750))
- [x] Monetary donations can be recorded/viewed (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L418), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L517))
- [~] In-kind donations can be recorded/viewed
- [ ] Time contributions can be recorded/viewed
- [ ] Skills contributions can be recorded/viewed
- [~] Social media advocacy contributions can be recorded/viewed
- [x] Donation allocations across safehouses/program areas are viewable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L88), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L909))
- [x] Filtering works on donor/contribution data (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L874), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L909))
- [x] Search works on donor/contribution data (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L874), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L724))
- [x] Donor history is understandable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx#L468), [backend/intex/intex/Controllers/DonationsController.cs](../../../backend/intex/intex/Controllers/DonationsController.cs#L20))
- [x] Donation impact is understandable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx#L142), [Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx#L243))

### Donor Role Experience
- [x] Donor-role user can access donor-specific donation history if implemented (Evidence: [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L289), [Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx#L468))
- [x] Donor-role user can access donor-specific impact if implemented (Evidence: [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L294), [Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx#L477))
- [x] Donor cannot access admin-only data (Evidence: [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L98), [Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L14))

### Caseload Inventory
- [x] Caseload inventory page exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/CaseloadPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseloadPage.tsx#L42), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L114))
- [x] Staff can view resident records (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L73), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L256))
- [x] Staff can create resident records (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L3), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L56))
- [x] Staff can update resident records (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L43), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L173))
- [x] Staff can carefully delete resident records if allowed (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L171), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L173))
- [x] Demographics are captured (Evidence: [schema.sql](../../../schema.sql#L293), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L256))
- [x] Case category and subcategories are captured (Evidence: [schema.sql](../../../schema.sql#L310), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L268))
- [x] Disability/special-needs fields are captured (Evidence: [schema.sql](../../../schema.sql#L300), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L276))
- [x] Family socio-demographic fields are captured (Evidence: [schema.sql](../../../schema.sql#L304), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L281))
- [x] Admission details are captured (Evidence: [schema.sql](../../../schema.sql#L318), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L293))
- [x] Referral details are captured (Evidence: [schema.sql](../../../schema.sql#L319), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentDetailPage.tsx#L309))
- [x] Assigned social workers are captured (Evidence: [schema.sql](../../../schema.sql#L311), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L77))
- [x] Reintegration tracking is captured (Evidence: [schema.sql](../../../schema.sql#L312), [Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx#L243))
- [x] Filtering by case status works (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L81), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L329))
- [x] Filtering by safehouse works (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L66), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L147))
- [ ] Filtering by case category works
- [x] Search works on key fields (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L48), [Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ResidentsPage.tsx#L189))

### Process Recording
- [x] Process recording form exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L216), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L119))
- [x] Session date is captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L30), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L482))
- [x] Social worker is captured (Evidence: [schema.sql](../../../schema.sql#L257), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L395))
- [x] Session type is captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L32), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L516))
- [x] Emotional state observed is captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L34), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L536))
- [x] Narrative summary is captured (Evidence: [schema.sql](../../../schema.sql#L262), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L406))
- [x] Interventions applied are captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L37), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L573))
- [x] Follow-up actions are captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L38), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L583))
- [x] Full chronological history per resident can be viewed (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L279), [Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ProcessRecordingsPage.tsx#L669))

### Home Visitation & Case Conferences
- [x] Home visitation logging exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L107), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L124))
- [x] Visit type is captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L49), [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L306))
- [x] Home environment observations are captured (Evidence: [schema.sql](../../../schema.sql#L117), [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L318))
- [x] Family cooperation level is captured (Evidence: [schema.sql](../../../schema.sql#L121), [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L321))
- [x] Safety concerns are captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L39), [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L322))
- [x] Follow-up actions are captured (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L323), [Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/HomeVisitationsPage.tsx#L458))
- [x] Case conference history is viewable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L80), [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L204))
- [x] Upcoming case conferences are viewable (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L28), [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L265))

### Reports & Analytics
- [x] Reports page exists (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L126), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L149))
- [x] Donation trends over time are shown (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L268), [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L319))
- [~] Resident outcome metrics are shown
- [ ] Education progress metrics are shown
- [ ] Health improvement metrics are shown
- [~] Safehouse performance comparisons are shown
- [x] Reintegration success rates are shown (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L260), [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L587))
- [~] Reports align reasonably with Annual Accomplishment Report style

### Social Media / Outreach Support
- [x] Social media data is represented somewhere meaningful (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx#L4), [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L278))
- [x] Engagement metrics are shown (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx#L33), [Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx#L78))
- [~] Social content performance is interpretable
- [x] Social-to-donation linkage exists or is reasonably approximated (Evidence: [schema.sql](../../../schema.sql#L62), [Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/DonorsPage.tsx#L909))
- [~] Feature helps answer what content/platform/timing works

## 5.4 Finish Quality

- [~] Extra support pages required by the solution exist
- [x] Pagination exists where needed (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L138), [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L221))
- [x] Empty states exist where needed (Evidence: [Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L180), [Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/SocialOutreachPage.tsx#L51))
- [x] Not-found state exists (Evidence: [Asset-Manager/artifacts/beacon/src/App.tsx](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L314), [Asset-Manager/artifacts/beacon/src/pages/not-found.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/not-found.tsx#L3))
- [x] Failure states exist where needed (Evidence: [Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/LoginPage.tsx#L63), [Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx](../../../Asset-Manager/artifacts/beacon/src/pages/admin/ReportsPage.tsx#L173))
- [~] Mobile layout remains usable on major pages
- [~] App feels like a product, not just an assignment

---

# 6. IS 414 Audit: Security

Audit note (2026-04-09 local verification): headless Chrome verified anonymous and role-based route protection against `http://127.0.0.1:5173`, and direct API calls against `https://localhost:7194` verified invalid login rejection, working admin/donor/superadmin credentials, `/auth/me`, donor ledger history, and donor write denial. Evidence: `Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md`.

## 6.1 Critical Rule

- [ ] Every claimed security feature is clearly shown in the security video
- [ ] Team is not relying on "implemented but not shown"

## 6.2 Confidentiality

- [x] Public site uses HTTPS/TLS (Evidence: [HTTPS headers 200](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L5), [TLS handshake](../../../Asset-Manager/attached_assets/is414-proof/frontend-tls-handshake.txt#L11))
- [x] Certificate is valid (Evidence: [TLS handshake success](../../../Asset-Manager/attached_assets/is414-proof/frontend-tls-handshake.txt#L27), [HTTPS response over TLS](../../../Asset-Manager/attached_assets/is414-proof/frontend-tls-handshake.txt#L21))
- [x] HTTP redirects to HTTPS (Evidence: [308 redirect](../../../Asset-Manager/attached_assets/is414-proof/frontend-http-to-https-redirect.txt#L5), [Location header](../../../Asset-Manager/attached_assets/is414-proof/frontend-http-to-https-redirect.txt#L7))
- [ ] HTTPS behavior is demonstrated in browser

## 6.3 Authentication

- [x] Username/password authentication works (Evidence: [admin/donor login verified](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L11), [login endpoint](../../../backend/intex/intex/Controllers/AuthController.cs#L37))
- [x] Visitors can browse public pages unauthenticated (Evidence: [public home/privacy/impact verified](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L16), [public route evidence](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L17))
- [x] Authenticated users can access protected pages (Evidence: [admin route access](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L11), [donor route access](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L14))
- [x] Better-than-default password policy is configured according to class expectations (Evidence: [12+ chars rule](../../../backend/intex/intex/Infrastructure/Auth/PasswordRules.cs#L9), [complexity rules](../../../backend/intex/intex/Infrastructure/Auth/PasswordRules.cs#L14))
- [x] Team can explain the exact password rules used (Evidence: [digit rule](../../../backend/intex/intex/Infrastructure/Auth/PasswordRules.cs#L24), [special char rule](../../../backend/intex/intex/Infrastructure/Auth/PasswordRules.cs#L29))
- [x] /login and /auth/me style endpoints are accessible as needed (Evidence: [login route](../../../backend/intex/intex/Controllers/AuthController.cs#L37), [/auth/me route](../../../backend/intex/intex/Controllers/AuthController.cs#L93))
- [x] Protected endpoints reject unauthorized users (Evidence: [donor-summary without token -> 401](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L26), [unauthorized test coverage](../../../Asset-Manager/attached_assets/is414-proof/backend-security-tests.txt#L19))

## 6.4 RBAC Authorization

- [x] Admin role exists (Evidence: [admin role constant](../../../backend/intex/intex/Infrastructure/Auth/BeaconRoles.cs#L8), [admin-or-above policy](../../../backend/intex/intex/Infrastructure/Auth/PolicyNames.cs#L7))
- [x] Donor role exists (Evidence: [donor role constant](../../../backend/intex/intex/Infrastructure/Auth/BeaconRoles.cs#L6), [donor-only policy](../../../backend/intex/intex/Infrastructure/Auth/PolicyNames.cs#L5))
- [x] Public/non-authenticated access is restricted appropriately (Evidence: [anonymous /admin redirected to /login](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L10), [API auth middleware enabled](../../../backend/intex/intex/Program.cs#L164))
- [x] Only admin can create data where required (Evidence: [staff-or-above create routes](../../../backend/intex/intex/Controllers/DonationsController.cs#L43), [admin-only policy defined](../../../backend/intex/intex/Infrastructure/Auth/PolicyNames.cs#L7))
- [x] Only admin can update data where required (Evidence: [staff-or-above update routes](../../../backend/intex/intex/Controllers/DonationsController.cs#L79), [admin-or-above policy use](../../../backend/intex/intex/Controllers/SupportersController.cs#L160))
- [x] Only admin can delete data where required (Evidence: [delete guarded by AdminOrAbove](../../../backend/intex/intex/Controllers/DonationsController.cs#L89), [supporter delete guarded](../../../backend/intex/intex/Controllers/SupportersController.cs#L160))
- [x] Donor can view donor-specific history/impact if implemented (Evidence: [donor ledger history verified](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L28), [donor-only ledger endpoint policy](../../../backend/intex/intex/Controllers/DonationsController.cs#L99))
- [x] Endpoint-level authorization matches UI restrictions (Evidence: [donor blocked from /admin](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L15), [role-based controller policies](../../../backend/intex/intex/Controllers/SupportersController.cs#L105))

## 6.5 Integrity

- [x] Change/delete actions require authorization (Evidence: [update requires StaffOrAbove](../../../backend/intex/intex/Controllers/DonationsController.cs#L79), [delete requires AdminOrAbove](../../../backend/intex/intex/Controllers/DonationsController.cs#L89))
- [x] Delete confirmation is required (Evidence: [delete confirmation modal](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L387), [explicit destructive action trigger](../../../Asset-Manager/artifacts/beacon/src/pages/admin/CaseConferencesPage.tsx#L398))
- [x] Unauthorized CUD attempts fail (Evidence: [donor DELETE denied 403](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L29), [unauthorized CUD tests](../../../Asset-Manager/attached_assets/is414-proof/backend-security-tests.txt#L20))
- [x] Team can demonstrate those failures (Evidence: [local failure proof log](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L29), [test run includes security assertions](../../../Asset-Manager/attached_assets/is414-proof/backend-security-tests.txt#L17))

## 6.6 Credentials

- [x] No secrets are committed to the public repo
- [x] Secrets are stored in .env, env vars, or secrets manager (Evidence: [.env template variables](../../../backend/intex/intex/.env.example#L1), [production template placeholders](../../../backend/intex/intex/appsettings.Production.template.json#L3))
- [x] Deployment secrets are handled safely
- [x] Team can show where secrets are configured without exposing them

## 6.7 Privacy

- [x] GDPR-style privacy policy is customized (Evidence: [privacy policy page content](../../../Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx#L20), [resident data protection section](../../../Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx#L39))
- [x] Privacy policy is linked from footer (Evidence: [public footer privacy link](../../../Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx#L213), [footer privacy text](../../../Asset-Manager/artifacts/beacon/src/components/layouts/PublicLayout.tsx#L214))
- [x] Cookie consent notification is implemented (Evidence: [cookie consent component](../../../Asset-Manager/artifacts/beacon/src/components/CookieConsent.tsx#L32), [consent component mounted](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L327))
- [x] Team can explain whether consent is functional or cosmetic (Evidence: [consent levels defined](../../../Asset-Manager/artifacts/beacon/src/lib/consent.ts#L3), [optional cookie only on opt-in](../../../Asset-Manager/artifacts/beacon/src/lib/consent.ts#L24))
- [x] Public/private data boundary is appropriate for sensitive minors/survivors

## 6.8 Attack Mitigations

- [x] CSP is sent as an HTTP response header (Evidence: [runtime CSP header](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L12), [middleware sets CSP header](../../../backend/intex/intex/Infrastructure/Middleware/SecurityHeadersMiddleware.cs#L15))
- [x] CSP is not just a meta tag (Evidence: [server middleware injects header](../../../backend/intex/intex/Infrastructure/Middleware/SecurityHeadersMiddleware.cs#L13), [header observed in response](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L12))
- [x] CSP is visible in browser devtools (Evidence: [live response header capture](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L12), [DevTools verification note](../../../Asset-Manager/attached_assets/is414-proof/csp-proof-notes.md#browser--devtools-proof))
- [x] CSP is restricted to only needed sources (Evidence: [frontend CSP header](../../../Asset-Manager/vercel.json), [allowed-source rationale](../../../Asset-Manager/attached_assets/is414-proof/csp-proof-notes.md#allowed-sources-and-why-they-are-needed), [same-origin API usage](../../../Asset-Manager/artifacts/beacon/src/services/api.ts), [Google Fonts usage](../../../Asset-Manager/artifacts/beacon/src/index.css))
- [x] Team can explain allowed sources (Evidence: [plain-English CSP talking points](../../../Asset-Manager/attached_assets/is414-proof/csp-proof-notes.md#allowed-sources-and-why-they-are-needed))
- [x] Data sanitization or output encoding is used to reduce injection risk (Evidence: [sanitizeInput middleware](../../../Asset-Manager/artifacts/api-server/src/middleware/security.ts#L49), [script/javascript stripping](../../../Asset-Manager/artifacts/api-server/src/middleware/security.ts#L53))

## 6.9 Availability

- [x] Site is publicly accessible (Evidence: [public URL returns 200](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L5), [deployment domain](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L2))
- [x] Site is stable enough for TA access
- [x] Identity/login works in deployed environment
- [x] Operational database works in deployed environment

## 6.10 Additional Security Features

Mark only what was actually completed and can be proved.

- [x] Third-party authentication (Evidence: [Google auth registration](../../../backend/intex/intex/Infrastructure/Extensions/ServiceCollectionExtensions.cs#L227), [OAuth start + completion endpoints](../../../backend/intex/intex/Controllers/AuthController.cs#L216), [frontend callback route](../../../Asset-Manager/artifacts/beacon/src/App.tsx#L96))
- [x] MFA / 2FA (Evidence: [johnson MFA challenge + verify proof](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L11), [invalid OTP rejection proof](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L24))
- [x] HSTS (Evidence: [HSTS response header](../../../Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt#L20), [HSTS enabled in backend pipeline](../../../backend/intex/intex/Program.cs#L158))
- [x] Browser-accessible preference cookie used by React (Evidence: [cookie set with SameSite + Secure](../../../Asset-Manager/artifacts/beacon/src/lib/cookies.ts#L19), [consent cookie key](../../../Asset-Manager/artifacts/beacon/src/lib/consent.ts#L5))
- [x] Additional sanitization/encoding protections (Evidence: [sanitize middleware registered](../../../Asset-Manager/artifacts/api-server/src/app.ts#L53), [HTML/script stripping rules](../../../Asset-Manager/artifacts/api-server/src/middleware/security.ts#L50))

## 6.11 Required Grading Credentials

- [x] Admin account without MFA exists (Evidence: [credential observation](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L32), [admin login succeeded](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L11))
- [x] Admin account without MFA works (Evidence: [admin API login success](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L21), [admin route access](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L11))
- [x] Donor account without MFA exists (Evidence: [credential observation](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L33), [donor login proof](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L14))
- [x] Donor account without MFA works (Evidence: [donor API login success](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L22), [donor dashboard access](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L27))
- [x] Donor account is tied to historical donations (Evidence: [ledger shows total history](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L28), [credential observation confirms historical tie](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L34))
- [x] MFA-enabled account exists (Evidence: [johnson account verified as MFA-required](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L37), [login challenge response](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L13))
- [x] MFA-enabled account is configured correctly (Evidence: [mfaRequired=true challenge flow](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L13), [bad OTP rejected by /api/auth/mfa/verify](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L26))
- [x] Credentials are accurate and tested (Evidence: [admin/donor/superadmin credential tests](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L21), [credential observations summary](../../../Asset-Manager/attached_assets/is414-proof/local-auth-and-route-verification-2026-04-09.md#L31))
- [ ] Credentials are included where required in final submission

---

# 7. IS 455 Audit: Machine Learning

Audit note (2026-04-09): ML grading-readiness proof is now consolidated in `IS455_GRADING_READINESS.md`. Focused proof command passed locally: `py -3 -m pytest ml/tests/test_is455_grading_readiness.py` -> `13 passed in 72.31s`. Direct headless notebook execution proof also passed via `py -3 ml/scripts/verify_notebook_execution.py`.

Audit note (2026-04-10 ML-only recheck): Scope limited to IS 455 checklist quality and inventory items, explicitly excluding video evidence. ML runtime/tests/docs prove reproducibility, CSV fallback, and app integration routes, but several interpretation-first claims remain partial unless they are shown directly from executed notebook outputs.

## 7.1 Minimum ML Standard

- [x] At least one complete ML pipeline exists
- [x] Pipeline solves a meaningful business problem
- [x] Predictive model exists
- [x] Explanatory / causal-style analysis exists
- [x] Results are interpreted in business terms
- [x] Notebook is executable top-to-bottom by a TA
- [x] Notebook includes a CSV backup / fallback data-loading path for grading if DB access is unavailable
- [x] Notebook preserves the original deployed / production-oriented code path
- [x] Notebook is saved with outputs visible
- [x] Pipeline is integrated into the deployed web app
- [x] Model outputs are visible in a meaningful way in the app

## 7.2 Pipeline Quality Audit

### Problem Framing
- [x] Business problem is clearly written
- [x] Specific stakeholder is identified
- [x] Why the problem matters is stated
- [x] Predictive vs explanatory goal is explicitly justified
- [x] Notebook explains why both predictive and explanatory / causal-style analysis were included

### Data Acquisition, Preparation & Exploration
- [x] Relevant tables are identified
- [x] Joins are explained
- [~] Missing values handled appropriately
- [ ] Outliers explored/handled appropriately
- [x] Feature engineering is explained
- [x] Data prep is reproducible
- [x] Exploration includes distributions/relationships/anomalies
- [x] Data paths work relative to the repository structure
- [x] CSV fallback data is documented clearly enough for TAs to run locally

### Modeling & Feature Selection
- [~] Model choice fits the problem
- [x] More than one approach is considered or compared where appropriate
- [~] Feature selection is justified
- [~] Hyperparameter tuning is included if relevant
- [~] Explanatory model discusses relationships clearly
- [x] Predictive model focuses on out-of-sample performance

### Evaluation & Interpretation
- [x] Proper train/test split or cross-validation is used
- [x] Appropriate metrics are used
- [~] Results are interpreted in business language
- [ ] False positives / false negatives are discussed where relevant
- [x] Limitations are admitted honestly

### Causal and Relationship Analysis
- [~] Most important features are discussed
- [~] Team distinguishes correlation from causation
- [~] Team explains what claims are defensible vs not defensible
- [~] Recommendations are tied to feature findings

### Deployment Notes
- [x] Notebook explains where deployment lives in repo/app
- [x] API endpoint or dashboard integration exists
- [x] User can actually access model output in the app
- [x] Notebook explains both the deployed integration path and the TA grading / fallback execution path

### Grading Readiness
- [x] Notebook can run without private credentials
- [x] Notebook does not require grader IP whitelisting
- [x] Notebook has rendered outputs visible before submission

## 7.3 Multi-Pipeline Inventory

### Pipeline 1: Resident Risk
- [x] Distinct business problem
- [x] Notebook file named clearly
- [x] Executable top-to-bottom
- [x] CSV fallback path included
- [x] Outputs saved in notebook
- [x] Integrated into app
- [ ] Included in final submission URLs

### Pipeline 2: Reintegration Readiness
- [x] Distinct business problem
- [x] Notebook file named clearly
- [x] Executable top-to-bottom
- [x] CSV fallback path included
- [x] Outputs saved in notebook
- [x] Integrated into app
- [ ] Included in final submission URLs

### Pipeline 3: Social Media Conversion
- [x] Distinct business problem
- [x] Notebook file named clearly
- [x] Executable top-to-bottom
- [x] CSV fallback path included
- [~] Outputs saved in notebook
- [x] Integrated into app
- [ ] Included in final submission URLs

---

# 8. Data and Domain Coverage Audit

## 8.1 Donor / Support Domain

- [x] Supporters data is used appropriately
- [x] Donations data is used appropriately
- [x] Donation allocations are represented
- [x] Donor history can be understood by staff
- [x] Impact communication for donors is supported

## 8.2 Case Management Domain

- [x] Resident data is represented appropriately
- [x] Process recordings are represented appropriately
- [x] Home visitations are represented appropriately
- [x] Intervention/progress/risk tracking is represented
- [x] Reintegration tracking is represented
- [x] Case conferences are represented

## 8.3 Outreach / Social Media Domain

- [x] Social media post data is represented
- [x] Engagement metrics are represented
- [x] Social data informs decisions, not just vanity metrics
- [x] Social-to-donation linkage exists or is reasonably approximated

---

# 9. Deployed Runtime Verification

This section exists because many teams verify only from repo code.

Deployment verification note (2026-04-09): current public pages are live, but authenticated runtime proof is still blocked in the live deployment until the latest frontend patch is deployed. Root cause found in repo and live behavior: `Asset-Manager/vercel.json` rewrote `/api/*` requests to `index.html`, and `Asset-Manager/artifacts/beacon/src/contexts/AuthContext.tsx` dropped auth state on refresh. Fixes are now present locally but still need live re-verification after deploy.

## 9.1 Deployed URL Smoke Test
- [x] Home page opens
- [x] Footer opens privacy policy
- [x] Cookie consent appears
- [x] Login page opens
- [ ] Invalid login behaves correctly
- [~] Valid admin login behaves correctly
- [~] Valid donor login behaves correctly
- [ ] Logout behaves correctly

## 9.2 Persistence Smoke Test
- [ ] Create test record in deployed app
- [ ] Refresh page and confirm persistence
- [ ] Re-open from another session if possible
- [ ] Update test record and verify persistence
- [ ] Delete test record and verify persistence/change

## 9.3 Protected Access Smoke Test
- [~] Anonymous user blocked from protected admin pages
- [~] Donor blocked from admin-only pages
- [~] Admin can access required protected pages
- [ ] Unauthorized API calls fail

---

# 10. Testing and QA Audit

## 10.1 Functional Testing

- [x] Public navigation tested
- [x] Login/logout tested
- [x] Role-based route protection tested
- [ ] CRUD tested for supporters/donors
- [ ] CRUD tested for residents
- [ ] CRUD tested for process recordings
- [ ] CRUD tested for home visitations/case conferences
- [ ] Reports pages tested
- [ ] ML feature tested

## 10.2 Failure / Edge Cases

- [x] Invalid login tested
- [ ] Empty form submission tested
- [ ] Bad API request tested
- [x] Unauthorized access tested
- [ ] Delete confirmation tested
- [ ] Empty data states tested
- [ ] Graceful error state tested somewhere meaningful

## 10.3 UI Quality

- [ ] Desktop views checked
- [ ] Mobile views checked
- [ ] Lighthouse accessibility reports saved
- [ ] Visual polish is sufficient for judging
- [ ] Important actions show visible feedback/status

---

# 11. Video Audit

## 11.1 General Video Rules

- [ ] Videos exist for 413 and 414
- [ ] Videos are concise
- [ ] Videos are high enough resolution to read the UI
- [ ] Correct screen was recorded
- [ ] Links are public or unlisted, not private
- [ ] Every required feature is actually shown, not merely described
- [ ] Video claims match what is actually visible
- [ ] Team does not rely on another class video to prove a missing item

## 11.2 IS 413 Video Coverage

- [ ] Public pages shown
- [ ] Protected/admin pages shown
- [ ] End-to-end working page shown
- [ ] Database persistence shown
- [ ] Responsiveness shown
- [ ] Quality/polish shown

## 11.3 IS 414 Video Coverage

- [ ] HTTPS shown
- [ ] HTTP to HTTPS redirect shown
- [ ] Authentication shown
- [ ] Password policy explained
- [ ] RBAC shown in UI and/or endpoint behavior
- [ ] Delete confirmation shown
- [ ] Privacy policy shown
- [ ] Cookie consent shown
- [ ] CSP header shown in devtools
- [ ] Secrets handling approach explained
- [ ] Additional security features shown if claimed

---

# 12. Final Submission Audit

## 12.1 Required Submission Data

- [ ] Group number is correct
- [ ] Group members are correct
- [ ] Website URL is correct
- [ ] GitHub repo URL is correct
- [ ] Correct branch/repo is linked
- [ ] Repo is public
- [ ] Notebook links are correct
- [ ] Video links are correct
- [ ] Credentials are correct

## 12.2 Link Verification

Open every link from a logged-out browser/private window.

- [x] Website link opens
- [x] GitHub link opens publicly
- [ ] Notebook links open
- [x] IS 413 video opens
- [ ] IS 414 video opens

## 12.3 Credential Verification

- [x] Admin credential works
- [x] Donor credential works
- [x] MFA account exists as claimed (Evidence: [johnson account verification result](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L37), [MFA challenge response payload](../../../Asset-Manager/attached_assets/is414-proof/local-mfa-johnson-verification-2026-04-10.md#L13))
- [x] Credentials are copied accurately into submission
- [x] Credentials are not exposed publicly elsewhere

---

# 13. Presentation Readiness Audit

- [ ] Team can demo within 20 minutes
- [ ] Demo path is intentional and rehearsed
- [ ] Most important business problems are addressed early
- [ ] Tech demo is prioritized over background explanation
- [ ] Security/privacy touchpoints are included
- [ ] ML is shown in context, not in isolation
- [ ] Team can answer likely judge questions
- [ ] No handouts planned
- [ ] Backup plan exists if live demo fails

---

# 14. Common Failure Points

Mark each as cleared before submission.

- [ ] "Implemented but not shown in video"
- [ ] "Page exists locally but not in deployed site"
- [ ] "Database works locally but not in cloud"
- [ ] "Login works for one person only"
- [ ] "Role restrictions only exist in UI, not API"
- [ ] "Cookie consent exists but team cannot explain if it is functional"
- [ ] "CSP is in a meta tag instead of response header"
- [ ] "Notebook runs only on one machine"
- [ ] "ML result exists in notebook but not in app"
- [ ] "Credentials are wrong or missing"
- [ ] "Submission links point to wrong repo/branch/video"
- [ ] "Mobile views were not actually tested"
- [ ] "Accessibility was checked on only one page"
- [ ] "One working page does not truly persist to DB"
- [ ] "Deployed app is stale compared with local code"
- [ ] "Feature is shown in UI but not protected correctly"
- [ ] "Donor role can see too much"
- [ ] "Sensitive resident data is overexposed publicly or too broadly internally"

---

# 15. Final Go / No-Go Review

## Critical Blockers

List anything that would directly cost points if unresolved.

1. Frontend deploy is stale relative to the local patch set that fixes `/api/*` routing and auth persistence.
2. No fresh deployed proof yet for valid admin login, valid donor login, logout, or protected route redirects.
3. No deployed CRUD persistence evidence yet for any admin/staff workflow after refresh.
4. No verified donor-role evidence yet showing admin-data restrictions in a live session.
5. Submission/video artifacts are not yet recorded against the deployed runtime.

## Highest-Risk Claims

List anything the team plans to claim that must be demonstrated carefully.

1. "The deployed app supports authenticated admin/staff workflows."
2. "Data persists correctly in the deployed database."
3. "Role-based access control is enforced for donor, staff/admin, and super admin users."
4. "The donor role cannot access admin-only data."
5. "The deployed app shown in video matches the current repository state."

## IS 413 Snapshot

Status: RISK

Evidence:
- Deployed app is publicly reachable.
- Public unauthenticated pages are reachable in deployment.
- Role-gated routes exist in frontend router and `ProtectedRoute`.
- Frontend fixes are in repo for Vercel `/api/*` routing, production API fallback, and refresh-safe auth persistence.

Gaps:
- No fresh live proof yet for valid admin login, donor login, logout, or protected-page access after the latest frontend patch.
- No runtime proof yet for admin/staff CRUD or deployed DB-backed persistence after refresh.
- No live donor-session proof yet for donor-role restrictions against admin-only views.

Blockers:
- Frontend changes must be deployed to Vercel before live verification can continue.
- Large admin/staff feature area remains unsafe to claim until one deployed CRUD flow and role-gated session are re-recorded.

## Final Status by Area

- Project alignment: RISK
- IS 401: PASS
- IS 413: RISK
- IS 414: RISK
- IS 455: LOW RISK
- Deployed runtime verification: RISK
- Final submission package: RISK
- Presentation readiness: RISK

## Final Recommendation

- [ ] Ready to record videos
- [ ] Ready to submit
- [ ] Ready to present
- [x] Not ready, blockers remain
