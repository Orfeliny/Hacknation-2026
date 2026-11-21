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

export async function fetchEliMetadata(eliId: string): Promise<EliMetadata> {
  const response = await fetch(`${ELI_API}/${eliId}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`ELI ${eliId}: HTTP ${response.status}`);
  return parseEliMetadata(await response.json());
}
