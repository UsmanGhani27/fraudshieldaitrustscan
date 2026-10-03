// Deterministic, configurable heuristics. Weights live here so they can be tuned centrally.
import type { ThreatCategory } from "../risk";

export type HeuristicRule = {
  code: string;
  re: RegExp;
  title: string;
  tactic?: string;
  severity: "low" | "medium" | "high";
  weight: number;
  cats: ThreatCategory[];
  explanation: string;
};

export const HEURISTIC_RULES: HeuristicRule[] = [
  { code: "urgency", re: /\b(urgent|immediately|within \d+ ?(hours|hrs|minutes)|final notice|act now|last chance|expires? today)\b/i, title: "Urgency pressure", tactic: "Urgency", severity: "medium", weight: 12, cats: ["social_engineering"], explanation: "Deadlines push you to act before you have time to verify." },
  { code: "threat", re: /\b(suspended|locked|deactivated|terminated|legal action|arrest|penalt(y|ies)|will be deleted)\b/i, title: "Threat of loss or punishment", tactic: "Fear", severity: "medium", weight: 12, cats: ["social_engineering"], explanation: "Fear of losing access or getting in trouble lowers people's guard." },
  { code: "credential_request", re: /\b(verify|confirm|update|validate)\b.{0,40}\b(account|identity|details|information|password|login)\b/i, title: "Request to verify account details", tactic: "Credential request", severity: "high", weight: 18, cats: ["phishing", "credential_harvesting"], explanation: "Legitimate services rarely ask you to confirm credentials through a message link." },
  { code: "otp_request", re: /\b(one[- ]time code|otp|verification code|2fa code|security code|send (me )?the code)\b/i, title: "Asks for a one-time code", tactic: "Credential request", severity: "high", weight: 22, cats: ["account_takeover"], explanation: "Sharing a one-time code can hand over control of your account." },
  { code: "payment_method", re: /\b(gift ?cards?|wire transfer|crypto|bitcoin|usdt|western union|zelle|cash app|venmo)\b/i, title: "Hard-to-reverse payment method", tactic: "Payment request", severity: "high", weight: 18, cats: ["payment_scam"], explanation: "Gift cards, crypto and wires are nearly impossible to recover." },
  { code: "small_fee", re: /\b(customs fee|redelivery fee|unpaid (fee|charge)|small fee|\$\s?[0-3]\.\d{2})\b/i, title: "Small unexpected fee", tactic: "Payment request", severity: "medium", weight: 12, cats: ["payment_scam", "delivery_scam"], explanation: "Tiny fees are used to collect card details." },
  { code: "delivery", re: /\b(parcel|package|delivery|shipment|redelivery|courier)\b/i, title: "Delivery pretext", severity: "low", weight: 6, cats: ["delivery_scam"], explanation: "Fake delivery notices are one of the most common scam lures." },
  { code: "refund", re: /\b(refund|reimburse(ment|d)?|overpaid|tax return|rebate)\b/i, title: "Unexpected refund or money offer", tactic: "Reward bait", severity: "medium", weight: 8, cats: ["payment_scam"], explanation: "Unexpected money is bait to collect payment details." },
  { code: "job", re: /\b(remote (job|role|position)|work from home|no interview|starter kit|training fee|per hour|\$\d+\s?\/\s?h(ou)?r)\b/i, title: "Too-good-to-be-true job offer", tactic: "Reward bait", severity: "medium", weight: 14, cats: ["job_scam"], explanation: "Unsolicited offers with high pay, no interview or upfront costs are classic job scams." },
  { code: "investment", re: /\b(guaranteed (returns?|profit)|double your|investment opportunity|trading (platform|bot)|passive income)\b/i, title: "Investment promise", tactic: "Reward bait", severity: "high", weight: 18, cats: ["investment_scam"], explanation: "Guaranteed or unusually high returns are a strong fraud signal." },
  { code: "government", re: /\b(irs|hmrc|tax authority|police|immigration|social security|court summons|customs office)\b/i, title: "Government authority reference", tactic: "Authority", severity: "medium", weight: 10, cats: ["government_impersonation"], explanation: "Authorities rarely make first contact by text or demand immediate payment." },
  { code: "support", re: /\b(tech(nical)? support|remote access|anydesk|teamviewer|virus (detected|found)|your (computer|device) is infected)\b/i, title: "Support / remote-access request", tactic: "Authority", severity: "high", weight: 18, cats: ["fake_support"], explanation: "Remote access requests from unsolicited contacts are high risk." },
  { code: "secrecy", re: /\b(don'?t tell|keep (this )?(confidential|secret|between us)|do not contact)\b/i, title: "Asks for secrecy", tactic: "Isolation", severity: "high", weight: 14, cats: ["social_engineering"], explanation: "Scammers isolate victims so nobody can warn them." },
  { code: "id_request", re: /\b(photo of (your )?id|passport|ssn|social security number|driver'?s licen[cs]e)\b/i, title: "Requests identity documents", tactic: "Credential request", severity: "high", weight: 14, cats: ["credential_harvesting"], explanation: "Identity documents enable identity theft." },
  { code: "attachment", re: /\.(zip|exe|scr|js|iso|img|htm|html|docm|xlsm)\b/i, title: "Risky file type mentioned", severity: "medium", weight: 10, cats: ["suspicious_attachment"], explanation: "These file types can carry malware or fake login pages." },
  { code: "generic_greeting", re: /\b(dear (customer|user|client|member|sir\/madam))\b/i, title: "Generic greeting", severity: "low", weight: 4, cats: ["phishing"], explanation: "Real providers usually address you by name." },
];

export type HeuristicHit = { rule: HeuristicRule; match: string };

export function runHeuristics(text: string): HeuristicHit[] {
  const hits: HeuristicHit[] = [];
  for (const rule of HEURISTIC_RULES) {
    const m = text.match(rule.re);
    if (m) hits.push({ rule, match: m[0] });
  }
  return hits;
}

export const URL_FINDING_WEIGHT: Record<"low" | "medium" | "high", number> = { low: 4, medium: 10, high: 20 };
