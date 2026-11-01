---
description: "Use when writing or fixing Vitest unit tests or Playwright E2E tests: physics, scoring, service, replay, determinism, signaling code validation, network failure cases."
applyTo: ["src/**/*.test.ts", "tests/**", "src/debug/**"]
---

# Testy

- Vitest: testy obok modułu (`src/**/*.test.ts`), środowisko node, bez DOM.
- Playwright: `tests/*.spec.ts`, Chromium; artefakty zapisuj przez `test.info().outputPath()`.
- Start testu E2E: `openApp(page)` z `tests/support/app.ts`. Do modułów gry sięgaj przez typowane `window.__tennis` (`src/debug/test-api.ts`, tylko tryb dev): `openPreview({ id, players })` tworzy kort ze stanem w `preview.state`, `preview.draw()` renderuje, `closePreview()` sprząta. Nie importuj `/src/...` dynamicznie w `page.evaluate`; brakujące moduły dodaj do `TennisTestApi`.
- Testuj fizykę, punktację, serwis, granice kortu, serializację stanu, powtarzalność replay oraz walidację kodów. Ostateczny wariant reguł ustal przed implementacją.
- Testy sieci obejmują opóźnienia, utratę danych, duplikaty, błędne kody i rozłączenia. Połączenie w dwóch kartach nie potwierdza działania między różnymi sieciami NAT.
