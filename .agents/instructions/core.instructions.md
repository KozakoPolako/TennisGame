---
description: "Use when editing the deterministic tennis simulation: physics, ball flight, bounces, scoring, service rules, step(), checksum, replay, fixed tick, seeded RNG."
applyTo: "src/core/**"
---
# Rdzeń symulacji

- Stały krok, docelowo 60 Hz (`TICK_RATE`), niezależny od częstotliwości renderowania.
- `step(state, inputs)` daje powtarzalny wynik i nie mutuje stanu wejściowego. Stan można zapisać, odtworzyć i przeliczyć ponownie.
- Używaj numerów ticków, ustalonej kolejności aktualizacji i seedowanego RNG. Nie używaj czasu ściennego ani `Math.random`.
- Determinizm potwierdzaj testami replay i `checksum()`. Wspólny kod TS nie gwarantuje zgodności między przeglądarkami; unikaj zależnych od implementacji funkcji matematycznych, rozważ fixed-point.
- Ruch piłki modeluj we współrzędnych kortu z osobną wysokością i prędkością pionową. Projekcja na ekran, cień i animacje należą do renderera.
- Liczby o znaczeniu domenowym (pozycje startowe, granice, prędkości) nazywaj stałymi, np. w `court.ts`.
- Wzorzec testu replay po serializacji: `training.test.ts`, `ball-machine.test.ts`.
