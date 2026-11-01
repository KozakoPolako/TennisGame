---
description: "Use when writing or fixing Vitest unit tests or Playwright E2E tests: physics, scoring, service, replay, determinism, signaling code validation, network failure cases."
applyTo: ["src/**/*.test.ts", "tests/**"]
---

# Testy

- Vitest: testy obok modułu (`src/**/*.test.ts`), środowisko node, bez DOM.
- Playwright: `tests/*.spec.ts`, Chromium; artefakty zapisuj przez `test.info().outputPath()`.
- Testuj fizykę, punktację, serwis, granice kortu, serializację stanu, powtarzalność replay oraz walidację kodów. Ostateczny wariant reguł ustal przed implementacją.
- Testy sieci obejmują opóźnienia, utratę danych, duplikaty, błędne kody i rozłączenia. Połączenie w dwóch kartach nie potwierdza działania między różnymi sieciami NAT.
