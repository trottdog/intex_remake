BEGIN;

-- Case-management seed data for the live .NET API.
-- Safe to re-run: every insert is guarded with NOT EXISTS checks.

WITH safehouse_base AS (
  SELECT COALESCE(MAX(safehouse_id), 0) AS base_id
  FROM public.safehouses
)
INSERT INTO public.safehouses (
  safehouse_id,
  safehouse_code,
  name,
  region,
  city,
  province,
  country,
  open_date,
  status,
  capacity_girls,
  capacity_staff,
  current_occupancy,
  notes
)
SELECT
  safehouse_base.base_id + 1,
  'CM-SEED-01',
  'Case Management Seed Safehouse',
  'NCR',
  'Quezon City',
  'Metro Manila',
  'Philippines',
  DATE '2024-01-15',
  'active',
  24,
  6,
  3,
  'Seed data used to populate the case-management pages.'
FROM safehouse_base
WHERE NOT EXISTS (
  SELECT 1
  FROM public.safehouses
  WHERE safehouse_code = 'CM-SEED-01'
);

-- Make the seeded safehouse visible to any scoped admin or staff account.
WITH assignment_candidates AS (
  SELECT
    u.id::text AS user_id,
    s.safehouse_id,
    ROW_NUMBER() OVER (ORDER BY u.id) AS rn
  FROM public.users u
  JOIN public.safehouses s
    ON s.safehouse_code = 'CM-SEED-01'
  WHERE u.role IN ('admin', 'staff')
    AND NOT EXISTS (
      SELECT 1
      FROM public.staff_safehouse_assignments a
      WHERE a.user_id = u.id::text
        AND a.safehouse_id = s.safehouse_id
    )
),
assignment_base AS (
  SELECT COALESCE(MAX(id), 0) AS base_id
  FROM public.staff_safehouse_assignments
)
INSERT INTO public.staff_safehouse_assignments (id, user_id, safehouse_id)
SELECT
  assignment_base.base_id + assignment_candidates.rn,
  assignment_candidates.user_id,
  assignment_candidates.safehouse_id
FROM assignment_candidates
CROSS JOIN assignment_base;

WITH resident_values AS (
  SELECT *
  FROM (
    VALUES
      (
        'CM-2026-001',
        'CM-R001',
        'active',
        'female',
        DATE '2012-05-14',
        'trafficking',
        TRUE,
        FALSE,
        FALSE,
        DATE '2025-10-03',
        '13',
        '13',
        '6 months',
        'DSWD',
        'Luz Ramos',
        'Ana Cruz',
        'Resident shows strong engagement in counseling and school reintegration planning.',
        'family_reintegration',
        'in_progress',
        'high',
        'medium',
        TIMESTAMP '2026-03-20 09:15:00',
        TRUE,
        FALSE,
        FALSE,
        TRUE,
        'Keep legal history restricted to social-work staff.'
      ),
      (
        'CM-2026-002',
        'CM-R002',
        'active',
        'female',
        DATE '2010-11-22',
        'abuse',
        FALSE,
        TRUE,
        FALSE,
        DATE '2025-12-12',
        '15',
        '15',
        '4 months',
        'Barangay Referral',
        'Officer Pena',
        'Ana Cruz',
        'High-trauma intake case requiring close psychosocial monitoring.',
        'family_reunification',
        'not_started',
        'critical',
        'high',
        TIMESTAMP '2026-03-24 14:30:00',
        FALSE,
        TRUE,
        FALSE,
        FALSE,
        'Trauma narrative and court details restricted.'
      ),
      (
        'CM-2026-003',
        'CM-R003',
        'closed',
        'female',
        DATE '2013-08-30',
        'child_labor',
        FALSE,
        FALSE,
        TRUE,
        DATE '2025-07-01',
        '11',
        '12',
        '9 months',
        'School Counselor',
        'Mae Ortega',
        'Carlo Diaz',
        'Resident stabilized quickly and met education and family readiness targets.',
        'supported_return_home',
        'completed',
        'medium',
        'low',
        TIMESTAMP '2026-03-28 11:00:00',
        TRUE,
        FALSE,
        FALSE,
        FALSE,
        'Post-reintegration follow-up only.'
      )
  ) AS v(
    case_control_no,
    internal_code,
    case_status,
    sex,
    date_of_birth,
    case_category,
    sub_cat_trafficked,
    sub_cat_physical_abuse,
    sub_cat_child_labor,
    date_of_admission,
    age_upon_admission,
    present_age,
    length_of_stay,
    referral_source,
    referring_agency_person,
    assigned_social_worker,
    initial_case_assessment,
    reintegration_type,
    reintegration_status,
    initial_risk_level,
    current_risk_level,
    created_at,
    family_is_4ps,
    family_solo_parent,
    family_indigenous,
    family_informal_settler,
    notes_restricted
  )
),
resident_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY v.case_control_no) AS rn,
    v.case_control_no,
    v.internal_code,
    s.safehouse_id,
    v.case_status,
    v.sex,
    v.date_of_birth,
    v.case_category,
    v.sub_cat_trafficked,
    v.sub_cat_physical_abuse,
    v.sub_cat_child_labor,
    v.date_of_admission,
    v.age_upon_admission,
    v.present_age,
    v.length_of_stay,
    v.referral_source,
    v.referring_agency_person,
    v.assigned_social_worker,
    v.initial_case_assessment,
    v.reintegration_type,
    v.reintegration_status,
    v.initial_risk_level,
    v.current_risk_level,
    v.created_at,
    v.family_is_4ps,
    v.family_solo_parent,
    v.family_indigenous,
    v.family_informal_settler,
    v.notes_restricted
  FROM public.safehouses s
  JOIN resident_values v
    ON TRUE
  WHERE s.safehouse_code = 'CM-SEED-01'
    AND NOT EXISTS (
      SELECT 1
      FROM public.residents r
      WHERE r.case_control_no = v.case_control_no
    )
),
resident_base AS (
  SELECT COALESCE(MAX(resident_id), 0) AS base_id
  FROM public.residents
)
INSERT INTO public.residents (
  resident_id,
  case_control_no,
  internal_code,
  safehouse_id,
  case_status,
  sex,
  date_of_birth,
  case_category,
  sub_cat_trafficked,
  sub_cat_physical_abuse,
  sub_cat_child_labor,
  date_of_admission,
  age_upon_admission,
  present_age,
  length_of_stay,
  referral_source,
  referring_agency_person,
  assigned_social_worker,
  initial_case_assessment,
  reintegration_type,
  reintegration_status,
  initial_risk_level,
  current_risk_level,
  created_at,
  family_is_4ps,
  family_solo_parent,
  family_indigenous,
  family_informal_settler,
  notes_restricted
)
SELECT
  resident_base.base_id + resident_candidates.rn,
  resident_candidates.case_control_no,
  resident_candidates.internal_code,
  resident_candidates.safehouse_id,
  resident_candidates.case_status,
  resident_candidates.sex,
  resident_candidates.date_of_birth,
  resident_candidates.case_category,
  resident_candidates.sub_cat_trafficked,
  resident_candidates.sub_cat_physical_abuse,
  resident_candidates.sub_cat_child_labor,
  resident_candidates.date_of_admission,
  resident_candidates.age_upon_admission,
  resident_candidates.present_age,
  resident_candidates.length_of_stay,
  resident_candidates.referral_source,
  resident_candidates.referring_agency_person,
  resident_candidates.assigned_social_worker,
  resident_candidates.initial_case_assessment,
  resident_candidates.reintegration_type,
  resident_candidates.reintegration_status,
  resident_candidates.initial_risk_level,
  resident_candidates.current_risk_level,
  resident_candidates.created_at,
  resident_candidates.family_is_4ps,
  resident_candidates.family_solo_parent,
  resident_candidates.family_indigenous,
  resident_candidates.family_informal_settler,
  resident_candidates.notes_restricted
FROM resident_candidates
CROSS JOIN resident_base;

WITH process_values AS (
  SELECT *
  FROM (
    VALUES
      (
        'CM-2026-001',
        DATE '2026-04-02',
        'Ana Cruz',
        'Individual',
        60,
        'Anxious but cooperative',
        'Calm and hopeful',
        'Resident discussed school re-entry fears and identified coping supports at the safehouse.',
        'Grounding exercises, strengths reflection, reintegration planning',
        'Coordinate with school focal person before next session.',
        TRUE,
        FALSE,
        FALSE,
        NULL
      ),
      (
        'CM-2026-002',
        DATE '2026-04-03',
        'Ana Cruz',
        'Crisis',
        75,
        'Highly distressed',
        'Emotionally regulated with support',
        'Session focused on a flashback episode triggered by family contact.',
        'Crisis stabilization, breathing exercises, safety review',
        'Schedule psychiatry consult and increase check-ins.',
        FALSE,
        TRUE,
        TRUE,
        'Detailed trauma narrative omitted from general access.'
      ),
      (
        'CM-2026-003',
        DATE '2026-03-18',
        'Carlo Diaz',
        'Follow-up',
        45,
        'Positive',
        'Positive',
        'Resident reported steady adjustment at home and continued school attendance.',
        'Supportive counseling, reinforcement of follow-up plan',
        'Maintain monthly post-reintegration monitoring.',
        TRUE,
        FALSE,
        FALSE,
        NULL
      )
  ) AS v(
    case_control_no,
    session_date,
    social_worker,
    session_type,
    session_duration_minutes,
    emotional_state_observed,
    emotional_state_end,
    session_narrative,
    interventions_applied,
    follow_up_actions,
    progress_noted,
    concerns_flagged,
    referral_made,
    notes_restricted
  )
),
process_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.resident_id, v.session_date, v.session_type) AS rn,
    r.resident_id,
    v.session_date,
    v.social_worker,
    v.session_type,
    v.session_duration_minutes,
    v.emotional_state_observed,
    v.emotional_state_end,
    v.session_narrative,
    v.interventions_applied,
    v.follow_up_actions,
    v.progress_noted,
    v.concerns_flagged,
    v.referral_made,
    v.notes_restricted
  FROM public.residents r
  JOIN process_values v
    ON r.case_control_no = v.case_control_no
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.process_recordings pr
    WHERE pr.resident_id = r.resident_id
      AND pr.session_date = v.session_date
      AND COALESCE(pr.session_type, '') = COALESCE(v.session_type, '')
  )
),
process_base AS (
  SELECT COALESCE(MAX(recording_id), 0) AS base_id
  FROM public.process_recordings
)
INSERT INTO public.process_recordings (
  recording_id,
  resident_id,
  session_date,
  social_worker,
  session_type,
  session_duration_minutes,
  emotional_state_observed,
  emotional_state_end,
  session_narrative,
  interventions_applied,
  follow_up_actions,
  progress_noted,
  concerns_flagged,
  referral_made,
  notes_restricted
)
SELECT
  process_base.base_id + process_candidates.rn,
  process_candidates.resident_id,
  process_candidates.session_date,
  process_candidates.social_worker,
  process_candidates.session_type,
  process_candidates.session_duration_minutes,
  process_candidates.emotional_state_observed,
  process_candidates.emotional_state_end,
  process_candidates.session_narrative,
  process_candidates.interventions_applied,
  process_candidates.follow_up_actions,
  process_candidates.progress_noted,
  process_candidates.concerns_flagged,
  process_candidates.referral_made,
  process_candidates.notes_restricted
FROM process_candidates
CROSS JOIN process_base;

WITH visit_values AS (
  SELECT *
  FROM (
    VALUES
      (
        'CM-2026-001',
        DATE '2026-03-27',
        'Ana Cruz',
        'Reintegration Visit',
        'Family home, Quezon City',
        'Mother, aunt, younger brother',
        'Assess readiness for weekend home placement.',
        'Home environment was orderly and the caregiver demonstrated consistent support.',
        'Good',
        FALSE,
        TRUE,
        'Verify school documents before overnight visit.',
        'Positive'
      ),
      (
        'CM-2026-002',
        DATE '2026-03-29',
        'Ana Cruz',
        'Family Assessment',
        'Temporary guardian residence, Caloocan',
        'Aunt, barangay worker',
        'Review family safety and supervision capacity.',
        'Guardian is willing to participate, but neighborhood exposure risk remains high.',
        'Moderate',
        TRUE,
        TRUE,
        'Escalate to case conference before reintegration planning.',
        'Requires Follow-up'
      )
  ) AS v(
    case_control_no,
    visit_date,
    social_worker,
    visit_type,
    location_visited,
    family_members_present,
    purpose,
    observations,
    family_cooperation_level,
    safety_concerns_noted,
    follow_up_needed,
    follow_up_notes,
    visit_outcome
  )
),
visit_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.resident_id, v.visit_date, v.visit_type) AS rn,
    r.resident_id,
    v.visit_date,
    v.social_worker,
    v.visit_type,
    v.location_visited,
    v.family_members_present,
    v.purpose,
    v.observations,
    v.family_cooperation_level,
    v.safety_concerns_noted,
    v.follow_up_needed,
    v.follow_up_notes,
    v.visit_outcome
  FROM public.residents r
  JOIN visit_values v
    ON r.case_control_no = v.case_control_no
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.home_visitations hv
    WHERE hv.resident_id = r.resident_id
      AND hv.visit_date = v.visit_date
      AND COALESCE(hv.visit_type, '') = COALESCE(v.visit_type, '')
  )
),
visit_base AS (
  SELECT COALESCE(MAX(visitation_id), 0) AS base_id
  FROM public.home_visitations
)
INSERT INTO public.home_visitations (
  visitation_id,
  resident_id,
  visit_date,
  social_worker,
  visit_type,
  location_visited,
  family_members_present,
  purpose,
  observations,
  family_cooperation_level,
  safety_concerns_noted,
  follow_up_needed,
  follow_up_notes,
  visit_outcome
)
SELECT
  visit_base.base_id + visit_candidates.rn,
  visit_candidates.resident_id,
  visit_candidates.visit_date,
  visit_candidates.social_worker,
  visit_candidates.visit_type,
  visit_candidates.location_visited,
  visit_candidates.family_members_present,
  visit_candidates.purpose,
  visit_candidates.observations,
  visit_candidates.family_cooperation_level,
  visit_candidates.safety_concerns_noted,
  visit_candidates.follow_up_needed,
  visit_candidates.follow_up_notes,
  visit_candidates.visit_outcome
FROM visit_candidates
CROSS JOIN visit_base;

WITH conference_values AS (
  SELECT *
  FROM (
    VALUES
      (
        'CM-2026-001',
        DATE '2026-04-04',
        'Reintegration Planning',
        'Team agreed the resident can begin supervised weekend home stays.',
        'Approve phased reintegration over the next 30 days.',
        'Finalize school coordination and caregiver orientation.',
        DATE '2026-04-18',
        'Ana Cruz'
      ),
      (
        'CM-2026-002',
        DATE '2026-04-05',
        'Case Review',
        'Conference called after safety concerns surfaced during family assessment.',
        'Delay reintegration planning and intensify trauma support.',
        'Complete psychiatric consult and home safety verification.',
        DATE '2026-04-19',
        'Ana Cruz'
      )
  ) AS v(
    case_control_no,
    conference_date,
    conference_type,
    summary,
    decisions_made,
    next_steps,
    next_conference_date,
    created_by
  )
),
conference_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.resident_id, v.conference_date, v.conference_type) AS rn,
    r.resident_id,
    v.conference_date,
    v.conference_type,
    v.summary,
    v.decisions_made,
    v.next_steps,
    v.next_conference_date,
    v.created_by
  FROM public.residents r
  JOIN conference_values v
    ON r.case_control_no = v.case_control_no
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.case_conferences cc
    WHERE cc.resident_id = r.resident_id
      AND cc.conference_date = v.conference_date
      AND COALESCE(cc.conference_type, '') = COALESCE(v.conference_type, '')
  )
),
conference_base AS (
  SELECT COALESCE(MAX(conference_id), 0) AS base_id
  FROM public.case_conferences
)
INSERT INTO public.case_conferences (
  conference_id,
  resident_id,
  conference_date,
  conference_type,
  summary,
  decisions_made,
  next_steps,
  next_conference_date,
  created_by
)
SELECT
  conference_base.base_id + conference_candidates.rn,
  conference_candidates.resident_id,
  conference_candidates.conference_date,
  conference_candidates.conference_type,
  conference_candidates.summary,
  conference_candidates.decisions_made,
  conference_candidates.next_steps,
  conference_candidates.next_conference_date,
  conference_candidates.created_by
FROM conference_candidates
CROSS JOIN conference_base;

WITH plan_values AS (
  SELECT *
  FROM (
    VALUES
      (
        'CM-2026-001',
        'Educational Support',
        'Return resident to formal schooling with tutoring support and attendance monitoring.',
        'School enrollment support, tutoring, transportation allowance',
        100::numeric,
        DATE '2026-05-15',
        'In Progress',
        DATE '2026-04-04',
        TIMESTAMP '2026-04-04 10:00:00',
        0.78,
        'high-impact'
      ),
      (
        'CM-2026-002',
        'Psychosocial Support',
        'Stabilize trauma symptoms before any reintegration milestone is considered.',
        'Trauma-focused CBT, psychiatric referral, daily check-ins',
        80::numeric,
        DATE '2026-06-01',
        'In Progress',
        DATE '2026-04-05',
        TIMESTAMP '2026-04-05 13:30:00',
        0.54,
        'moderate'
      ),
      (
        'CM-2026-003',
        'Family Reintegration',
        'Complete post-return monitoring and close the support plan after stable adjustment.',
        'Monthly home visits, school attendance follow-up, caregiver coaching',
        100::numeric,
        DATE '2026-04-30',
        'Completed',
        DATE '2026-03-12',
        TIMESTAMP '2026-03-12 09:00:00',
        0.87,
        'high-impact'
      )
  ) AS v(
    case_control_no,
    plan_category,
    plan_description,
    services_provided,
    target_value,
    target_date,
    status,
    case_conference_date,
    created_at,
    effectiveness_outcome_score,
    effectiveness_band
  )
),
plan_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.resident_id, v.target_date, v.plan_category) AS rn,
    r.resident_id,
    v.plan_category,
    v.plan_description,
    v.services_provided,
    v.target_value,
    v.target_date,
    v.status,
    v.case_conference_date,
    v.created_at,
    v.effectiveness_outcome_score,
    v.effectiveness_band
  FROM public.residents r
  JOIN plan_values v
    ON r.case_control_no = v.case_control_no
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.intervention_plans ip
    WHERE ip.resident_id = r.resident_id
      AND COALESCE(ip.plan_category, '') = COALESCE(v.plan_category, '')
      AND ip.target_date = v.target_date
  )
),
plan_base AS (
  SELECT COALESCE(MAX(plan_id), 0) AS base_id
  FROM public.intervention_plans
)
INSERT INTO public.intervention_plans (
  plan_id,
  resident_id,
  plan_category,
  plan_description,
  services_provided,
  target_value,
  target_date,
  status,
  case_conference_date,
  created_at,
  effectiveness_outcome_score,
  effectiveness_band
)
SELECT
  plan_base.base_id + plan_candidates.rn,
  plan_candidates.resident_id,
  plan_candidates.plan_category,
  plan_candidates.plan_description,
  plan_candidates.services_provided,
  plan_candidates.target_value,
  plan_candidates.target_date,
  plan_candidates.status,
  plan_candidates.case_conference_date,
  plan_candidates.created_at,
  plan_candidates.effectiveness_outcome_score,
  plan_candidates.effectiveness_band
FROM plan_candidates
CROSS JOIN plan_base;

WITH incident_values AS (
  SELECT *
  FROM (
    VALUES
      (
        'CM-2026-002',
        DATE '2026-04-01',
        'SelfHarm',
        'high',
        'Resident expressed self-harm ideation after a difficult family contact.',
        'Crisis protocol activated, one-on-one supervision started, psychiatry referral sent.',
        FALSE,
        NULL::date,
        'Ana Cruz',
        TRUE,
        'investigating'
      ),
      (
        'CM-2026-001',
        DATE '2026-03-26',
        'Behavioral',
        'medium',
        'Resident argued with a peer after a stressful school readiness meeting.',
        'Conflict de-escalated with mediation and reflective journaling exercise.',
        TRUE,
        DATE '2026-03-27',
        'Carlo Diaz',
        FALSE,
        'resolved'
      )
  ) AS v(
    case_control_no,
    incident_date,
    incident_type,
    severity,
    description,
    response_taken,
    resolved,
    resolution_date,
    reported_by,
    follow_up_required,
    status
  )
),
incident_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.resident_id, v.incident_date, v.incident_type) AS rn,
    r.resident_id,
    r.safehouse_id,
    v.incident_date,
    v.incident_type,
    v.severity,
    v.description,
    v.response_taken,
    v.resolved,
    v.resolution_date,
    v.reported_by,
    v.follow_up_required,
    v.status
  FROM public.residents r
  JOIN incident_values v
    ON r.case_control_no = v.case_control_no
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.incident_reports ir
    WHERE ir.resident_id = r.resident_id
      AND ir.incident_date = v.incident_date
      AND COALESCE(ir.incident_type, '') = COALESCE(v.incident_type, '')
  )
),
incident_base AS (
  SELECT COALESCE(MAX(incident_id), 0) AS base_id
  FROM public.incident_reports
)
INSERT INTO public.incident_reports (
  incident_id,
  resident_id,
  safehouse_id,
  incident_date,
  incident_type,
  severity,
  description,
  response_taken,
  resolved,
  resolution_date,
  reported_by,
  follow_up_required,
  status
)
SELECT
  incident_base.base_id + incident_candidates.rn,
  incident_candidates.resident_id,
  incident_candidates.safehouse_id,
  incident_candidates.incident_date,
  incident_candidates.incident_type,
  incident_candidates.severity,
  incident_candidates.description,
  incident_candidates.response_taken,
  incident_candidates.resolved,
  incident_candidates.resolution_date,
  incident_candidates.reported_by,
  incident_candidates.follow_up_required,
  incident_candidates.status
FROM incident_candidates
CROSS JOIN incident_base;

COMMIT;

-- Quick checks after running:
-- SELECT case_control_no, case_status, current_risk_level, reintegration_status FROM public.residents WHERE case_control_no LIKE 'CM-2026-%';
-- SELECT resident_id, session_date, session_type FROM public.process_recordings WHERE resident_id IN (SELECT resident_id FROM public.residents WHERE case_control_no LIKE 'CM-2026-%');
