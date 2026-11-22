// Rules for a link HR imports: https only, no credentials, no private or internal hosts. The check works
// on the host name; a name that resolves to a private address is caught by `fetchSource` through DNS.

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

const INTERNAL_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home.arpa",
  ".intranet",
];

function ipv4Parts(host: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return parts.every((p) => p <= 255) ? parts : null;
}

function isPrivateIpv4(parts: number[]): boolean {
  const [a = 0, b = 0, c = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

// Only global unicast (2000::/3) passes: loopback, unique local, link local, multicast and IPv4-mapped
// forms all start elsewhere.
function isPrivateIpv6(host: string): boolean {
  const first = host.split(":")[0] ?? "";
  const value = Number.parseInt(first || "0", 16);
  return !(value >= 0x2000 && value <= 0x3fff);
}

export function isPrivateAddress(address: string): boolean {
  const bare = address.replace(/^\[|\]$/g, "").toLowerCase();
  const v4 = ipv4Parts(bare);
  if (v4) return isPrivateIpv4(v4);
  return bare.includes(":") ? isPrivateIpv6(bare) : true;
}

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "" || host === "localhost") return true;
  if (host.startsWith("[") || ipv4Parts(host)) return isPrivateAddress(host);
  if (!host.includes(".")) return true;
  return INTERNAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function checkPublicHttpsUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Wpisz poprawny adres internetowy." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "Adres musi zaczynać się od https://." };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      reason: "Adres nie może zawierać nazwy użytkownika ani hasła.",
    };
  }
  if (url.port && url.port !== "443") {
    return {
      ok: false,
      reason: "Adres z niestandardowym portem jest niedozwolony.",
    };
  }
  if (isPrivateHost(url.hostname)) {
    return {
      ok: false,
      reason: "Adres wskazuje na sieć wewnętrzną i jest niedozwolony.",
    };
  }
  return { ok: true, url };
}

// The key of a source: the same link written with a fragment or a trailing slash is one source.
export function normalizeUrl(url: URL): string {
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.hostname.toLowerCase()}${path}${url.search}`;
}

export function fileNameFromUrl(url: URL, max = 255): string {
  const segment = url.pathname.split("/").filter(Boolean).pop();
  let name = segment ?? url.hostname;
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep the raw segment
  }
  return name.slice(0, max);
}

const ELI_HOSTS = new Set(["eli.gov.pl", "www.eli.gov.pl"]);

// An act link of eli.gov.pl (`/api/acts/DU/2016/470/...` or `/eli/DU/2016/470/...`): its id and the
// address of the plain HTML text.
export function eliFromUrl(
  url: URL,
): { eliId: string; textUrl: string } | null {
  if (!ELI_HOSTS.has(url.hostname.toLowerCase())) return null;
  const match = /^\/(?:api\/acts|eli)\/([A-Z]+)\/(\d{4})\/(\d+)(?:\/|$)/.exec(
    url.pathname,
  );
  if (!match) return null;
  const eliId = `${match[1]}/${match[2]}/${match[3]}`;
  return { eliId, textUrl: `https://eli.gov.pl/api/acts/${eliId}/text.html` };
}
