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
  {
    slug: "przygotuj-sie-do-rozmowy-oceniajacej",
    title: "Jak przygotować się do rozmowy oceniającej",
    summary:
      "Trzy tematy rozmowy z przełożonym i kilka rzeczy, które warto przemyśleć wcześniej.",
    topic: "rozmowa_oceniajaca",
    audience: "pracownik",
    sections: [
      {
        heading: "O czym będzie rozmowa",
        paragraphs: [
          "Przed sporządzeniem oceny na piśmie przełożony odbywa z Tobą rozmowę. Omawia w niej trzy rzeczy:",
        ],
        bullets: [
          "główne obowiązki, które wykonywałeś w okresie oceny, i sposób ich realizacji, z uwzględnieniem ustalonych kryteriów oceny,",
          "sposób realizowania celów, jeżeli zostały wyznaczone,",
          "kierunki Twojego dalszego rozwoju zawodowego i potrzeby w zakresie podnoszenia kwalifikacji i doskonalenia umiejętności.",
        ],
      },
      {
        heading: "To dialog",
        paragraphs: [
          "Cel rozmowy to nie tylko ocena i informacja zwrotna o pracy, ale też motywowanie i zaplanowanie rozwoju zawodowego. Rozmowa nie ma być monologiem przełożonego, lecz dialogiem, więc Twój głos się liczy.",
        ],
        bullets: [],
      },
      {
        heading: "Co warto przemyśleć wcześniej",
        paragraphs: [],
        bullets: [
          "Jakie główne obowiązki i cele realizowałeś w okresie oceny.",
          "Jak spełniałeś kryteria oceny i oczekiwania przełożonego omówione na rozmowie rozpoczynającej proces oceny.",
          "Jakie kompetencje chcesz rozwijać i w jakiej formie.",
        ],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${GUIDE}, pkt 6.2.1 i 6.2.4`,
    published: true,
  },
  {
    slug: "jak-czytac-swoja-ocene",
    title: "Jak czytać swoją ocenę okresową",
    summary:
      "Skala ocen cząstkowych, ogólny poziom i to, kiedy ocena jest pozytywna, a kiedy negatywna.",
    topic: "kryteria_oceny",
    audience: "pracownik",
    sections: [
      {
        heading: "Oceny cząstkowe",
        paragraphs: [
          "Za każde kryterium, obowiązkowe i dodatkowe, przełożony przyznaje ocenę w pięciostopniowej skali:",
        ],
        bullets: [
          "1 punkt: znacznie poniżej oczekiwań,",
          "3 punkty: poniżej oczekiwań,",
          "5 punktów: na poziomie oczekiwań,",
          "7 punktów: powyżej oczekiwań,",
          "9 punktów: znacznie powyżej oczekiwań.",
        ],
      },
      {
        heading: "Ogólny poziom i ocena",
        paragraphs: [
          "Przełożony wylicza średnią arytmetyczną ocen cząstkowych i na tej podstawie ustala ogólny poziom spełniania kryteriów. Ocena jest pozytywna przy poziomie: znacznie powyżej oczekiwań, powyżej oczekiwań albo na poziomie oczekiwań, pod warunkiem że żadna ocena cząstkowa nie jest „znacznie poniżej oczekiwań”. Ocena jest negatywna przy poziomie poniżej oczekiwań lub znacznie poniżej oczekiwań, a także gdy choć jedna ocena cząstkowa jest „znacznie poniżej oczekiwań”.",
        ],
        bullets: [],
      },
      {
        heading: "Uzasadnienie",
        paragraphs: [
          "Ocena negatywna wymaga uzasadnienia, a pozytywna może być uzasadniona. Uzasadnienie jest dla Ciebie informacją zwrotną o tym, jak przełożony widzi spełnianie jego oczekiwań. Oceny powinny wynikać z rzeczywistych zachowań, a nie z ogólnego wrażenia.",
        ],
        bullets: [],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${GUIDE}, pkt 6.2.5.1, 6.2.5.2 i 6.2.5.3`,
    published: true,
  },
  {
    slug: "skad-sie-bierze-twoj-program-rozwoju",
    title: "Skąd bierze się Twój program rozwoju (IPRZ)",
    summary:
      "Skąd biorą się wnioski do indywidualnego programu rozwoju zawodowego i jak wykorzystać do nich rozmowę oceniającą.",
    topic: "inne",
    audience: "pracownik",
    sections: [
      {
        heading: "Czym jest IPRZ",
        paragraphs: [
          "Wnioski o rozwoju zapisane w arkuszu oceny stanowią podstawę indywidualnego programu rozwoju zawodowego, który przełożony ustala odrębnie dla każdego ocenianego. Program jest m.in. podstawą kierowania na szkolenia. Sporządza się go każdemu ocenionemu, niezależnie od rodzaju oceny.",
        ],
        bullets: [],
      },
      {
        heading: "Skąd wiadomo, co rozwijać",
        paragraphs: [
          "Najwięcej mówią oceny cząstkowe. Kryterium ocenione poniżej poziomu oczekiwań to obszar rozwojowy, na którym warto się skupić. Uzasadnienie oceny może wskazać konkretne zachowanie do poprawy. Uwagi wymagają też kompetencje kluczowe na Twoim stanowisku i obszary, które szybko się zmieniają, np. prawo czy informatyka.",
        ],
        bullets: [],
      },
      {
        heading: "Co zawierają wnioski",
        paragraphs: [
          "Wnioski wpisuje do arkusza oceniający. Powinny uwzględniać obecne i przyszłe zadania oraz oczekiwania ocenianego i wskazywać obszary wiedzy i umiejętności do doskonalenia oraz optymalne formy i metody ich realizacji.",
          "Kierunki Twojego dalszego rozwoju i potrzeby szkoleniowe omawia się na rozmowie oceniającej, więc to dobra okazja, żeby je przedstawić.",
        ],
        bullets: [],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${GUIDE}, pkt 6.2.4, 6.2.5.4 oraz pkt 8`,
    published: true,
  },
  {
    slug: "sprzeciw-od-oceny",
    title: "Sprzeciw od oceny: kiedy i jak",
    summary:
      "Terminy, adresat i dalsza droga, jeśli nie zgadzasz się z oceną okresową.",
    topic: "inne",
    audience: "pracownik",
    sections: [
      {
        heading: "Termin i adresat",
        paragraphs: [
          "Od oceny okresowej służy sprzeciw do dyrektora generalnego urzędu. Złóż go w terminie 7 dni od dnia, w którym zapoznano Cię z oceną. Sprzeciw rozpatruje się w terminie 14 dni od dnia jego wniesienia.",
        ],
        bullets: [],
      },
      {
        heading: "Co warto w nim zawrzeć",
        paragraphs: [
          "Ustawa nie wymaga uzasadnienia sprzeciwu ani decyzji w jego sprawie, ale poradnik uznaje je za wskazane, zwłaszcza gdy sprzeciw nie zostaje uwzględniony. Sprzeciw odnoszący się do konkretnych ocen cząstkowych lub ich uzasadnień przy uwzględnieniu prowadzi do zastąpienia tych fragmentów oceny nowymi. Przy sprzeciwie ogólnym, bez konkretnych zarzutów, przełożony sporządza ocenę po raz drugi i sam decyduje, co w niej zmienić.",
        ],
        bullets: [],
      },
      {
        heading: "Co dalej",
        paragraphs: [],
        bullets: [
          "Jeśli sprzeciw zostanie uwzględniony, ocenę zmienia się albo sporządza po raz drugi; nie można jej wtedy obniżyć.",
          "Od oceny sporządzonej po raz drugi przysługuje ponowny sprzeciw.",
          "Gdy sprzeciw nie zostanie rozpatrzony w terminie albo nie zostanie uwzględniony, możesz w ciągu 14 dni odwołać się do sądu pracy. Termin liczy się od dnia doręczenia decyzji albo od dnia upływu terminu na rozpatrzenie sprzeciwu.",
        ],
      },
    ],
    readingMinutes: 2,
    source: "material_kprm",
    sourceRef: `${GUIDE}, pkt 7; ustawa o służbie cywilnej, art. 83`,
    published: true,
  },
];
