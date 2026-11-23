# Mapówka Atlas

Interaktywna mapa do nauki 111 regionów świata: gór, pustyń, nizin, półwyspów, wysp i wyżyn. Made by Tomek.

## Tryby

- **Mapa** - nauka z przełączanymi warstwami i nazwami.
- **Ćwiczenia** - wskazywanie regionów z natychmiastową informacją zwrotną.
- **Sprawdzian** - pierwsza odpowiedź jest ostateczna, podsumowanie po zakończeniu.
- **Dopasuj nazwy** - opcja ćwiczeń z widocznymi obrysami.

Motywy pomarańczowy i fioletowy, opcjonalna strefa tolerancji zwiększająca powierzchnię obrysu o 20%. Ustawienia i postęp są przechowywane lokalnie w przeglądarce.

## Uruchomienie

Otwórz `dist/index.html` lub uruchom `python -m http.server 8000 --directory dist`. Nie wymaga instalowania zależności do działania strony ani zewnętrznych usług mapowych.

## Publikacja

GitHub Pages: Settings → Pages → Deploy from a branch → Public → /docs. Katalog `docs/` jest kopią gotowej strony z `dist/`; po zmianach zsynchronizuj te katalogi.

Strona zawiera `noindex`, aby wyszukiwarki respektujące tę regułę nie indeksowały jej. Strona i repozytorium pozostają publiczne; to nie jest kontrola dostępu.

## Weryfikacja

`node checks.cjs` sprawdza wszystkie 111 obrysów, obszary tolerancji i blokowanie pierwszej odpowiedzi. `python package_offline.py` tworzy samodzielny plik HTML. `python build_display.py` odtwarza uproszczone warstwy wyświetlania (wymaga Shapely).

## Dane i ograniczenia

Silnik: Leaflet 1.9.4. Dane bazowe: Natural Earth 1:10m, https://www.naturalearthdata.com/. Linie wybrzeży służą do przycinania obszarów do lądów. Regiony fizycznogeograficzne mają umowne, uproszczone granice.

13 obrysów autorskich to przybliżenia. Ich przegląd geograficzny wykazał potrzebę korekt; ta publikacja zachowuje dotychczasowe obrysy i nie stanowi wersji po ich poprawie. Strefa tolerancji nie zmienia obrysu widocznego regionu.

Licencje Leaflet oraz fontów Nunito i Caveat znajdują się w `dist/vendor/` i `dist/fonts/` (także w `docs/`).
