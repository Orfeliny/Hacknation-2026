# Materiały do wyzwania w markdown

Wersje markdown materiałów dodatkowych do wyzwania (oryginały: PDF, DOCX, XLSX, VSDX, XPDL).
Cel: agenci czytają tekst, bez parsowania formatów binarnych. Każdy plik ma w nagłówku `source`
(dawna ścieżka oryginału).

**Oryginałów nie ma w repozytorium.** Zostały usunięte, a źródłem są materiały od organizatorów
(według opisu wyzwania: Discord). Gdy markdown wygląda na błędny, sprawdź oryginał od organizatorów.
Pole `source` wskazuje plik, z którego powstał dany markdown.

Treść pochodzi z konwersji automatycznej. Układ tabel i numeracja punktów mogły się zmienić.
Teksty prawne czytaj z `01-akty-prawne/`, a nie z pamięci modelu.

## Od czego zacząć

1. `03-schemat-procesu/opis-procesu-i-pojecia.md`: krótki opis procesu i pojęć.
2. `03-schemat-procesu/przeplyw-procesu-bpmn.md`: kroki procesu, role i przejścia.
3. `02-przypadki-uzycia/use-cases-opis.md`: lista przypadków użycia (zakres funkcji systemu).
4. `04-formularze/arkusz-{a,b,c}-schemat-pol.md`: pola formularzy i reguły edycji.
5. `06-materialy-dodatkowe/liczenie-terminow.md`: zasady liczenia terminów.

## Spis plików

| Plik                                                        | Zawartość                                                                              | Uwagi                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `01-akty-prawne/ustawa-o-sluzbie-cywilnej-calosc.md`        | Ustawa o służbie cywilnej, tekst jednolity (Dz. U. 2026 poz. 590)                      | Podział na `## Rozdział` i `### Art.`. Oceny: art. 81-83, 89, 108                                               |
| `01-akty-prawne/ustawa-o-sluzbie-cywilnej-wyciag.md`        | Wyciąg przepisów z ustawy                                                              |                                                                                                                 |
| `01-akty-prawne/rozporzadzenie-oceny-okresowe.md`           | Rozporządzenie PRM z 4.04.2016 (Dz. U. poz. 470): kryteria, skala, tryb, wzory arkuszy | Podział na `### §`                                                                                              |
| `01-akty-prawne/standardy-zarzadzania-zasobami-ludzkimi.md` | Standardy zarządzania ZZL (zarządzenie nr 6 SSC)                                       | Tekst z OCR (możliwe drobne błędy w słowach)                                                                    |
| `02-przypadki-uzycia/use-cases-opis.md`                     | Drzewo przypadków użycia                                                               |                                                                                                                 |
| `02-przypadki-uzycia/use-cases-warunki-brzegowe.md`         | Warunki brzegowe przypadków użycia                                                     |                                                                                                                 |
| `02-przypadki-uzycia/przypadki-uzycia-a3.md`                | Diagram przypadków użycia (tekst z PDF)                                                | Tylko etykiety, bez relacji                                                                                     |
| `02-przypadki-uzycia/przypadki-uzycia-visio-tekst.md`       | Etykiety z pliku Visio                                                                 | Tylko etykiety, bez relacji                                                                                     |
| `03-schemat-procesu/opis-procesu-i-pojecia.md`              | Skrócony opis procesu i pojęć                                                          |                                                                                                                 |
| `03-schemat-procesu/przeplyw-procesu-bpmn.md`               | Model BPMN: 5 torów, 43 kroki, 42 przejścia                                            | Z XPDL. Nazwy faz odczytane z obrazu                                                                            |
| `04-formularze/arkusz-a-schemat-pol.md`                     | Arkusz A: pola, listy, reguły blokowania                                               | Arkusz A: kierownik urzędu (§ 3 ust. 2 rozporządzenia)                                                          |
| `04-formularze/arkusz-b-schemat-pol.md`                     | Arkusz B: pola i reguły                                                                | Arkusz B: stanowiska z bezpośrednim kierowaniem pracownikami (§ 3 ust. 3)                                       |
| `04-formularze/arkusz-c-schemat-pol.md`                     | Arkusz C: pola i reguły                                                                | Arkusz C: pozostałe stanowiska (§ 3 ust. 4)                                                                     |
| `04-formularze/arkusz-b-wersja-zautomatyzowana.md`          | Skoroszyt Excel z formułami: arkusze Instrukcja, Część I-III, do druku                 | Tabele z numerami wierszy i kolumn Excela, formuły osobno                                                       |
| `05-przyklady-wypelnione/`                                  | 13 przykładowych wypełnionych arkuszy (A, B, C, oceny pozytywne i negatywne)           | Pliki `06`-`08` to przykłady z poradnika. Dane osobowe najpewniej fikcyjne, ale materiały tego nie potwierdzają |
| `06-materialy-dodatkowe/liczenie-terminow.md`               | Zasady liczenia terminów i nieobecności                                                |                                                                                                                 |
| `06-materialy-dodatkowe/poradnik-oceny-okresowe.md`         | Poradnik KPRM "Oceny okresowe w służbie cywilnej" (wrzesień 2016)                      | 45 stron, układ według spisu treści w pliku                                                                     |

## Czego tu nie ma

- **`wzór formularza oceny okresowej arkusz A/B/C.pdf`** (4 strony każdy): to skany stron
  rozporządzenia bez warstwy tekstowej. Próbny OCR dał zaszumiony wynik (tabele i pola wyboru), więc
  go nie dodano. Wzory arkuszy są w tekście `rozporzadzenie-oceny-okresowe.md` (załączniki nr 2-4),
  a pola opisują pliki `arkusz-*-schemat-pol.md`.
- **`przepływ procesu (plik png).png`**: diagram jest w całości odtworzony w `przeplyw-procesu-bpmn.md`.
- **`.bpm`, `extended attributes.xml`**: ten sam model w formacie Bizagi, bez nowych informacji.
- **`Thumbs.db`, pliki `~$*.docx`**: pliki systemowe i tymczasowe Worda.

## Uwagi

- Kod formularza i reguły z `*-schemat-pol.md` zawierają adnotacje projektowe (np. "pole zablokowane
  po potwierdzeniu, zmiana tylko w trybie korekty błędów przez administratora"). To wymagania
  funkcjonalne, nie tylko opis pól.
- Przykładowe formularze zawierają imiona i nazwiska. Prawdopodobnie są fikcyjne, ale tego nie
  zweryfikowano. Nie wstawiaj do repozytorium danych prawdziwych osób.
