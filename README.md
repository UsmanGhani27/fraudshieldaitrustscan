# Fraudshieldaitrustscan

Build a production-minded hackathon MVP called "FraudShield AI" — an AI-powered scam, impersonation, phishing, and fraud analysis platform aligned to the ForgeHacks 2026 AI + Cybersecurity prompt.

IMPORTANT PRODUCT GOAL
FraudShield AI helps people recognize, verify, and respond safely to scams, impersonation, phishing, and fraud enabled by AI or modern technologies. It is NOT an antivirus, legal service, financial advisor, or guarantee of safety. Every automated result must clearly communicate uncertainty and encourage independent verification for high-impact decisions.

BUILD PRINCIPLES
- Use Lovable as the primary build platform.
- Use Lovable Cloud/Supabase for auth, PostgreSQL database, storage, and server-side/edge functions where appropriate.
- Do not make Featherless, Agentboxd, n8n, Momen, ProjectAAL, Adaption Labs, Tin, YouCam, or Kariaa mandatory runtime dependencies in this first build.
- Create clean provider abstraction points so those services can be integrated later without rewriting the core product.
- For the first working demo, use Lovable's available AI capabilities/server-side AI integration where supported; if an external AI key is required, create a secure server-side provider interface and a clearly labeled demo/fallback analyzer so the app remains functional without client-side secrets.
- Never expose API keys or provider credentials in frontend code.
- Do not claim an analysis is 100% accurate or that a message is definitively AI-generated.
- Make the app responsive, polished, fast, and demo-ready.

BRAND / VISUAL DIRECTION
- Product: FraudShield AI
- Tagline: "Understand suspicious messages. Verify what's real. Act safely."
- Visual style: premium cybersecurity SaaS, dark charcoal/navy base, subtle indigo/cyan security glow, clean cards, strong hierarchy, restrained gradients, no hacker/cliché visuals.
- Use accessible contrast, clear status colors, icons, and concise explanations.
- Make the UI feel trustworthy and professional rather than scary.
- Desktop-first dashboard but fully responsive on mobile.

CORE USER FLOWS
1) Visitor lands on marketing landing page.
2) Visitor can see product value, supported inputs, safety disclaimer, and pricing.
3) User signs up/logs in.
4) User reaches dashboard with protection overview and monthly usage.
5) User chooses one analyzer:
   - Message
   - Email
   - URL
   - Screenshot
   - QR (UI-ready; use safe placeholder/clear "coming soon" state if full QR decoding is not available yet)
6) User submits content.
7) System normalizes input and runs analysis.
8) System returns a structured threat assessment.
9) User sees:
   - Risk level: LOW / MEDIUM / HIGH / CRITICAL
   - Confidence percentage
   - Threat categories
   - "Why we flagged it" evidence
   - Detected signals
   - Claimed identity vs observed indicators
   - Recommended safe actions
   - Verification checklist
   - Clear uncertainty disclaimer
10) User can save the result, export a security report, or start a new analysis.
11) History stores prior analyses and can be searched/filtered.
12) Pricing/plan UI shows limits and locked Pro/Team capabilities without requiring live billing in this MVP.
13) Settings lets user manage profile, data retention, and account.

MVP SCREENS
A. Public:
- Landing
- How It Works
- Pricing
- Safety & Privacy
- Sign In
- Sign Up

B. Authenticated:
- Dashboard
- Analyze
- Analysis Result
- Analysis History
- Saved Reports
- Threat Detail
- Settings
- Billing/Plan (UI + usage, no live payment required)
- 404 / error state

DASHBOARD
Create:
- Protection Status card
- Monthly analyses used / limit
- Threats analyzed
- High/Critical findings
- Recent analyses
- Quick action buttons
- Small risk trend visualization based only on the user's stored analyses
- "Stay safe" educational tip
Do not fabricate statistics; show zero/empty states when data is absent.

ANALYZER UX
Create a unified Analyze screen with tabs or segmented controls:
- Message
- Email
- URL
- Screenshot
- QR
For message/email:
- large text input
- optional sender field
- optional claimed brand/service
For URL:
- URL input
For screenshot:
- secure upload component with file type and size validation, preview, remove/retry
For QR:
- show input/upload flow and clearly state the feature is in MVP-preview mode if actual QR decoding is not implemented.
Always show what data will be processed and remind users not to upload passwords, recovery codes, or highly sensitive secrets unless necessary.

THREAT ANALYSIS RESULT
The main result page should be visually excellent:
- Risk badge
- Confidence
- Summary
- Threat categories
- Why this was flagged
- Signal cards with severity
- Claimed identity / actual observed identity or domain where applicable
- Recommended next steps
- Verification checklist
- Save / export / analyze another actions
- "This is an automated assessment, not a guarantee of safety" notice

THREAT CATEGORIES
Support:
- Phishing
- Brand impersonation
- Account takeover
- Payment scam
- Fake support
- Job scam
- Investment scam
- Delivery scam
- Government impersonation
- QR phishing
- Malicious/suspicious attachment
- Social engineering
- Credential harvesting
- AI-manipulation indicators
Store categories as normalized enum-like values in the database.

RISK MODEL
Use a transparent scoring model:
- risk_score: 0-100
- risk_level: low | medium | high | critical
- confidence: 0-100
Do NOT imply that the score is mathematically perfect. It is an AI-assisted assessment.
Suggested level mapping:
0-24 LOW
25-49 MEDIUM
50-74 HIGH
75-100 CRITICAL
Allow the backend/provider layer to return a score and reasons; keep mapping centralized so it can be changed later.

AI RESPONSE SCHEMA
Return strictly structured JSON internally:
{
  "risk_score": 0,
  "risk_level": "low|medium|high|critical",
  "confidence": 0,
  "summary": "",
  "threat_categories": [],
  "claimed_identity": "",
  "observed_indicators": [],
  "signals": [
    {
      "title": "",
      "severity": "low|medium|high",
      "evidence": "",
      "explanation": ""
    }
  ],
  "recommended_actions": [],
  "verification_steps": [],
  "uncertainty_notes": [],
  "safe_to_proceed": false,
  "provider": "",
  "model": "",
  "analysis_version": ""
}
Validate and sanitize provider output before persisting or rendering it. Never render arbitrary HTML from model output. Escape user-generated content.

DATABASE
Create a normalized schema suitable for a real SaaS MVP:

1. profiles
- id (uuid, references auth user)
- full_name
- avatar_url
- plan_code (free|personal|pro|team)
- monthly_analysis_limit
- created_at
- updated_at

2. analyses
- id
- user_id
- input_type (message|email|url|screenshot|qr)
- title
- raw_input_text (nullable; only store when user has not opted out of history)
- normalized_input_hash (for safe duplicate detection without storing plaintext when possible)
- source_name / sender_label (nullable)
- claimed_brand (nullable)
- source_url (nullable)
- screenshot_storage_path (nullable)
- risk_score
- risk_level
- confidence
- summary
- safe_to_proceed
- provider
- model
- analysis_version
- created_at
- updated_at

3. analysis_categories
- id
- analysis_id
- category
- created_at

4. analysis_signals
- id
- analysis_id
- title
- severity
- evidence
- explanation
- created_at

5. analysis_actions
- id
- analysis_id
- action_text
- action_type
- sort_order
- created_at

6. verification_steps
- id
- analysis_id
- step_text
- sort_order
- created_at

7. reports
- id
- user_id
- analysis_id
- report_title
- generated_at
- storage_path (nullable)

8. usage_events
- id
- user_id
- event_type
- analysis_id (nullable)
- units
- created_at

9. subscriptions (billing-ready, no live checkout required in MVP)
- id
- user_id
- plan_code
- status
- provider_customer_id (nullable)
- provider_subscription_id (nullable)
- current_period_start
- current_period_end
- created_at
- updated_at

10. data_preferences
- id
- user_id
- history_enabled
- retention_days (null means indefinite until manual deletion)
- created_at
- updated_at

11. security_events
- id
- user_id (nullable)
- event_type
- metadata_json
- created_at
Only store minimal metadata. Never store passwords, auth tokens, full secrets, or raw payment details.

ROW LEVEL SECURITY / SECURITY
- Every user-owned table must use RLS.
- Users can only read/write their own profiles, analyses, categories, signals, actions, verification steps, reports, usage events, subscriptions, preferences, and security events.
- Never trust plan_code or limits from the client. Enforce usage limits server-side.
- Use server-side functions for analysis execution and any external provider calls.
- Rate-limit analysis requests.
- Validate URLs and upload MIME types/size before processing.
- Never log raw user message/screenshot contents in server logs.
- Do not expose internal provider errors to users; show safe user-facing error messages and log non-sensitive diagnostic data.
- Add account/session-safe error states.
- Include delete-all-data action that removes user-owned analysis/history/report data where technically supported.
- Treat model output as untrusted input.
- Include a visible privacy/safety disclaimer.

PLAN / PRICING UI
Create pricing page with:
FREE — $0/month
- 10 analyses/month
- Message + URL analysis
- Basic history
- Basic risk report

PERSONAL — $4.99/month
- 150 analyses/month
- All MVP analyzers including screenshot
- Full history
- Exportable reports
- Advanced explanations

PRO — $9.99/month
- 500 analyses/month
- Advanced analysis
- Priority processing
- Extended reports
- Risk analytics
- Future integrations/agent features

TEAM — $29/month
- Up to 5 users
- 2,000 analyses/month
- Team dashboard
- Shared reports
- Admin controls
- Future email-agent integrations

BUSINESS — Custom
- Larger usage
- SSO / organization controls
- API/integrations
- Custom retention and support

Pricing UI should clearly say plans are proposed/preview for the hackathon MVP if live billing is not enabled. Do not collect payment information.

USAGE SYSTEM
- Free users default to 10 analyses/month.
- Personal 150, Pro 500, Team 2,000.
- Before starting an analysis, check the user's server-side monthly usage.
- Show usage progress in dashboard and near Analyze action.
- On limit reached, show clear upgrade CTA and safe graceful block.
- Usage must not be bypassable by editing frontend state.

REPORT
Create a downloadable/printable security report layout:
- FraudShield AI branding
- Analysis ID
- Input type
- Date/time
- Risk level and score
- Confidence
- Summary
- Threat categories
- Signals/evidence
- Recommended actions
- Verification steps
- Uncertainty/safety note
Do not include secrets such as password-like text in exported reports.

LANDING PAGE COPY
Hero:
"Understand suspicious messages. Verify what's real. Act safely."
Subheadline:
"FraudShield AI helps you analyze suspicious messages, emails, links, and screenshots for phishing, impersonation, and fraud signals — with clear explanations and safer next steps."
Primary CTA: "Analyze Something"
Secondary CTA: "See How It Works"
Include sections:
- One place to check suspicious content
- Explainable AI
- Verify before you trust
- Privacy-first controls
- How it works (Input → Analyze → Explain → Verify → Act)
- Example threat report
- Pricing
- Safety disclaimer
Do not claim perfect detection or guaranteed protection.

NAVIGATION
Public nav: Product, How it Works, Safety, Pricing, Sign In
Authenticated sidebar: Dashboard, Analyze, History, Reports, Settings
Top bar: usage indicator, profile menu

EMPTY / LOADING / ERROR STATES
Design polished states for:
- no analyses yet
- first analysis processing
- AI unavailable
- upload failed
- invalid URL
- limit reached
- deleted item
- session expired

DEMO DATA
Provide a safe, clearly labeled "Load Demo Example" option using synthetic examples only. Never use real people's private messages or credentials. Demo examples should include:
1) fake delivery refund scam
2) fake bank verification phishing
3) brand impersonation email
4) suspicious job offer
Use synthetic text.

FUTURE-INTEGRATION ARCHITECTURE
Create a provider abstraction layer/interfaces so later we can connect:
- Featherless AI as alternate/advanced model provider
- Agentboxd for monitored AI-agent email inboxes
- n8n for automated workflows
These should be disabled/not required in the initial MVP.
Add a simple internal settings/admin-safe placeholder indicating integrations are "Planned / Optional" rather than pretending they are connected.

TECHNICAL QUALITY
- TypeScript
- React
- Tailwind
- shadcn/ui where appropriate
- Reusable components
- Clean route structure
- Server-side validation
- Accessible labels and keyboard navigation
- Mobile responsive
- No fake backend calls
- No hardcoded secrets
- No broken buttons
- Use real database persistence for auth/history/usage
- Add basic unit-level validation helpers where useful
- Keep architecture maintainable for future Stripe/Gmail/Outlook/browser-extension integration

HACKATHON ALIGNMENT
Optimize the MVP around ForgeHacks AI + Cybersecurity:
"Build an AI-powered solution that helps people recognize, prevent, verify, or respond to scams, impersonation, and fraud enabled by AI or modern technologies."
The final build should visibly demonstrate:
- real user problem
- meaningful AI usage
- explainability
- working end-to-end flow
- polished UX
- clear future extensibility
Do not add unrelated features just to increase feature count.

FIRST BUILD PRIORITY
Implement the complete MVP end-to-end now:
1. app shell + routing
2. auth
3. database/schema + RLS
4. dashboard
5. unified Analyze page
6. server-side analysis/provider abstraction
7. structured threat result
8. history
9. report view/export
10. settings/privacy controls
11. pricing/plan UI
12. demo examples
13. responsive polish
14. clear security/error/empty states

After the initial build, run a self-review for broken flows, missing persistence, client-side secret exposure, RLS gaps, and inconsistent UI. Fix obvious issues before considering the build complete.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fraudshieldaitrustscan.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb87e498-d6fa-47f0-926d-59d0fa51efed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
