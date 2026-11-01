# Tennis Game

Przeglądarkowa gra tenisowa inspirowana Super Tennis (SNES): retro pixel art, czytelny kort, dynamiczna rozgrywka arcade. Lokalnie do 4 graczy (klawiatura i pady jednocześnie), docelowo online P2P przez WebRTC DataChannel z ręcznym signalingiem kodami. Bez własnego backendu, serwera signalingowego, kont i matchmakingu; hosting statyczny i serwer deweloperski są dozwolone.

Twórz własne lub odpowiednio licencjonowane zasoby; nie kopiuj oryginalnych sprite'ów, muzyki ani znaków gry.

## Stos
- TypeScript strict, Vite, PixiJS (render 2D), Vitest (logika), Playwright (przeglądarka).
- Własna symulacja tenisa zamiast silnika fizycznego; natywne Gamepad API i RTCPeerConnection.
- Biblioteki pomocnicze tylko, gdy uzasadniają dodatkową zależność. Nie zastępuj istniejącego stosu.

## Architektura
- `core` stan, fizyka, reguły · `input` urządzenia i mapowania · `session` sloty graczy i tryby · `net` połączenia, signaling, synchronizacja · `render` obraz · `audio` · `ui` menu i lobby · `main.ts` okablowanie.
- Core nie zależy od DOM, PixiJS, WebRTC ani urządzeń wejściowych. Ten sam rdzeń obsługuje grę lokalną i online.
- Input ma wspólny format dla każdego gracza i ticka, niezależnie od klawiatury, pada lub sieci.
- Efekty dźwiękowe i wizualne oddziel od symulacji, aby ponowne przeliczanie ticków nie duplikowało efektów.

## Zasady modułów
Przed edycją przeczytaj odpowiedni plik z `.agents/instructions/`:
- `src/core/**` → `core.instructions.md`
- `src/input/**`, `src/session/**` → `input.instructions.md`
- `src/net/**` lub praca nad trybem online → `net.instructions.md`
- `src/render/**`, `src/ui/**`, `src/audio/**`, `src/style.css`, `index.html` → `render.instructions.md`
- `src/**/*.test.ts`, `tests/**` → `tests.instructions.md`

## Komendy
- `npm run test` – Vitest; pojedynczy plik: `npx vitest run src/core/simulation.test.ts`
- `npm run typecheck`, `npm run build`
- `npm run test:e2e` – Playwright (sam startuje `npm run dev`); pojedynczy: `npx playwright test tests/court.spec.ts`
- `npm run check` – wszystko powyżej; uruchom po zmianach.

## Otwarte decyzje
Liczba urządzeń online, model synchronizacji i szczegółowe zasady meczu wymagają jeszcze decyzji. Nie przedstawiaj ich jako uzgodnionych.

## Sposób pracy
- Odpowiadaj po polsku, krótko i konkretnie. Nazwy symboli w kodzie po angielsku.
- Najpierw sprawdź istniejące pliki i instrukcje. Nie zakładaj, że opisany moduł jest już zaimplementowany.
- Realizuj bieżące polecenie, nie cały projekt naraz. Przy istotnej niejasności zakresu zapytaj; przy drobnych decyzjach wybierz najprostsze rozwiązanie zgodne z założeniami.
- Domyślna kolejność rozwoju: grywalny mecz lokalny, czterech graczy i pady, testy deterministyczności, ręczny signaling, synchronizacja online, poprawa jakości i ewentualny rollback.
- Komentarz tylko dla informacji, której kod sam nie pokazuje; najwyżej jedna krótka linia.
- Nie twórz plików Markdown dokumentujących zmiany, chyba że użytkownik o to poprosi.
- Nie twierdź, że sprawdzono pady, różne przeglądarki lub sieci, jeśli takich testów nie wykonano.
- Kończ krótkim podsumowaniem wykonanych prac, wyników sprawdzeń i pozostałych ograniczeń.
