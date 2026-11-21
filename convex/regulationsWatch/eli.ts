import { z } from "zod";

export const ELI_API = "https://api.sejm.gov.pl/eli/acts";

// Acts behind the periodic review rules (#10). The consolidated text of the act changes its
// number, so the watch follows the original act, whose metadata lists amending acts.
export const WATCHED_ACTS = [
  {
    eliId: "DU/2016/470",
    title: "Rozporządzenie PRM w sprawie ocen okresowych w służbie cywilnej",
  },
  { eliId: "DU/2008/1505", title: "Ustawa o służbie cywilnej" },
] as const;

const reference = z.object({ id: z.string() }).passthrough();

const metadata = z.object({
  ELI: z.string(),
  title: z.string(),
  changeDate: z.string(),
  status: z.string().optional(),
  inForce: z.string().optional(),
  references: z.record(z.string(), z.array(reference)).optional(),
});

export type EliMetadata = {
  eliId: string;
  title: string;
  changeDate: string;
  status: string | null;
  amendingActs: string[];
};

export function parseEliMetadata(json: unknown): EliMetadata {
  const data = metadata.parse(json);
  return {
    eliId: data.ELI,
    title: data.title,
    changeDate: data.changeDate,
    status: data.status ?? null,
    amendingActs: (data.references?.["Akty zmieniające"] ?? []).map(
      (r) => r.id,
    ),
  };
}

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

// Same rule as AI_PROVIDER: the demo works offline with "mock"; REGULATIONS_SOURCE=eli turns on
// the live, account-free Sejm API.
export function regulationsSource(): "mock" | "eli" {
  return process.env.REGULATIONS_SOURCE === "eli" ? "eli" : "mock";
}

// Snapshot of the real metadata from 2026-11-21, so the mock looks like the API.
export const MOCK_METADATA: Record<string, EliMetadata> = {
  "DU/2016/470": {
    eliId: "DU/2016/470",
    title:
      "Rozporządzenie Prezesa Rady Ministrów z dnia 4 kwietnia 2016 r. w sprawie warunków i sposobu przeprowadzania ocen okresowych urzędników służby cywilnej i pracowników służby cywilnej",
    changeDate: "2024-03-14T21:30:57",
    status: "obowiązujący",
    amendingActs: [],
  },
  "DU/2008/1505": {
    eliId: "DU/2008/1505",
    title: "Ustawa z dnia 21 listopada 2008 r. o służbie cywilnej",
    changeDate: "2026-05-12T15:01:13",
    status: "akt posiada tekst jednolity",
    amendingActs: [],
  },
};

export async function loadMetadata(eliId: string): Promise<EliMetadata> {
  if (regulationsSource() === "eli") return fetchEliMetadata(eliId);
  const mock = MOCK_METADATA[eliId];
  if (!mock) throw new Error(`Brak atrapy dla ${eliId}`);
  return Promise.resolve(mock);
}

export async function fetchEliMetadata(eliId: string): Promise<EliMetadata> {
  const response = await fetch(`${ELI_API}/${eliId}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`ELI ${eliId}: HTTP ${response.status}`);
  return parseEliMetadata(await response.json());
}
