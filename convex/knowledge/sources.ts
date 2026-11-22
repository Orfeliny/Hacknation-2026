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
type Act = {
  year: number;
  pos: number;
  title: string;
  legalBasis: string;
  publicationDate: string;
  effectiveDate?: string;
};

// Titles and dates come from the ELI API (api.sejm.gov.pl/eli/acts/DU/<year>/<pos>): publicationDate
// is the promulgation date, effectiveDate the entry into force (not given for a consolidated text notice).
// Two items of the team's list look like mistakes: 2007/1749 is a visa regulation and 2018/483 a notice on
// the consolidated text of the bonds act.
const ACTS: readonly Act[] = [
  {
    year: 2008,
    pos: 1505,
    title: "Ustawa z dnia 21 listopada 2008 r. o służbie cywilnej",
    legalBasis: "Dz.U. 2008 nr 227 poz. 1505",
    publicationDate: "2008-12-23",
    effectiveDate: "2009-03-24",
  },
  {
    year: 2016,
    pos: 470,
    title:
      "Rozporządzenie Prezesa Rady Ministrów z dnia 4 kwietnia 2016 r. w sprawie warunków i sposobu przeprowadzania ocen okresowych urzędników służby cywilnej i pracowników służby cywilnej",
    legalBasis: "Dz.U. 2016 poz. 470",
    publicationDate: "2016-04-08",
    effectiveDate: "2016-04-23",
  },
  {
    year: 2008,
    pos: 1458,
    title: "Ustawa z dnia 21 listopada 2008 r. o pracownikach samorządowych",
    legalBasis: "Dz.U. 2008 nr 223 poz. 1458",
    publicationDate: "2008-12-18",
    effectiveDate: "2009-01-01",
  },
  {
    year: 1982,
    pos: 214,
    title:
      "Ustawa z dnia 16 września 1982 r. o pracownikach urzędów państwowych",
    legalBasis: "Dz.U. 1982 nr 31 poz. 214",
    publicationDate: "1982-10-08",
    effectiveDate: "1983-01-01",
  },
  {
    year: 1998,
    pos: 1125,
    title:
      "Ustawa z dnia 18 grudnia 1998 r. o pracownikach sądów i prokuratury",
    legalBasis: "Dz.U. 1998 nr 162 poz. 1125",
    publicationDate: "1998-12-30",
    effectiveDate: "1998-12-30",
  },
  {
    year: 2007,
    pos: 1749,
    title:
      "Rozporządzenie Ministra Spraw Wewnętrznych i Administracji z dnia 18 grudnia 2007 r. w sprawie wiz dla cudzoziemców",
    legalBasis: "Dz.U. 2007 nr 238 poz. 1749",
    publicationDate: "2007-12-21",
    effectiveDate: "2007-12-21",
  },
  {
    year: 2001,
    pos: 1070,
    title: "Ustawa z dnia 27 lipca 2001 r. Prawo o ustroju sądów powszechnych",
    legalBasis: "Dz.U. 2001 nr 98 poz. 1070",
    publicationDate: "2001-09-12",
    effectiveDate: "2001-10-01",
  },
  {
    year: 2012,
    pos: 714,
    title:
      "Rozporządzenie Ministra Sprawiedliwości z dnia 14 czerwca 2012 r. w sprawie okresowych ocen referendarzy sądowych i asystentów sędziów",
    legalBasis: "Dz.U. 2012 poz. 714",
    publicationDate: "2012-06-25",
    effectiveDate: "2012-07-03",
  },
  {
    year: 2016,
    pos: 177,
    title: "Ustawa z dnia 28 stycznia 2016 r. Prawo o prokuraturze",
    legalBasis: "Dz.U. 2016 poz. 177",
    publicationDate: "2016-02-15",
    effectiveDate: "2016-03-04",
  },
  {
    year: 2016,
    pos: 1947,
    title:
      "Ustawa z dnia 16 listopada 2016 r. o Krajowej Administracji Skarbowej",
    legalBasis: "Dz.U. 2016 poz. 1947",
    publicationDate: "2016-12-02",
    effectiveDate: "2017-03-01",
  },
  {
    year: 2018,
    pos: 483,
    title:
      "Obwieszczenie Marszałka Sejmu Rzeczypospolitej Polskiej z dnia 9 lutego 2018 r. w sprawie ogłoszenia jednolitego tekstu ustawy o obligacjach",
    legalBasis: "Dz.U. 2018 poz. 483",
    publicationDate: "2018-03-06",
  },
  {
    year: 2018,
    pos: 1668,
    title:
      "Ustawa z dnia 20 lipca 2018 r. Prawo o szkolnictwie wyższym i nauce",
    legalBasis: "Dz.U. 2018 poz. 1668",
    publicationDate: "2018-08-30",
    effectiveDate: "2018-10-01",
  },
  {
    year: 1982,
    pos: 19,
    title: "Ustawa z dnia 26 stycznia 1982 r. Karta Nauczyciela",
    legalBasis: "Dz.U. 1982 nr 3 poz. 19",
    publicationDate: "1982-02-01",
    effectiveDate: "1982-02-01",
  },
  {
    year: 2022,
    pos: 1822,
    title:
      "Rozporządzenie Ministra Edukacji i Nauki z dnia 25 sierpnia 2022 r. w sprawie oceny pracy nauczycieli",
    legalBasis: "Dz.U. 2022 poz. 1822",
    publicationDate: "2022-08-30",
    effectiveDate: "2022-09-01",
  },
  {
    year: 1974,
    pos: 141,
    title: "Ustawa z dnia 26 czerwca 1974 r. Kodeks pracy",
    legalBasis: "Dz.U. 1974 nr 24 poz. 141",
    publicationDate: "1974-07-05",
    effectiveDate: "1975-01-01",
  },
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
  ...ACTS.map((act): SeedSource => ({
    kind: "act",
    url: `https://eli.gov.pl/api/acts/DU/${act.year}/${act.pos}/text.html`,
    title: act.title,
    legalBasis: act.legalBasis,
    publicationDate: act.publicationDate,
    ...(act.effectiveDate ? { effectiveDate: act.effectiveDate } : {}),
  })),
  ...PAGES,
];

export const SEED_ELI_IDS = SEED_SOURCES.flatMap((source) => {
  const eli = eliFromUrl(new URL(source.url));
  return eli ? [eli.eliId] : [];
});
