# FraudShield AI roadmap

## Phase 1 — MVP build
- [x] Schema + RLS, auth, provider layer, analyzer, results, history, reports, settings, pricing, demo examples
- [x] Build check + end-to-end verification

## Phase 2 — Refinement brief
- [x] Sidebar: add Alerts + Help; mobile bottom nav
- [x] Public FAQ page; hero supporting copy update
- [x] Analyzer: email fields (reply-to, subject, attachments), message context, clear/reset, staged loading
- [x] URL deterministic analysis (lookalike, punycode, paths) server-side
- [x] Risk engine: blend heuristics + model + evidence quality
- [x] Extended AI schema: primary/secondary threat, tactics, do_not_do, sender/url analysis, verification status
- [x] Result: identity verification status, What NOT to do, technical details collapsed
- [x] Alerts center (high/critical, 80% usage, system notices)
- [x] Evidence vault (view/delete screenshots)
- [x] Pricing update (new tiers, history days, Join Early Access)
- [x] Dashboard: critical count, reports, remaining, category breakdown
- [x] History sort
- [x] QA pass + security linter

## Phase 3 — Second QA pass
- [x] Signed-in E2E (all 5 analyzers, report, deletion, delete-all, limit, sign-out)
- [x] Column-level grants (plan/limit/results not editable from browser), least-privilege table grants
- [x] Prompt-delimiter injection guard; drop advice reusing contact details from content
- [x] Retention enforced on app visit; history-off titles generic; privacy copy matches storage
- [x] Mobile dashboard overflow; clearer link findings; dedupe signals
- [x] Account self-deletion (typed-email confirm, full data + sign-in removal, usage carry-over)

## Phase 4 — Third targeted pass
- [x] Atomic usage reservation (DB-serialized; released on failure)
- [x] Report print/PDF polish (A4, page breaks, risk chip, header/footer)
- [x] Hourly scheduled retention cleanup + image deletion queue
- [x] Auth UX: return path, forgot/reset password, resend confirmation, clearer errors
- [x] Demo results labelled synthetic
- [x] Visual scan of all pages desktop + mobile; security re-checks

## Phase 5 — Honesty / cleanup only
- [ ] Check hosted Google settings and honest sign-in presentation
- [ ] Audit fallback/image refusal and product claims; fix real issues
- [ ] Run regression tests, route smoke and source scans; review harness checks
- [ ] Report evidence and blockers; stop in preview awaiting restored-credit verification
