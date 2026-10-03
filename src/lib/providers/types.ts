import type { InputType } from "../risk";

/** Normalized input handed to any analysis provider. Never contains client secrets. */
export interface NormalizedInput {
  type: InputType;
  text: string; // normalized + redacted text (message/email body, or URL)
  sender?: string;
  claimedBrand?: string;
  url?: string;
  image?: { mime: string; base64: string };
}

/** Every provider returns raw (untrusted) JSON that the core validates via sanitizeAssessment. */
export interface AnalysisProvider {
  id: string;
  model: string;
  isAvailable(): boolean;
  analyze(input: NormalizedInput): Promise<unknown>;
}

export interface PlannedIntegration {
  id: string;
  name: string;
  purpose: string;
  status: "planned";
}

export const PLANNED_INTEGRATIONS: PlannedIntegration[] = [
  { id: "featherless", name: "Featherless AI", purpose: "Alternate / advanced open-model analysis provider", status: "planned" },
  { id: "agentboxd", name: "Agentboxd", purpose: "Monitored AI-agent email inboxes that forward suspicious mail for analysis", status: "planned" },
  { id: "n8n", name: "n8n", purpose: "Automated workflows (alerts, ticketing, team notifications)", status: "planned" },
];
