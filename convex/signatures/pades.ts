export const PDF_CONTENT_TYPE = "application/pdf";
export const MAX_SIGNED_FILE_BYTES = 10 * 1024 * 1024;

// adbe.pkcs7.* are the classic PDF signatures, ETSI.CAdES.detached is PAdES baseline (eIDAS).
// ETSI.RFC3161 is left out: it marks a document timestamp, not a person's signature.
export const SIGNATURE_SUB_FILTERS = [
  "adbe.pkcs7.detached",
  "adbe.pkcs7.sha1",
  "ETSI.CAdES.detached",
] as const;

export type PadesDetection =
  { detected: true; subFilter: string } | { detected: false };

// Latin-1 keeps one character per byte, so string offsets equal byte offsets for /ByteRange.
function latin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  return latin1(bytes.subarray(0, 1024)).includes("%PDF-");
}

const BYTE_RANGE = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;

// Structural check only: a signature dictionary whose /ByteRange points at a non-empty /Contents
// hole. It does not verify the certificate chain or the digest; that needs EU DSS before production.
export function detectPadesSignature(bytes: Uint8Array): PadesDetection {
  const text = latin1(bytes);
  const fieldIsSig = /\/FT\s*\/Sig\b/.test(text);
  for (const match of text.matchAll(BYTE_RANGE)) {
    const [a, b, c, d] = match.slice(1, 5).map(Number) as [
      number,
      number,
      number,
      number,
    ];
    if (a !== 0 || b <= 0 || c <= b || c + d > bytes.length) continue;
    // The hole between the two ranges must be exactly the hex string of /Contents.
    if (text[b] !== "<" || text[c - 1] !== ">") continue;
    const hex = text.slice(b + 1, c - 1).replace(/\s/g, "");
    if (!/^[0-9A-Fa-f]+$/.test(hex) || /^0+$/.test(hex)) continue;

    // The signature dictionary is an indirect object; look only inside it. The signature value
    // cannot sit in a compressed object stream, because /ByteRange addresses raw file bytes.
    const index = match.index;
    const start = Math.max(0, text.lastIndexOf("obj", index));
    const endAt = text.indexOf("endobj", index);
    const dict = text.slice(start, endAt === -1 ? text.length : endAt);
    const typed = /\/Type\s*\/Sig\b/.test(dict);
    if (!typed && !fieldIsSig) continue;
    const subFilter = /\/SubFilter\s*\/([A-Za-z0-9.]+)/.exec(dict)?.[1];
    if (
      subFilter &&
      (SIGNATURE_SUB_FILTERS as readonly string[]).includes(subFilter)
    ) {
      return { detected: true, subFilter };
    }
  }
  return { detected: false };
}
