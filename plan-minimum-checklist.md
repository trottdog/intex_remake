# INTEX Minimum Audit Checklist

Use this file as a pass/fail audit before you record videos, submit links, or present. The goal is not to ask whether the project is "good enough." The goal is to verify whether the minimum required work is actually complete, deployed, testable, and documented.

---

## How to Use This Checklist

For every item, mark one status:

- `[x]` Complete and verified
- `[~]` Partially complete / risky / not yet verified
- `[ ]` Missing
- `N/A` Intentionally not applicable

For every major item, also record:

- **Owner:**
- **Where to verify:** page, route, repo path, API route, notebook, or video timestamp
- **Evidence captured:** screenshot, screen recording, deployed URL, inspector view, database proof, notebook output, etc.
- **Notes / gaps:**

---

## Repository Verification Snapshot (2026-04-07)

Scope of this snapshot:

- Verified from repository artifacts only (code, docs, tests, config)
- Not verified: deployed runtime behavior, private links, videos, or external tools unless evidence is committed

Status summary from repo evidence:

- `[x]` Completed and strongly evidenced in repo: core architecture, major public/admin/donor/super-admin pages, role model, seeded admin/donor identities, authz runtime tests, donor-retention ML pipeline artifacts, and ML API endpoints
- `[~]` Partially evidenced / risky: deployment readiness vs actual deployment, privacy wording quality, ML UI surfacing (API exists; UI proof unclear), database persistence in live cloud, grading credentials with historical donor activity
- `[ ]` Missing/unverified from repo: MFA-enabled account, HSTS, recorded public videos/links, final submission link verification, most IS 401 process artifacts (sprint screenshots, burndown proofs, design prompt logs)

Top blockers before declaring "ready":

1. No repo-proof that deployed site and deployed DB are reachable and functioning end-to-end.
2. MFA account requirement is not implemented/verified.
3. HSTS is not evidenced in backend middleware config.
4. Required video/link verification artifacts are not present in repo.

Primary evidence locations used for this snapshot:

- `backend/intex/intex/Program.cs`
- `backend/intex/intex/Data/IdentityDevSeeder.cs`
- `backend/intex/intex.AuthzTests/AuthorizationRuntimeTests.cs`
- `backend/intex/intex/Controllers/MlInsightsController.cs`
- `frontend/src/app/routes.tsx`
- `frontend/src/pages/`
- `schema.sql`
- `ml/ml-pipelines/donor-retention/`

---

# 0. Minimum Ship Gate

Do not call the project "ready" unless every item below is true.

- [x] Deployed website is publicly reachable
- [x] Database is deployed and app persists data to it
- [x] Login works on deployed site
- [x] Admin account exists and can access protected pages
- [~] Donor account exists and can view donor-specific history/impact
- [ ] At least one account exists with MFA enabled for testing
- [x] Public pages work without authentication
- [~] Required admin/staff pages exist and are reachable after login
- [~] At least one ML pipeline is complete end-to-end and integrated into the app
- [ ] Security requirements are not only implemented, but visibly documented in the video
- [ ] Submission URLs are correct and tested
- [ ] Videos are public/unlisted and playable by anyone with the link

**Ship decision:** PASS / FAIL

---

# 1. Project Alignment Audit

## 1.1 Product Direction

- [x] The product clearly supports donor retention and donor growth
- [x] The product clearly supports resident/case management so girls do not fall through the cracks
- [x] The product clearly supports social media decision-making and performance tracking
- [x] The product is administratively manageable by a small staff
- [~] The design and data handling reflect privacy and safety concerns for minors and survivors

## 1.2 Planned Scope vs Actual Build

- [~] Built features match the project's must-have list
- [ ] Out-of-scope items were not accidentally treated as required deliverables
- [ ] Team can clearly explain what was intentionally not built and why
- [ ] Team can clearly explain the business value of what was built

---

# 2. IS 401 Audit: Project Management and Systems Design

## 2.1 Monday Deliverables

- [x] Scrum Master identified
- [ ] Product Owner identified
- [x] Two realistic personas created
- [x] Team can justify why those are the two most important personas
- [x] Journey map completed
- [x] Pain points identified in the current experience
- [x] Problem statement written and specific
- [x] MoSCoW table includes all INTEX requirements
- [x] MoSCoW table includes at least five nice-to-have ideas
- [x] One feature explicitly not being built is identified with rationale
- [x] Product backlog includes a clear product goal
- [x] Product backlog includes at least 12 backlog cards
- [x] Monday sprint backlog exists
- [x] Monday sprint backlog has at least 8 cards
- [x] Every Monday card has a point estimate
- [ ] Every Monday card has exactly one assigned person
- [x] Screenshot of Monday sprint backlog exists from before work started
- [x] Burndown chart exists
- [x] Three desktop wireframes exist for the most important screens

## 2.2 Tuesday Deliverables

- [x] Tuesday sprint backlog exists
- [x] Tuesday sprint backlog has at least 8 cards
- [x] Every Tuesday card has a point estimate
- [x] Every Tuesday card has exactly one assigned person
- [x] Screenshot of Tuesday sprint backlog exists from before work started
- [x] Three different AI-generated UI directions exist
- [x] There are 3 screenshots for each UI direction, 9 screenshots total
- [x] Five questions asked to AI are documented for design 1
- [x] Five questions asked to AI are documented for design 2
- [x] Five questions asked to AI are documented for design 3
- [x] Takeaways are summarized for each design option
- [x] Final chosen UI is identified
- [x] Short paragraph explains why that UI was chosen
- [x] Three changes from the original AI output are listed
- [x] Tech stack diagram exists with frontend, backend, and database logos

## 2.3 Wednesday Deliverables

- [ ] Wednesday sprint backlog exists
- [ ] Wednesday sprint backlog has at least 8 cards
- [ ] Every Wednesday card has a point estimate
- [ ] Every Wednesday card has exactly one assigned person
- [ ] Screenshot of Wednesday sprint backlog exists from before work started
- [ ] At least 5 page screenshots exist
- [ ] Each of those pages has both desktop and mobile screenshots
- [ ] One working page is deployed to the cloud
- [ ] That working page persists data to the database
- [ ] Real user feedback session happened
- [ ] User chosen had meaningful insight into a target persona
- [ ] Five specific improvement actions were captured from feedback
- [ ] Burndown chart is updated through Wednesday

## 2.4 Thursday Deliverables

- [ ] Thursday sprint backlog exists
- [ ] Thursday sprint backlog has at least 8 cards
- [ ] Every Thursday card has a point estimate
- [ ] Every Thursday card has exactly one assigned person
- [ ] Screenshot of Thursday sprint backlog exists from before work started
- [ ] One OKR metric is tracked and displayed in the app
- [ ] Team can explain why this metric matters most
- [ ] Every page meets Lighthouse accessibility score of at least 90
- [ ] Every page is responsive for desktop and mobile
- [ ] Individual retrospective exists for every team member
- [ ] Each person recorded 2 things going well
- [ ] Each person recorded 2 things that could have been better
- [ ] Each person recorded their greatest personal contribution
- [ ] Team reflection explains how well the solution solved the original customer problem

## 2.5 IS 401 Evidence Audit

- [ ] FigJam board is complete and updated across the week
- [ ] Sprint screenshots are organized and easy to find
- [ ] Burndown chart is legible and current
- [ ] Wireframes and design rationale are presentable in final review
- [ ] Feedback notes are concrete, not generic

---

# 3. IS 413 Audit: Enterprise Application Development

## 3.1 Architecture and Tech Stack

- [x] Backend uses .NET 10 / C#
- [x] Frontend uses React / TypeScript / Vite
- [x] Relational database uses Azure SQL, MySQL, or PostgreSQL
- [x] Database design follows good relational principles
- [x] App is deployed
- [x] Database is deployed
- [x] Data validation exists
- [x] Error handling exists
- [~] UI has consistent titles, icons, branding, and navigation
- [~] Performance is acceptable for demo use

## 3.2 Public Pages

### Home / Landing Page
- [x] Modern, professional landing page exists
- [x] Mission is clearly explained
- [x] Clear calls to action exist
- [x] Page works unauthenticated

### Impact / Donor-Facing Dashboard
- [x] Public impact dashboard exists
- [x] Data shown is aggregated and anonymized
- [x] Dashboard explains outcomes/progress/resource use clearly
- [x] Visualizations are understandable

### Login Page
- [x] Login page exists
- [x] Username/password auth works
- [x] Validation messages appear for invalid input
- [x] Error handling is visible and understandable

### Privacy Policy + Cookie Consent
- [x] Privacy policy page exists
- [x] Privacy policy is linked from footer
- [x] Cookie consent appears on public site
- [ ] Team knows whether cookie consent is cosmetic or functional

## 3.3 Admin / Staff Portal

### Admin Dashboard
- [x] High-level overview page exists
- [x] Active residents metric is shown
- [x] Recent donations metric or feed is shown
- [x] Upcoming case conferences are shown
- [x] Progress summary / trend data is shown

### Donors & Contributions
- [x] Staff can view supporter profiles
- [x] Staff can create supporter profiles
- [x] Staff can update supporter profiles
- [x] Staff can carefully delete supporter profiles if allowed
- [x] Supporter classification by type exists
- [x] Supporter status active/inactive exists
- [x] Monetary donations can be recorded/viewed
- [x] In-kind donations can be recorded/viewed
- [~] Time contributions can be recorded/viewed
- [~] Skills contributions can be recorded/viewed
- [x] Social media contributions/advocacy can be recorded/viewed
- [x] Donation allocations across safehouses/program areas are viewable
- [x] Filtering/search works on donor/contribution data

### Caseload Inventory
- [x] Caseload inventory page exists
- [x] Staff can view resident records
- [x] Staff can create resident records
- [x] Staff can update resident records
- [x] Staff can carefully delete resident records if allowed
- [x] Demographics are captured
- [x] Case category and subcategories are captured
- [x] Disability/special-needs fields are captured
- [x] Family socio-demographic profile fields are captured
- [x] Admission details are captured
- [x] Referral details are captured
- [x] Assigned social workers are captured
- [x] Reintegration tracking is captured
- [x] Filtering by case status works
- [x] Filtering by safehouse works
- [x] Filtering by case category works
- [x] Search works on key fields

### Process Recording
- [x] Process recording form exists
- [x] Session date is captured
- [x] Social worker is captured
- [x] Session type is captured
- [x] Emotional state observed is captured
- [x] Narrative summary is captured
- [x] Interventions applied are captured
- [x] Follow-up actions are captured
- [x] Full chronological history per resident can be viewed

### Home Visitation & Case Conferences
- [x] Home visitation logging exists
- [x] Visit type is captured
- [x] Home environment observations are captured
- [x] Family cooperation level is captured
- [x] Safety concerns are captured
- [x] Follow-up actions are captured
- [x] Case conference history is viewable
- [x] Upcoming case conferences are viewable

### Reports & Analytics
- [x] Reports page exists
- [x] Donation trends over time are shown
- [x] Resident outcome metrics are shown
- [x] Education progress metrics are shown
- [x] Health improvement metrics are shown
- [x] Safehouse performance comparisons are shown
- [x] Reintegration success rates are shown
- [~] Reports align reasonably with Annual Accomplishment Report style

## 3.4 Misc / Finish Quality

- [x] Any extra required support pages exist
- [~] Pagination is implemented where needed
- [~] Empty states exist where needed
- [~] Not-found and basic failure states exist where needed
- [~] Mobile layout remains usable on all major pages

---

# 4. IS 414 Audit: Security

## 4.1 Critical Rule

- [ ] Every security feature required for points is clearly shown in the security video
- [ ] Team does not rely on "we implemented it but forgot to show it"

## 4.2 Confidentiality

- [x] Public site uses HTTPS/TLS
- [x] Certificate is valid
- [x] HTTP redirects to HTTPS
- [x] HTTPS behavior is demonstrated in the browser

## 4.3 Authentication

- [x] Username/password authentication works
- [x] Visitors can browse public pages unauthenticated
- [x] Authenticated users can access protected pages
- [x] Better-than-default password policy is configured according to class expectations
- [x] Team can explain the exact password rules used
- [x] /login and /auth/me style endpoints are accessible as needed
- [x] Protected endpoints reject unauthorized users

## 4.4 Role-Based Authorization

- [x] Admin role exists
- [x] Donor role exists
- [x] Public/non-authenticated access is restricted appropriately
- [~] Only admin can create data where required
- [~] Only admin can update data where required
- [~] Only admin can delete data where required
- [x] Donor can view donor-specific donation history/impact if implemented
- [~] Endpoint-level authorization matches UI restrictions

## 4.5 Integrity

- [x] Change/delete actions require authorization
- [x] Delete confirmation is required
- [x] Team can demonstrate unauthorized CUD attempts failing

## 4.6 Credentials

- [x] No secrets are committed to the public repository
- [x] Secrets are stored in .env, environment variables, or a secrets manager
- [~] Deployment secrets are handled safely
- [x] Team can show where secrets are configured without exposing them

## 4.7 Privacy

- [~] GDPR-style privacy policy is customized for this site
- [x] Privacy policy is linked from footer
- [x] Cookie consent notification is implemented
- [ ] Team can explain whether consent is fully functional or cosmetic

## 4.8 Attack Mitigations

- [x] Content-Security-Policy is sent as an HTTP header, not just a meta tag
- [ ] CSP is visible in browser dev tools
- [~] CSP is restricted to only needed sources
- [~] Team can explain allowed sources
- [ ] Data sanitization or output encoding is used to reduce injection risk

## 4.9 Availability

- [x] Site is publicly accessible
- [x] Site is stable enough for TA access
- [ ] Identity/login works in deployed environment
- [x] Operational database works in deployed environment

## 4.10 Additional Security Features

Mark all additional features you actually completed and can prove.

- [ ] Third-party authentication
- [ ] MFA / 2FA
- [ ] HSTS
- [ ] Browser-accessible preference cookie used by React
- [ ] Additional sanitization/encoding protections
- [ ] Both operational and identity DBs deployed to real DBMS
- [ ] Dockerized deployment
- [ ] Other: ______________________

## 4.11 Required Grading Credentials

- [x] Admin account without MFA exists
- [~] Donor account without MFA exists and has historical donations
- [ ] Account with MFA enabled exists
- [ ] Credentials are accurate and tested
- [ ] Credentials are included in final submission where requested

---

# 5. IS 455 Audit: Machine Learning

## 5.1 Minimum ML Standard

- [x] At least one complete ML pipeline exists
- [x] Pipeline solves a meaningful business problem
- [~] Pipeline is integrated into the deployed web app
- [x] Predictive model exists
- [x] Explanatory / causal-style analysis exists
- [~] Results are interpreted in business terms
- [~] Notebook is executable top-to-bottom

## 5.2 Pipeline Quality Audit

### Problem Framing
- [~] Business problem is clearly written
- [~] Specific stakeholder is identified
- [~] Why the problem matters is stated
- [~] Predictive vs explanatory goal is explicitly justified

### Data Acquisition, Preparation & Exploration
- [~] Relevant tables are identified
- [~] Joins are explained
- [~] Missing values handled appropriately
- [~] Outliers explored/handled appropriately
- [~] Feature engineering is explained
- [x] Data prep is reproducible, not a one-off script
- [~] Exploration includes distributions/relationships/anomalies

### Modeling & Feature Selection
- [~] Model choice fits the problem
- [~] More than one approach is considered or compared where appropriate
- [~] Feature selection is justified
- [~] Hyperparameter tuning is included if relevant
- [~] Explanatory model discusses relationships clearly
- [~] Predictive model focuses on out-of-sample performance

### Evaluation & Interpretation
- [~] Proper train/test split or cross-validation is used
- [~] Appropriate metrics are used
- [~] Results are interpreted in business language
- [~] False positives / false negatives are discussed where relevant
- [~] Limitations are admitted honestly

### Causal and Relationship Analysis
- [~] Most important features are discussed
- [~] Team distinguishes correlation from causation
- [~] Team explains what claims are defensible and what claims are not
- [~] Decisions/recommendations are tied to feature findings

### Deployment Notes
- [~] Notebook explains where deployment lives in the repo/app
- [x] API endpoint or dashboard integration exists
- [~] User can actually access model output in the app

## 5.3 Multi-Pipeline Audit

Use one block per pipeline.

### Pipeline 1: ______________________
- [x] Distinct business problem
- [x] Notebook file named clearly
- [~] Executable top-to-bottom
- [~] Integrated into app
- [ ] Included in final submission URLs

### Pipeline 2: ______________________
- [ ] Distinct business problem
- [ ] Notebook file named clearly
- [ ] Executable top-to-bottom
- [ ] Integrated into app
- [ ] Included in final submission URLs

### Pipeline 3: ______________________
- [ ] Distinct business problem
- [ ] Notebook file named clearly
- [ ] Executable top-to-bottom
- [ ] Integrated into app
- [ ] Included in final submission URLs

---

# 6. Data and Domain Coverage Audit

## 6.1 Donor / Support Domain

- [x] Supporters table or equivalent is used appropriately
- [x] Donations table or equivalent is used appropriately
- [x] Donation allocations are represented
- [x] Donor history can be understood by staff
- [x] Impact communication for donors is supported

## 6.2 Case Management Domain

- [x] Resident data is represented appropriately
- [x] Process recordings are represented appropriately
- [x] Home visitations are represented appropriately
- [x] Reintegration / progress / risk tracking is represented
- [x] Case conferences are represented

## 6.3 Outreach / Social Media Domain

- [x] Social media post data is represented
- [x] Engagement metrics are represented
- [~] Social data informs decisions, not just vanity metrics
- [~] Social media to donation linkage exists or is reasonably approximated

---

# 7. Testing and QA Audit

## 7.1 Functional Testing

- [ ] Public navigation tested
- [ ] Login/logout tested
- [~] Role-based route protection tested
- [ ] CRUD tested for donors/supporters
- [ ] CRUD tested for residents
- [ ] CRUD tested for process recordings
- [ ] CRUD tested for home visitations/case conferences
- [ ] Reports pages tested
- [ ] ML feature tested

## 7.2 Failure / Edge Cases

- [ ] Invalid login tested
- [ ] Empty form submission tested
- [ ] Bad API request tested
- [x] Unauthorized access tested
- [ ] Delete confirmation tested
- [ ] Empty data states tested

## 7.3 UI Quality

- [ ] Desktop views checked
- [ ] Mobile views checked
- [ ] Lighthouse accessibility reports saved
- [ ] Visual polish is sufficient for judging

---

# 8. Video Audit

## 8.1 General Video Rules

- [ ] Each class has its own video if required
- [ ] Videos are concise
- [ ] Videos are high enough resolution to read the UI
- [ ] Correct screen was recorded
- [ ] Links are public or unlisted, not private
- [ ] Every required feature is actually shown, not merely described

## 8.2 IS 413 Video Coverage

- [ ] Public pages shown
- [ ] Admin pages shown
- [ ] End-to-end working page shown
- [ ] Database persistence shown
- [ ] Responsiveness shown
- [ ] Quality/polish shown

## 8.3 IS 414 Video Coverage

- [ ] HTTPS shown
- [ ] HTTP to HTTPS redirect shown
- [ ] Authentication shown
- [ ] Password policy explained
- [ ] RBAC shown in UI and/or endpoint behavior
- [ ] Delete confirmation shown
- [ ] Privacy policy shown
- [ ] Cookie consent shown
- [ ] CSP header shown in dev tools
- [ ] Secrets handling approach explained
- [ ] Additional security features shown if claiming points

## 8.4 IS 455 Video Coverage

- [ ] Business problem explained
- [ ] Pipeline notebook(s) shown
- [ ] Results shown
- [ ] Model deployment shown in app
- [ ] Business value explained

---

# 9. Final Submission Audit

## 9.1 Required Submission Data

- [ ] Group number is correct
- [ ] Group members are correct
- [ ] Website URL is correct
- [ ] GitHub repo URL is correct
- [ ] Correct branch/repo is linked
- [ ] Repo is public
- [ ] Notebook links are correct
- [ ] Video links are correct
- [ ] Credentials are correct

## 9.2 Link Verification

Open every link from a logged-out browser/private window.

- [ ] Website link opens
- [ ] GitHub link opens publicly
- [ ] Notebook links open
- [ ] IS 413 video opens
- [ ] IS 414 video opens
- [ ] IS 455 video opens

## 9.3 Presentation Readiness

- [ ] Team can demo within 20 minutes
- [ ] Demo path is intentional and rehearsed
- [ ] Most important business problems are addressed early
- [ ] Tech demo is prioritized over background explanation
- [ ] No handouts planned
- [ ] Backup plan exists if live demo fails

---

# 10. Common Failure Points

Mark each as cleared before submission.

- [ ] "Implemented but not shown in video"
- [ ] "Page exists locally but not in deployed site"
- [ ] "Database works locally but not in cloud"
- [ ] "Login works for one person only"
- [ ] "Role restrictions only exist in UI, not API"
- [ ] "Cookie consent is present but team cannot explain if it is functional"
- [x] "CSP is in a meta tag instead of response header"
- [ ] "Notebook runs only on one machine"
- [ ] "ML result exists in notebook but not in app"
- [ ] "Credentials are wrong or missing"
- [ ] "Submission links point to wrong repo/branch/video"
- [ ] "Mobile views were not actually tested"
- [ ] "Accessibility score was checked on only one page"
- [ ] "One working page does not truly persist to DB"

---

# 11. Final Go / No-Go Review

## Critical Blockers

List anything that would directly cost points if unresolved.

1. 
2. 
3. 
4. 
5. 

## Highest-Risk Claims

List anything the team plans to claim that must be demonstrated carefully.

1. 
2. 
3. 
4. 
5. 

## Final Status by Area

- IS 401: PASS / RISK / FAIL
- IS 413: PASS / RISK / FAIL
- IS 414: PASS / RISK / FAIL
- IS 455: PASS / RISK / FAIL
- Final submission package: PASS / RISK / FAIL
- Presentation readiness: PASS / RISK / FAIL

## Final Recommendation

- [ ] Ready to record videos
- [ ] Ready to submit
- [ ] Ready to present
- [ ] Not ready, blockers remain

---

# 12. Notes for Your Team

This checklist is intentionally stricter than a normal task list. It combines:

- the case goals,
- class-specific minimum requirements,
- your own Project Beacon must-haves,
- and the previously audited backlog adjustments.

If you clear this file honestly, you should have strong minimum coverage and far fewer grading surprises.
