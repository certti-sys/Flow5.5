# Testing

## Current Testing Strategy
- **Manual QA**: Main method of verification.
- **Unit Tests**: Minimal or missing (needs audit).
- **Integration Tests**: Minimal or missing (needs audit).
- **Browser Testing**: Performed via Agent Browser for automated UX checks.

## Proposed GSD Testing Loop
- **Dry Runs**: Before any major SQL or Edge Function change.
- **UAT (User Acceptance Testing)**: Guided sessions with the user to verify functionality.
- **Health Checks**: Regular execution of `gsd-health` for environment integrity.

---
# Concerns

## 🔴 CRITICAL: "Don't Destroy Anything"
- **Project Identity**: The project is already in production/active development.
- **Data Integrity**: Avoid `TRUNCATE` or `DELETE` without explicit user confirmation of backup.
- **Downtime**: Minimize service disruption when updating Edge Functions.

## 🔴 SECURITY VULNERABILITIES (Audited)
- **Sensitive Logs**: Edge Functions are logging payload/headers (PII leak).
- **CORS**: Excessively permissive (`*`).
- **Input Validation**: Missing Zod schemas in some ingest points.
- **Token Security**: JWTs stored in `localStorage` are vulnerable to XSS.
- **Git Exposure**: History contains `.env` secrets (requires filter-branch and key rotation).

## 🟡 LOGIC CONCERNS
- **Webhook ID Collision**: Need robust handling for duplicate ingestions.
- **Payment Lifecycle**: Ensure idempotency in payment-to-access logic.
- **RLS Leakage**: Validate all tables for missing Row Level Security policies.

## 🟢 GUIDANCE FOR AGENTS
- **Backup Before Edit**: Create backups of files/SQL if the change is risky.
- **Phase Validation**: Never advance to Phase 2 if Phase 1 has outstanding security tasks.
