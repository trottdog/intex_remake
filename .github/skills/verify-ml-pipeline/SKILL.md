---
name: verify-ml-pipeline
description: Verify whether an INTEX ML pipeline is actually complete from problem framing through deployment. Use this when checking notebooks, train/test methodology, explanatory vs predictive logic, feature selection, business interpretation, and UI/API integration.
argument-hint: [notebook path, model endpoint, UI route]
user-invocable: true
---

# Verify ML Pipeline

Use this skill to audit IS 455 pipeline completion.

## Verify all stages

- problem framing
- stakeholder and business value
- predictive vs explanatory distinction
- data acquisition and joins
- cleaning and feature engineering
- exploration
- model choice
- validation method
- metrics
- interpretation in business terms
- feature importance or explanatory discussion
- limits and causality discussion
- deployment notes
- actual app integration

## Fail conditions

Mark RISK or FAIL when:
- notebook exists but is not executable
- model is trained but not integrated into app
- prediction and explanation are confused
- only one model is shown without reasoning
- evaluation is weak or missing
- business interpretation is absent
- deployed endpoint exists but no UI uses it

## Output format

- Pipeline name
- Status: PASS / RISK / FAIL
- What is complete
- What is weak
- What is missing
- Whether it is safe to show in the final video