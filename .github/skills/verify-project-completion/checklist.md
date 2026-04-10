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
- [ ] Donor account has historical donations tied correctly
- [ ] At least one account exists with MFA enabled for testing
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

- [ ] FigJam board is complete and updated across the week
- [ ] Sprint screenshots are easy to find
- [ ] Burndown chart is legible and current
- [ ] Wireframes are presentable
- [ ] Design rationale is presentable
- [ ] User feedback notes are concrete, not generic
- [ ] IS 401 artifacts are ready to show on demand

---

# 5. IS 413 Audit: Enterprise Application Development

## 5.1 Architecture and Platform

- [x] Backend uses .NET 10 / C#
- [x] Frontend uses React / TypeScript / Vite
- [x] Database uses Azure SQL, MySQL, or PostgreSQL
- [x] Database design follows good relational principles
- [x] App is deployed
- [ ] Database is deployed
- [ ] App and DB both work together in deployed environment
- [x] Data validation exists
- [x] Error handling exists
- [ ] Titles/icons/branding/navigation are consistent
- [ ] Performance is acceptable for demo use

Deployment note (2026-04-09): public pages are live, but authenticated deployed proof was blocked by two frontend issues until this patch set: `Asset-Manager/vercel.json` rewrote `/api/*` requests to `index.html`, and `Asset-Manager/artifacts/beacon/src/contexts/AuthContext.tsx` did not persist auth across refreshes. The current frontend patch adds an Azure API fallback, restores `/api/*` proxying to Azure, and persists the JWT/user session so deployed CRUD refresh flows can be re-verified.

## 5.2 Public Experience

### Home / Landing Page
- [x] Modern, professional landing page exists
- [x] Mission is clearly explained
- [x] Clear calls to action exist
- [x] Trust/credibility signals are present
- [x] Page works unauthenticated

### Impact / Donor-Facing Dashboard
- [x] Public impact dashboard exists
- [x] Data is aggregated
- [x] Data is anonymized
- [x] Outcomes/progress/resource use are explained clearly
- [x] Visualizations are understandable
- [x] Dashboard helps build donor trust

### Login Page
- [x] Login page exists
- [x] Username/password auth works
- [x] Validation messages appear for invalid input
- [x] Error handling is understandable

### Privacy Policy + Cookie Consent
- [x] Privacy policy page exists
- [x] Privacy policy is linked from footer
- [x] Cookie consent appears on public site
- [x] Team knows whether cookie consent is cosmetic or functional

## 5.3 Admin / Staff Experience

### Admin Dashboard
- [ ] High-level overview page exists
- [ ] Active residents metric is shown
- [ ] Recent donations metric or feed is shown
- [ ] Upcoming case conferences are shown
- [ ] Progress summary / trend data is shown
- [ ] Dashboard helps staff know what to do next, not just what exists

### Donors & Contributions
- [ ] Staff can view supporter profiles
- [ ] Staff can create supporter profiles
- [ ] Staff can update supporter profiles
- [ ] Staff can carefully delete supporter profiles if allowed
- [ ] Supporter classification by type exists
- [ ] Supporter active/inactive status exists
- [ ] Monetary donations can be recorded/viewed
- [ ] In-kind donations can be recorded/viewed
- [ ] Time contributions can be recorded/viewed
- [ ] Skills contributions can be recorded/viewed
- [ ] Social media advocacy contributions can be recorded/viewed
- [ ] Donation allocations across safehouses/program areas are viewable
- [ ] Filtering works on donor/contribution data
- [ ] Search works on donor/contribution data
- [ ] Donor history is understandable
- [ ] Donation impact is understandable

### Donor Role Experience
- [ ] Donor-role user can access donor-specific donation history if implemented
- [ ] Donor-role user can access donor-specific impact if implemented
- [ ] Donor cannot access admin-only data

### Caseload Inventory
- [ ] Caseload inventory page exists
- [ ] Staff can view resident records
- [ ] Staff can create resident records
- [ ] Staff can update resident records
- [ ] Staff can carefully delete resident records if allowed
- [ ] Demographics are captured
- [ ] Case category and subcategories are captured
- [ ] Disability/special-needs fields are captured
- [ ] Family socio-demographic fields are captured
- [ ] Admission details are captured
- [ ] Referral details are captured
- [ ] Assigned social workers are captured
- [ ] Reintegration tracking is captured
- [ ] Filtering by case status works
- [ ] Filtering by safehouse works
- [ ] Filtering by case category works
- [ ] Search works on key fields

### Process Recording
- [ ] Process recording form exists
- [ ] Session date is captured
- [ ] Social worker is captured
- [ ] Session type is captured
- [ ] Emotional state observed is captured
- [ ] Narrative summary is captured
- [ ] Interventions applied are captured
- [ ] Follow-up actions are captured
- [ ] Full chronological history per resident can be viewed

### Home Visitation & Case Conferences
- [ ] Home visitation logging exists
- [ ] Visit type is captured
- [ ] Home environment observations are captured
- [ ] Family cooperation level is captured
- [ ] Safety concerns are captured
- [ ] Follow-up actions are captured
- [ ] Case conference history is viewable
- [ ] Upcoming case conferences are viewable

### Reports & Analytics
- [ ] Reports page exists
- [ ] Donation trends over time are shown
- [ ] Resident outcome metrics are shown
- [ ] Education progress metrics are shown
- [ ] Health improvement metrics are shown
- [ ] Safehouse performance comparisons are shown
- [ ] Reintegration success rates are shown
- [ ] Reports align reasonably with Annual Accomplishment Report style

### Social Media / Outreach Support
- [ ] Social media data is represented somewhere meaningful
- [ ] Engagement metrics are shown
- [ ] Social content performance is interpretable
- [ ] Social-to-donation linkage exists or is reasonably approximated
- [ ] Feature helps answer what content/platform/timing works

## 5.4 Finish Quality

- [ ] Extra support pages required by the solution exist
- [ ] Pagination exists where needed
- [ ] Empty states exist where needed
- [ ] Not-found state exists
- [ ] Failure states exist where needed
- [ ] Mobile layout remains usable on major pages
- [ ] App feels like a product, not just an assignment

---

# 6. IS 414 Audit: Security

## 6.1 Critical Rule

- [ ] Every claimed security feature is clearly shown in the security video
- [ ] Team is not relying on "implemented but not shown"

## 6.2 Confidentiality

- [x] Public site uses HTTPS/TLS
- [x] Certificate is valid
- [x] HTTP redirects to HTTPS
- [ ] HTTPS behavior is demonstrated in browser

## 6.3 Authentication

- [x] Username/password authentication works
- [x] Visitors can browse public pages unauthenticated
- [ ] Authenticated users can access protected pages
- [x] Better-than-default password policy is configured according to class expectations
- [x] Team can explain the exact password rules used
- [x] /login and /auth/me style endpoints are accessible as needed
- [x] Protected endpoints reject unauthorized users

## 6.4 RBAC Authorization

- [x] Admin role exists
- [x] Donor role exists
- [ ] Public/non-authenticated access is restricted appropriately
- [x] Only admin can create data where required
- [x] Only admin can update data where required
- [x] Only admin can delete data where required
- [x] Donor can view donor-specific history/impact if implemented
- [x] Endpoint-level authorization matches UI restrictions

## 6.5 Integrity

- [x] Change/delete actions require authorization
- [x] Delete confirmation is required
- [x] Unauthorized CUD attempts fail
- [ ] Team can demonstrate those failures

## 6.6 Credentials

- [ ] No secrets are committed to the public repo
- [x] Secrets are stored in .env, env vars, or secrets manager
- [ ] Deployment secrets are handled safely
- [ ] Team can show where secrets are configured without exposing them

## 6.7 Privacy

- [x] GDPR-style privacy policy is customized
- [x] Privacy policy is linked from footer
- [x] Cookie consent notification is implemented
- [x] Team can explain whether consent is functional or cosmetic
- [ ] Public/private data boundary is appropriate for sensitive minors/survivors

## 6.8 Attack Mitigations

- [x] CSP is sent as an HTTP response header
- [x] CSP is not just a meta tag
- [ ] CSP is visible in browser devtools
- [ ] CSP is restricted to only needed sources
- [ ] Team can explain allowed sources
- [x] Data sanitization or output encoding is used to reduce injection risk

## 6.9 Availability

- [x] Site is publicly accessible
- [ ] Site is stable enough for TA access
- [ ] Identity/login works in deployed environment
- [ ] Operational database works in deployed environment

## 6.10 Additional Security Features

Mark only what was actually completed and can be proved.

- [ ] Third-party authentication
- [ ] MFA / 2FA
- [x] HSTS
- [x] Browser-accessible preference cookie used by React
- [x] Additional sanitization/encoding protections
- [ ] Both operational and identity DBs deployed to real DBMS
- [ ] Dockerized deployment
- [ ] Other: ______________________

## 6.11 Required Grading Credentials

- [ ] Admin account without MFA exists
- [ ] Admin account without MFA works
- [ ] Donor account without MFA exists
- [ ] Donor account without MFA works
- [ ] Donor account is tied to historical donations
- [ ] MFA-enabled account exists
- [ ] MFA-enabled account is configured correctly
- [ ] Credentials are accurate and tested
- [ ] Credentials are included where required in final submission

---

# 7. IS 455 Audit: Machine Learning

Audit note (2026-04-09): ML grading-readiness proof is now consolidated in `IS455_GRADING_READINESS.md`. Focused proof command passed locally: `py -3 -m pytest ml/tests/test_is455_grading_readiness.py` -> `13 passed in 72.31s`. Direct headless notebook execution proof also passed via `py -3 ml/scripts/verify_notebook_execution.py`.

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
- [ ] Relevant tables are identified
- [ ] Joins are explained
- [ ] Missing values handled appropriately
- [ ] Outliers explored/handled appropriately
- [ ] Feature engineering is explained
- [x] Data prep is reproducible
- [ ] Exploration includes distributions/relationships/anomalies
- [x] Data paths work relative to the repository structure
- [x] CSV fallback data is documented clearly enough for TAs to run locally

### Modeling & Feature Selection
- [ ] Model choice fits the problem
- [ ] More than one approach is considered or compared where appropriate
- [ ] Feature selection is justified
- [ ] Hyperparameter tuning is included if relevant
- [ ] Explanatory model discusses relationships clearly
- [ ] Predictive model focuses on out-of-sample performance

### Evaluation & Interpretation
- [ ] Proper train/test split or cross-validation is used
- [ ] Appropriate metrics are used
- [ ] Results are interpreted in business language
- [ ] False positives / false negatives are discussed where relevant
- [ ] Limitations are admitted honestly

### Causal and Relationship Analysis
- [ ] Most important features are discussed
- [ ] Team distinguishes correlation from causation
- [ ] Team explains what claims are defensible vs not defensible
- [ ] Recommendations are tied to feature findings

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

### Pipeline 1: ______________________
- [ ] Distinct business problem
- [ ] Notebook file named clearly
- [ ] Executable top-to-bottom
- [ ] CSV fallback path included
- [ ] Outputs saved in notebook
- [ ] Integrated into app
- [ ] Included in final submission URLs

### Pipeline 2: ______________________
- [ ] Distinct business problem
- [ ] Notebook file named clearly
- [ ] Executable top-to-bottom
- [ ] CSV fallback path included
- [ ] Outputs saved in notebook
- [ ] Integrated into app
- [ ] Included in final submission URLs

### Pipeline 3: ______________________
- [ ] Distinct business problem
- [ ] Notebook file named clearly
- [ ] Executable top-to-bottom
- [ ] CSV fallback path included
- [ ] Outputs saved in notebook
- [ ] Integrated into app
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

- [ ] Public navigation tested
- [ ] Login/logout tested
- [ ] Role-based route protection tested
- [ ] CRUD tested for supporters/donors
- [ ] CRUD tested for residents
- [ ] CRUD tested for process recordings
- [ ] CRUD tested for home visitations/case conferences
- [ ] Reports pages tested
- [ ] ML feature tested

## 10.2 Failure / Edge Cases

- [ ] Invalid login tested
- [ ] Empty form submission tested
- [ ] Bad API request tested
- [ ] Unauthorized access tested
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
- [ ] GitHub link opens publicly
- [ ] Notebook links open
- [ ] IS 413 video opens
- [ ] IS 414 video opens

## 12.3 Credential Verification

- [~] Admin credential works
- [~] Donor credential works
- [ ] MFA account exists as claimed
- [ ] Credentials are copied accurately into submission
- [ ] Credentials are not exposed publicly elsewhere

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
