import { eliFromUrl } from "./urlSafety";

export type SeedSource = {
  kind: "act" | "page";
  url: string;
  title: string;
  legalBasis: string;
  // Fall back to the day the source is loaded when the real dates are not filled in yet.
  effectiveDate?: string;
  publicationDate?: string;
};

// Starter set of the national base (the team's lists in #86). Every act is read through the ELI API.
const ACTS: ReadonlyArray<readonly [number, number]> = [
  [2008, 1505],
  [2016, 470],
  [2008, 1458],
  [1982, 214],
  [1998, 1125],
  [2007, 1749],
  [2001, 1070],
  [2012, 714],
  [2016, 177],
  [2016, 1947],
  [2018, 483],
  [2018, 1668],
  [1982, 19],
  [2022, 1822],
  [1974, 141],
];

const PAGES: SeedSource[] = [
  {
    kind: "page",
    url: "https://www.gov.pl/web/sluzbacywilna/ocena-okresowa",
    title: "gov.pl: Ocena okresowa",
    legalBasis: "Serwis Służby Cywilnej (gov.pl)",
  },
  {
    kind: "page",
    url: "https://www.gov.pl/web/sluzbacywilna/oceny-pracownicze",
    title: "gov.pl: Oceny pracownicze",
    legalBasis: "Serwis Służby Cywilnej (gov.pl)",
  },
];

export const SEED_SOURCES: SeedSource[] = [
  ...ACTS.map(([year, pos]): SeedSource => ({
    kind: "act",
    url: `https://eli.gov.pl/api/acts/DU/${year}/${pos}/text.html`,
    title: `Dz.U. ${year} poz. ${pos}`,
    legalBasis: `Dz.U. ${year} poz. ${pos}`,
  })),
  ...PAGES,
];

export const SEED_ELI_IDS = SEED_SOURCES.flatMap((source) => {
  const eli = eliFromUrl(new URL(source.url));
  return eli ? [eli.eliId] : [];
});
