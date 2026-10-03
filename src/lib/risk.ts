// Centralized risk model, categories and plan definitions (client-safe).
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type InputType = "message" | "email" | "url" | "screenshot" | "qr";
export type PlanCode = "free" | "personal" | "pro" | "team";

export const RISK_THRESHOLDS: { level: RiskLevel; min: number }[] = [
  { level: "critical", min: 75 },
  { level: "high", min: 50 },
  { level: "medium", min: 25 },
  { level: "low", min: 0 },
];

export function scoreToLevel(score: number): RiskLevel {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return RISK_THRESHOLDS.find((t) => s >= t.min)!.level;
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const THREAT_CATEGORIES = [
  "phishing",
  "brand_impersonation",
  "account_takeover",
  "payment_scam",
  "fake_support",
  "job_scam",
  "investment_scam",
  "delivery_scam",
  "government_impersonation",
  "qr_phishing",
  "suspicious_attachment",
  "social_engineering",
  "credential_harvesting",
  "ai_manipulation",
] as const;
export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

export const CATEGORY_INFO: Record<ThreatCategory, { label: string; description: string }> = {
  phishing: { label: "Phishing", description: "Deceptive messages designed to trick you into revealing information or clicking malicious links." },
  brand_impersonation: { label: "Brand impersonation", description: "Pretending to be a known company or service to borrow its trust." },
  account_takeover: { label: "Account takeover", description: "Attempts to gain control of your existing accounts, often via codes or resets." },
  payment_scam: { label: "Payment scam", description: "Requests to send money, gift cards, crypto, or pay unexpected fees." },
  fake_support: { label: "Fake support", description: "Impostor tech or customer support asking for remote access or payment." },
  job_scam: { label: "Job scam", description: "Too-good-to-be-true job offers that request fees, personal data, or reshipping." },
  investment_scam: { label: "Investment scam", description: "Promises of guaranteed or unusually high returns, often in crypto." },
  delivery_scam: { label: "Delivery scam", description: "Fake parcel notices asking for small fees or address confirmation." },
  government_impersonation: { label: "Government impersonation", description: "Pretending to be tax, police, immigration or other authorities." },
  qr_phishing: { label: "QR phishing", description: "QR codes that lead to credential-harvesting or payment pages." },
  suspicious_attachment: { label: "Suspicious attachment", description: "Files that may contain malware or lead to malicious content." },
  social_engineering: { label: "Social engineering", description: "Psychological pressure: urgency, fear, authority, or secrecy." },
  credential_harvesting: { label: "Credential harvesting", description: "Pages or messages that collect passwords, codes or card details." },
  ai_manipulation: { label: "AI-manipulation indicators", description: "Signs that content may be AI-assisted to appear more convincing. Never definitive." },
};

export function isThreatCategory(v: unknown): v is ThreatCategory {
  return typeof v === "string" && (THREAT_CATEGORIES as readonly string[]).includes(v);
}

export const PLAN_LIMITS: Record<PlanCode, number> = {
  free: 10,
  personal: 150,
  pro: 500,
  team: 2000,
};

export const INPUT_LABEL: Record<InputType, string> = {
  message: "Message",
  email: "Email",
  url: "URL",
  screenshot: "Screenshot",
  qr: "QR code",
};

export const RATE_LIMIT_PER_MINUTE = 5;
export const MAX_TEXT_LENGTH = 8000;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
