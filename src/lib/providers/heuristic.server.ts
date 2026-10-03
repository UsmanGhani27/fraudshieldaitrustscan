import type { AnalysisProvider, NormalizedInput } from "./types";
import type { ThreatCategory } from "../risk";

/**
 * Transparent rule-based fallback analyzer. Used only when the AI provider is unavailable,
 * and clearly labeled as such in results. Not a substitute for AI-assisted analysis.
 */
type Rule = { re: RegExp; title: string; severity: "low" | "medium" | "high"; weight: number; cats: ThreatCategory[]; explanation: string };

const RULES: Rule[] = [
  { re: /\b(urgent|immediately|within 24 hours|final notice|act now|suspended|locked)\b/i, title: "Urgency or threat language", severity: "medium", weight: 15, cats: ["social_engineering"], explanation: "Scammers create time pressure so you act before verifying." },
  { re: /\b(verify|confirm|update)\b.{0,40}\b(account|identity|details|information|password)\b/i, title: "Request to verify account details", severity: "high", weight: 20, cats: ["phishing", "credential_harvesting"], explanation: "Legitimate services rarely ask you to confirm credentials via a link." },
  { re: /\b(gift card|wire transfer|crypto|bitcoin|usdt|western union|zelle)\b/i, title: "Unusual payment method", severity: "high", weight: 20, cats: ["payment_scam"], explanation: "Hard-to-reverse payment methods are a hallmark of fraud." },
  { re: /\b(parcel|package|delivery|shipment|redelivery|customs fee)\b/i, title: "Delivery-related pretext", severity: "medium", weight: 12, cats: ["delivery_scam"], explanation: "Fake delivery notices commonly request small fees or address confirmation." },
  { re: /\b(refund|reimbursement|overpaid|tax return)\b/i, title: "Unexpected refund offer", severity: "medium", weight: 10, cats: ["payment_scam"], explanation: "Unexpected refunds are used as bait to collect payment details." },
  { re: /\b(one-time code|otp|verification code|2fa code|security code)\b/i, title: "Request for one-time code", severity: "high", weight: 22, cats: ["account_takeover"], explanation: "Sharing a one-time code can hand over control of your account." },
  { re: /\b(work from home|remote job|hiring|recruiter|per hour|training fee|starter kit)\b/i, title: "Job offer pattern", severity: "medium", weight: 12, cats: ["job_scam"], explanation: "Unsolicited job offers with high pay or upfront fees are common scams." },
  { re: /\b(guaranteed returns?|double your|investment opportunity|trading platform)\b/i, title: "Investment promise", severity: "high", weight: 18, cats: ["investment_scam"], explanation: "Guaranteed or unusually high returns are a strong fraud signal." },
  { re: /\b(irs|hmrc|tax authority|police|immigration|social security|court)\b/i, title: "Government authority reference", severity: "medium", weight: 12, cats: ["government_impersonation"], explanation: "Authorities rarely initiate contact by text or demand immediate payment." },
  { re: /\b(tech support|remote access|anydesk|teamviewer|virus detected)\b/i, title: "Support / remote access request", severity: "high", weight: 18, cats: ["fake_support"], explanation: "Remote access requests from unsolicited contacts are high risk." },
  { re: /(bit\.ly|tinyurl|t\.co|is\.gd|rb\.gy|cutt\.ly)\//i, title: "Shortened link hides destination", severity: "medium", weight: 12, cats: ["phishing"], explanation: "Link shorteners hide the real destination domain." },
  { re: /https?:\/\/\d{1,3}(\.\d{1,3}){3}/i, title: "Link uses raw IP address", severity: "high", weight: 18, cats: ["phishing"], explanation: "Legitimate services almost never link to raw IP addresses." },
  { re: /\.(zip|exe|scr|js|iso|html?)\b/i, title: "Potentially risky file reference", severity: "medium", weight: 10, cats: ["suspicious_attachment"], explanation: "These file types can carry malware or fake login pages." },
];

const BRANDS = ["paypal", "amazon", "apple", "microsoft", "netflix", "google", "chase", "wells fargo", "bank of america", "dhl", "fedex", "ups", "usps", "royal mail", "meta", "facebook", "instagram", "whatsapp", "coinbase"];

export const heuristicProvider: AnalysisProvider = {
  id: "fraudshield-heuristic",
  model: "rules-v1 (fallback)",
  isAvailable: () => true,
  async analyze(input: NormalizedInput) {
    const text = `${input.text} ${input.sender ?? ""} ${input.url ?? ""}`;
    const hits = RULES.map((r) => ({ r, m: text.match(r.re) })).filter((h) => h.m);
    const cats = new Set<ThreatCategory>();
    hits.forEach((h) => h.r.cats.forEach((c) => cats.add(c)));
    const lower = text.toLowerCase();
    const brand = input.claimedBrand || BRANDS.find((b) => lower.includes(b)) || "";
    const indicators: string[] = [];
    const domains = Array.from(new Set((text.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/gi) ?? []).map((d) => d.toLowerCase()))).filter((d) => /[a-z]/.test(d.split(".").pop() ?? "")).slice(0, 5);
    domains.forEach((d) => indicators.push(`Domain observed: ${d}`));
    let score = hits.reduce((s, h) => s + h.r.weight, 0);
    const signals = hits.map((h) => ({ title: h.r.title, severity: h.r.severity, evidence: `"${h.m![0]}"`, explanation: h.r.explanation }));
    if (brand && domains.length && !domains.some((d) => d.includes(brand.replace(/\s+/g, "")))) {
      cats.add("brand_impersonation");
      score += 18;
      signals.push({ title: "Claimed brand does not match observed domain", severity: "high", evidence: `${brand} vs ${domains[0]}`, explanation: "The link or sender domain does not belong to the brand being referenced." });
    }
    if (input.type === "screenshot" && !input.text) {
      score = Math.max(score, 30);
      signals.push({ title: "Screenshot could not be read by fallback analyzer", severity: "low", evidence: "Image content", explanation: "The rule-based fallback cannot read images. Treat this result with extra caution." });
    }
    score = Math.min(100, score);
    return {
      risk_score: score,
      confidence: input.type === "screenshot" ? 20 : Math.min(70, 30 + hits.length * 8),
      summary: hits.length
        ? `The fallback rule-based analyzer found ${hits.length} common scam signal${hits.length > 1 ? "s" : ""}. AI analysis was unavailable, so this result is less nuanced than usual.`
        : "The fallback rule-based analyzer did not find common scam patterns. AI analysis was unavailable, so subtle threats may be missed.",
      threat_categories: Array.from(cats),
      claimed_identity: brand,
      observed_indicators: indicators,
      signals,
      recommended_actions: [
        "Do not click links or call numbers from this content until verified.",
        "Contact the organization through its official website or app that you open yourself.",
        "Never share passwords, one-time codes, or payment details in response to unsolicited messages.",
      ],
      verification_steps: [
        "Check the sender's address or number against the organization's official contact page.",
        "Hover over or long-press links to inspect the real domain before opening.",
        "Ask someone you trust for a second opinion if money or account access is involved.",
      ],
      uncertainty_notes: ["Generated by the rule-based fallback analyzer because AI analysis was unavailable. Re-run later for a full AI-assisted assessment."],
      safe_to_proceed: score < 15,
    };
  },
};
