// Deterministic URL analysis. Never fetches or visits the URL.
import { KNOWN_BRANDS } from "./brands";

export type UrlFinding = { code: string; title: string; severity: "low" | "medium" | "high"; detail: string };
export type UrlAnalysis = {
  normalized_url: string;
  hostname: string;
  registrable_domain: string;
  protocol: string;
  findings: UrlFinding[];
  lookalike_of: string | null;
};

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "is.gd", "rb.gy", "cutt.ly", "goo.gl", "ow.ly", "buff.ly", "shorturl.at", "tiny.cc"];
const RISKY_TLDS = ["top", "xyz", "zip", "mov", "click", "country", "gq", "tk", "ml", "cf", "ga", "work", "rest", "cam", "icu", "buzz", "sbs", "cfd", "lol"];
const TWO_PART_TLDS = ["co.uk", "com.au", "co.in", "co.jp", "com.br", "gov.uk", "org.uk", "ac.uk"];
const PATH_BAITS = /(login|signin|verify|account|update|secure|wallet|unlock|confirm|billing|password|reset|refund|redelivery|kyc)/i;

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const last2 = parts.slice(-2).join(".");
  if (TWO_PART_TLDS.includes(last2)) return parts.slice(-3).join(".");
  return last2;
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length]![b.length]!;
}

const HOMOGLYPH: Record<string, string> = { "0": "o", "1": "l", "3": "e", "5": "s", "rn": "m", "vv": "w" };
function deglyph(s: string) {
  let out = s;
  for (const [k, v] of Object.entries(HOMOGLYPH)) out = out.split(k).join(v);
  return out;
}

export function isOfficialDomain(host: string, brand: string): boolean {
  const reg = registrableDomain(host);
  return (KNOWN_BRANDS[brand] ?? []).some((d) => reg === d || host === d || host.endsWith(`.${d}`));
}

export function analyzeUrl(raw: string): UrlAnalysis | null {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  const reg = registrableDomain(host);
  const label = reg.split(".")[0] ?? "";
  const tld = host.split(".").pop() ?? "";
  const findings: UrlFinding[] = [];
  let lookalike: string | null = null;

  if (url.protocol === "http:") findings.push({ code: "no_https", title: "Not using HTTPS", severity: "low", detail: "The connection would not be encrypted." });
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) findings.push({ code: "ip_host", title: "Raw IP address instead of a domain", severity: "high", detail: host });
  if (host.startsWith("xn--") || host.includes(".xn--")) findings.push({ code: "punycode", title: "Internationalized (punycode) domain", severity: "high", detail: "Can be used to imitate familiar domains with look-alike characters." });
  if (url.username || url.password || raw.includes("@")) findings.push({ code: "userinfo", title: "Contains '@' or embedded credentials", severity: "high", detail: "Text before '@' can disguise the real destination." });
  if (SHORTENERS.includes(reg) || SHORTENERS.includes(host)) findings.push({ code: "shortener", title: "Link shortener hides the destination", severity: "medium", detail: reg });
  if (RISKY_TLDS.includes(tld)) findings.push({ code: "risky_tld", title: `Uncommon domain ending (.${tld})`, severity: "medium", detail: "Frequently abused because it's cheap to register." });
  if (host.split(".").length > 4) findings.push({ code: "deep_subdomain", title: "Unusually many subdomains", severity: "medium", detail: host });
  if ((label.match(/-/g) ?? []).length >= 2) findings.push({ code: "hyphenated", title: "Heavily hyphenated domain", severity: "low", detail: reg });
  if (PATH_BAITS.test(url.pathname + url.search)) findings.push({ code: "bait_path", title: "Login / verification wording in the link path", severity: "medium", detail: (url.pathname + url.search).slice(0, 120) });
  if (url.search.length > 200) findings.push({ code: "long_query", title: "Very long tracking/query string", severity: "low", detail: `${url.search.length} characters` });

  for (const [brand, domains] of Object.entries(KNOWN_BRANDS)) {
    if (isOfficialDomain(host, brand)) continue;
    const compact = brand.replace(/\s+/g, "");
    const brandLabels = domains.map((d) => d.split(".")[0]!);
    const hostHasBrand = host.replace(/[-.]/g, "").includes(compact);
    const nearMiss = brandLabels.some((b) => b.length >= 4 && label !== b && (levenshtein(label, b) <= (b.length > 6 ? 2 : 1) || deglyph(label) === b));
    if (hostHasBrand || nearMiss) {
      lookalike = brand;
      findings.push({
        code: nearMiss ? "lookalike" : "brand_in_foreign_domain",
        title: nearMiss ? `Look-alike spelling of ${brand}` : `Uses "${brand}" on a domain it doesn't own`,
        severity: "high",
        detail: `${reg} is not an official ${brand} domain (${domains.slice(0, 2).join(", ")}).`,
      });
      break;
    }
  }

  return { normalized_url: url.toString(), hostname: host, registrable_domain: reg, protocol: url.protocol.replace(":", ""), findings, lookalike_of: lookalike };
}

export function extractUrls(text: string): string[] {
  const m = text.match(/\b((?:https?:\/\/|www\.)[^\s<>"')]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|top|xyz|info|biz|me|ly|gd|uk|de|in|app|site|online|shop|link|click)(?:\/[^\s<>"')]*)?)/gi);
  return Array.from(new Set(m ?? [])).slice(0, 5);
}
