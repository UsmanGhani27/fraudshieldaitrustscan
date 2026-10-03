// Browser-only QR decoding. Lazy-loads jsQR so it never enters the SSR or initial bundle.
export async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const code = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
  return code?.data?.trim() || null;
}
