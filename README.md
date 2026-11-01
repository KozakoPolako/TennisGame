# Tennis Game

[![Deploy demo](https://github.com/KozakoPolako/TennisGame/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/KozakoPolako/TennisGame/actions/workflows/deploy-pages.yml)

Przeglądarkowa gra tenisowa w stylu retro, inspirowana Super Tennis ze SNES-a: pixel art, czytelny kort i dynamiczna rozgrywka arcade. Lokalnie do 4 graczy na klawiaturze i padach jednocześnie; docelowo także online P2P przez WebRTC — bez własnego backendu.

### ▶ [Zagraj w live demo](https://kozakopolako.github.io/TennisGame/)

> Projekt jest we wczesnej fazie. Wszystkie grafiki i dźwięki są tworzone od zera; projekt nie korzysta z zasobów oryginalnej gry.

## Co już działa

- **Trening solo** z maszyną do piłek: ustawienia siły i kierunku podań, uderzenie FLAT z ładowaniem, trafienia w ciało, odbicia od siatki i maszyny, piłki zostające na korcie do resetu.
- **Piaskownica 2 i 4 graczy**: ruch, zamach i animacje na korcie ze stadionem, sędzią, ball kids i publicznością.
- **Sterowanie**: klawiatura i pady (standardowe mapowanie) jednocześnie, zmiana klawiszy z wykrywaniem konfliktów.
- **Widok**: pełne okno, tryb panoramy, skalowanie pikselowe.

W przygotowaniu: serwis i punktacja meczu, tryb online z ręcznym signalingiem (wymiana kodów zaproszenia i odpowiedzi).

## Sterowanie (domyślne)

| Gracz | Ruch                       | Uderzenie      |
| ----- | -------------------------- | -------------- |
| 1     | `W` `A` `S` `D`            | `F`            |
| 2     | strzałki                   | `/`            |
| 3     | `I` `J` `K` `L`            | `O`            |
| 4     | numeryczna `8` `4` `5` `6` | numeryczna `0` |
| Pad   | krzyżak lub lewa gałka     | `A` / `✕`      |

Przytrzymanie przycisku uderzenia ładuje zamach, puszczenie go wykonuje. Czterech graczy na jednej klawiaturze może nie działać przez ograniczenia sprzętowe (ghosting) — lepiej użyć padów.

## Uruchomienie lokalne

Wymagany Node.js 22.12 lub nowszy.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

| Komenda            | Opis                                             |
| ------------------ | ------------------------------------------------ |
| `npm run lint`     | Biome, w tym reguły determinizmu rdzenia         |
| `npm run test`     | testy logiki (Vitest)                            |
| `npm run build`    | sprawdzenie typów i build produkcyjny do `dist/` |
| `npm run test:e2e` | testy w przeglądarce (Playwright, Chromium)      |
| `npm run check`    | wszystko powyżej                                 |

Przed pierwszym `test:e2e` zainstaluj przeglądarkę: `npx playwright install chromium`.

## Technologia i architektura

TypeScript (strict), Vite, PixiJS, Vitest, Playwright, Biome.

```
src/
  core/     deterministyczna symulacja: stan, fizyka, reguły (bez DOM i PixiJS)
  input/    klawiatura i pady → wspólny format wejścia
  session/  sloty graczy i tryby
  net/      WebRTC i signaling (w przygotowaniu)
  render/   obraz w PixiJS
  audio/    dźwięk
  ui/       menu i ustawienia
  debug/    API testowe window.__tennis (tylko tryb dev)
tests/      testy Playwright
```

Rdzeń działa ze stałym krokiem 60 Hz, a `step(state, inputs)` daje powtarzalny wynik — to podstawa przyszłej synchronizacji online. Linter blokuje w `src/core` m.in. `Math.random`, czas systemowy i importy z warstw zewnętrznych.

## Wdrożenie

Każdy push na `main` uruchamia [workflow](.github/workflows/deploy-pages.yml), który sprawdza lint i testy, buduje aplikację i publikuje ją na GitHub Pages jako [live demo](https://kozakopolako.github.io/TennisGame/).

## Praca z agentami AI

Zasady projektu dla agentów (Copilot, Cursor, Claude) są w [AGENTS.md](AGENTS.md), a zasady poszczególnych modułów w [.agents/instructions/](.agents/instructions/).
