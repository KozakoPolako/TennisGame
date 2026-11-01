---
description: "Use when working on graphics, pixel art, PixiJS rendering, court projection, animations, UI, menus, lobby, layout, focus, audio."
applyTo: ["src/render/**", "src/ui/**", "src/audio/**", "src/style.css", "index.html"]
---
# Grafika i UX

- Renderuj w niskiej rozdzielczości logicznej, np. 256×224, z wyłączonym wygładzaniem i skalowaniem całkowitoliczbowym tam, gdzie mieści się w oknie.
- Rozdziel retro widok meczu od czytelnych formularzy lobby i długich kodów signalingowych.
- Uwzględnij responsywny układ, nawigację klawiaturą, widoczny fokus i uruchamianie audio po interakcji użytkownika.
- Renderer, UI i audio tylko czytają `GameState`; nie mutują stanu symulacji.
