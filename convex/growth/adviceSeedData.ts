import type { Doc } from "../_generated/dataModel";

export type SeedAdvice = Omit<Doc<"adviceArticles">, "_id" | "_creationTime">;

const STANDARDS = "standardy-zarzadzania-zasobami-ludzkimi.md";
const GUIDE = "poradnik-oceny-okresowe.md";

// Every statement below comes from the two source documents named in `sourceRef`; nothing is invented.
// An article without such a basis would be `demo` and show "Dane demonstracyjne" in the UI.
export const SEED_ADVICE: SeedAdvice[] = [
  {
    slug: "informacja-zwrotna-na-biezaco",
    title: "Informacja zwrotna: na bieżąco i cyklicznie",
    summary:
      "Dwa rodzaje informacji zwrotnej i dwie zasady: ma być konkretna i dopasowana do odbiorcy.",
    topic: "informacja_zwrotna",
    criterionIds: ["komunikacja", "zarzadzanie_ludzmi"],
    sections: [
      {
        heading: "Czym jest informacja zwrotna",
        paragraphs: [
          "To informacja, którą bezpośredni przełożony przekazuje pracownikowi, żeby podsumować sposób, w jaki wykonuje on zadania. Pełni funkcję ewaluacyjną, informacyjną, rozwojową i motywacyjną oraz pomaga przełożonemu podejmować decyzje kadrowe.",
        ],
        bullets: [],
      },
      {
        heading: "Dwa rodzaje",
        paragraphs: [],
        bullets: [
          "Informacja bieżąca: udzielana bezpośrednio po sytuacji, która uzasadnia przekazanie pracownikowi informacji o jego zadaniach lub zachowaniu.",
          "Informacja cykliczna: udzielana w regularnych odstępach czasu (np. kwartalnie) i podsumowująca dany okres pracy.",
        ],
      },
      {
        heading: "Jak ją przekazać",
        paragraphs: [
          "Informacja zwrotna powinna być konkretna, to znaczy odnosić się do zachowań i faktów, oraz dostosowana do odbiorcy.",
        ],
        bullets: [
          "Odnoś się do zachowań i faktów.",
          "Dostosuj informację do odbiorcy.",
        ],
      },
      {
        heading: "Po co to w okresie oceniania",
        paragraphs: [
          "W okresie oceniania przełożony obserwuje pracownika, udziela mu informacji zwrotnych o wykonywanej pracy i zbiera informacje potrzebne do oceny. Poradnik podpowiada, żeby nadać temu charakter cykliczny, np. przez comiesięczne lub cokwartalne rozmowy podsumowujące wyniki pracownika. System informacji zwrotnej w urzędzie ma mieć charakter motywujący i rozwojowy.",
        ],
        bullets: [],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${STANDARDS}, System informacji zwrotnej oraz pojęcia (informacja zwrotna); ${GUIDE}, pkt 6.2.3 oraz tabela etapów procesu oceny (etap II)`,
    published: true,
  },
  {
    slug: "rozmowa-oceniajaca-to-dialog",
    title: "Rozmowa oceniająca to dialog, nie monolog",
    summary:
      "Co omawia się na rozmowie oceniającej, po co ona jest i co robi się po niej.",
    topic: "rozmowa_oceniajaca",
    sections: [
      {
        heading: "Co omawiasz",
        paragraphs: [
          "Przed sporządzeniem oceny na piśmie odbywasz z pracownikiem rozmowę. Omawiasz w niej trzy rzeczy:",
        ],
        bullets: [
          "główne obowiązki wykonywane w okresie oceny i sposób ich realizacji, z uwzględnieniem ustalonych kryteriów oceny,",
          "sposób realizowania celów do osiągnięcia, jeżeli zostały wyznaczone,",
          "kierunki dalszego rozwoju zawodowego i potrzeby pracownika w zakresie podnoszenia kwalifikacji i doskonalenia umiejętności.",
        ],
      },
      {
        heading: "Po co ta rozmowa",
        paragraphs: [
          "Jej cel to nie tylko ocenienie pracownika i przekazanie mu informacji zwrotnej o pracy, ale też zmotywowanie go i zaplanowanie rozwoju zawodowego. Dlatego rozmowa nie powinna być monologiem oceniającego, lecz dialogiem oceniającego z ocenianym.",
        ],
        bullets: [],
      },
      {
        heading: "Przygotowanie",
        paragraphs: [
          "Bezpośrednio przed rozmową przygotuj wypełniony na roboczo arkusz oceny. Ustalenia z rozmowy rozpoczynającej, jeśli je spisałeś, pozwolą Ci odwołać się do wcześniejszych oczekiwań i uniknąć nieporozumień wynikających z upływu czasu.",
        ],
        bullets: [],
      },
      {
        heading: "Po rozmowie",
        paragraphs: ["Podsumowujesz ją na arkuszu oceny okresowej:"],
        bullets: [
          "przyznajesz oceny cząstkowe i określasz ogólny poziom spełniania kryteriów,",
          "przyznajesz ocenę pozytywną lub negatywną,",
          "uzasadniasz ocenę negatywną (w przypadku pozytywnej uzasadnienie jest fakultatywne),",
          "zapisujesz wnioski dotyczące indywidualnego programu rozwoju zawodowego.",
        ],
      },
    ],
    readingMinutes: 3,
    source: "material_kprm",
    sourceRef: `${GUIDE}, pkt 6.2.1, 6.2.4 i 6.2.5 oraz tabela etapów procesu oceny`,
    published: true,
  },
  {
    slug: "dobrostan-zespolu-i-rownowaga",
    title: "Dobrostan zespołu i równowaga między pracą a życiem",
    summary:
      "Narzędzia work-life balance, które zalecają standardy, i jak je zastosować w swoim zespole.",
    topic: "dobrostan",
    sections: [
      {
        heading: "Co zalecają standardy",
        paragraphs: [
          "Standardy zarządzania zasobami ludzkimi w służbie cywilnej zalecają, żeby urząd katalogował i opisywał dostępne narzędzia work-life balance, a następnie upowszechniał je wśród pracowników, np. w intranecie. Cele takich narzędzi to m.in. tworzenie przyjaznej atmosfery w pracy, wzrost motywacji i efektywności pracowników oraz wspieranie zdrowego stylu życia.",
        ],
        bullets: [],
      },
      {
        heading: "Obszary narzędzi",
        paragraphs: ["Standardy wymieniają narzędzia z różnych obszarów, np.:"],
        bullets: [
          "czas i organizacja pracy (ruchomy czas pracy, telepraca),",
          "opieka nad dzieckiem lub osobą zależną,",
          "wypoczynek, sport, rekreacja i czas wolny,",
          "zdrowie i opieka medyczna, w tym ergonomiczne i komfortowe warunki pracy,",
          "integracja i komunikacja (np. platforma do komunikacji wewnętrznej).",
        ],
      },
      {
        heading: "Co możesz zrobić jako przełożony",
        paragraphs: [
          "Osoby kierujące pracownikami powinny starać się rozpoznawać potrzeby pracowników i w indywidualny sposób dopasowywać narzędzia. Jako niematerialne narzędzia motywacyjne standardy wymieniają m.in. narzędzia work-life balance, budowanie przyjaznej atmosfery zespołu, usprawnianie komunikacji i optymalizowanie organizacji pracy.",
        ],
        bullets: [
          "Sprawdź, jakie narzędzia work-life balance są dostępne w urzędzie: standardy zalecają ich katalogowanie i upowszechnianie.",
          "Rozpoznawaj potrzeby pracowników i dopasowuj narzędzia indywidualnie.",
        ],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Katalog narzędzi work-life balance oraz Wykorzystywanie niematerialnych narzędzi motywacyjnych`,
    published: true,
  },
  {
    slug: "docenianie-pracownikow",
    title: "Docenianie pracowników bez wielkich budżetów",
    summary:
      "Niematerialne formy motywowania, które zalecają standardy, oraz do czego służą wyniki oceny okresowej.",
    topic: "docenianie",
    criterionIds: ["zarzadzanie_ludzmi"],
    sections: [
      {
        heading: "Niematerialne narzędzia motywacyjne",
        paragraphs: ["Standardy zalecają korzystanie m.in. z:"],
        bullets: [
          "pochwał i wyróżnień,",
          "powierzania nowych i interesujących zadań,",
          "zwiększania zakresu odpowiedzialności i samodzielności,",
          "stwarzania warunków do samorealizacji,",
          "kierowania na szkolenia,",
          "budowania przyjaznej atmosfery zespołu i usprawniania komunikacji.",
        ],
      },
      {
        heading: "Dopasuj do osoby",
        paragraphs: [
          "Osoby kierujące pracownikami powinny starać się rozpoznawać ich potrzeby i w indywidualny sposób dopasowywać narzędzia motywacyjne.",
        ],
        bullets: [],
      },
      {
        heading: "Jak wykorzystuje się wyniki oceny okresowej",
        paragraphs: [
          "Poradnik wymienia, do czego mogą posłużyć wyniki oceny okresowej:",
        ],
        bullets: [
          "awanse, np. przyznawane wyłącznie osobom, które otrzymały ostatnią ocenę co najmniej na poziomach powyżej oczekiwań,",
          "nagrody, przy których poziom oceny może posłużyć do określenia ich wysokości,",
          "szkolenia, bo informacje z ocen cząstkowych pokazują luki kompetencyjne.",
        ],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${STANDARDS}, Wykorzystywanie niematerialnych narzędzi motywacyjnych; ${GUIDE}, pkt 8 (Konsekwencje oceny okresowej)`,
    published: true,
  },
  {
    slug: "praca-z-kryteriami-oceny",
    title: "Praca z kryteriami oceny: wybór i obserwacja",
    summary:
      "Jak wybrać kryteria dodatkowe i jak zbierać informacje przez cały okres, a nie tylko tuż przed oceną.",
    topic: "kryteria_oceny",
    sections: [
      {
        heading: "Kryteria obowiązkowe i dodatkowe",
        paragraphs: [
          "Kryteria obowiązkowe są na stałe przypisane do arkusza (A, B lub C). Kryteria dodatkowe wybierasz z wykazu kryteriów oceny: nie więcej niż 3, takie, które są najistotniejsze ze względu na obowiązki z opisu stanowiska. Możesz nie wybierać żadnych, jeśli zadania na stanowisku są ogólne i jednorodne.",
        ],
        bullets: [],
      },
      {
        heading: "Jak wybierać",
        paragraphs: [],
        bullets: [
          "Kieruj się obowiązkami pracownika i kompetencjami wymaganymi na stanowisku, korzystając z opisu stanowiska pracy.",
          "Przy takich samych zadaniach (np. obsługa sekretariatu) wybieraj takie same kryteria dodatkowe, żeby pracowników dało się rzetelnie porównać.",
          "Jeśli zadania pracownika się nie zmieniły, kolejną ocenę warto oprzeć na tych samych kryteriach dodatkowych, żeby zobaczyć jego rozwój.",
        ],
      },
      {
        heading: "Zbieraj informacje przez cały okres",
        paragraphs: [
          "Oceniaj na podstawie całego okresu, a nie ostatnich, zapamiętanych wydarzeń. Informacje o pracy pracownika warto zapisywać na bieżąco, np. w nieformalnej „teczce pracowniczej”, bo zapobiega to trudnościom w przywołaniu faktów z początku okresu.",
        ],
        bullets: [],
      },
      {
        heading: "Spisz oczekiwania",
        paragraphs: [
          "Ustalenia z rozmowy rozpoczynającej o oczekiwaniach wobec kryteriów można sporządzić na piśmie. Pozwoli to odwołać się do nich na rozmowie oceniającej.",
        ],
        bullets: [],
      },
    ],
    readingMinutes: 3,
    source: "material_kprm",
    sourceRef: `${GUIDE}, pkt 6.2.1, 6.2.2 i 6.2.3`,
    published: true,
  },
];
