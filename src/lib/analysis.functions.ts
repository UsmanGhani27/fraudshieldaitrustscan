import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH, MIN_TEXT_LENGTH, RATE_LIMIT_PER_MINUTE,
  PLAN_HISTORY_DAYS, USAGE_WARN_RATIO, analyzerAllowed, INPUT_LABEL, RISK_LABEL, type PlanCode,
} from "./risk";
import { normalizeText, redactSecrets, validateUrl } from "./validation";

export type AnalyzeErrorCode = "LIMIT_REACHED" | "RATE_LIMITED" | "INVALID_INPUT" | "INVALID_URL" | "UPLOAD_INVALID" | "PLAN_LOCKED" | "SERVER_ERROR";
export type AnalyzeResult = { ok: true; id: string; usedFallback: boolean } | { ok: false; code: AnalyzeErrorCode; message: string };

const opt = (max: number) => z.string().max(max).optional();
const inputSchema = z.object({
  type: z.enum(["message", "email", "url", "screenshot", "qr"]),
  text: opt(MAX_TEXT_LENGTH * 2),
  sender: opt(300),
  replyTo: opt(300),
  subject: opt(300),
  attachments: opt(500),
  claimedBrand: opt(120),
  context: opt(500),
  url: opt(2048),
  image: z.object({ mime: z.string().max(40), base64: z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16) }).optional(),
});

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const clean = (v: string | undefined, max: number) => (v ? redactSecrets(normalizeText(v)).slice(0, max) || undefined : undefined);

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: events }] = await Promise.all([
      supabase.from("profiles").select("plan_code, monthly_analysis_limit").eq("id", userId).maybeSingle(),
      supabase.from("usage_events").select("units").eq("user_id", userId).eq("event_type", "analysis").gte("created_at", monthStart()),
    ]);
    const used = (events ?? []).reduce((s, e) => s + (e.units ?? 1), 0);
    // Enforce retention on every app visit too, so it isn't only applied when a new analysis runs.
    try {
      const { data: prefs } = await supabase.from("data_preferences").select("retention_days").eq("user_id", userId).maybeSingle();
      const days = [prefs?.retention_days ?? null, PLAN_HISTORY_DAYS[(profile?.plan_code ?? "free") as PlanCode]].filter((x): x is number => typeof x === "number");
      if (days.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await purgeOlderThan(supabaseAdmin, userId, Math.min(...days));
      }
    } catch { console.warn("[retention] purge skipped"); }
    return { plan: (profile?.plan_code ?? "free") as PlanCode, limit: profile?.monthly_analysis_limit ?? 10, used };
  });

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<AnalyzeResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runProviderChain } = await import("./providers/index.server");
    const { assess } = await import("./engine/risk-engine");
    const { ANALYSIS_VERSION } = await import("./providers/prompt");

    let reservationId: string | null = null;
    const release = async () => {
      if (reservationId) await supabaseAdmin.from("usage_events").delete().eq("id", reservationId).is("analysis_id", null);
      reservationId = null;
    };
    try {
      // --- server-side abuse + quota checks (never trusts client state) ---
      const since = new Date(Date.now() - 60_000).toISOString();
      const [{ count: recent }, { data: profile }, { data: prefs }] = await Promise.all([
        supabaseAdmin.from("security_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "analysis_attempt").gte("created_at", since),
        supabaseAdmin.from("profiles").select("plan_code, monthly_analysis_limit").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("data_preferences").select("history_enabled, retention_days").eq("user_id", userId).maybeSingle(),
      ]);
      if ((recent ?? 0) >= RATE_LIMIT_PER_MINUTE) {
        await supabaseAdmin.from("security_events").insert({ user_id: userId, event_type: "rate_limited" });
        return { ok: false, code: "RATE_LIMITED", message: "You're analyzing quickly. Please wait a minute and try again." };
      }
      await supabaseAdmin.from("security_events").insert({ user_id: userId, event_type: "analysis_attempt", metadata_json: { type: data.type } });

      const plan = (profile?.plan_code ?? "free") as PlanCode;
      if (!analyzerAllowed(plan, data.type)) return { ok: false, code: "PLAN_LOCKED", message: `${INPUT_LABEL[data.type]} analysis isn't included in your plan.` };
      const historyEnabled = prefs?.history_enabled ?? true;

      // --- normalize & validate ---
      const sender = clean(data.sender, 300);
      const replyTo = clean(data.replyTo, 300);
      const subject = clean(data.subject, 300);
      const claimedBrand = clean(data.claimedBrand, 120);
      const ctx = clean(data.context, 500);
      const attachments = data.attachments ? data.attachments.split(/[,\n]/).map((a) => normalizeText(a).slice(0, 100)).filter(Boolean).slice(0, 10) : undefined;
      let text = "";
      let url: string | undefined;
      let image: { mime: string; base64: string } | undefined;

      if (data.type === "url" || (data.type === "qr" && data.url)) {
        const check = validateUrl(data.url ?? "");
        if (!check.ok) return { ok: false, code: "INVALID_URL", message: data.type === "qr" ? `The QR code doesn't contain a valid web link. ${check.reason}` : check.reason };
        url = check.url.toString();
        text = data.type === "qr" ? `QR code destination: ${url}` : url;
      } else if (data.type === "screenshot" || data.type === "qr") {
        if (!data.image || !(ALLOWED_IMAGE_MIME as readonly string[]).includes(data.image.mime)) return { ok: false, code: "UPLOAD_INVALID", message: "Please upload a PNG, JPG or WebP image." };
        if (Math.floor((data.image.base64.length * 3) / 4) > MAX_IMAGE_BYTES) return { ok: false, code: "UPLOAD_INVALID", message: "Image is larger than 4 MB." };
        image = data.image;
        text = data.type === "qr" ? "This image contains a QR code that could not be decoded on the device. Describe where it appears to lead, if visible." : "";
      } else {
        text = redactSecrets(normalizeText([subject ? `Subject: ${subject}` : "", data.text ?? ""].filter(Boolean).join("\n\n")));
        if ((data.text ?? "").trim().length < MIN_TEXT_LENGTH) return { ok: false, code: "INVALID_INPUT", message: "Please paste a bit more of the content to analyze." };
      }

      // --- atomic quota reservation: serialized per user in the database, so
      // simultaneous requests cannot exceed the monthly limit. Released on failure.
      const { data: resv, error: resvErr } = await supabaseAdmin.rpc("reserve_analysis_usage", { _user_id: userId });
      if (resvErr || !resv) throw new Error("reservation_failed");
      const r = resv as { ok: boolean; used: number; limit: number; reservation_id?: string };
      const limit = r.limit;
      const used = r.used;
      if (!r.ok) return { ok: false, code: "LIMIT_REACHED", message: `You've used all ${limit} analyses included this month.` };
      reservationId = r.reservation_id ?? null;

      // Deterministic pre-pass (shared with the model as context)
      const pre = assess({ type: data.type, text, sender, replyTo, claimedBrand, url }, null);
      const deterministicFindings = pre.signals.slice(0, 8).map((s) => `${s.title} (${s.evidence})`);
      const chain = await runProviderChain({ type: data.type, text, sender, replyTo, subject, attachments, claimedBrand, context: ctx, url, image, deterministicFindings });
      const a = chain.output ? assess({ type: data.type, text, sender, replyTo, claimedBrand, url }, chain.output) : pre;
      const usedFallback = !chain.output;

      const hash = await sha256(`${data.type}|${text}|${image ? image.base64.slice(0, 4096) : ""}`);
      let title = "";
      try { title = url ? new URL(url).hostname : ""; } catch { /* ignore */ }
      // With history off, avoid persisting content-derived titles (the first line could be sensitive).
      if (!historyEnabled) title = title || `${INPUT_LABEL[data.type]} analysis`;
      title = (title || subject || claimedBrand || a.claimed_identity || sender || (text.split("\n")[0] ?? "") || `${INPUT_LABEL[data.type]} analysis`).slice(0, 80);

      let screenshotPath: string | null = null;
      if (image && historyEnabled) {
        const ext = image.mime === "image/jpeg" ? "jpg" : image.mime.split("/")[1];
        screenshotPath = `${userId}/${crypto.randomUUID()}.${ext}`;
        const bin = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabaseAdmin.storage.from("screenshots").upload(screenshotPath, bin, { contentType: image.mime, upsert: false });
        if (upErr) { console.warn("[analysis] evidence store failed"); screenshotPath = null; }
      }

      const { data: row, error } = await supabaseAdmin
        .from("analyses")
        .insert({
          user_id: userId,
          input_type: data.type,
          title: redactSecrets(title),
          raw_input_text: historyEnabled && text && data.type !== "url" ? text : null,
          normalized_input_hash: hash,
          sender_label: sender ?? null,
          claimed_brand: claimedBrand ?? null,
          source_url: url ?? null,
          screenshot_storage_path: screenshotPath,
          risk_score: a.risk_score,
          risk_level: a.risk_level,
          confidence: a.confidence,
          summary: a.summary,
          claimed_identity: a.claimed_identity || null,
          observed_indicators: a.observed_indicators,
          uncertainty_notes: a.limitations,
          safe_to_proceed: a.safe_to_proceed,
          primary_threat: a.primary_threat,
          verification_status: a.verification.status,
          details: {
            tactics: a.tactics,
            suspicious_entities: a.suspicious_entities,
            verification: a.verification,
            url_analysis: a.url_analysis,
            do_not_do: a.do_not_do,
            scoring: a.scoring,
            signal_sources: a.signals.map((s) => s.source),
            reply_to: replyTo ?? null,
            subject: subject ?? null,
            attachments: attachments ?? [],
            sender_notes: chain.output?.sender_notes ?? "",
            url_notes: chain.output?.url_notes ?? "",
            ai_failure: chain.failure,
          },
          provider: chain.provider,
          model: chain.model,
          analysis_version: ANALYSIS_VERSION,
        })
        .select("id")
        .single();
      if (error || !row) throw new Error("persist_failed");
      const id = row.id;

      const newUsed = used + 1;
      const alerts: { user_id: string; kind: string; severity: string; title: string; body: string; analysis_id?: string }[] = [];
      if (a.risk_level === "high" || a.risk_level === "critical")
        alerts.push({ user_id: userId, kind: "high_risk", severity: a.risk_level, title: `${RISK_LABEL[a.risk_level]} risk detected`, body: `“${title}” was assessed as ${a.risk_level} risk. Review the safe next steps.`, analysis_id: id });
      if (used < Math.ceil(limit * USAGE_WARN_RATIO) && newUsed >= Math.ceil(limit * USAGE_WARN_RATIO) && newUsed < limit)
        alerts.push({ user_id: userId, kind: "usage", severity: "warning", title: "80% of monthly analyses used", body: `You've used ${newUsed} of ${limit} analyses this month.` });
      if (newUsed === limit) alerts.push({ user_id: userId, kind: "usage", severity: "warning", title: "Monthly limit reached", body: `You've used all ${limit} analyses. Your allowance resets at the start of next month.` });

      await Promise.all([
        a.threat_categories.length ? supabaseAdmin.from("analysis_categories").insert(a.threat_categories.map((category) => ({ analysis_id: id, category }))) : null,
        a.signals.length ? supabaseAdmin.from("analysis_signals").insert(a.signals.map((s) => ({ analysis_id: id, title: s.title, severity: s.severity, evidence: redactSecrets(s.evidence), explanation: s.explanation }))) : null,
        supabaseAdmin.from("analysis_actions").insert([
          ...a.recommended_actions.map((t, i) => ({ analysis_id: id, action_text: t, action_type: "recommended", sort_order: i })),
          ...a.do_not_do.map((t, i) => ({ analysis_id: id, action_text: t, action_type: "avoid", sort_order: 100 + i })),
        ]),
        a.verification_steps.length ? supabaseAdmin.from("verification_steps").insert(a.verification_steps.map((t, i) => ({ analysis_id: id, step_text: t, sort_order: i }))) : null,
        supabaseAdmin.from("usage_events").insert({ user_id: userId, event_type: "analysis", analysis_id: id, units: 1 }),
        alerts.length ? supabaseAdmin.from("alerts").insert(alerts) : null,
      ]);

      // Retention: user choice, capped by plan history window
      const planDays = PLAN_HISTORY_DAYS[plan];
      const days = [prefs?.retention_days ?? null, planDays].filter((x): x is number => typeof x === "number");
      if (days.length) await purgeOlderThan(supabaseAdmin, userId, Math.min(...days));

      return { ok: true, id, usedFallback };
    } catch (e) {
      console.error("[analysis] failure", e instanceof Error ? e.message : "unknown");
      return { ok: false, code: "SERVER_ERROR", message: "Something went wrong while analyzing. You weren't charged for this attempt — please try again." };
    }
  });

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
async function purgeOlderThan(admin: Admin, userId: string, days: number) {
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const { data: old } = await admin.from("analyses").select("id, screenshot_storage_path").eq("user_id", userId).lt("created_at", cutoff);
  if (!old?.length) return;
  const paths = old.map((o) => o.screenshot_storage_path).filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from("screenshots").remove(paths);
  await admin.from("analyses").delete().in("id", old.map((o) => o.id));
}

export const getEvidenceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ analysisId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS-scoped read proves ownership before signing.
    const { data: row } = await context.supabase.from("analyses").select("screenshot_storage_path").eq("id", data.analysisId).maybeSingle();
    if (!row?.screenshot_storage_path || !row.screenshot_storage_path.startsWith(`${context.userId}/`)) return { url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from("screenshots").createSignedUrl(row.screenshot_storage_path, 300);
    return { url: signed?.signedUrl ?? null };
  });

export const deleteEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ analysisId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("analyses").select("id, screenshot_storage_path").eq("id", data.analysisId).maybeSingle();
    if (!row) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (row.screenshot_storage_path?.startsWith(`${context.userId}/`)) await supabaseAdmin.storage.from("screenshots").remove([row.screenshot_storage_path]);
    await supabaseAdmin.from("analyses").update({ screenshot_storage_path: null, raw_input_text: null, evidence_deleted_at: new Date().toISOString() }).eq("id", row.id).eq("user_id", context.userId);
    await supabaseAdmin.from("security_events").insert({ user_id: context.userId, event_type: "evidence_deleted", metadata_json: { analysis_id: row.id } });
    return { ok: true };
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ analysisId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("analyses").select("id, screenshot_storage_path").eq("id", data.analysisId).maybeSingle();
    if (!row) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (row.screenshot_storage_path?.startsWith(`${context.userId}/`)) await supabaseAdmin.storage.from("screenshots").remove([row.screenshot_storage_path]);
    const { error } = await context.supabase.from("analyses").delete().eq("id", row.id);
    return { ok: !error };
  });

export const deleteAllData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await supabaseAdmin.storage.from("screenshots").list(userId, { limit: 1000 });
    if (files?.length) await supabaseAdmin.storage.from("screenshots").remove(files.map((f) => `${userId}/${f.name}`));
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("alerts").delete().eq("user_id", userId);
    const { error } = await supabase.from("analyses").delete().eq("user_id", userId);
    await supabaseAdmin.from("security_events").insert({ user_id: userId, event_type: "all_data_deleted" });
    return { ok: !error };
  });
