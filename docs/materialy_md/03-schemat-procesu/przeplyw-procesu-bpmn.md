---
source: "docs/materialy_dodatkowe/3. Schemat procesu/przepływ procesu (plik xpdl).xpdl"
converted_from: xpdl (BPMN z Bizagi Modeler) + png
note: "Pliki .bpm i extended attributes.xml to ten sam model w formatach narzędzia, nie zawierają nowych informacji."
---

# Przepływ procesu oceny okresowej (BPMN)

Model procesu z 5 torami i 43 elementami. Tory: ZARZĄDZAJĄCY (administrator merytoryczny urzędu, np. kadry lub dyrektor generalny), OCENIAJĄCY (przełożony), OCENIANY, ADMIN (techniczny), SCHEDULER (CZAS) (automat, który wysyła przypomnienia i przelicza terminy). Bramka to punkt decyzyjny. Zdarzenie to wyzwalacz (np. wprowadzenie danych albo złożenie wniosku).

## Tory (role)

- ZARZĄDZAJĄCY
- OCENIAJĄCY
- OCENIANY
- ADMIN
- SCHEDULER (CZAS)

## Fazy procesu (nagłówki z diagramu PNG, od lewej)

Nazwy faz pochodzą z obrazu `przepływ procesu (plik png).png`. Plik XPDL ich nie zawiera. Kolejność kroków z tabeli poniżej odpowiada im z grubsza od lewej do prawej.

1. Zainicjowanie oceny (adnotacja: początek umowy na czas nieokreślony lub mianowania albo poprzednia ocena)
2. Ocena okresowa - wyznaczenie kryteriów (kroki 3-10)
3. Zmiana terminu - długotrwała nieobecność (kroki 11-14)
4. Zmiana terminu - przez oceniającego (kroki 15-17)
5. Zmiana terminu - na wniosek ocenianego (kroki 18-23)
6. Dokonanie oceny (kroki 24-32)
7. Wniosek o kolejny stopień służbowy (kroki 33-35)
8. Obligatoryjne przyznanie wniosku (kroki 36-37)
9. Uwzględnione odwołanie - zmiana oceny (kroki 38-41)
10. Odwołanie od oceny uwzględnione - ponowne sporządzenie oceny (kroki 42-43)

## Kroki (43), od lewej do prawej

| nr  | tor              | typ       | opis                                                                              |
| --- | ---------------- | --------- | --------------------------------------------------------------------------------- |
| 1   | ADMIN            | start     | Utworzenie użytkownika                                                            |
| 2   | ZARZĄDZAJĄCY     | zdarzenie | wprowadza dane pracownika podlegającego ocenie                                    |
| 3   | SCHEDULER (CZAS) | zadanie   | wysyła przypomnienie o wyznaczeniu kryteriów                                      |
| 4   | OCENIAJĄCY       | zadanie   | otrzymuje przypomnienie o wyznaczniu kryteriów                                    |
| 5   | OCENIANY         | zadanie   | otrzymuje informację o rozpoczęciu cyklu oceny                                    |
| 6   | OCENIANY         | zadanie   | otrzymuje zaproszenie na rozmowę                                                  |
| 7   | OCENIAJĄCY       | bramka    | może wysłać zaproszenie na rozmowę                                                |
| 8   | OCENIAJĄCY       | zdarzenie | odbywają rozmowę                                                                  |
| 9   | OCENIAJĄCY       | zadanie   | wprowadza potwierdzenie odbycia rozmowy i wyznaczenia kryteriów                   |
| 10  | OCENIANY         | zadanie   | potiwerdza odbycie rozmowy i wyznaczenie kryteriów                                |
| 11  | ZARZĄDZAJĄCY     | zdarzenie | wprowadza informację o nieobecności ocenianego dłuższej ni ż miesiąc              |
| 12  | SCHEDULER (CZAS) | zadanie   | przedłuża termin oceny o czas trwania nieobecności                                |
| 13  | OCENIAJĄCY       | zadanie   | otrzymuje powiadomienie o zmianie terminu oceny                                   |
| 14  | OCENIANY         | zadanie   | otrzymuje powiadomienie o zmianie terminu oceny                                   |
| 15  | OCENIAJĄCY       | zdarzenie | zmienia termin oceny                                                              |
| 16  | OCENIANY         | zadanie   | otrzymuje powiadomienie o zmianie terminu oceny                                   |
| 17  | SCHEDULER (CZAS) | zadanie   | rejestruje zmianę terminu oceny                                                   |
| 18  | OCENIANY         | zdarzenie | składa wniosek o zmianę terminu oceny                                             |
| 19  | OCENIAJĄCY       | zadanie   | otrzymuje wniosek o zmianę terminu oceny                                          |
| 20  | OCENIANY         | zadanie   | otrzymuje powiadomienie o odrzuceniu wniosku                                      |
| 21  | OCENIAJĄCY       | bramka    | PROMPT o rozpatrzenie wniosku                                                     |
| 22  | OCENIANY         | zadanie   | otrzymuje powiadomienie o akceptacji i zmianie terminu oceny                      |
| 23  | SCHEDULER (CZAS) | zadanie   | rejestruje zmianę terminu opceny                                                  |
| 24  | SCHEDULER (CZAS) | zadanie   | wysyła przypomnienie o zbliżającym się terminie oceny                             |
| 25  | OCENIANY         | zadanie   | otrzymuje przypomnienie o zlbiżającym się terminie oceny                          |
| 26  | OCENIAJĄCY       | zadanie   | otrzymuje przypomnienie o zbliżającym się terminie oceny                          |
| 27  | OCENIANY         | zadanie   | otrzymuje zaproszenie na rozmowę oceniającą                                       |
| 28  | OCENIAJĄCY       | bramka    | może wysłać zaproszenie na rozmowę oceniającą                                     |
| 29  | OCENIAJĄCY       | zdarzenie | odbywają rozmowę                                                                  |
| 30  | OCENIAJĄCY       | zadanie   | Dokonuje oceny i przekazuje do zapoznania                                         |
| 31  | OCENIANY         | zadanie   | potwierdza odbycie rozmowy i zapoznanie z oceną                                   |
| 32  | OCENIAJĄCY       | zdarzenie | koniec cyklu oceny i początek następnego                                          |
| 33  | OCENIAJĄCY       | bramka    | wniosek o kolejny stopień służbowy                                                |
| 34  | ZARZĄDZAJĄCY     | zadanie   | otrzymuje wniosek o kolejny stopień służbowy                                      |
| 35  | OCENIANY         | zadanie   | otrzymuje powiadomienie o złożeniu wniosku                                        |
| 36  | SCHEDULER (CZAS) | zadanie   | weryfikuje warunki przyznania kolejnego stopnia służbowego i wysyła powiadomienie |
| 37  | ZARZĄDZAJĄCY     | zadanie   | otrzymuje przpypomnienie o obowiązku przyznania stopnia służbowego                |
| 38  | ZARZĄDZAJĄCY     | zdarzenie | wprowadza informację o uwzględnieniu odwołani i zmianie oceny                     |
| 39  | ZARZĄDZAJĄCY     | zadanie   | [dyrektor generalny] wprowadza zmianę w formularzu oceny                          |
| 40  | OCENIAJĄCY       | zadanie   | otrzymuje powiadomienie o zmianie oceny                                           |
| 41  | OCENIANY         | zadanie   | otrzymuje powiadomienie o zmianie oceny                                           |
| 42  | ZARZĄDZAJĄCY     | zdarzenie | wprowadza informację o uwzględnieniu odwołania i ponownym sporządzeniu oceny      |
| 43  | OCENIAJĄCY       | zadanie   | otrzymuje informację o uwzględnieniu odwołania i ponownym sporządzeniu oceny      |

## Przejścia (42)

- 1. Utworzenie użytkownika (ADMIN) → 2. wprowadza dane pracownika podlegającego ocenie (ZARZĄDZAJĄCY)
- 2. wprowadza dane pracownika podlegającego ocenie (ZARZĄDZAJĄCY) → 3. wysyła przypomnienie o wyznaczeniu kryteriów (SCHEDULER (CZAS))
- 3. wysyła przypomnienie o wyznaczeniu kryteriów (SCHEDULER (CZAS)) → 5. otrzymuje informację o rozpoczęciu cyklu oceny (OCENIANY)
- 3. wysyła przypomnienie o wyznaczeniu kryteriów (SCHEDULER (CZAS)) → 4. otrzymuje przypomnienie o wyznaczniu kryteriów (OCENIAJĄCY)
- 4. otrzymuje przypomnienie o wyznaczniu kryteriów (OCENIAJĄCY) → 7. może wysłać zaproszenie na rozmowę (OCENIAJĄCY)
- 7. może wysłać zaproszenie na rozmowę (OCENIAJĄCY) → 6. otrzymuje zaproszenie na rozmowę (OCENIANY) [wysyła zaproszenie]
- 7. może wysłać zaproszenie na rozmowę (OCENIAJĄCY) → 8. odbywają rozmowę (OCENIAJĄCY) [odbywa rozmowę bez zaproszenia]
- 6. otrzymuje zaproszenie na rozmowę (OCENIANY) → 8. odbywają rozmowę (OCENIAJĄCY)
- 8. odbywają rozmowę (OCENIAJĄCY) → 9. wprowadza potwierdzenie odbycia rozmowy i wyznaczenia kryteriów (OCENIAJĄCY)
- 9. wprowadza potwierdzenie odbycia rozmowy i wyznaczenia kryteriów (OCENIAJĄCY) → 10. potiwerdza odbycie rozmowy i wyznaczenie kryteriów (OCENIANY)
- 11. wprowadza informację o nieobecności ocenianego dłuższej ni ż miesiąc (ZARZĄDZAJĄCY) → 12. przedłuża termin oceny o czas trwania nieobecności (SCHEDULER (CZAS))
- 12. przedłuża termin oceny o czas trwania nieobecności (SCHEDULER (CZAS)) → 14. otrzymuje powiadomienie o zmianie terminu oceny (OCENIANY)
- 12. przedłuża termin oceny o czas trwania nieobecności (SCHEDULER (CZAS)) → 13. otrzymuje powiadomienie o zmianie terminu oceny (OCENIAJĄCY)
- 15. zmienia termin oceny (OCENIAJĄCY) → 16. otrzymuje powiadomienie o zmianie terminu oceny (OCENIANY)
- 18. składa wniosek o zmianę terminu oceny (OCENIANY) → 19. otrzymuje wniosek o zmianę terminu oceny (OCENIAJĄCY)
- 19. otrzymuje wniosek o zmianę terminu oceny (OCENIAJĄCY) → 21. PROMPT o rozpatrzenie wniosku (OCENIAJĄCY)
- 21. PROMPT o rozpatrzenie wniosku (OCENIAJĄCY) → 20. otrzymuje powiadomienie o odrzuceniu wniosku (OCENIANY) [odrzuca wniosek]
- 21. PROMPT o rozpatrzenie wniosku (OCENIAJĄCY) → 22. otrzymuje powiadomienie o akceptacji i zmianie terminu oceny (OCENIANY) [akceptuje wniosek i zmienia termin]
- 21. PROMPT o rozpatrzenie wniosku (OCENIAJĄCY) → 23. rejestruje zmianę terminu opceny (SCHEDULER (CZAS)) [akceptuje wniosek i zmienia termin]
- 15. zmienia termin oceny (OCENIAJĄCY) → 17. rejestruje zmianę terminu oceny (SCHEDULER (CZAS))
- 3. wysyła przypomnienie o wyznaczeniu kryteriów (SCHEDULER (CZAS)) → 24. wysyła przypomnienie o zbliżającym się terminie oceny (SCHEDULER (CZAS))
- 24. wysyła przypomnienie o zbliżającym się terminie oceny (SCHEDULER (CZAS)) → 25. otrzymuje przypomnienie o zlbiżającym się terminie oceny (OCENIANY)
- 24. wysyła przypomnienie o zbliżającym się terminie oceny (SCHEDULER (CZAS)) → 26. otrzymuje przypomnienie o zbliżającym się terminie oceny (OCENIAJĄCY)
- 26. otrzymuje przypomnienie o zbliżającym się terminie oceny (OCENIAJĄCY) → 28. może wysłać zaproszenie na rozmowę oceniającą (OCENIAJĄCY)
- 28. może wysłać zaproszenie na rozmowę oceniającą (OCENIAJĄCY) → 27. otrzymuje zaproszenie na rozmowę oceniającą (OCENIANY) [wysyła zaproszenie]
- 28. może wysłać zaproszenie na rozmowę oceniającą (OCENIAJĄCY) → 29. odbywają rozmowę (OCENIAJĄCY) [odbywa rozmowę bez zaproszenia]
- 27. otrzymuje zaproszenie na rozmowę oceniającą (OCENIANY) → 29. odbywają rozmowę (OCENIAJĄCY)
- 29. odbywają rozmowę (OCENIAJĄCY) → 30. Dokonuje oceny i przekazuje do zapoznania (OCENIAJĄCY)
- 30. Dokonuje oceny i przekazuje do zapoznania (OCENIAJĄCY) → 31. potwierdza odbycie rozmowy i zapoznanie z oceną (OCENIANY)
- 30. Dokonuje oceny i przekazuje do zapoznania (OCENIAJĄCY) → 32. koniec cyklu oceny i początek następnego (OCENIAJĄCY)
- 32. koniec cyklu oceny i początek następnego (OCENIAJĄCY) → 3. wysyła przypomnienie o wyznaczeniu kryteriów (SCHEDULER (CZAS))
- 30. Dokonuje oceny i przekazuje do zapoznania (OCENIAJĄCY) → 33. wniosek o kolejny stopień służbowy (OCENIAJĄCY)
- 33. wniosek o kolejny stopień służbowy (OCENIAJĄCY) → 34. otrzymuje wniosek o kolejny stopień służbowy (ZARZĄDZAJĄCY) [składa wniosek]
- 34. otrzymuje wniosek o kolejny stopień służbowy (ZARZĄDZAJĄCY) → 35. otrzymuje powiadomienie o złożeniu wniosku (OCENIANY)
- 33. wniosek o kolejny stopień służbowy (OCENIAJĄCY) → 32. koniec cyklu oceny i początek następnego (OCENIAJĄCY) [nie składa wniosku]
- 30. Dokonuje oceny i przekazuje do zapoznania (OCENIAJĄCY) → 36. weryfikuje warunki przyznania kolejnego stopnia służbowego i wysyła powiadomienie (SCHEDULER (CZAS))
- 36. weryfikuje warunki przyznania kolejnego stopnia służbowego i wysyła powiadomienie (SCHEDULER (CZAS)) → 37. otrzymuje przpypomnienie o obowiązku przyznania stopnia służbowego (ZARZĄDZAJĄCY)
- 38. wprowadza informację o uwzględnieniu odwołani i zmianie oceny (ZARZĄDZAJĄCY) → 39. [dyrektor generalny] wprowadza zmianę w formularzu oceny (ZARZĄDZAJĄCY)
- 42. wprowadza informację o uwzględnieniu odwołania i ponownym sporządzeniu oceny (ZARZĄDZAJĄCY) → 43. otrzymuje informację o uwzględnieniu odwołania i ponownym sporządzeniu oceny (OCENIAJĄCY)
- 39. [dyrektor generalny] wprowadza zmianę w formularzu oceny (ZARZĄDZAJĄCY) → 40. otrzymuje powiadomienie o zmianie oceny (OCENIAJĄCY)
- 39. [dyrektor generalny] wprowadza zmianę w formularzu oceny (ZARZĄDZAJĄCY) → 41. otrzymuje powiadomienie o zmianie oceny (OCENIANY)
- 43. otrzymuje informację o uwzględnieniu odwołania i ponownym sporządzeniu oceny (OCENIAJĄCY) → 26. otrzymuje przypomnienie o zbliżającym się terminie oceny (OCENIAJĄCY)

## Adnotacje

- Ocena okresowa: początek umowy na czas nieokreślony/mianowania albo poprzednia ocena
- Możliwe jeżeli: 1 ocenaniy jest urzędnikiem mianowanym 2 ocena jest pozytywna
- Warunki: 1 druga kolejna ocena na jednym z dwóch najwyższych poziomów 2 ocenaniy jest urzędnikiem
