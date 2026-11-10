# Legacy Files Reorganization - Design Specification

**Date:** 2026-05-01  
**Project:** Neo Vidya Stream (Flow5)  
**Status:** Approved

---

## 1. Overview

This specification defines the reorganization of legacy files, documentation, and configuration directories in the Neo Vidya Stream project. The goal is to clean up the root directory while preserving all historical documentation and configurations in an organized, accessible structure.

---

## 2. Problem Statement

The project root contains multiple legacy items:
- Analysis documentation from different sessions (`.agent`, `.claude`)
- Configuration directories for various AI tools (`.codex`, `.gemini`, `.kilo`, `.kiro`, `.opencode`, `.planning`)
- Old documentation (`DocS`, `FlowMembers-Evolution-Package`)
- Loose SQL and JSON files (`APLICAR-MIGRATION.sql`, `TESTAR-CUPOM.sql`, `deploy_payload.json`)
- Backup directories
- Test scripts mixed with operational scripts

This creates clutter and makes it difficult to distinguish between active project files and historical/legacy content.

---

## 3. Design Goals

1. **Clarity**: Clear separation between active project files and legacy content
2. **Accessibility**: Legacy content remains accessible without extraction/decompression
3. **Organization**: Logical categorization by content type
4. **Preservation**: No data loss - all files are moved, not deleted
5. **Git Safety**: All moves tracked in git history

---

## 4. Target Structure

```
Legado/
├── documentacao-analises/
│   ├── .agent/                 # Agent analysis (April 2026)
│   ├── .claude/                # Claude documentation (May 2026)
│   └── FlowMembers-Evolution-Package/  # Evolution package
├── ferramentas-ai/
│   ├── .codex/                 # Codex AI tool config
│   ├── .gemini/                # Gemini AI tool config
│   ├── .kilo/                  # Kilo AI tool config
│   ├── .kiro/                  # Kiro AI tool config
│   ├── .opencode/              # OpenCode AI tool config
│   └── .planning/              # Planning tool config
├── documentacao-antiga/
│   └── DocS/                   # Old project documentation
├── backups/
│   └── backup-20260418-191316/ # System backups
├── scripts-teste/
│   ├── diagnostico-pix-qrcode.mjs
│   ├── test-checkout-form-schema.mjs
│   ├── test-payment-ops-mercadopago-token.mjs
│   ├── test-payment-ops-pix-boleto.mjs
│   ├── test-payment-ops-schema.mjs
│   └── test-validate-coupon-cors.mjs
└── arquivos-soltos/
    ├── APLICAR-MIGRATION.sql
    ├── TESTAR-CUPOM.sql
    ├── deploy_payload.json
    └── skills-lock.json
```

---

## 5. Files Remaining in Root

### Configuration Files
- `package.json`, `package-lock.json` - Project dependencies
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - TypeScript config
- `vite.config.ts` - Vite bundler config
- `tailwind.config.ts` - Tailwind CSS config
- `components.json` - shadcn/ui components config
- `eslint.config.js` - ESLint config
- `postcss.config.js` - PostCSS config
- `vercel.json` - Vercel deployment config

### Environment & Git
- `.env`, `.env.example` - Environment variables
- `.gitignore` - Git ignore rules

### Entry Point
- `index.html` - Application entry point

---

## 6. Directories Remaining in Root

### Active Project Directories
- `src/` - Source code
- `public/` - Public assets
- `supabase/` - Supabase configuration and functions
- `scripts/` - Operational scripts (backup, deploy, monitor, rollback)
- `dist/` - Build output
- `node_modules/` - Dependencies
- `.git/` - Git repository
- `.agents/` - Active agent skills (kept for current use)
- `docs/` - Active documentation (including this spec)

---

## 7. Migration Strategy

### Phase 1: Create Structure
1. Create `Legado/` directory
2. Create all subdirectories

### Phase 2: Move Files
1. Move analysis documentation directories
2. Move AI tool configuration directories
3. Move old documentation
4. Move backups
5. Move test scripts
6. Move loose files

### Phase 3: Create Index
1. Create `Legado/README.md` with index of all moved content
2. Include original locations and move dates

### Phase 4: Git Commit
1. Stage all moves
2. Commit with descriptive message
3. Verify git history preserves file history

---

## 8. Scripts Directory Handling

The `scripts/` directory contains both operational and test scripts:

**Keep in scripts/ (operational):**
- `backup-complete.sh` - Production backup script
- `monitor-deploy.sh` - Deployment monitoring
- `pre-deploy-check.sh` - Pre-deployment validation
- `rollback-emergency.sh` - Emergency rollback
- `README.md` - Scripts documentation

**Move to Legado/scripts-teste/ (test/diagnostic):**
- `diagnostico-pix-qrcode.mjs` - Pix QR code diagnostic
- `test-checkout-form-schema.mjs` - Checkout form test
- `test-payment-ops-mercadopago-token.mjs` - Payment token test
- `test-payment-ops-pix-boleto.mjs` - Pix/Boleto test
- `test-payment-ops-schema.mjs` - Payment schema test
- `test-validate-coupon-cors.mjs` - Coupon CORS test

---

## 9. README.md Content

The `Legado/README.md` will include:
- Purpose of the Legado directory
- Index of all subdirectories with descriptions
- Original locations of moved files
- Date of reorganization
- Instructions for accessing content

---

## 10. Success Criteria

1. ✅ Root directory contains only active project files
2. ✅ All legacy content preserved in organized structure
3. ✅ Git history intact (moves tracked, not delete+add)
4. ✅ README.md provides clear index
5. ✅ No broken references in active code
6. ✅ `.gitignore` updated if needed

---

## 11. Risks & Mitigations

### Risk: Breaking references
**Mitigation:** Verify no active code references moved directories

### Risk: Git history loss
**Mitigation:** Use `git mv` for all moves to preserve history

### Risk: Accidental deletion
**Mitigation:** Move only, never delete. Verify all files present after move.

---

## 12. Post-Migration Tasks

1. Update `.gitignore` to include `Legado/` if desired
2. Verify build still works (`npm run build`)
3. Verify dev server still works (`npm run dev`)
4. Check for any broken imports in code

---

## 13. Rollback Plan

If issues arise:
1. `git reset --hard HEAD~1` to undo commit
2. All files return to original locations
3. No data loss due to git tracking

---

## 14. Timeline

**Estimated Duration:** 15-20 minutes
- Structure creation: 2 min
- File moves: 8-10 min
- README creation: 3-5 min
- Git commit: 2 min
- Verification: 3-5 min
