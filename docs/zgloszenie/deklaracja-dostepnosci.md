# Deklaracja dostępności: Cyfrowy Asystent Ocen Okresowych (szkic)

> Szkic do przeglądu przez zespół. Pola w nawiasach kwadratowych wymagają uzupełnienia przez podmiot odpowiedzialny i (w razie potrzeby) prawnika. Nie publikować przed tym uzupełnieniem.

Data przygotowania szkicu: 2026-11-21.

## Stan zgodności

Aplikacja jest **częściowo zgodna** z WCAG 2.1 na poziomie AA (Web Content Accessibility Guidelines, wytyczne dostępności treści internetowych). Ocena dotyczy ścieżki demo wymienionej poniżej, a nie całej aplikacji.

## Zakres

Ścieżka demo:

- strona główna (`/`),
- oceny okresowe (`/oceny`),
- moja ocena (`/moja-ocena`),
- HR partner (`/hr-partner`),
- wydruk arkusza (`/druk`),
- przepisy (`/przepisy`).

## Sposób sprawdzenia

Sprawdzenie wykonano 2026-11-21 na lokalnej wersji deweloperskiej z danymi demo:

- **Automatyczny audyt (axe-core).** Reguły WCAG 2.0 i 2.1 poziomów A i AA, uruchomione po załadowaniu każdej strony ścieżki demo w każdej z pięciu ról demo (przełożony, oceniany, kadry, dyrektor, administrator). Wynik: 0 naruszeń. Audyt objął stan początkowy stron i pierwszy krok kreatora oceny, a nie każdy krok.
- **Nawigacja klawiaturą.** Przejście klawiszem Tab przez pierwsze fokusowalne elementy każdej strony ścieżki demo. Każdy fokusowany element miał widoczny wskaźnik fokusu. Nie wykonano pełnego przejścia kreatora oceny wyłącznie klawiaturą.

Nie wykonano jeszcze:

- testu z czytnikiem ekranu (np. NVDA, VoiceOver),
- pełnego przejścia kreatora oceny klawiaturą,
- testu na wąskim ekranie (telefon) i przy powiększeniu tekstu,
- audytu Lighthouse.

## Treści niedostępne i ograniczenia

- Na ścieżce demo nie ma wykresów, więc nie ma czego opisywać tekstowo. Wykresy w narzędziach deweloperskich (`/dev/model-domain`) nie należą do ścieżki demo.
- Nie zweryfikowano ręcznie, czy wszystkie statusy (np. ostrzeżenia w panelu HR partnera) są oznaczone nie tylko kolorem. Automatyczny audyt sprawdza kontrast, ale nie to kryterium.
- Sprawdzono układ na komputerze. Wersja na wąski ekran (telefon) nie została jeszcze sprawdzona.

## Zgodność z innymi wymogami

Dokument obejmuje wyłącznie dostępność cyfrową. Zgodność z Krajowymi Ramami Interoperacyjności (KRI) i Krajowym Systemem Cyberbezpieczeństwa (KSC) nie jest tu oceniana.

## Informacje zwrotne i kontakt

[Adres e-mail lub formularz do zgłaszania barier dostępności: do uzupełnienia przez zespół.]

[Dane podmiotu odpowiedzialnego: do uzupełnienia.]

## Procedura odwoławcza

[Procedura dochodzenia roszczeń i organ egzekwujący zgodnie z ustawą z 4 kwietnia 2019 r. o dostępności cyfrowej stron internetowych i aplikacji mobilnych podmiotów publicznych: do uzupełnienia przez prawnika.]
