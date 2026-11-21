import type { PositionKind, SheetType } from "./types";

export type CriterionId =
  | "komunikacja"
  | "kreatywnosc"
  | "negocjowanie"
  | "organizacja_pracy"
  | "orientacja_na_klienta"
  | "podejmowanie_decyzji"
  | "sytuacje_kryzysowe"
  | "rzetelnosc"
  | "myslenie_analityczne"
  | "wykorzystywanie_wiedzy"
  | "wspolpraca"
  | "wystapienia_publiczne"
  | "zarzadzanie_ludzmi"
  | "zarzadzanie_strategiczne";

export type CatalogEntry = {
  id: CriterionId;
  name: string;
  indicators: string[];
};

export type OverallLevelId =
  | "znacznie_ponizej_oczekiwan"
  | "ponizej_oczekiwan"
  | "na_poziomie_oczekiwan"
  | "powyzej_oczekiwan"
  | "znacznie_powyzej_oczekiwan";

export type RulesPack = {
  version: string;
  source: string;
  sheets: Record<
    SheetType,
    { positionKind: PositionKind; mandatory: CriterionId[]; source: string }
  >;
  catalog: CatalogEntry[];
  maxAdditionalCriteria: number;
  partialScale: { id: string; label: string; value: number }[];
  overallLevels: { id: OverallLevelId; label: string; maxAverage: number }[];
  positiveAbove: number;
  reviewPeriodMonths: number;
  openingDays: number;
  openingDaysAfterNegative: number;
  absenceExtensionThresholdMonths: number;
  reevaluationAfterNegativeMonths: number;
  deadlineChangeAfterMonths: number;
  objectionDays: number;
  objectionDecisionDays: number;
  mandatoryPromotionDays: number;
  sources: Record<string, string>;
};

const ROZP = "rozporządzenie PRM z 4.04.2016 (Dz.U. poz. 470)";
const USTAWA = "ustawa o służbie cywilnej (Dz.U. 2026 poz. 590)";

export const RULES_2016: RulesPack = {
  version: "2016-04-23",
  source: ROZP,
  sheets: {
    A: {
      positionKind: "office_head",
      mandatory: [
        "zarzadzanie_ludzmi",
        "podejmowanie_decyzji",
        "organizacja_pracy",
        "wspolpraca",
        "komunikacja",
        "zarzadzanie_strategiczne",
      ],
      source: `${ROZP} § 3 ust. 2, § 4 ust. 1`,
    },
    B: {
      positionKind: "managerial",
      mandatory: [
        "zarzadzanie_ludzmi",
        "podejmowanie_decyzji",
        "organizacja_pracy",
        "wspolpraca",
        "komunikacja",
      ],
      source: `${ROZP} § 3 ust. 3, § 4 ust. 2`,
    },
    C: {
      positionKind: "non_managerial",
      mandatory: [
        "wykorzystywanie_wiedzy",
        "rzetelnosc",
        "organizacja_pracy",
        "wspolpraca",
        "komunikacja",
      ],
      source: `${ROZP} § 3 ust. 4, § 4 ust. 3`,
    },
  },
  catalog: [
    {
      id: "komunikacja",
      name: "Komunikacja",
      indicators: [
        "Koncentrowanie się na wypowiedzi rozmówcy i dbanie o wzajemne zrozumienie.",
        "Wypowiadanie się w sposób jasny i precyzyjny, dostosowany do sytuacji i rozmówcy (dobieranie stylu, języka i treści).",
        "Formułowanie jasnych i precyzyjnych wypowiedzi pisemnych dostosowanych do sytuacji i odbiorcy (dobieranie stylu, języka i treści).",
        "Przedstawianie przekonujących argumentów odpowiednio do sytuacji.",
      ],
    },
    {
      id: "kreatywnosc",
      name: "Kreatywność",
      indicators: [
        "Proponowanie lub tworzenie nowych rozwiązań.",
        "Nieschematyczne podejście do zadań.",
      ],
    },
    {
      id: "negocjowanie",
      name: "Negocjowanie",
      indicators: [
        "Przygotowywanie się do negocjacji, w szczególności opracowanie projektu stanowiska, zakresu możliwych ustępstw i argumentacji.",
        "Stosowanie technik i strategii negocjacyjnych.",
        "Osiągnięcie efektu negocjacji akceptowanego przez przełożonych.",
      ],
    },
    {
      id: "organizacja_pracy",
      name: "Organizacja pracy i orientacja na osiąganie celów",
      indicators: [
        "Określanie sposobu realizacji zadań/celów.",
        "Realizowanie zadań/celów w kolejności uwzględniającej ich wagę i pilność (ustalanie priorytetów działania).",
        "Dobieranie niezbędnych zasobów umożliwiających realizację zadań/celów.",
        "Dostosowywanie się do zmieniających się okoliczności.",
        "Wytrwałość i zaangażowanie w realizację zadań/celów.",
      ],
    },
    {
      id: "orientacja_na_klienta",
      name: "Orientacja na klienta/interesanta",
      indicators: [
        "Taktowne zachowanie, wyrażające szacunek i zrozumienie dla drugiej osoby.",
        "Reagowanie na potrzeby klienta/interesanta, w szczególności rozpoznawanie jego potrzeb i proponowanie rozwiązań.",
      ],
    },
    {
      id: "podejmowanie_decyzji",
      name: "Podejmowanie decyzji i odpowiedzialność",
      indicators: [
        "Wypracowywanie alternatywnych rozwiązań na podstawie analizy informacji, w szczególności potencjalnego ryzyka.",
        "Podejmowanie decyzji (decyzyjność).",
        "Przyjmowanie odpowiedzialności za efekty podjętych decyzji.",
      ],
    },
    {
      id: "sytuacje_kryzysowe",
      name: "Radzenie sobie w sytuacjach kryzysowych",
      indicators: [
        "Rozpoznawanie sytuacji kryzysowych i informowanie o nich zainteresowanych.",
        "Podejmowanie działań mających na celu rozwiązanie kryzysu.",
        "Wyciąganie wniosków z sytuacji kryzysowych.",
      ],
    },
    {
      id: "rzetelnosc",
      name: "Rzetelność",
      indicators: [
        "Wykonywanie zadań zgodnie z obowiązującymi standardami (przepisami, zasadami, procedurami) oraz dbałość o jakość rezultatów.",
        "Dotrzymywanie zobowiązań (realizacja zadań) w wyznaczonym czasie.",
      ],
    },
    {
      id: "myslenie_analityczne",
      name: "Myślenie analityczne",
      indicators: [
        "Rozróżnianie informacji istotnych i nieistotnych.",
        "Dostrzeganie zależności między informacjami.",
        "Formułowanie wniosków.",
      ],
    },
    {
      id: "wykorzystywanie_wiedzy",
      name: "Wykorzystywanie wiedzy i doskonalenie zawodowe",
      indicators: [
        "Wykorzystywanie wiedzy przy realizacji zadań na zajmowanym stanowisku pracy.",
        "Doskonalenie wiedzy i umiejętności niezbędnych do wykonywania zadań na zajmowanym stanowisku pracy, w szczególności wyszukiwanie i pozyskiwanie wiedzy, korzystanie z dobrych praktyk i doświadczeń innych.",
        "Korzystanie z dostępnych źródeł informacji, rozwiązań i technologii.",
      ],
    },
    {
      id: "wspolpraca",
      name: "Współpraca",
      indicators: [
        "Włączanie się w działania realizowane razem z innymi osobami, jeśli istnieje taka możliwość.",
        "Dbanie o przepływ informacji.",
        "Dbanie o dobrą atmosferę i otwartość we współpracy.",
        "Dostrzeganie wkładu pracy innych osób.",
        "Branie pod uwagę zdania innych osób.",
        "Dzielenie się wiedzą i doświadczeniem.",
      ],
    },
    {
      id: "wystapienia_publiczne",
      name: "Wystąpienia publiczne",
      indicators: [
        "Wykorzystywanie różnych środków przekazu (np. narzędzi multimedialnych) i dbałość o sposób prezentacji (w tym autoprezentacji).",
        "Nawiązywanie i utrzymywanie kontaktu z audytorium.",
        "Zarządzanie czasem wystąpienia, w szczególności przestrzeganie ram czasowych, elastyczne reagowanie na potrzeby audytorium.",
        "Radzenie sobie ze stresem i emocjami, w szczególności wywołanymi krytyką i trudnymi pytaniami.",
      ],
    },
    {
      id: "zarzadzanie_ludzmi",
      name: "Zarządzanie ludźmi",
      indicators: [
        "Przydzielanie zakresu odpowiedzialności, zadań i uprawnień pracownikom (delegowanie zadań).",
        "Monitorowanie realizacji zadań oraz w razie potrzeby podejmowanie działań korygujących lub zapobiegawczych.",
        "Motywowanie pracowników.",
        "Udzielanie pracownikom informacji zwrotnej opartej na ocenie ich zaangażowania i sposobu realizacji zadań.",
        "Rozwiązywanie konfliktów.",
        "Wspieranie pracowników w rozwoju zawodowym, w szczególności identyfikowanie potrzeb rozwojowych, proponowanie działań rozwojowych oraz monitorowanie ich realizacji.",
      ],
    },
    {
      id: "zarzadzanie_strategiczne",
      name: "Zarządzanie strategiczne",
      indicators: [
        "Tworzenie wizji oraz wyznaczanie celów strategicznych w oparciu o całościowe i perspektywiczne widzenie organizacji, otoczenia oraz strategie rozwoju.",
        "Formułowanie celów operacyjnych na podstawie celów strategicznych.",
        "Analiza ryzyka planowanych działań o charakterze strategicznym.",
      ],
    },
  ],
  maxAdditionalCriteria: 3,
  partialScale: [
    { id: "1", label: "znacznie poniżej oczekiwań", value: 1 },
    { id: "3", label: "poniżej oczekiwań", value: 3 },
    { id: "5", label: "na poziomie oczekiwań", value: 5 },
    { id: "7", label: "powyżej oczekiwań", value: 7 },
    { id: "9", label: "znacznie powyżej oczekiwań", value: 9 },
  ],
  overallLevels: [
    {
      id: "znacznie_ponizej_oczekiwan",
      label: "znacznie poniżej oczekiwań",
      maxAverage: 2,
    },
    { id: "ponizej_oczekiwan", label: "poniżej oczekiwań", maxAverage: 4 },
    {
      id: "na_poziomie_oczekiwan",
      label: "na poziomie oczekiwań",
      maxAverage: 6,
    },
    { id: "powyzej_oczekiwan", label: "powyżej oczekiwań", maxAverage: 8 },
    {
      id: "znacznie_powyzej_oczekiwan",
      label: "znacznie powyżej oczekiwań",
      maxAverage: 9,
    },
  ],
  positiveAbove: 4,
  reviewPeriodMonths: 24,
  openingDays: 30,
  openingDaysAfterNegative: 7,
  absenceExtensionThresholdMonths: 1,
  reevaluationAfterNegativeMonths: 6,
  deadlineChangeAfterMonths: 6,
  objectionDays: 7,
  objectionDecisionDays: 14,
  mandatoryPromotionDays: 30,
  sources: {
    sheet: `${ROZP} § 3`,
    additionalCriteria: `${ROZP} § 2 ust. 2, § 5 ust. 2`,
    partialScale: `${ROZP} § 11 ust. 1 pkt 1`,
    overallLevel: `${ROZP} § 11 ust. 1 pkt 2`,
    result: `${ROZP} § 11 ust. 1 pkt 3-4`,
    developmentConclusions: `${ROZP} § 11 ust. 1 pkt 5; ${USTAWA} art. 81 ust. 5`,
    justification: `${ROZP} § 11 ust. 3`,
    promotionRequest: `${ROZP} § 11 ust. 5; ${USTAWA} art. 89 ust. 1`,
    opening: `${ROZP} § 7`,
    openingSignatures: `${ROZP} § 6 ust. 2`,
    reviewPeriod: `${USTAWA} art. 81 ust. 4`,
    absenceExtension: `${USTAWA} art. 81 ust. 7`,
    reevaluation: `${USTAWA} art. 81 ust. 9`,
    deadlineChange: `${USTAWA} art. 81 ust. 8; ${ROZP} § 8`,
    acknowledgement: `${ROZP} § 12`,
    objection: `${USTAWA} art. 83 ust. 1`,
    objectionDecision: `${USTAWA} art. 83 ust. 3`,
    mandatoryPromotion: `${USTAWA} art. 89 ust. 2`,
    subject: `${USTAWA} art. 81 ust. 1`,
    termCounting:
      "Kodeks cywilny art. 111-115; KPRM: zasady obliczania terminów",
  },
};
