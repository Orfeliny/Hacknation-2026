# Deklaracja dostępności: Azymut

> Szkic do przeglądu przez zespół. Pola w nawiasach kwadratowych wymagają uzupełnienia przez podmiot odpowiedzialny i (w razie potrzeby) prawnika. Nie publikować przed tym uzupełnieniem.

Data przygotowania szkicu: 2026-11-21.

## Stan zgodności

Aplikacja jest **częściowo zgodna** z WCAG 2.1 na poziomie AA (Web Content Accessibility Guidelines, wytyczne dostępności treści internetowych). Ocena dotyczy ścieżki demo wymienionej poniżej, a nie całej aplikacji. Wynik jest częściowy, bo nie wykonano jeszcze testu z czytnikiem ekranu (patrz niżej).

## Zakres

Ścieżka demo:

- strona główna (`/`),
- oceny okresowe, w tym wszystkie sześć kroków kreatora (`/oceny`),
- moja ocena (`/moja-ocena`),
- HR partner (`/hr-partner`),
- wydruk arkusza (`/druk`),
- przepisy (`/przepisy`).

## Sposób sprawdzenia

Sprawdzenie wykonano 2026-11-21 na lokalnej wersji deweloperskiej z danymi demo:

- **Automatyczny audyt (axe-core 4).** Reguły WCAG 2.0 i 2.1 poziomów A i AA, uruchomione na każdej stronie ścieżki demo w każdej z pięciu ról demo (przełożony, oceniany, kadry, dyrektor, administrator), a także na każdym z sześciu kroków kreatora oceny. Wynik po poprawkach: 0 naruszeń, zarówno na komputerze (1280 px), jak i na wąskim ekranie (320 px).
- **Nawigacja klawiaturą.** Kreator oceny przeszedł przez wszystkie sześć kroków wyłącznie klawiaturą (Tab, strzałki, Enter, wpisywanie tekstu), łącznie z potwierdzeniem oceny przez oceniającego i ocenianego. Każdy element fokusowany klawiaturą ma widoczny wskaźnik fokusu. Pozostałe strony ścieżki demo przejrzano klawiszem Tab.
- **Wąski ekran.** Strony ścieżki demo mieszczą się w szerokości 320 px bez poziomego przewijania całej strony (kryterium 1.4.10, Reflow). Szerokie tabele (arkusz oceny, tabele na stronie przepisów) przewija się w osobnym obszarze dostępnym z klawiatury i opisanym nazwą.
- **Przegląd kodu.** Stan kroków kreatora oznaczono tekstem i symbolem, a nie tylko kolorem. Sygnały HR partnera mają etykiety tekstowe.

## Poprawki wprowadzone po audycie

- Każda strona ścieżki demo ma własny tytuł (np. „Oceny okresowe”, „Wydruk arkusza oceny”) zamiast wspólnego tytułu aplikacji (kryterium 2.4.2).
- Kroki kreatora: zakończone kroki mają znak ✓ i tekst „zakończony”, a przyszłe tekst „do zrobienia” dla czytników ekranu. Bieżący krok jest dodatkowo pogrubiony i obramowany (kryterium 1.4.1).
- Arkusz do wydruku i tabele na stronie przepisów przewijają się w obszarze dostępnym z klawiatury (kryteria 1.4.10 i 2.1.1).

## Co jeszcze sprawdzimy

- testu z czytnikiem ekranu (np. NVDA, VoiceOver),
- audytu Lighthouse (zastąpiono go axe-core),
- testu przy powiększeniu tekstu do 200% i zmienionych odstępach tekstu,
- ręcznego sprawdzenia kontrastu elementów graficznych poza regułami axe.

## Treści niedostępne i ograniczenia

- Na ścieżce demo nie ma wykresów, więc nie ma czego opisywać tekstowo. Wykres w narzędziach deweloperskich (`/dev/model-domain`) nie należy do ścieżki demo.
- Widok „Moja ocena” jest przeznaczony na komputer (minimum 1024 px szerokości) i na węższym ekranie pokazuje o tym komunikat.
- Strony powiązane z kreatorem, które jeszcze nie powstały (przygotowanie do rozmów, projekt treści oceny), nie były sprawdzane.

## Zgodność z innymi wymogami

Dokument obejmuje wyłącznie dostępność cyfrową. Zgodność z Krajowymi Ramami Interoperacyjności (KRI) i Krajowym Systemem Cyberbezpieczeństwa (KSC) nie jest tu oceniana.

## Informacje zwrotne i kontakt

[Adres e-mail lub formularz do zgłaszania barier dostępności: do uzupełnienia przez zespół.]

[Dane podmiotu odpowiedzialnego: do uzupełnienia.]

## Procedura odwoławcza

[Procedura dochodzenia roszczeń i organ egzekwujący zgodnie z ustawą z 4 kwietnia 2019 r. o dostępności cyfrowej stron internetowych i aplikacji mobilnych podmiotów publicznych: do uzupełnienia przez prawnika.]
