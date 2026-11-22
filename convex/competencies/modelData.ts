// Pure data, validated by loadModel in model.ts. To use the organizer's competency model, replace
// this object (and bump modelVersion); no code change is needed.
// Indicator texts are quoted from annex 1 to the 2016 regulation (same as RULES_2016.catalog).
// The per-level behaviour descriptions are DEMO data written by the team: the organizer's model
// was not available in the repo, so `source` is "demo" and the UI must say so.
export const MODEL_DATA: unknown = {
  modelVersion: "demo-2026-11-21",
  name: "Model kompetencji (wersja demonstracyjna)",
  source: "demo",
  sourceNote:
    "Wskaźniki behawioralne: załącznik nr 1 do rozporządzenia PRM z 4.04.2016 (Dz.U. poz. 470). Opisy zachowań na poziomach: dane demonstracyjne zespołu, nie pochodzą z modelu kompetencyjnego organizatora.",
  levels: [
    { id: "1", label: "znacznie poniżej oczekiwań" },
    { id: "3", label: "poniżej oczekiwań" },
    { id: "5", label: "na poziomie oczekiwań" },
    { id: "7", label: "powyżej oczekiwań" },
    { id: "9", label: "znacznie powyżej oczekiwań" },
  ],
  suggestion: {
    rule: "median",
    minObservedShare: 0.5,
    anchorLevelId: "5",
  },
  competencies: [
    {
      id: "komunikacja",
      criterionId: "komunikacja",
      name: "Komunikacja",
      indicators: [
        {
          id: "komunikacja-1",
          text: "Koncentrowanie się na wypowiedzi rozmówcy i dbanie o wzajemne zrozumienie.",
          levels: {
            "1": "Przerywa rozmówcy, nie sprawdza, czy został zrozumiany; częste nieporozumienia.",
            "3": "Słucha, ale rzadko dopytuje; nieporozumienia wyjaśnia dopiero po zwróceniu uwagi.",
            "5": "Słucha uważnie, dopytuje o niejasności i upewnia się, że obie strony rozumieją ustalenia.",
            "7": "Także w trudnych rozmowach parafrazuje i podsumowuje ustalenia, zapobiegając nieporozumieniom.",
            "9": "Wzór dla innych: prowadzi rozmowy tak, że strony szybko dochodzą do wspólnego rozumienia, także w konflikcie.",
          },
        },
        {
          id: "komunikacja-2",
          text: "Wypowiadanie się w sposób jasny i precyzyjny, dostosowany do sytuacji i rozmówcy (dobieranie stylu, języka i treści).",
          levels: {
            "1": "Wypowiedzi są chaotyczne lub niezrozumiałe dla odbiorcy; nie dostosowuje języka.",
            "3": "Mówi zrozumiale w prostych sprawach, w złożonych bywa nieprecyzyjny.",
            "5": "Mówi jasno i rzeczowo, dobiera język do rozmówcy w typowych sytuacjach.",
            "7": "Jasno tłumaczy złożone sprawy różnym odbiorcom, także spoza urzędu.",
            "9": "Wyjaśnia trudne zagadnienia w sposób, który inni przejmują jako wzór; reprezentuje komórkę w kluczowych rozmowach.",
          },
        },
        {
          id: "komunikacja-3",
          text: "Formułowanie jasnych i precyzyjnych wypowiedzi pisemnych dostosowanych do sytuacji i odbiorcy (dobieranie stylu, języka i treści).",
          levels: {
            "1": "Pisma wymagają gruntownych poprawek; zawierają błędy merytoryczne lub językowe.",
            "3": "Pisma są poprawne, ale często wymagają redakcji lub uzupełnień.",
            "5": "Pisze poprawnie i zrozumiale, dostosowując styl do odbiorcy; pisma rzadko wymagają poprawek.",
            "7": "Przygotowuje przejrzyste pisma także w złożonych sprawach; inni proszą go o redakcję tekstów.",
            "9": "Tworzy wzorcowe pisma i szablony używane w komórce; uczy innych prostego języka.",
          },
        },
        {
          id: "komunikacja-4",
          text: "Przedstawianie przekonujących argumentów odpowiednio do sytuacji.",
          levels: {
            "1": "Nie uzasadnia swojego stanowiska albo używa argumentów nietrafionych.",
            "3": "Przedstawia argumenty, ale słabo dopasowane do rozmówcy; rzadko przekonuje.",
            "5": "Uzasadnia stanowisko rzeczowymi argumentami dopasowanymi do sytuacji.",
            "7": "Skutecznie przekonuje także sceptycznych rozmówców, przewidując ich zastrzeżenia.",
            "9": "Buduje poparcie dla trudnych rozwiązań w urzędzie i poza nim; jego argumentacja jest wykorzystywana przez innych.",
          },
        },
      ],
    },
    {
      id: "kreatywnosc",
      criterionId: "kreatywnosc",
      name: "Kreatywność",
      indicators: [
        {
          id: "kreatywnosc-1",
          text: "Proponowanie lub tworzenie nowych rozwiązań.",
          levels: {
            "1": "Nie zgłasza żadnych propozycji, także gdy jest o nie proszony.",
            "3": "Zgłasza propozycje rzadko i tylko na wyraźną prośbę.",
            "5": "Proponuje usprawnienia w swoim obszarze pracy.",
            "7": "Z własnej inicjatywy proponuje rozwiązania, które zostają wdrożone.",
            "9": "Inicjuje nowe rozwiązania o znaczeniu dla całej komórki lub urzędu i doprowadza je do wdrożenia.",
          },
        },
        {
          id: "kreatywnosc-2",
          text: "Nieschematyczne podejście do zadań.",
          levels: {
            "1": "Trzyma się utartego sposobu działania, nawet gdy ten wyraźnie nie działa.",
            "3": "Zmienia podejście dopiero po wskazaniu przez innych.",
            "5": "Szuka innych sposobów, gdy typowe podejście nie przynosi efektu.",
            "7": "Samodzielnie łączy różne podejścia i znajduje nieoczywiste rozwiązania.",
            "9": "Zachęca zespół do nieschematycznego myślenia i tworzy do tego warunki.",
          },
        },
      ],
    },
    {
      id: "negocjowanie",
      criterionId: "negocjowanie",
      name: "Negocjowanie",
      indicators: [
        {
          id: "negocjowanie-1",
          text: "Przygotowywanie się do negocjacji, w szczególności opracowanie projektu stanowiska, zakresu możliwych ustępstw i argumentacji.",
          levels: {
            "1": "Przystępuje do negocjacji bez przygotowanego stanowiska.",
            "3": "Przygotowuje stanowisko, ale bez zakresu ustępstw i argumentacji.",
            "5": "Przygotowuje stanowisko, zakres możliwych ustępstw i argumenty.",
            "7": "Przygotowuje warianty stanowiska i analizuje interesy drugiej strony.",
            "9": "Przygotowuje strategię negocjacyjną dla zespołu; inni korzystają z jego materiałów.",
          },
        },
        {
          id: "negocjowanie-2",
          text: "Stosowanie technik i strategii negocjacyjnych.",
          levels: {
            "1": "Nie stosuje żadnych technik; ustępuje lub eskaluje spór.",
            "3": "Stosuje pojedyncze techniki, niekonsekwentnie.",
            "5": "Dobiera techniki negocjacyjne do sytuacji.",
            "7": "Elastycznie zmienia strategię w trakcie trudnych negocjacji.",
            "9": "Prowadzi złożone negocjacje wielostronne i uczy technik innych.",
          },
        },
        {
          id: "negocjowanie-3",
          text: "Osiągnięcie efektu negocjacji akceptowanego przez przełożonych.",
          levels: {
            "1": "Wyniki negocjacji zwykle nie są akceptowane przez przełożonych.",
            "3": "Wyniki bywają akceptowane, ale często wymagają renegocjacji.",
            "5": "Osiąga wyniki akceptowane przez przełożonych.",
            "7": "Osiąga wyniki lepsze od założonych.",
            "9": "Osiąga wyniki znacząco lepsze od założonych, także w negocjacjach o dużej wadze.",
          },
        },
      ],
    },
    {
      id: "organizacja_pracy",
      criterionId: "organizacja_pracy",
      name: "Organizacja pracy i orientacja na osiąganie celów",
      indicators: [
        {
          id: "organizacja_pracy-1",
          text: "Określanie sposobu realizacji zadań/celów.",
          levels: {
            "1": "Rozpoczyna zadania bez planu; potrzebuje stałych wskazówek.",
            "3": "Planuje proste zadania, przy złożonych potrzebuje wsparcia.",
            "5": "Samodzielnie planuje sposób realizacji powierzonych zadań.",
            "7": "Planuje złożone zadania z uwzględnieniem ryzyk i zależności.",
            "9": "Planuje przedsięwzięcia obejmujące wiele osób lub komórek; inni korzystają z jego planów.",
          },
        },
        {
          id: "organizacja_pracy-2",
          text: "Realizowanie zadań/celów w kolejności uwzględniającej ich wagę i pilność (ustalanie priorytetów działania).",
          levels: {
            "1": "Nie odróżnia spraw pilnych od ważnych; ważne terminy są zagrożone.",
            "3": "Ustala priorytety dopiero po interwencji przełożonego.",
            "5": "Samodzielnie ustala priorytety zgodnie z wagą i pilnością spraw.",
            "7": "Utrzymuje właściwe priorytety także przy dużym obciążeniu i zmianach.",
            "9": "Pomaga zespołowi ustalać priorytety w sytuacjach przeciążenia.",
          },
        },
        {
          id: "organizacja_pracy-3",
          text: "Dobieranie niezbędnych zasobów umożliwiających realizację zadań/celów.",
          levels: {
            "1": "Nie rozpoznaje, jakich zasobów potrzebuje; zadania stają.",
            "3": "Zgłasza potrzeby zasobów późno lub niepełnie.",
            "5": "Z wyprzedzeniem określa i pozyskuje potrzebne zasoby.",
            "7": "Optymalnie wykorzystuje zasoby, także współdzielone z innymi komórkami.",
            "9": "Organizuje zasoby dla większych przedsięwzięć i usprawnia ich wykorzystanie w urzędzie.",
          },
        },
        {
          id: "organizacja_pracy-4",
          text: "Dostosowywanie się do zmieniających się okoliczności.",
          levels: {
            "1": "Zmiana okoliczności blokuje realizację zadania.",
            "3": "Dostosowuje się powoli i wymaga wsparcia.",
            "5": "Dostosowuje plan do zmienionych okoliczności.",
            "7": "Szybko przestawia się na nowe warunki, zachowując jakość pracy.",
            "9": "Wyprzedza zmiany i przygotowuje do nich zespół.",
          },
        },
        {
          id: "organizacja_pracy-5",
          text: "Wytrwałość i zaangażowanie w realizację zadań/celów.",
          levels: {
            "1": "Porzuca zadania przy pierwszych trudnościach.",
            "3": "Kończy zadania, ale wymaga przypominania i motywowania.",
            "5": "Doprowadza zadania do końca mimo trudności.",
            "7": "Wykazuje wysokie zaangażowanie także w trudnych i długotrwałych zadaniach.",
            "9": "Swoją postawą mobilizuje innych do realizacji wymagających celów.",
          },
        },
      ],
    },
    {
      id: "orientacja_na_klienta",
      criterionId: "orientacja_na_klienta",
      name: "Orientacja na klienta/interesanta",
      indicators: [
        {
          id: "orientacja_na_klienta-1",
          text: "Taktowne zachowanie, wyrażające szacunek i zrozumienie dla drugiej osoby.",
          levels: {
            "1": "Zdarzają mu się zachowania nietaktowne wobec interesantów.",
            "3": "Jest uprzejmy, ale w trudnych sytuacjach traci takt.",
            "5": "Zachowuje się taktownie i z szacunkiem wobec interesantów.",
            "7": "Zachowuje takt i zrozumienie także wobec trudnych interesantów.",
            "9": "Rozładowuje napięte sytuacje z interesantami; jest wzorem dla innych.",
          },
        },
        {
          id: "orientacja_na_klienta-2",
          text: "Reagowanie na potrzeby klienta/interesanta, w szczególności rozpoznawanie jego potrzeb i proponowanie rozwiązań.",
          levels: {
            "1": "Nie rozpoznaje potrzeb interesanta; odsyła go bez rozwiązania.",
            "3": "Rozpoznaje potrzeby tylko w typowych sprawach.",
            "5": "Rozpoznaje potrzeby interesanta i proponuje rozwiązania w ramach przepisów.",
            "7": "Przewiduje potrzeby interesantów i proponuje rozwiązania wykraczające poza bieżącą sprawę.",
            "9": "Usprawnia obsługę interesantów w komórce lub urzędzie.",
          },
        },
      ],
    },
    {
      id: "podejmowanie_decyzji",
      criterionId: "podejmowanie_decyzji",
      name: "Podejmowanie decyzji i odpowiedzialność",
      indicators: [
        {
          id: "podejmowanie_decyzji-1",
          text: "Wypracowywanie alternatywnych rozwiązań na podstawie analizy informacji, w szczególności potencjalnego ryzyka.",
          levels: {
            "1": "Rozważa jedno rozwiązanie, bez analizy ryzyka.",
            "3": "Rozważa alternatywy powierzchownie, ryzyko pomija.",
            "5": "Przygotowuje alternatywy na podstawie analizy informacji i ryzyka.",
            "7": "Przygotowuje dobrze uzasadnione warianty także w złożonych sprawach.",
            "9": "Jego analizy wariantów są podstawą decyzji kierownictwa.",
          },
        },
        {
          id: "podejmowanie_decyzji-2",
          text: "Podejmowanie decyzji (decyzyjność).",
          levels: {
            "1": "Unika decyzji w swoim zakresie; przekazuje je wyżej.",
            "3": "Podejmuje decyzje z opóźnieniem lub po potwierdzeniu przez innych.",
            "5": "Podejmuje decyzje w swoim zakresie w odpowiednim czasie.",
            "7": "Podejmuje trafne decyzje także pod presją czasu i przy niepełnych informacjach.",
            "9": "Podejmuje trudne decyzje o dużej wadze w sposób, który zespół rozumie i akceptuje.",
          },
        },
        {
          id: "podejmowanie_decyzji-3",
          text: "Przyjmowanie odpowiedzialności za efekty podjętych decyzji.",
          levels: {
            "1": "Przerzuca odpowiedzialność za skutki decyzji na innych.",
            "3": "Przyjmuje odpowiedzialność tylko za decyzje zakończone sukcesem.",
            "5": "Przyjmuje odpowiedzialność za skutki swoich decyzji.",
            "7": "Otwarcie omawia skutki decyzji i sam proponuje korekty.",
            "9": "Bierze odpowiedzialność także za decyzje zespołu i wyciąga z nich wnioski dla innych.",
          },
        },
      ],
    },
    {
      id: "sytuacje_kryzysowe",
      criterionId: "sytuacje_kryzysowe",
      name: "Radzenie sobie w sytuacjach kryzysowych",
      indicators: [
        {
          id: "sytuacje_kryzysowe-1",
          text: "Rozpoznawanie sytuacji kryzysowych i informowanie o nich zainteresowanych.",
          levels: {
            "1": "Nie dostrzega sytuacji kryzysowej albo nie informuje o niej.",
            "3": "Rozpoznaje kryzys z opóźnieniem; informuje niepełnie.",
            "5": "Rozpoznaje kryzys i informuje zainteresowanych bez zwłoki.",
            "7": "Dostrzega wczesne sygnały kryzysu i uprzedza o nim zawczasu.",
            "9": "Tworzy w komórce sposób wczesnego wykrywania kryzysów.",
          },
        },
        {
          id: "sytuacje_kryzysowe-2",
          text: "Podejmowanie działań mających na celu rozwiązanie kryzysu.",
          levels: {
            "1": "W kryzysie nie podejmuje działań.",
            "3": "Działa tylko według wskazówek innych.",
            "5": "Podejmuje adekwatne działania w swoim zakresie.",
            "7": "Skutecznie koordynuje działania kilku osób w kryzysie.",
            "9": "Kieruje rozwiązaniem poważnego kryzysu, zachowując spokój zespołu.",
          },
        },
        {
          id: "sytuacje_kryzysowe-3",
          text: "Wyciąganie wniosków z sytuacji kryzysowych.",
          levels: {
            "1": "Nie wyciąga wniosków; te same błędy się powtarzają.",
            "3": "Wyciąga wnioski tylko na prośbę przełożonego.",
            "5": "Wyciąga wnioski i stosuje je w swojej pracy.",
            "7": "Formułuje wnioski i proponuje zmiany procedur.",
            "9": "Doprowadza do trwałych zmian zapobiegających kryzysom w urzędzie.",
          },
        },
      ],
    },
    {
      id: "rzetelnosc",
      criterionId: "rzetelnosc",
      name: "Rzetelność",
      indicators: [
        {
          id: "rzetelnosc-1",
          text: "Wykonywanie zadań zgodnie z obowiązującymi standardami (przepisami, zasadami, procedurami) oraz dbałość o jakość rezultatów.",
          levels: {
            "1": "Często narusza procedury; wyniki pracy wymagają poprawek.",
            "3": "Zdarzają mu się uchybienia procedur lub błędy w wynikach.",
            "5": "Pracuje zgodnie z przepisami i procedurami; wyniki są dobrej jakości.",
            "7": "Wyniki są bezbłędne także w złożonych sprawach; sam wykrywa ryzyka niezgodności.",
            "9": "Podnosi standardy jakości w komórce; inni konsultują z nim zgodność z procedurami.",
          },
        },
        {
          id: "rzetelnosc-2",
          text: "Dotrzymywanie zobowiązań (realizacja zadań) w wyznaczonym czasie.",
          levels: {
            "1": "Często nie dotrzymuje terminów bez uprzedzenia.",
            "3": "Zdarza mu się przekraczać terminy.",
            "5": "Dotrzymuje terminów; o ryzyku opóźnienia uprzedza.",
            "7": "Dotrzymuje terminów także przy dużym obciążeniu, często przed czasem.",
            "9": "Pomaga innym dotrzymać terminów; jest niezawodny w sprawach pilnych.",
          },
        },
      ],
    },
    {
      id: "myslenie_analityczne",
      criterionId: "myslenie_analityczne",
      name: "Myślenie analityczne",
      indicators: [
        {
          id: "myslenie_analityczne-1",
          text: "Rozróżnianie informacji istotnych i nieistotnych.",
          levels: {
            "1": "Nie odróżnia informacji istotnych od nieistotnych.",
            "3": "Odróżnia je w prostych sprawach, w złożonych gubi istotę.",
            "5": "Trafnie wybiera informacje istotne dla sprawy.",
            "7": "Szybko wyodrębnia istotę także z obszernych, niejednoznacznych materiałów.",
            "9": "Porządkuje informacje dla innych; jego zestawienia są podstawą pracy zespołu.",
          },
        },
        {
          id: "myslenie_analityczne-2",
          text: "Dostrzeganie zależności między informacjami.",
          levels: {
            "1": "Nie dostrzega oczywistych zależności.",
            "3": "Dostrzega zależności tylko po ich wskazaniu.",
            "5": "Dostrzega zależności między informacjami w swoim obszarze.",
            "7": "Dostrzega nieoczywiste zależności, także między obszarami.",
            "9": "Wykrywa zależności o znaczeniu dla całego urzędu.",
          },
        },
        {
          id: "myslenie_analityczne-3",
          text: "Formułowanie wniosków.",
          levels: {
            "1": "Nie formułuje wniosków albo są one nieuzasadnione.",
            "3": "Formułuje wnioski ogólnikowe.",
            "5": "Formułuje trafne, uzasadnione wnioski.",
            "7": "Formułuje wnioski, które wyznaczają dalsze działania.",
            "9": "Jego wnioski są wykorzystywane przy decyzjach strategicznych.",
          },
        },
      ],
    },
    {
      id: "wykorzystywanie_wiedzy",
      criterionId: "wykorzystywanie_wiedzy",
      name: "Wykorzystywanie wiedzy i doskonalenie zawodowe",
      indicators: [
        {
          id: "wykorzystywanie_wiedzy-1",
          text: "Wykorzystywanie wiedzy przy realizacji zadań na zajmowanym stanowisku pracy.",
          levels: {
            "1": "Braki wiedzy utrudniają realizację podstawowych zadań.",
            "3": "Stosuje wiedzę w typowych sprawach, w nietypowych potrzebuje pomocy.",
            "5": "Sprawnie wykorzystuje wiedzę w zadaniach na stanowisku.",
            "7": "Wykorzystuje wiedzę także w sprawach złożonych i nietypowych.",
            "9": "Jest ekspertem, do którego zwracają się inni.",
          },
        },
        {
          id: "wykorzystywanie_wiedzy-2",
          text: "Doskonalenie wiedzy i umiejętności niezbędnych do wykonywania zadań na zajmowanym stanowisku pracy, w szczególności wyszukiwanie i pozyskiwanie wiedzy, korzystanie z dobrych praktyk i doświadczeń innych.",
          levels: {
            "1": "Nie rozwija wiedzy, także gdy zmieniają się przepisy.",
            "3": "Doskonali się tylko na polecenie przełożonego.",
            "5": "Na bieżąco uzupełnia wiedzę potrzebną na stanowisku.",
            "7": "Z własnej inicjatywy pozyskuje wiedzę i dobre praktyki innych.",
            "9": "Dzieli się pozyskaną wiedzą i organizuje doskonalenie innych.",
          },
        },
        {
          id: "wykorzystywanie_wiedzy-3",
          text: "Korzystanie z dostępnych źródeł informacji, rozwiązań i technologii.",
          levels: {
            "1": "Nie korzysta z dostępnych źródeł i narzędzi.",
            "3": "Korzysta z wąskiego zestawu źródeł i narzędzi.",
            "5": "Korzysta z dostępnych źródeł, rozwiązań i narzędzi.",
            "7": "Sprawnie korzysta z nowych narzędzi i źródeł, usprawniając pracę.",
            "9": "Wprowadza nowe narzędzia i źródła do pracy zespołu.",
          },
        },
      ],
    },
    {
      id: "wspolpraca",
      criterionId: "wspolpraca",
      name: "Współpraca",
      indicators: [
        {
          id: "wspolpraca-1",
          text: "Włączanie się w działania realizowane razem z innymi osobami, jeśli istnieje taka możliwość.",
          levels: {
            "1": "Unika wspólnych działań.",
            "3": "Włącza się we wspólne działania tylko na polecenie.",
            "5": "Chętnie włącza się we wspólne działania.",
            "7": "Inicjuje wspólne działania z innymi osobami i komórkami.",
            "9": "Buduje trwałą współpracę między komórkami lub instytucjami.",
          },
        },
        {
          id: "wspolpraca-2",
          text: "Dbanie o przepływ informacji.",
          levels: {
            "1": "Zatrzymuje informacje potrzebne innym.",
            "3": "Przekazuje informacje z opóźnieniem lub niepełne.",
            "5": "Przekazuje innym potrzebne informacje na czas.",
            "7": "Z wyprzedzeniem dba, by właściwe osoby miały potrzebne informacje.",
            "9": "Usprawnia obieg informacji w komórce lub urzędzie.",
          },
        },
        {
          id: "wspolpraca-3",
          text: "Dbanie o dobrą atmosferę i otwartość we współpracy.",
          levels: {
            "1": "Swoim zachowaniem pogarsza atmosferę w zespole.",
            "3": "Bywa nieprzystępny we współpracy.",
            "5": "Jest otwarty i życzliwy we współpracy.",
            "7": "Aktywnie dba o dobrą atmosferę, także w napiętych sytuacjach.",
            "9": "Kształtuje kulturę otwartości w zespole.",
          },
        },
        {
          id: "wspolpraca-4",
          text: "Dostrzeganie wkładu pracy innych osób.",
          levels: {
            "1": "Pomija lub przypisuje sobie wkład innych.",
            "3": "Rzadko zauważa wkład innych.",
            "5": "Dostrzega i docenia wkład innych osób.",
            "7": "Wyraźnie i na bieżąco docenia wkład innych, także wobec przełożonych.",
            "9": "Buduje w zespole zwyczaj wzajemnego doceniania.",
          },
        },
        {
          id: "wspolpraca-5",
          text: "Branie pod uwagę zdania innych osób.",
          levels: {
            "1": "Lekceważy zdanie innych.",
            "3": "Wysłuchuje innych, ale rzadko uwzględnia ich zdanie.",
            "5": "Uwzględnia zdanie innych przy wspólnych ustaleniach.",
            "7": "Aktywnie zasięga opinii innych przed ważnymi ustaleniami.",
            "9": "Tworzy warunki, w których wszyscy członkowie zespołu mogą wnieść swoje zdanie.",
          },
        },
        {
          id: "wspolpraca-6",
          text: "Dzielenie się wiedzą i doświadczeniem.",
          levels: {
            "1": "Nie dzieli się wiedzą, także na prośbę.",
            "3": "Dzieli się wiedzą tylko na prośbę.",
            "5": "Chętnie dzieli się wiedzą i doświadczeniem.",
            "7": "Z własnej inicjatywy przekazuje wiedzę, np. wdraża nowe osoby.",
            "9": "Prowadzi szkolenia lub mentoring, porządkuje wiedzę zespołu.",
          },
        },
      ],
    },
    {
      id: "wystapienia_publiczne",
      criterionId: "wystapienia_publiczne",
      name: "Wystąpienia publiczne",
      indicators: [
        {
          id: "wystapienia_publiczne-1",
          text: "Wykorzystywanie różnych środków przekazu (np. narzędzi multimedialnych) i dbałość o sposób prezentacji (w tym autoprezentacji).",
          levels: {
            "1": "Prezentacje są nieprzygotowane; środki przekazu utrudniają odbiór.",
            "3": "Korzysta ze środków przekazu w ograniczonym zakresie.",
            "5": "Dobiera środki przekazu do celu; dba o sposób prezentacji.",
            "7": "Prezentuje w sposób angażujący, sprawnie łącząc różne środki.",
            "9": "Jego wystąpienia są wzorem dla innych; przygotowuje innych do wystąpień.",
          },
        },
        {
          id: "wystapienia_publiczne-2",
          text: "Nawiązywanie i utrzymywanie kontaktu z audytorium.",
          levels: {
            "1": "Nie nawiązuje kontaktu z audytorium.",
            "3": "Kontakt z audytorium jest słaby.",
            "5": "Nawiązuje i utrzymuje kontakt z audytorium.",
            "7": "Utrzymuje uwagę także dużego lub trudnego audytorium.",
            "9": "Swobodnie prowadzi dialog z każdym audytorium.",
          },
        },
        {
          id: "wystapienia_publiczne-3",
          text: "Zarządzanie czasem wystąpienia, w szczególności przestrzeganie ram czasowych, elastyczne reagowanie na potrzeby audytorium.",
          levels: {
            "1": "Znacznie przekracza czas lub nie realizuje programu wystąpienia.",
            "3": "Ma trudności z mieszczeniem się w czasie.",
            "5": "Mieści się w czasie wystąpienia.",
            "7": "Elastycznie dostosowuje przebieg do potrzeb audytorium, mieszcząc się w czasie.",
            "9": "Prowadzi złożone wydarzenia, panując nad czasem wszystkich wystąpień.",
          },
        },
        {
          id: "wystapienia_publiczne-4",
          text: "Radzenie sobie ze stresem i emocjami, w szczególności wywołanymi krytyką i trudnymi pytaniami.",
          levels: {
            "1": "Krytyka lub trudne pytania wytrącają go z równowagi.",
            "3": "Na trudne pytania reaguje nerwowo lub wymijająco.",
            "5": "Spokojnie odpowiada na krytykę i trudne pytania.",
            "7": "Wykorzystuje trudne pytania do wzmocnienia przekazu.",
            "9": "Zachowuje opanowanie w sytuacjach o dużym ciężarze, np. przed mediami.",
          },
        },
      ],
    },
    {
      id: "zarzadzanie_ludzmi",
      criterionId: "zarzadzanie_ludzmi",
      name: "Zarządzanie ludźmi",
      indicators: [
        {
          id: "zarzadzanie_ludzmi-1",
          text: "Przydzielanie zakresu odpowiedzialności, zadań i uprawnień pracownikom (delegowanie zadań).",
          levels: {
            "1": "Nie deleguje zadań albo deleguje je bez uprawnień i jasnych oczekiwań.",
            "3": "Deleguje nierównomiernie lub bez określenia oczekiwań.",
            "5": "Deleguje zadania z jasnym zakresem odpowiedzialności i uprawnień.",
            "7": "Deleguje z uwzględnieniem kompetencji i rozwoju pracowników.",
            "9": "Buduje samodzielny zespół, któremu powierza zadania o dużej wadze.",
          },
        },
        {
          id: "zarzadzanie_ludzmi-2",
          text: "Monitorowanie realizacji zadań oraz w razie potrzeby podejmowanie działań korygujących lub zapobiegawczych.",
          levels: {
            "1": "Nie monitoruje realizacji zadań; problemy wychodzą za późno.",
            "3": "Monitoruje nieregularnie; reaguje dopiero na problemy.",
            "5": "Regularnie monitoruje zadania i w razie potrzeby koryguje działania.",
            "7": "Zapobiega problemom, zanim wpłyną na wyniki.",
            "9": "Tworzy system monitorowania używany także przez inne komórki.",
          },
        },
        {
          id: "zarzadzanie_ludzmi-3",
          text: "Motywowanie pracowników.",
          levels: {
            "1": "Swoim zachowaniem demotywuje pracowników.",
            "3": "Motywuje rzadko i schematycznie.",
            "5": "Motywuje pracowników, dostosowując sposoby do osób.",
            "7": "Utrzymuje wysokie zaangażowanie zespołu także w trudnych okresach.",
            "9": "Zespół osiąga wyniki ponad oczekiwania dzięki jego sposobowi motywowania.",
          },
        },
        {
          id: "zarzadzanie_ludzmi-4",
          text: "Udzielanie pracownikom informacji zwrotnej opartej na ocenie ich zaangażowania i sposobu realizacji zadań.",
          levels: {
            "1": "Nie udziela informacji zwrotnej albo jest ona niekonkretna.",
            "3": "Udziela informacji zwrotnej rzadko, głównie przy ocenie.",
            "5": "Regularnie udziela konkretnej informacji zwrotnej.",
            "7": "Udziela informacji zwrotnej na bieżąco, także trudnej, w sposób wspierający.",
            "9": "Buduje w zespole kulturę wzajemnej informacji zwrotnej.",
          },
        },
        {
          id: "zarzadzanie_ludzmi-5",
          text: "Rozwiązywanie konfliktów.",
          levels: {
            "1": "Ignoruje konflikty lub je zaostrza.",
            "3": "Reaguje na konflikty z opóźnieniem.",
            "5": "Rozwiązuje konflikty w zespole.",
            "7": "Rozpoznaje konflikty wcześnie i rozwiązuje je trwale.",
            "9": "Rozwiązuje złożone konflikty między komórkami.",
          },
        },
        {
          id: "zarzadzanie_ludzmi-6",
          text: "Wspieranie pracowników w rozwoju zawodowym, w szczególności identyfikowanie potrzeb rozwojowych, proponowanie działań rozwojowych oraz monitorowanie ich realizacji.",
          levels: {
            "1": "Nie zajmuje się rozwojem pracowników.",
            "3": "Wskazuje potrzeby rozwojowe tylko przy ocenie.",
            "5": "Rozpoznaje potrzeby rozwojowe i proponuje działania.",
            "7": "Planuje i monitoruje rozwój każdego pracownika.",
            "9": "Jego pracownicy awansują i przejmują odpowiedzialne zadania.",
          },
        },
      ],
    },
    {
      id: "zarzadzanie_strategiczne",
      criterionId: "zarzadzanie_strategiczne",
      name: "Zarządzanie strategiczne",
      indicators: [
        {
          id: "zarzadzanie_strategiczne-1",
          text: "Tworzenie wizji oraz wyznaczanie celów strategicznych w oparciu o całościowe i perspektywiczne widzenie organizacji, otoczenia oraz strategie rozwoju.",
          levels: {
            "1": "Nie formułuje wizji ani celów strategicznych.",
            "3": "Cele strategiczne są ogólnikowe lub oderwane od otoczenia.",
            "5": "Wyznacza cele strategiczne spójne ze strategią rozwoju.",
            "7": "Tworzy wizję uwzględniającą długofalowe zmiany otoczenia.",
            "9": "Jego wizja wyznacza kierunek rozwoju urzędu i jest szeroko akceptowana.",
          },
        },
        {
          id: "zarzadzanie_strategiczne-2",
          text: "Formułowanie celów operacyjnych na podstawie celów strategicznych.",
          levels: {
            "1": "Cele operacyjne nie wynikają z celów strategicznych.",
            "3": "Powiązanie celów operacyjnych ze strategicznymi jest słabe.",
            "5": "Formułuje cele operacyjne wynikające z celów strategicznych.",
            "7": "Formułuje mierzalne cele operacyjne i monitoruje ich realizację.",
            "9": "Tworzy spójny system celów w całym urzędzie.",
          },
        },
        {
          id: "zarzadzanie_strategiczne-3",
          text: "Analiza ryzyka planowanych działań o charakterze strategicznym.",
          levels: {
            "1": "Nie analizuje ryzyka działań strategicznych.",
            "3": "Analiza ryzyka jest pobieżna.",
            "5": "Analizuje ryzyko i planuje działania ograniczające.",
            "7": "Prowadzi pogłębioną analizę ryzyka, także długoterminowego.",
            "9": "Wprowadza w urzędzie systemowe zarządzanie ryzykiem.",
          },
        },
      ],
    },
  ],
};
