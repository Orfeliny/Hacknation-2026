import type { Doc } from "../_generated/dataModel";

export type SeedOption = Omit<
  Doc<"developmentOptions">,
  "_id" | "_creationTime"
>;

const STANDARDS = "standardy-zarzadzania-zasobami-ludzkimi.md";

// "demo": generic forms with no provider, link or price, shown as "Dane demonstracyjne".
// "material_kprm": forms that the human resources standards of the Head of the Civil Service name.
// The criterion assignment is a starting suggestion for HR to confirm. Nothing here names a real
// training, provider, link or price: a real source supplies those (#60).
export const SEED_OPTIONS: SeedOption[] = [
  {
    title: "Mentoring wewnętrzny",
    description:
      "Wymiana doświadczeń między osobą o większej wiedzy w danym obszarze a osobą, która chce go rozwijać.",
    form: "mentoring",
    criterionIds: ["wspolpraca", "wykorzystywanie_wiedzy", "komunikacja"],
    level: "podstawowy",
    cost: "brak_danych",
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Organizacja szkoleń i działań rozwojowych, pkt 1 lit. d`,
    active: true,
  },
  {
    title: "Wizyta studyjna i konsultacje u doświadczonej osoby",
    description:
      "Wizyta studyjna oraz konsultacje z osobą, która zna dane zadanie.",
    form: "wymiana_doswiadczen",
    criterionIds: ["komunikacja", "wspolpraca", "orientacja_na_klienta"],
    level: "sredni",
    cost: "brak_danych",
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Organizacja szkoleń i działań rozwojowych, pkt 1 lit. d`,
    active: true,
  },
  {
    title: "Staż lub udział w zespole zadaniowym",
    description:
      "Doskonalenie w działaniu: praca w zespole zadaniowym, wykonanie analizy lub ekspertyzy, dodatkowe zadanie albo zastępstwo.",
    form: "zadanie_rozwojowe",
    criterionIds: ["wspolpraca", "organizacja_pracy", "wykorzystywanie_wiedzy"],
    level: "sredni",
    cost: "brak_danych",
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Organizacja szkoleń i działań rozwojowych, pkt 1 lit. c`,
    active: true,
  },
  {
    title: "Czasowa mobilność: zadania w innej komórce lub urzędzie",
    description:
      "Czasowa realizacja innych zadań w obecnym lub innym miejscu pracy, np. przeniesienie czasowe do innego urzędu w ramach służby cywilnej albo praca w roboczym zespole projektowym.",
    form: "zadanie_rozwojowe",
    criterionIds: ["kreatywnosc", "wykorzystywanie_wiedzy", "wspolpraca"],
    level: "zaawansowany",
    cost: "brak_danych",
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Mobilność pracowników, pkt 2`,
    active: true,
  },
  {
    title: "Samodoskonalenie: literatura fachowa i orzecznictwo",
    description:
      "Samodzielna lektura literatury fachowej i orzecznictwa w obszarze, który wymaga pogłębienia.",
    form: "material",
    criterionIds: [
      "wykorzystywanie_wiedzy",
      "myslenie_analityczne",
      "rzetelnosc",
    ],
    level: "podstawowy",
    cost: "brak_danych",
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Organizacja szkoleń i działań rozwojowych, pkt 1 lit. b`,
    active: true,
  },
  {
    title: "Kaskadowe dzielenie się wiedzą",
    description:
      "Osoba, która była na szkoleniu lub zna dobrą praktykę, przekazuje ją zespołowi na krótkim spotkaniu.",
    form: "wymiana_doswiadczen",
    criterionIds: [
      "wspolpraca",
      "wykorzystywanie_wiedzy",
      "wystapienia_publiczne",
    ],
    level: "podstawowy",
    cost: "brak_danych",
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Organizacja szkoleń i działań rozwojowych, pkt 2 lit. d`,
    active: true,
  },
  {
    title: "Szkolenie z komunikacji i informacji zwrotnej",
    description:
      "Ogólne szkolenie z jasnego przekazywania informacji, słuchania i udzielania informacji zwrotnej.",
    form: "szkolenie",
    criterionIds: ["komunikacja", "zarzadzanie_ludzmi"],
    level: "podstawowy",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
  {
    title: "Szkolenie z negocjacji",
    description:
      "Ogólne szkolenie z przygotowania do negocjacji i podstawowych technik negocjacyjnych.",
    form: "szkolenie",
    criterionIds: ["negocjowanie", "komunikacja"],
    level: "sredni",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
  {
    title: "Szkolenie z planowania pracy i ustalania priorytetów",
    description:
      "Ogólne szkolenie z organizacji własnej pracy, ustalania priorytetów i radzenia sobie ze zmianami.",
    form: "szkolenie",
    criterionIds: ["organizacja_pracy", "podejmowanie_decyzji"],
    level: "podstawowy",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
  {
    title: "Kurs wystąpień publicznych",
    description:
      "Ogólny kurs prezentowania i kontaktu z audytorium oraz radzenia sobie ze stresem przed wystąpieniem.",
    form: "kurs",
    criterionIds: ["wystapienia_publiczne", "komunikacja"],
    level: "sredni",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
  {
    title: "Szkolenie z delegowania zadań i motywowania zespołu",
    description:
      "Ogólne szkolenie dla osób, które zaczynają kierować zespołem: delegowanie, monitorowanie zadań i motywowanie.",
    form: "szkolenie",
    criterionIds: ["zarzadzanie_ludzmi", "organizacja_pracy"],
    level: "zaawansowany",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
  {
    title: "Zadanie rozwojowe: poprowadzenie spotkania zespołu",
    description:
      "Przełożony powierza pracownikowi przygotowanie i poprowadzenie jednego spotkania zespołu, a potem omawia z nim, jak poszło.",
    form: "zadanie_rozwojowe",
    criterionIds: ["komunikacja", "wystapienia_publiczne", "organizacja_pracy"],
    level: "podstawowy",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
];
