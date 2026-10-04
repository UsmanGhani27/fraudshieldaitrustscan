/** Only allow same-origin, in-app paths as post-login destinations. */
export function safeReturnPath(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return undefined;
  if (v.startsWith("/auth") || v.startsWith("/signup") || v.startsWith("/reset-password")) return undefined;
  return v.slice(0, 500);
}

const KEY = "fs:return-path";
export const rememberReturnPath = (p?: string) => { try { if (p) sessionStorage.setItem(KEY, p); } catch { /* ignore */ } };
export const takeReturnPath = (): string | undefined => {
  try { const v = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); return safeReturnPath(v); } catch { return undefined; }
};
