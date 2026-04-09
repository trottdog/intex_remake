---
name: verify-project-completion
description: Audit the INTEX project for real completion, not claimed completion. Use this when asked whether the project is done, ready to submit, ready to record videos, ready to present, or when verifying rubric coverage across IS 401, IS 413, IS 414, IS 455, deployment, videos, and submission links.
argument-hint: [what to verify, evidence locations, deployment URLs, repo paths]
user-invocable: true
---

# Verify Project Completion

Use this skill to perform a strict completion audit for the INTEX project and to document the state of the project in the checklist.md.

This skill is not for giving encouragement or vague readiness opinions.
This skill is for evidence-based pass/risk/fail verification.

Primary resources:
- [INTEX audit checklist](./checklist.md)
- [Audit report template](./audit-report-template.md)
- https://intex.trottdog.com/

## Core rule

Do not say the project is "ready" unless required evidence exists.

If evidence is missing, mark the item as:
- `[ ]` Missing
- `[~]` Risky / partially evidenced / not verified

Only mark `[x]` when there is direct evidence.

Skip over items already marked as `[x]`.

## What counts as evidence

Acceptable evidence includes:
- deployed URL behavior
- repo file path
- controller/API route
- page route
- screenshot
- screen recording
- browser devtools proof
- database persistence proof
- notebook output
- test result
- final public link opened successfully

Do not treat "we implemented it" as evidence by itself.

## Audit procedure

Follow this order:

1. Read the user's request and identify the audit scope.
   Examples:
   - full ship gate
   - security only
   - video readiness only
   - ML pipeline only
   - final submission only

2. Check the [INTEX audit checklist](./checklist.md) and map the request to the relevant sections.

3. Gather evidence from the workspace, including:
   - frontend routes and pages
   - backend auth, middleware, controllers, and tests
   - ML notebooks and API integration points
   - deployment config
   - screenshots, reports, and video links if present
   - submission artifacts if present

4. For every major section reviewed, output:
   - Status: PASS / RISK / FAIL
   - Evidence found
   - Missing proof
   - Exact blockers
   - Next actions

5. Be strict about common false-completion patterns:
   - implemented locally but not deployed
   - UI exists but API auth is missing
   - notebook exists but model is not surfaced in app
   - credentials exist but were not tested
   - page looks complete but does not persist to DB

6. End with:
   - Critical blockers
   - Highest-risk claims
   - Final recommendation:
     - Ready to record videos
     - Ready to submit
     - Ready to present
     - Not ready

## Required output format

Use this structure:

### Audit Scope
- What was checked

### Overall Status
- PASS / RISK / FAIL

### Section Results
For each section:
- Status
- Evidence
- Gaps
- Blockers

### Critical Blockers
1.
2.
3.

### Highest-Risk Claims
1.
2.
3.

### Final Recommendation
- Ready to record videos / Not ready
- Ready to submit / Not ready
- Ready to present / Not ready

## Special rules for this project

### Ship gate
Do not say "ready" unless the minimum ship gate is satisfied.

### ML
An ML pipeline does not count as complete unless it is:
- a meaningful business problem
- notebook-backed
- evaluated properly
- integrated into the app in a user-visible way

### Submission
A link does not count as verified unless it is explicitly checked as accessible.

## Tone

Be direct and skeptical.
Prefer "not yet verified" over guessing.
Prefer "risk" over false confidence.