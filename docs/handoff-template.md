# Szablon `handoff.md`

Plik w katalogu głównym repozytorium, nieśledzony przez Git (jest w `.gitignore`). Pisze go agent po
Twoim „tak” na propozycję przekazania sesji. Nowa sesja zaczyna się od zdania
**„continue from handoff”**.

```markdown
# Handoff <data, godzina>

## Cel

Jedno zdanie: co budujemy i po co.

## Podjęte decyzje

- Decyzja i powód, żeby nikt jej nie otwierał od nowa.

## Stan pracy

- Branch, numer issue i PR, numer aktualnego zadania.
- Tabela zadań: numer, status (todo / w toku / do review / zatwierdzone), pliki.

## Zrobione i sprawdzone

- Co działa i jak to zweryfikowano (komenda + wynik). Czego NIE sprawdzono.

## Następne 3 kroki

1. ...
2. ...
3. ...

## Otwarte pytania

- Co czeka na decyzję człowieka.

## Najpierw przeczytaj

- Ścieżki plików (spec, wątek zadania, diff), w kolejności czytania.
```

## Zasady dla agenta po „continue from handoff”

1. Przeczytaj `handoff.md`, potem pliki z sekcji „Najpierw przeczytaj”.
2. Porównaj opis z rzeczywistością: `git status`, `git log -5`, `gh pr list`. Przy rozbieżności wierzy się Gitowi i GitHubowi, nie notatce, i mówisz o tym użytkownikowi.
3. Nie pytaj ponownie o to, co jest w „Podjętych decyzjach”.
4. Kontynuuj od „Następnych 3 kroków”.
