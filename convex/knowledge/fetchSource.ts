import { checkPublicHttpsUrl, isPrivateAddress } from "./urlSafety";

// Legal acts reach about 2.5 MB of HTML, so the limit is counted in megabytes.
export const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 30_000;

// `failed`: the source could not be fetched; `needs_fix`: it was fetched but cannot be used as it is.
export class SourceError extends Error {
  constructor(
    message: string,
    readonly status: "failed" | "needs_fix" = "failed",
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export type FetchedSource = {
  bytes: Uint8Array;
  contentType: string;
  finalUrl: string;
};

type Options = {
  fetch?: typeof fetch;
  // Resolves a host name to its addresses; the node action passes DNS, tests pass a stub.
  resolve?: (host: string) => Promise<string[]>;
  maxBytes?: number;
  timeoutMs?: number;
};

async function readLimited(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw tooLarge(maxBytes);
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

const tooLarge = (maxBytes: number) =>
  new SourceError(
    `Dokument jest za duży: najwyżej ${Math.round(maxBytes / (1024 * 1024))} MB.`,
  );

// Every hop, including each redirect, is checked again: https, a public host, a public address.
export async function fetchSource(
  rawUrl: string,
  options: Options = {},
): Promise<FetchedSource> {
  const doFetch = options.fetch ?? fetch;
  const maxBytes = options.maxBytes ?? MAX_DOWNLOAD_BYTES;
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = checkPublicHttpsUrl(current);
    if (!check.ok) throw new SourceError(check.reason);
    if (options.resolve) {
      const addresses = await options.resolve(check.url.hostname);
      if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
        throw new SourceError(
          "Adres wskazuje na sieć wewnętrzną i jest niedozwolony.",
        );
      }
    }
    let response: Response;
    try {
      response = await doFetch(check.url.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
        headers: { accept: "text/html,application/pdf,*/*;q=0.5" },
      });
    } catch {
      throw new SourceError(
        "Nie udało się pobrać dokumentu z podanego adresu.",
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location)
        throw new SourceError("Serwer przekierował bez adresu docelowego.");
      current = new URL(location, check.url).href;
      continue;
    }
    if (!response.ok) {
      throw new SourceError(`Serwer zwrócił błąd ${response.status}.`);
    }
    return {
      bytes: await readLimited(response, maxBytes),
      contentType: response.headers.get("content-type") ?? "",
      finalUrl: check.url.href,
    };
  }
  throw new SourceError("Za dużo przekierowań.");
}
