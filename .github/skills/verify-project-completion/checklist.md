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

- [ ] Deployed website is publicly reachable
- [ ] Deployed operational database is reachable through the app
- [ ] App truly persists data to the deployed database
- [ ] Login works on the deployed site
- [ ] Admin account exists and works on the deployed site
- [ ] Donor account exists and works on the deployed site
- [ ] Donor account has historical donations tied correctly
- [ ] At least one account exists with MFA enabled for testing
- [ ] Public pages work without authentication
- [ ] Required protected staff/admin pages work after login
- [ ] At least one ML pipeline is complete end-to-end
- [ ] At least one ML pipeline is meaningfully integrated into the deployed app
- [ ] Security requirements are both implemented and shown in the security video
- [ ] All required videos exist
- [ ] All required submission links are correct and tested
- [ ] All required credentials are correct and tested
- [ ] Videos are public/unlisted and playable by anyone with the link

**Ship decision:** PASS / FAIL

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

## 4.1 Monday Deliverables

- [ ] Scrum Master identified
- [ ] Product Owner identified
- [ ] Two realistic personas created
- [ ] Team can justify why those are the two most important personas
- [ ] Journey map completed
- [ ] Current pain points identified
- [ ] Problem statement written and specific
- [ ] MoSCoW table includes all INTEX requirements
- [ ] MoSCoW table includes at least five nice-to-have ideas
- [ ] One explicitly not-built feature is identified with rationale
- [ ] Product backlog includes a clear product goal
- [ ] Product backlog includes at least 12 backlog cards
- [ ] Monday sprint backlog exists
- [ ] Monday sprint backlog has at least 8 cards
- [ ] Every Monday card has a point estimate
- [ ] Every Monday card has exactly one assigned person
- [ ] Screenshot of Monday sprint backlog exists from before work started
- [ ] Burndown chart exists
- [ ] Three desktop wireframes exist for the most important screens

## 4.2 Tuesday Deliverables

- [ ] Tuesday sprint backlog exists
- [ ] Tuesday sprint backlog has at least 8 cards
- [ ] Every Tuesday card has a point estimate
- [ ] Every Tuesday card has exactly one assigned person
- [ ] Screenshot of Tuesday sprint backlog exists from before work started
- [ ] Three distinct AI-generated UI directions exist
- [ ] There are 3 screenshots for each direction, 9 total
- [ ] Five AI questions are documented for design 1
- [ ] Five AI questions are documented for design 2
- [ ] Five AI questions are documented for design 3
- [ ] Takeaways are summarized for each design option
- [ ] Chosen UI is identified
- [ ] Chosen UI rationale paragraph exists
- [ ] Three changes from original AI output are listed
- [ ] Tech stack diagram exists with frontend/backend/database logos

## 4.3 Wednesday Deliverables

- [ ] Wednesday sprint backlog exists
- [ ] Wednesday sprint backlog has at least 8 cards
- [ ] Every Wednesday card has a point estimate
- [ ] Every Wednesday card has exactly one assigned person
- [ ] Screenshot of Wednesday sprint backlog exists from before work started
- [ ] At least 5 page screenshots exist
- [ ] Each of those pages has both desktop and mobile screenshots
- [ ] One working page is deployed to the cloud
- [ ] That working page persists data to the database
- [ ] Persistence was actually verified, not assumed
- [ ] Real user feedback session happened
- [ ] User chosen had meaningful insight into a target persona
- [ ] Five specific improvement actions were captured
- [ ] Burndown chart is updated through Wednesday

## 4.4 Thursday Deliverables

- [ ] Thursday sprint backlog exists
- [ ] Thursday sprint backlog has at least 8 cards
- [ ] Every Thursday card has a point estimate
- [ ] Every Thursday card has exactly one assigned person
- [ ] Screenshot of Thursday sprint backlog exists from before work started
- [ ] One OKR metric is tracked in the app
- [ ] OKR metric is displayed in the app
- [ ] Team can explain why this metric matters most
- [ ] Every required page meets Lighthouse accessibility score >= 90
- [ ] Every required page is responsive for desktop and mobile
- [ ] Individual retrospective exists for every team member
- [ ] Each person recorded 2 things going well
- [ ] Each person recorded 2 things that could have been better
- [ ] Each person recorded their greatest personal contribution
- [ ] Team reflection explains how well the solution solved the original customer problem

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

- [ ] Backend uses .NET 10 / C#
- [ ] Frontend uses React / TypeScript / Vite
- [ ] Database uses Azure SQL, MySQL, or PostgreSQL
- [ ] Database design follows good relational principles
- [ ] App is deployed
- [ ] Database is deployed
- [ ] App and DB both work together in deployed environment
- [ ] Data validation exists
- [ ] Error handling exists
- [ ] Titles/icons/branding/navigation are consistent
- [ ] Performance is acceptable for demo use

## 5.2 Public Experience

### Home / Landing Page
- [ ] Modern, professional landing page exists
- [ ] Mission is clearly explained
- [ ] Clear calls to action exist
- [ ] Trust/credibility signals are present
- [ ] Page works unauthenticated

### Impact / Donor-Facing Dashboard
- [ ] Public impact dashboard exists
- [ ] Data is aggregated
- [ ] Data is anonymized
- [ ] Outcomes/progress/resource use are explained clearly
- [ ] Visualizations are understandable
- [ ] Dashboard helps build donor trust

### Login Page
- [ ] Login page exists
- [ ] Username/password auth works
- [ ] Validation messages appear for invalid input
- [ ] Error handling is understandable

### Privacy Policy + Cookie Consent
- [ ] Privacy policy page exists
- [ ] Privacy policy is linked from footer
- [ ] Cookie consent appears on public site
- [ ] Team knows whether cookie consent is cosmetic or functional

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

- [ ] Public site uses HTTPS/TLS
- [ ] Certificate is valid
- [ ] HTTP redirects to HTTPS
- [ ] HTTPS behavior is demonstrated in browser

## 6.3 Authentication

- [ ] Username/password authentication works
- [ ] Visitors can browse public pages unauthenticated
- [ ] Authenticated users can access protected pages
- [ ] Better-than-default password policy is configured according to class expectations
- [ ] Team can explain the exact password rules used
- [ ] /login and /auth/me style endpoints are accessible as needed
- [ ] Protected endpoints reject unauthorized users

## 6.4 RBAC Authorization

- [ ] Admin role exists
- [ ] Donor role exists
- [ ] Public/non-authenticated access is restricted appropriately
- [ ] Only admin can create data where required
- [ ] Only admin can update data where required
- [ ] Only admin can delete data where required
- [ ] Donor can view donor-specific history/impact if implemented
- [ ] Endpoint-level authorization matches UI restrictions

## 6.5 Integrity

- [ ] Change/delete actions require authorization
- [ ] Delete confirmation is required
- [ ] Unauthorized CUD attempts fail
- [ ] Team can demonstrate those failures

## 6.6 Credentials

- [ ] No secrets are committed to the public repo
- [ ] Secrets are stored in .env, env vars, or secrets manager
- [ ] Deployment secrets are handled safely
- [ ] Team can show where secrets are configured without exposing them

## 6.7 Privacy

- [ ] GDPR-style privacy policy is customized
- [ ] Privacy policy is linked from footer
- [ ] Cookie consent notification is implemented
- [ ] Team can explain whether consent is functional or cosmetic
- [ ] Public/private data boundary is appropriate for sensitive minors/survivors

## 6.8 Attack Mitigations

- [ ] CSP is sent as an HTTP response header
- [ ] CSP is not just a meta tag
- [ ] CSP is visible in browser devtools
- [ ] CSP is restricted to only needed sources
- [ ] Team can explain allowed sources
- [ ] Data sanitization or output encoding is used to reduce injection risk

## 6.9 Availability

- [ ] Site is publicly accessible
- [ ] Site is stable enough for TA access
- [ ] Identity/login works in deployed environment
- [ ] Operational database works in deployed environment

## 6.10 Additional Security Features

Mark only what was actually completed and can be proved.

- [ ] Third-party authentication
- [ ] MFA / 2FA
- [ ] HSTS
- [ ] Browser-accessible preference cookie used by React
- [ ] Additional sanitization/encoding protections
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

## 7.1 Minimum ML Standard

- [ ] At least one complete ML pipeline exists
- [ ] Pipeline solves a meaningful business problem
- [ ] Predictive model exists
- [ ] Explanatory / causal-style analysis exists
- [ ] Results are interpreted in business terms
- [ ] Notebook is executable top-to-bottom by a TA
- [ ] Notebook includes a CSV backup / fallback data-loading path for grading if DB access is unavailable
- [ ] Notebook preserves the original deployed / production-oriented code path
- [ ] Notebook is saved with outputs visible
- [ ] Pipeline is integrated into the deployed web app
- [ ] Model outputs are visible in a meaningful way in the app

## 7.2 Pipeline Quality Audit

### Problem Framing
- [ ] Business problem is clearly written
- [ ] Specific stakeholder is identified
- [ ] Why the problem matters is stated
- [ ] Predictive vs explanatory goal is explicitly justified
- [ ] Notebook explains why both predictive and explanatory / causal-style analysis were included

### Data Acquisition, Preparation & Exploration
- [ ] Relevant tables are identified
- [ ] Joins are explained
- [ ] Missing values handled appropriately
- [ ] Outliers explored/handled appropriately
- [ ] Feature engineering is explained
- [ ] Data prep is reproducible
- [ ] Exploration includes distributions/relationships/anomalies
- [ ] Data paths work relative to the repository structure
- [ ] CSV fallback data is documented clearly enough for TAs to run locally

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
- [ ] Notebook explains where deployment lives in repo/app
- [ ] API endpoint or dashboard integration exists
- [ ] User can actually access model output in the app
- [ ] Notebook explains both the deployed integration path and the TA grading / fallback execution path

### Grading Readiness
- [ ] Notebook can run without private credentials
- [ ] Notebook does not require grader IP whitelisting
- [ ] Notebook has rendered outputs visible before submission

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

- [ ] Supporters data is used appropriately
- [ ] Donations data is used appropriately
- [ ] Donation allocations are represented
- [ ] Donor history can be understood by staff
- [ ] Impact communication for donors is supported

## 8.2 Case Management Domain

- [ ] Resident data is represented appropriately
- [ ] Process recordings are represented appropriately
- [ ] Home visitations are represented appropriately
- [ ] Intervention/progress/risk tracking is represented
- [ ] Reintegration tracking is represented
- [ ] Case conferences are represented

## 8.3 Outreach / Social Media Domain

- [ ] Social media post data is represented
- [ ] Engagement metrics are represented
- [ ] Social data informs decisions, not just vanity metrics
- [ ] Social-to-donation linkage exists or is reasonably approximated

---

# 9. Deployed Runtime Verification

This section exists because many teams verify only from repo code.

## 9.1 Deployed URL Smoke Test
- [ ] Home page opens
- [ ] Footer opens privacy policy
- [ ] Cookie consent appears
- [ ] Login page opens
- [ ] Invalid login behaves correctly
- [ ] Valid admin login behaves correctly
- [ ] Valid donor login behaves correctly
- [ ] Logout behaves correctly

## 9.2 Persistence Smoke Test
- [ ] Create test record in deployed app
- [ ] Refresh page and confirm persistence
- [ ] Re-open from another session if possible
- [ ] Update test record and verify persistence
- [ ] Delete test record and verify persistence/change

## 9.3 Protected Access Smoke Test
- [ ] Anonymous user blocked from protected admin pages
- [ ] Donor blocked from admin-only pages
- [ ] Admin can access required protected pages
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

- [ ] Website link opens
- [ ] GitHub link opens publicly
- [ ] Notebook links open
- [ ] IS 413 video opens
- [ ] IS 414 video opens

## 12.3 Credential Verification

- [ ] Admin credential works
- [ ] Donor credential works
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

- Project alignment: PASS / RISK / FAIL
- IS 401: PASS / RISK / FAIL
- IS 413: PASS / RISK / FAIL
- IS 414: PASS / RISK / FAIL
- IS 455: PASS / RISK / FAIL
- Deployed runtime verification: PASS / RISK / FAIL
- Final submission package: PASS / RISK / FAIL
- Presentation readiness: PASS / RISK / FAIL

## Final Recommendation

- [ ] Ready to record videos
- [ ] Ready to submit
- [ ] Ready to present
- [ ] Not ready, blockers remain
