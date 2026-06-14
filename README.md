# Space Invaders

Klasyczna gra Space Invaders napisana w czystym JavaScript z użyciem HTML5 Canvas i Web Audio API. Bez żadnych zewnętrznych bibliotek.

## Uruchomienie

Otwórz plik `index.html` w przeglądarce. To wszystko — gra nie wymaga serwera ani instalacji.

> Dźwięk włącza się po pierwszym naciśnięciu klawisza (wymóg przeglądarek dotyczący Web Audio API).

## Sterowanie

| Klawisz | Akcja |
|---------|-------|
| ← / → | Ruch statku w lewo / prawo |
| Spacja | Strzał |
| R | Restart gry (po przegranej lub wygranej) |

## Cel gry

Zestrzel wszystkich kosmitów, zanim dotrą do dolnej linii lub odbiorą Ci wszystkie życia. Za każdego trafionego kosmitę otrzymujesz 10 punktów. Masz 3 życia.

## Struktura projektu

| Plik | Opis |
|------|------|
| `index.html` | Punkt wejścia, ładuje wszystkie skrypty i canvas |
| `game.js` | Główna pętla gry, sterowanie, kolizje, stan gry |
| `renderer.js` | Rysowanie na Canvas, animacja sprite'ów, HUD |
| `enemies.js` | Ruch kosmitów i AI strzelania |
| `audio.js` | Efekty dźwiękowe (synteza przez Web Audio API) |

Pełna dokumentacja techniczna znajduje się w pliku `dokumentacja.txt`.

## Architektura

Moduły komunikują się przez globalne obiekty na `window`:

- `window.Game` — współdzielony stan gry
- `window.Renderer.draw(Game)` — renderowanie klatki
- `window.Enemies.init(Game)` / `window.Enemies.update(Game, dt)` — logika wrogów
- `window.Audio.playShoot() / playExplosion() / playGameOver() / playWin()` — dźwięk

Wszystkie wywołania międzymodułowe są zabezpieczone defensywnie, więc gra nie przerywa pętli, gdy któryś moduł jest niedostępny.
# Space-invaders
