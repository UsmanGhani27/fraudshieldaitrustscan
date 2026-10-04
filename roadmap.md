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
- [ ] Account self-deletion (not offered; needs product decision)
