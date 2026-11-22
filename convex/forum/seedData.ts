import type { Doc } from "../_generated/dataModel";

type Kind = Doc<"forumThreads">["kind"];
type Criterion = Doc<"forumThreads">["criterionId"];

export type SeedThread = {
  kind: Kind;
  criterionId?: Criterion;
  title: string;
  body: string;
  // Last name of a demo employee from employees/seed.
  author: string;
  daysAgo: number;
  replies: { author: string; body: string; daysAgo: number }[];
};

// Fictional threads for the demo, written by the demo employees. They name no real person,
// organisation, contact detail or training provider.
export const SEED_THREADS: SeedThread[] = [
  {
    kind: "question",
    criterionId: "komunikacja",
    title: "Jak zacząć trudną rozmowę z pracownikiem?",
    body: "W moim zespole jedna osoba oddaje zadania później niż kiedyś. Chcę z nią porozmawiać, ale tak, żeby rozmowa była konkretna i nie zabrzmiała jak zarzut. Jak do tego podchodzicie?",
    author: "Wiśniewska",
    daysAgo: 6,
    replies: [
      {
        author: "Nowicki",
        body: "Zacznij od faktów i zachowań, a nie od oceny osoby. Poproś też, żeby opowiedziała, jak widzi sytuację.",
        daysAgo: 5,
      },
      {
        author: "Dąbrowska",
        body: "Warto przygotować dwa lub trzy konkretne przykłady i spisać ustalenia po rozmowie.",
        daysAgo: 4,
      },
    ],
  },
  {
    kind: "recommendation",
    criterionId: "organizacja_pracy",
    title: "Krótki przegląd priorytetów raz w tygodniu",
    body: "W naszym zespole poniedziałkowy przegląd priorytetów, kilkanaście minut, ograniczył gaszenie pożarów. Każdy mówi, co jest najpilniejsze, i od razu widać, gdzie zadania się nakładają.",
    author: "Mazur",
    daysAgo: 4,
    replies: [
      {
        author: "Przykładowa",
        body: "U nas podobne spotkanie działa od jakiegoś czasu. Pomaga też to, że zapisujemy ustalenia.",
        daysAgo: 3,
      },
    ],
  },
  {
    kind: "offer",
    criterionId: "wykorzystywanie_wiedzy",
    title: "Mogę poprowadzić warsztat o pracy z orzecznictwem",
    body: "Chętnie podzielę się tym, jak porządkuję orzecznictwo przy bieżących sprawach. Mogę poprowadzić godzinne spotkanie dla zainteresowanych z innych wydziałów.",
    author: "Lewandowski",
    daysAgo: 3,
    replies: [
      {
        author: "Wójcik",
        body: "Chętnie wezmę udział. Daj znać, kiedy ustalisz termin.",
        daysAgo: 2,
      },
    ],
  },
  {
    kind: "seeking_mentor",
    criterionId: "wystapienia_publiczne",
    title: "Szukam mentora do wystąpień publicznych",
    body: "Za kilka miesięcy będę prezentować wyniki kontroli przed większym gronem i chciałabym porozmawiać z kimś, kto ma w tym doświadczenie. Wystarczy kilka krótkich spotkań.",
    author: "Przykładowa",
    daysAgo: 2,
    replies: [
      {
        author: "Dąbrowska",
        body: "Warto zapytać też w innych komórkach, czy ktoś ma ochotę zostać mentorem w tym obszarze.",
        daysAgo: 1,
      },
    ],
  },
  {
    kind: "question",
    title: "Czy ktoś był na wizycie studyjnej w innym urzędzie?",
    body: "Zastanawiam się nad krótką wizytą w komórce innego urzędu, która zajmuje się podobnymi sprawami. Jak ją zorganizować i co z niej wynieść?",
    author: "Wójcik",
    daysAgo: 1,
    replies: [],
  },
  {
    kind: "recommendation",
    criterionId: "komunikacja",
    title: "Spisuj oczekiwania po rozmowie rozpoczynającej",
    body: "Po rozmowie rozpoczynającej wysyłam pracownikowi krótką notatkę z ustaleniami. Przy rozmowie oceniającej łatwo się do niej odwołać i nie ma sporu o to, co ustaliliśmy.",
    author: "Wiśniewska",
    daysAgo: 0,
    replies: [],
  },
];
