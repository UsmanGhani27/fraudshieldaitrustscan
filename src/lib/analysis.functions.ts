import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH, RATE_LIMIT_PER_MINUTE } from "./risk";
import { normalizeText, redactSecrets, validateUrl } from "./validation";

export type AnalyzeResult =
  | { ok: true; id: string; usedFallback: boolean }
  | { ok: false; code: "LIMIT_REACHED" | "RATE_LIMITED" | "INVALID_INPUT" | "INVALID_URL" | "UPLOAD_INVALID" | "AI_UNAVAILABLE" | "SERVER_ERROR"; message: string };

const inputSchema = z.object({
  type: z.enum(["message", "email", "url", "screenshot", "qr"]),
  text: z.string().max(MAX_TEXT_LENGTH * 2).optional(),
  sender: z.string().max(200).optional(),
  claimedBrand: z.string().max(100).optional(),
  url: z.string().max(2048).optional(),
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

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: events }] = await Promise.all([
      supabase.from("profiles").select("plan_code, monthly_analysis_limit").eq("id", userId).maybeSingle(),
      supabase.from("usage_events").select("units").eq("user_id", userId).eq("event_type", "analysis").gte("created_at", monthStart()),
    ]);
    const used = (events ?? []).reduce((s, e) => s + (e.units ?? 1), 0);
    return { plan: profile?.plan_code ?? "free", limit: profile?.monthly_analysis_limit ?? 10, used };
  });

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<AnalyzeResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runProviderChain } = await import("./providers/index.server");

    try {
      // --- server-side rate limit + monthly usage (never trusts the client) ---
      const since = new Date(Date.now() - 60_000).toISOString();
      const [{ count: recent }, { data: profile }, { data: monthEvents }, { data: prefs }] = await Promise.all([
        supabaseAdmin.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
        supabaseAdmin.from("profiles").select("monthly_analysis_limit").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("usage_events").select("units").eq("user_id", userId).eq("event_type", "analysis").gte("created_at", monthStart()),
        supabaseAdmin.from("data_preferences").select("history_enabled, retention_days").eq("user_id", userId).maybeSingle(),
      ]);
      if ((recent ?? 0) >= RATE_LIMIT_PER_MINUTE) {
        return { ok: false, code: "RATE_LIMITED", message: "You're analyzing quickly. Please wait a minute and try again." };
      }
      const limit = profile?.monthly_analysis_limit ?? 10;
      const used = (monthEvents ?? []).reduce((s, e) => s + (e.units ?? 1), 0);
      if (used >= limit) {
        return { ok: false, code: "LIMIT_REACHED", message: `You've used all ${limit} analyses for this month.` };
      }
      const historyEnabled = prefs?.history_enabled ?? true;

      // --- normalize & validate input ---
      const sender = data.sender ? normalizeText(data.sender).slice(0, 200) : undefined;
      const claimedBrand = data.claimedBrand ? normalizeText(data.claimedBrand).slice(0, 100) : undefined;
      let text = "";
      let url: string | undefined;
      let image: { mime: string; base64: string } | undefined;

      if (data.type === "url") {
        const check = validateUrl(data.url ?? "");
        if (!check.ok) return { ok: false, code: "INVALID_URL", message: check.reason };
        url = check.url.toString();
        text = url;
      } else if (data.type === "screenshot" || data.type === "qr") {
        if (!data.image || !(ALLOWED_IMAGE_MIME as readonly string[]).includes(data.image.mime)) {
          return { ok: false, code: "UPLOAD_INVALID", message: "Please upload a PNG, JPG or WebP image." };
        }
        const bytes = Math.floor((data.image.base64.length * 3) / 4);
        if (bytes > MAX_IMAGE_BYTES) return { ok: false, code: "UPLOAD_INVALID", message: "Image is larger than 4 MB." };
        image = data.image;
        text = data.text ? redactSecrets(normalizeText(data.text)) : "";
        if (data.type === "qr") text = `This image contains a QR code. Read where it points (if visible), and assess QR phishing risk. ${text}`.trim();
      } else {
        text = redactSecrets(normalizeText(data.text ?? ""));
        if (text.length < 8) return { ok: false, code: "INVALID_INPUT", message: "Please paste a bit more of the content to analyze." };
      }

      const result = await runProviderChain({ type: data.type, text, sender, claimedBrand, url, image });
      if (!result) return { ok: false, code: "AI_UNAVAILABLE", message: "Analysis is temporarily unavailable. Please try again shortly." };
      const a = result.assessment;

      const hash = await sha256(`${data.type}|${text}|${image ? image.base64.slice(0, 2048) : ""}`);
      const title = (data.type === "url" ? new URL(url!).hostname : claimedBrand || sender || a.claimed_identity || (text.split("\n")[0] ?? "")).slice(0, 80) || `${data.type} analysis`;

      let screenshotPath: string | null = null;
      if (image && historyEnabled) {
        const ext = image.mime.split("/")[1];
        screenshotPath = `${userId}/${crypto.randomUUID()}.${ext}`;
        const bin = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabaseAdmin.storage.from("screenshots").upload(screenshotPath, bin, { contentType: image.mime });
        if (upErr) { console.warn("[analysis] screenshot store failed"); screenshotPath = null; }
      }

      const { data: row, error } = await supabaseAdmin
        .from("analyses")
        .insert({
          user_id: userId,
          input_type: data.type,
          title,
          raw_input_text: historyEnabled && data.type !== "url" && text ? text : null,
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
          uncertainty_notes: a.uncertainty_notes,
          safe_to_proceed: a.safe_to_proceed,
          provider: a.provider,
          model: a.model,
          analysis_version: a.analysis_version,
        })
        .select("id")
        .single();
      if (error || !row) throw new Error("persist_failed");
      const id = row.id;

      await Promise.all([
        a.threat_categories.length ? supabaseAdmin.from("analysis_categories").insert(a.threat_categories.map((category) => ({ analysis_id: id, category }))) : null,
        a.signals.length ? supabaseAdmin.from("analysis_signals").insert(a.signals.map((s) => ({ analysis_id: id, ...s }))) : null,
        a.recommended_actions.length ? supabaseAdmin.from("analysis_actions").insert(a.recommended_actions.map((t, i) => ({ analysis_id: id, action_text: t, sort_order: i }))) : null,
        a.verification_steps.length ? supabaseAdmin.from("verification_steps").insert(a.verification_steps.map((t, i) => ({ analysis_id: id, step_text: t, sort_order: i }))) : null,
        supabaseAdmin.from("usage_events").insert({ user_id: userId, event_type: "analysis", analysis_id: id, units: 1 }),
      ]);

      // Retention policy enforcement
      if (prefs?.retention_days) {
        const cutoff = new Date(Date.now() - prefs.retention_days * 86400_000).toISOString();
        await supabaseAdmin.from("analyses").delete().eq("user_id", userId).lt("created_at", cutoff);
      }

      return { ok: true, id, usedFallback: result.usedFallback };
    } catch (e) {
      console.error("[analysis] failure", e instanceof Error ? e.message : "unknown");
      return { ok: false, code: "SERVER_ERROR", message: "Something went wrong while analyzing. Your usage was not charged — please try again." };
    }
  });

export const getScreenshotUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ analysisId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS-scoped read proves ownership before signing.
    const { data: row } = await context.supabase.from("analyses").select("screenshot_storage_path").eq("id", data.analysisId).maybeSingle();
    if (!row?.screenshot_storage_path) return { url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from("screenshots").createSignedUrl(row.screenshot_storage_path, 300);
    return { url: signed?.signedUrl ?? null };
  });

export const deleteAllData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await supabaseAdmin.storage.from("screenshots").list(userId, { limit: 1000 });
    if (files?.length) await supabaseAdmin.storage.from("screenshots").remove(files.map((f) => `${userId}/${f.name}`));
    await supabase.from("reports").delete().eq("user_id", userId);
    const { error } = await supabase.from("analyses").delete().eq("user_id", userId);
    await supabaseAdmin.from("security_events").insert({ user_id: userId, event_type: "data_deleted" });
    if (error) return { ok: false };
    return { ok: true };
  });
