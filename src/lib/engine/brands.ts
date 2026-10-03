// Small, curated list of well-known brands and their official registrable domains.
// Used for deterministic identity checks only. Not a threat-intelligence feed.
export const KNOWN_BRANDS: Record<string, string[]> = {
  paypal: ["paypal.com", "paypal.me"],
  amazon: ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.in", "amazon.ca", "amazon.fr", "amazon.es", "amazon.it", "amazonaws.com"],
  apple: ["apple.com", "icloud.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com"],
  google: ["google.com", "gmail.com", "youtube.com"],
  netflix: ["netflix.com"],
  meta: ["meta.com", "facebook.com", "instagram.com", "whatsapp.com"],
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  whatsapp: ["whatsapp.com"],
  dhl: ["dhl.com", "dhl.de"],
  fedex: ["fedex.com"],
  ups: ["ups.com"],
  usps: ["usps.com"],
  "royal mail": ["royalmail.com"],
  chase: ["chase.com"],
  "wells fargo": ["wellsfargo.com"],
  "bank of america": ["bankofamerica.com"],
  coinbase: ["coinbase.com"],
  binance: ["binance.com"],
  linkedin: ["linkedin.com"],
  irs: ["irs.gov"],
  hmrc: ["gov.uk"],
  steam: ["steampowered.com", "steamcommunity.com"],
};

export function findBrand(text: string): string | null {
  const t = text.toLowerCase();
  for (const b of Object.keys(KNOWN_BRANDS)) {
    if (new RegExp(`\\b${b.replace(/\s+/g, "\\s*")}\\b`, "i").test(t)) return b;
  }
  return null;
}

export function normalizeBrand(name: string | undefined | null): string | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (KNOWN_BRANDS[n]) return n;
  return findBrand(n);
}
