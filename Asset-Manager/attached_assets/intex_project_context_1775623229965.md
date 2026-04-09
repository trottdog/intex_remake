# INTEX Project – Context Overview

---

## Background

This project represents the culmination of core Information Systems coursework, integrating concepts from project management (Scrum), machine learning, cybersecurity, and enterprise application development using .NET and React.

The objective is to design and build a comprehensive technology solution that supports a nonprofit organization modeled after Lighthouse Sanctuary, a US-based 501(c)(3) that operates safe homes for girls who are survivors of sexual abuse or sex trafficking in the Philippines fileciteturn1file0.

---

## Organizational Vision

The client aims to create a similar organization in underserved regions. To support this initiative, anonymized operational data and documentation have been provided, including:

- Caseload inventory records
- Counseling session process recordings
- Home visitation reports
- Annual accomplishment report templates

The goal is to build systems that not only support operations but also enable data-driven decision-making.

---

## Core Challenges

### 1. Donor Retention and Growth

The organization is entirely donation-funded and struggles to:
- Understand why donors stop giving
- Identify high-value or at-risk donors
- Measure campaign effectiveness
- Personalize outreach without a marketing team
- Connect donations to real-world impact

---

### 2. Case Management and Resident Outcomes

The organization’s primary mission is to protect and rehabilitate vulnerable girls. However, challenges include:

- Risk of residents "falling through the cracks"
- Limited visibility into individual progress
- Difficulty tracking intervention effectiveness
- Managing the full lifecycle of care:
  - Intake and assessment
  - Counseling (process recordings)
  - Education and health tracking
  - Home visitations
  - Reintegration planning

---

### 3. Social Media Strategy

Social media is the main outreach channel, but the organization lacks expertise in:

- Content strategy
- Platform selection
- Posting frequency and timing
- Understanding what drives donations vs engagement

---

### 4. Operational Simplicity

The system must:

- Be easy to use for staff with limited technical resources
- Support efficient data creation, updates, and controlled deletion

---

### 5. Security and Privacy

Due to the sensitive nature of the data (including minors who are abuse survivors), the system must:

- Protect confidentiality and privacy
- Ensure secure authentication and authorization
- Safeguard data against unauthorized access

These requirements align with strict security expectations such as encryption, role-based access control, and secure deployment practices fileciteturn1file2.

---

## Data Foundation

The system will leverage a structured dataset consisting of 17 tables across three domains:

### Donor & Support Domain
- Supporters, donations, allocations, partners

### Case Management Domain
- Residents, counseling sessions, home visits, education, health, interventions

### Outreach Domain
- Social media posts, engagement metrics, impact snapshots

This dataset enables both operational functionality and advanced analytics, including machine learning pipelines for prediction and explanation fileciteturn1file5.

---

## System Requirements Alignment

The final solution must integrate multiple disciplines:

- **Project Management (IS 401):** Agile planning, personas, journey mapping, backlog management
- **Enterprise Development (IS 413):** Full-stack web app using .NET and React with robust CRUD functionality and dashboards fileciteturn1file1
- **Security (IS 414):** Authentication, RBAC, HTTPS, privacy compliance, and attack mitigation fileciteturn1file2
- **Machine Learning (IS 455):** End-to-end pipelines that drive decision-making through predictive and explanatory models fileciteturn1file3

---

## Summary

This project is not just about building a web application—it is about creating a unified, secure, and intelligent system that:

- Improves donor retention and funding sustainability
- Enhances care outcomes for residents
- Optimizes outreach and communication strategies
- Enables data-driven decision-making across the organization

The ultimate goal is to design a solution that is scalable, impactful, and aligned with the real-world challenges faced by mission-driven organizations.

