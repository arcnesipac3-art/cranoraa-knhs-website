# Disaster Recovery Plan — KNHS PRISM Portal

## Overview

The KNHS PRISM Portal is a School Information System (SIS) for Kiwalan National High School. It manages student enrollment, grades, attendance, teacher records, announcements, and school communications.

**Architecture:**

| Component | Service |
|-----------|---------|
| Frontend | Vercel (React + Vite) |
| Backend | Render (Django REST Framework) |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Cache | Render Redis |
| DNS | Registrar-managed |

This document defines the procedures to recover the system in the event of data loss, service outage, or disaster.

---

## RTO / RPO Targets

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | **4 hours** | Maximum acceptable downtime before service is restored |
| **RPO** (Recovery Point Objective) | **24 hours** | Maximum acceptable data loss measured in time |

---

## Backup Strategy

### Database (PostgreSQL on Supabase)

- **Automated backups:** Supabase provides daily automated backups with point-in-time recovery (PITR) on Pro plans.
- **Manual backup command:**
  ```bash
  python manage.py db_backup
  ```
  Run this before any major deployment or schema change. Backups are stored in `backend/backups/`.
- **Export command (full dump):**
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```
- **Retention:** Keep the last 30 daily backups. Archive monthly backups for 1 year.

### Source Code (GitHub)

- The Git repository on GitHub is the source of truth for all application code.
- **Remote repositories:**
  - Origin: `https://github.com/<org>/cranoraa-knhs-website.git`
- Ensure at least two maintainers have push access.
- Enable branch protection on `main` — require PR reviews and status checks.

### Files (Supabase Storage)

- Profile pictures, assignment files, and student submissions are stored in Supabase Storage buckets.
- **Bucket:** `profile-pictures` (configured via `SUPABASE_STORAGE_BUCKET`).
- Supabase Storage includes built-in versioning and soft-delete within retention windows.
- For critical exports, use the Supabase CLI:
  ```bash
  supabase storage download --bucket profile-pictures ./storage-backup/
  ```

### Configuration

- All environment variables are documented in `backend/render.yaml`.
- Sensitive values (API keys, database URLs) are stored in Render environment variables — never committed to Git.
- **Recovery reference:** Keep an encrypted copy of production env vars in a secure vault (e.g., 1Password, Bitwarden).

---

## Recovery Procedures

### 1. Database Restore from Backup

**Scenario:** Data corruption, accidental deletion, or database failure.

1. Identify the last known good backup:
   - Supabase Dashboard → Database → Backups → Select restore point
2. For manual restore:
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD.sql
   ```
3. Run migrations to ensure schema consistency:
   ```bash
   python manage.py migrate --no-input
   ```
4. Verify data integrity by checking critical records (student count, grade entries).
5. Restart the backend service on Render (automatic on deploy).

**Expected time:** 30–60 minutes.

### 2. Full Redeployment from Git

**Scenario:** Complete infrastructure failure, Render service deletion, or corrupted deployment.

1. Clone the repository:
   ```bash
   git clone https://github.com/<org>/cranoraa-knhs-website.git
   cd cranoraa-knhs-website
   ```
2. Deploy backend to Render:
   - Connect the GitHub repo to Render via the dashboard.
   - Set all environment variables from the encrypted vault (reference `backend/render.yaml`).
   - Render will auto-deploy on push to `main`.
3. Deploy frontend to Vercel:
   - Connect the GitHub repo to Vercel.
   - Set environment variables (API base URL).
   - Vercel will auto-deploy on push to `main`.
4. Run database migrations:
   ```bash
   python manage.py migrate --no-input
   ```
5. Verify the deployment at the production URL.

**Expected time:** 1–2 hours.

### 3. Supabase File Recovery

**Scenario:** Accidental file deletion or bucket corruption.

1. Check Supabase Storage dashboard for soft-deleted files (within retention window).
2. For hard-deleted files, restore from the most recent storage export.
3. Re-upload files to the appropriate bucket using the Supabase CLI or dashboard.
4. Verify file references in the database (profile picture URLs, assignment links).

**Expected time:** 1–2 hours (depends on data volume).

### 4. DNS and SSL Recovery

**Scenario:** DNS misconfiguration or SSL certificate expiry.

1. **DNS:** Log in to the domain registrar and reconfigure DNS records:
   - Frontend: CNAME → `cname.vercel-dns.com`
   - Backend: CNAME → `knhs-backend.onrender.com`
2. **SSL:** Both Vercel and Render auto-provision and renew SSL certificates via Let's Encrypt.
   - If expired, trigger a manual renewal or redeploy the service.
3. Verify with:
   ```bash
   curl -I https://<domain>
   ```

**Expected time:** 15–30 minutes (DNS propagation may take up to 48 hours).

---

## Incident Response Steps

### Data Breach

1. **Contain:** Immediately rotate all API keys, database credentials, and JWT secret.
2. **Assess:** Determine what data was accessed and which records are affected.
3. **Notify:** Report to the National Privacy Commission (NPC) within 72 hours if personal data of ≥500 individuals is compromised. Notify affected data subjects without undue delay.
4. **Document:** Record the incident, root cause, and remediation steps.
5. **Remediate:** Patch the vulnerability, deploy the fix, and monitor for recurrence.

### System Outage

1. **Identify:** Check Render, Vercel, and Supabase status dashboards.
2. **Classify:** Determine if the outage is infrastructure-level (provider issue) or application-level (code issue).
3. **Communicate:** Notify school staff via email or group chat.
4. **Restore:** Follow the appropriate recovery procedure (Database Restore, Full Redeployment, etc.).
5. **Post-mortem:** Document the incident and update this plan if needed.

### Ransomware / Malicious Attack

1. **Isolate:** Take the affected service offline immediately.
2. **Preserve:** Do not delete logs or data — preserve evidence.
3. **Assess:** Determine the scope of compromise.
4. **Restore:** Deploy from the last clean Git commit and restore the database from backup.
5. **Report:** Notify law enforcement and the NPC as required.
6. **Harden:** Rotate all credentials, review access logs, and implement additional security controls.

---

## Contact Information

| Role | Name | Email | Phone |
|------|------|-------|-------|
| System Administrator | _[Name]_ | _[email]_ | _[phone]_ |
| IT Support | _[Name]_ | _[email]_ | _[phone]_ |
| School Principal | _[Name]_ | _[email]_ | _[phone]_ |
| Data Protection Officer | _[Name]_ | _[email]_ | _[phone]_ |
| DepEd Division Office | _[Name]_ | _[email]_ | _[phone]_ |

---

## Testing Schedule

| Quarter | Drill Type | Scope | Responsible |
|---------|-----------|-------|-------------|
| Q1 (Jan–Mar) | Tabletop exercise | Incident response walkthrough | System Admin |
| Q2 (Apr–Jun) | Backup restoration test | Database restore from backup | IT Support |
| Q3 (Jul–Sep) | Full DR simulation | Complete system rebuild from Git | System Admin + IT |
| Q4 (Oct–Dec) | Security review | Access audit, credential rotation | DPO + System Admin |

**Documentation:** Record all drill results in `docs/dr-drill-logs/` with date, participants, outcome, and lessons learned.

---

## Data Classification

| Classification | Examples | Handling |
|---------------|----------|----------|
| **Public** | School name, announcements, course catalog | No restrictions |
| **Internal** | Staff directories, internal memos | Access limited to school staff |
| **Confidential** | Grades, attendance records, teacher evaluations | Role-based access only |
| **Restricted** | Student PII (LRN, name, address, parent info), health records | Encrypted at rest, access logged, minimal retention |

All personal data is treated as **Confidential** or **Restricted** under RA 10173 (Data Privacy Act of 2012).
