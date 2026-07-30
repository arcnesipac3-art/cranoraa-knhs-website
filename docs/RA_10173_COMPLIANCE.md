# Data Privacy Act (RA 10173) Compliance — KNHS PRISM Portal

## Overview

Republic Act No. 10173, known as the **Data Privacy Act of 2012**, and its Implementing Rules and Regulations (IRR) govern the collection, processing, storage, and disposal of personal data in the Philippines. The KNHS PRISM Portal, as a school information system handling student and staff records, must comply with all provisions of RA 10173 and its IRR.

This document outlines how the system complies with the law and serves as a reference for school administrators, the Data Protection Officer (DPO), and technical staff.

---

## Scope

The system collects and processes the following categories of personal data:

### Student Data
- Full name, date of birth, gender, address
- Learner Reference Number (LRN)
- Parent/guardian names and contact information
- Grades, academic records, and class schedules
- Attendance records
- Profile pictures
- Enrollment history

### Teacher/Staff Data
- Full name, employee ID, contact information
- Department, position, and specialization
- Teaching assignments and class loads

### Administrative Data
- User account credentials (email, hashed passwords)
- System access logs and audit trails
- Role assignments (Admin, Teacher, Student)

---

## Legal Basis for Processing

The system processes personal data under the following legal bases as defined in RA 10173 Section 12 and the IRR:

1. **Consent** — Users (students, parents, teachers) provide explicit consent during registration and enrollment. Consent is obtained via the registration form and acceptance of the system's privacy notice.

2. **Legitimate Interest of the Controller** — Processing is necessary for the school's legitimate educational operations, including grade management, attendance tracking, and academic reporting.

3. **Education Purposes (IRR Article 12, Section 3(a))** — Personal data processing for academic purposes by an educational institution is permitted under the IRR without requiring additional consent beyond enrollment, provided the processing is directly related to the educational function.

4. **Compliance with Legal Obligation** — The school is required by DepEd to maintain student records, submit Learner Information System (LIS) data, and produce academic reports.

---

## Data Processing Activities

### Collection

| Data Type | Collection Method | Purpose |
|-----------|------------------|---------|
| Student enrollment info | Registration form (frontend) | Enrollment and record-keeping |
| Teacher registration | Admin-created accounts | Staff management |
| Profile pictures | File upload | User identification |
| Assignments/submissions | File upload | Academic assessment |
| Grades | Manual entry by teachers | Academic evaluation |
| Attendance | Teacher-recorded entries | Attendance monitoring |

**Privacy notice:** Displayed at registration. Informs data subjects of what data is collected, how it is used, and their rights under RA 10173.

### Storage

| Data | Storage Service | Encryption |
|------|----------------|------------|
| User records, grades, attendance | PostgreSQL (Supabase) | AES-256 at rest (Supabase-managed) |
| Profile pictures, files | Supabase Storage | Encrypted at rest |
| Session tokens | Redis (Render) | In-memory, not persisted |
| Source code, config | GitHub, Render | TLS in transit |

**Retention:** Data is stored for the duration of the user's active relationship with the school, plus the required retention period.

### Use

Personal data is used exclusively for:

- Grade computation and report card generation
- Attendance tracking and reporting
- Class schedule management
- School announcements and communications
- Academic record-keeping required by DepEd
- System administration and security (audit logs)

### Sharing

- Personal data is shared **only within the school** — between teachers, admins, and authorized staff.
- **No external sharing** occurs. Data is not sold, rented, or disclosed to third parties.
- DepEd reporting (LIS submissions) uses aggregated or anonymized data where possible.
- Supabase acts as a data processor (hosting provider) under a data processing agreement.

### Retention

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| Student academic records | Minimum 5 years after completion | DepEd policy |
| Student PII (enrollment) | Duration of enrollment + 5 years | DepEd policy |
| Teacher/staff records | Duration of employment + 3 years | Labor law requirements |
| System audit logs | 2 years | Security best practice |
| Deleted user accounts | Anonymized within 30 days | RA 10173 minimization principle |

### Disposal

- **Account deactivation:** User accounts are deactivated (not deleted) when a student graduates or a teacher leaves. Personal data is retained per the retention schedule above.
- **Data anonymization:** After the retention period, personal data is anonymized (names replaced with hashes, LRN removed) so it can no longer be linked to an identifiable individual.
- **File disposal:** Files in Supabase Storage are permanently deleted upon bucket cleanup or upon DPO authorization.
- **Backup disposal:** Database backups are rotated and older backups are securely deleted.

---

## Data Subject Rights

Under RA 10173 Section 16, data subjects have the following rights. The system supports each through the mechanisms described below:

| Right | Description | How to Exercise |
|-------|-------------|-----------------|
| **Access** | Right to obtain a copy of personal data | Submit request to DPO; system provides profile export |
| **Correction** | Right to correct inaccurate data | Users can edit their profile; teachers can update grades |
| **Erasure** | Right to delete personal data | Submit request to DPO; subject to retention requirements |
| **Portability** | Right to obtain data in a structured format | Data export as CSV/JSON upon request |
| **Objection** | Right to object to processing | Submit objection to DPO; processing may cease for non-essential purposes |
| **Restriction** | Right to restrict processing | Submit request to DPO |
| **Remedy** | Right to file a complaint with the NPC | Contact NPC: https://privacy.gov.ph |

**Response time:** All rights requests must be addressed within **15 working days**.

---

## Security Measures

### Technical Safeguards

| Measure | Implementation |
|---------|---------------|
| Authentication | JWT (JSON Web Tokens) via `djangorestframework-simplejwt` |
| Transport security | HTTPS enforced on all endpoints (Vercel + Render auto-SSL) |
| Content Security Policy | CSP headers configured in frontend |
| Rate limiting | API rate limiting to prevent brute-force attacks |
| Encryption at rest | Supabase encrypts PostgreSQL data with AES-256 |
| Password hashing | Django's PBKDF2 hasher (default) |
| CORS policy | Strict origin allowlist in `render.yaml` |
| CSRF protection | Django CSRF middleware + trusted origins configuration |

### Organizational Safeguards

| Measure | Implementation |
|---------|---------------|
| Role-based access control | Three roles: Admin, Teacher, Student — each with defined permissions |
| Audit logging | Login events, data modifications, and admin actions are logged |
| Principle of least privilege | Users only access data necessary for their role |
| Staff training | All staff with system access must complete data privacy training |
| Privacy notice | Displayed at registration and accessible in the system |

### Physical Safeguards

| Measure | Implementation |
|---------|---------------|
| Cloud hosting | Supabase (SOC 2 Type II compliant), Render (SOC 2), Vercel (SOC 2) |
| Data center security | Managed by cloud providers; ISO 27001 certified facilities |
| Backup storage | Encrypted backups stored in geographically separate locations |

---

## Data Protection Officer (DPO)

The school must designate a Data Protection Officer responsible for:

- Overseeing compliance with RA 10173 and its IRR
- Receiving and responding to data subject requests
- Coordinating with the National Privacy Commission (NPC)
- Conducting privacy impact assessments
- Maintaining the record of processing activities
- Handling data breach notifications

### DPO Contact Template

| Field | Value |
|-------|-------|
| Name | _[Designated DPO]_ |
| Position | _[Job title]_ |
| Email | _[dpo@kiwalan-nhs.edu.ph]_ |
| Phone | _[Contact number]_ |
| Office Hours | _[e.g., Mon–Fri, 8:00 AM – 5:00 PM]_ |

---

## Breach Notification

Under RA 10173 Section 20 and NPC Circular 16-01, the school must notify the following in the event of a personal data breach:

### Notification to NPC

- **Within 72 hours** of discovering the breach, if it involves:
  - Personal data of **500 or more individuals**, or
  - Sensitive personal information (e.g., LRN, health data), or
  - Any breach likely to cause serious harm

- **Notification must include:**
  1. Nature of the breach
  2. Personal data affected
  3. Number of data subjects affected
  4. Measures taken to contain and remediate
  5. Contact information of the DPO

### Notification to Affected Data Subjects

- Notify affected individuals **without undue delay** after determining the scope.
- Provide clear information about what happened, what data was compromised, and what steps they should take.

### Internal Response

1. Contain the breach (isolate affected systems)
2. Preserve evidence (logs, snapshots)
3. Assess the scope and severity
4. Notify NPC and affected parties
5. Remediate and prevent recurrence
6. Document the incident in the breach register

---

## Privacy Impact Assessment (PIA)

A Privacy Impact Assessment is required when:

- Deploying new features that process personal data
- Changing data processing workflows
- Integrating with new third-party services
- Handling sensitive personal information for the first time
- Responding to a data breach

### PIA Process

1. **Describe** the data processing activity and its purpose
2. **Identify** personal data involved and data subjects affected
3. **Assess** necessity and proportionality of processing
4. **Identify** risks to data subjects
5. **Determine** safeguards and mitigation measures
6. **Document** findings and obtain DPO approval
7. **Review** periodically or when changes occur

---

## Children's Data

The system processes personal data of **minors** (students under 18 years old). Special protections apply:

- **Parental consent:** Enrollment implies parental or guardian consent for the collection and processing of student data for educational purposes.
- **Minimal data collection:** Only data necessary for educational operations is collected.
- **Access control:** Student data is accessible only to authorized teachers, admins, and the student themselves.
- **No profiling:** Student data is not used for profiling, scoring, or automated decision-making beyond academic grading.
- **No marketing:** Student data is never used for marketing or commercial purposes.
- **Right to erasure:** Parents/guardians may request deletion of their child's data, subject to retention requirements.
- **Age verification:** The system does not collect data from children under 13 without verified parental consent (in compliance with RA 10173 and DepEd policy).

---

## Cross-border Data Transfer

The system uses the following cloud services, which may involve data processing outside the Philippines:

| Service | Provider | Hosting Region | Compliance |
|---------|----------|---------------|------------|
| Database (PostgreSQL) | Supabase | US (default) or configurable | SOC 2 Type II, GDPR-compliant DPA |
| File Storage | Supabase | Same as database | SOC 2 Type II |
| Backend Hosting | Render | US | SOC 2 Type II |
| Frontend Hosting | Vercel | Global CDN | SOC 2 Type II |
| Email | Mailjet | EU (Mailjet SAS) | GDPR, SOC 2 |

**Safeguards for cross-border transfer:**

- All providers have executed Data Processing Agreements (DPAs)
- Providers are SOC 2 Type II certified (or equivalent)
- Data is encrypted in transit (TLS 1.2+) and at rest (AES-256)
- The school has assessed that the receiving jurisdictions provide adequate protection
- If Supabase project is configured for a specific region, ensure it is set to a jurisdiction with adequate data protection

---

## Document Control

| Field | Value |
|-------|-------|
| Document Owner | Data Protection Officer |
| Version | 1.0 |
| Last Reviewed | _[Date]_ |
| Next Review | _[Date + 1 year]_ |
| Approved By | _[School Principal / Administrator]_ |
