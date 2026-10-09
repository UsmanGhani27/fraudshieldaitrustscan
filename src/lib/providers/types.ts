import type { InputType } from "../risk";

/** Normalized input handed to any analysis provider. Never contains client secrets. */
export interface NormalizedInput {
  type: InputType;
  text: string; // normalized + redacted
  sender?: string | undefined;
  replyTo?: string | undefined;
  subject?: string | undefined;
  attachments?: string[] | undefined;
  claimedBrand?: string | undefined;
  context?: string | undefined;
  url?: string | undefined;
  image?: { mime: string; base64: string } | undefined;
  deterministicFindings?: string[] | undefined; // pre-computed rule/URL findings shared with the model
}

/** Providers return raw (untrusted) JSON that the core validates via sanitizeModelOutput. */
export interface AnalysisProvider {
  id: string;
  model: string;
  /** false = text-only; the chain never sends image input to it. */
  supportsImages?: boolean;
  isAvailable(): boolean;
  analyze(input: NormalizedInput): Promise<unknown>;
}

/** Future adapters. None are active; the app works without any of them. */
export interface PlannedIntegration {
  id: string;
  name: string;
  purpose: string;
  kind: "model-provider" | "inbox-agent" | "automation" | "mail" | "client" | "intel" | "platform";
}

export const PLANNED_INTEGRATIONS: PlannedIntegration[] = [
  { id: "featherless", name: "Featherless AI", purpose: "Alternate / advanced open-model analysis provider", kind: "model-provider" },
  { id: "agentboxd", name: "Agentboxd", purpose: "Monitored AI-agent inboxes that forward suspicious mail for analysis", kind: "inbox-agent" },
  { id: "n8n", name: "n8n", purpose: "Automated workflows such as alerts and ticketing", kind: "automation" },
  { id: "mail", name: "Gmail / Outlook", purpose: "Analyze emails directly from your inbox", kind: "mail" },
  { id: "extension", name: "Browser extension", purpose: "Check links before you open them", kind: "client" },
  { id: "intel", name: "Threat intelligence", purpose: "Domain reputation and known-bad indicator lookups", kind: "intel" },
];
