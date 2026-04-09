---
name: verify-security-proof
description: Verify that INTEX security requirements are both implemented and demonstrably shown for grading. Use this when auditing HTTPS, redirect, auth, RBAC, password policy, CSP, cookie consent, secrets handling, MFA, HSTS, and security-video coverage.
argument-hint: [security files, routes, middleware, video evidence]
user-invocable: true
---

# Verify Security Proof

Use this skill to audit IS 414 completion.

## Core rule

A security feature is not complete for grading unless:
1. implementation evidence exists, and

## Verify these areas

- HTTPS/TLS
- HTTP -> HTTPS redirect
- login/authentication
- password policy
- RBAC
- protected APIs
- delete confirmation
- secrets handling
- privacy policy
- cookie consent
- CSP response header
- availability on deployed site
- MFA account if claimed
- HSTS if claimed
- extra security features if claimed

## Output

For each security item:
- Status: PASS / RISK / FAIL
- Repo/runtime evidence
- Missing proof
- Exact blocker

## Strict failure examples

Mark FAIL or RISK when:
- CSP is only in a meta tag
- role restrictions exist in UI but not API
- MFA is claimed but no account exists
- cookie consent exists but nobody can explain whether it is cosmetic or functional
- secrets are hidden in code or public repo
- HTTPS is assumed but not demonstrated