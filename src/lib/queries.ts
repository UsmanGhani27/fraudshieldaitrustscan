import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const analysesListQuery = () =>
  queryOptions({
    queryKey: ["analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, input_type, risk_level, risk_score, confidence, summary, is_saved, provider, created_at, analysis_categories(category)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

export const analysisDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*, analysis_categories(category), analysis_signals(id, title, severity, evidence, explanation), analysis_actions(id, action_text, sort_order), verification_steps(id, step_text, sort_order)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export type AnalysisDetail = NonNullable<Awaited<ReturnType<NonNullable<ReturnType<typeof analysisDetailQuery>["queryFn"]>>>>;

export const reportsQuery = () =>
  queryOptions({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, report_title, generated_at, analysis_id, analyses(risk_level, input_type)")
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const [p, prefs, sub] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("data_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      return { profile: p.data, prefs: prefs.data, subscription: sub.data };
    },
  });
