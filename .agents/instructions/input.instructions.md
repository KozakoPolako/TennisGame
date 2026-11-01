---
description: "Use when working on local players, keyboard and gamepad input, device-to-slot assignment, key mapping conflicts, controller connect/disconnect, dead zones."
applyTo: ["src/input/**", "src/session/**"]
---

# Lokalni gracze i kontrolery

- Rozdziel pojęcia gracza, urządzenia wejściowego i peera sieciowego. Jedna przeglądarka może obsługiwać kilku lokalnych graczy.
- Zapewnij przypisywanie urządzeń do slotów, konfigurowalne klawisze oraz wykrywanie konfliktów mapowania.
- Obsłuż dołączanie i odłączanie kontrolerów, martwą strefę analogów oraz kontrolery bez standardowego mapowania.
- Po utracie fokusu wyczyść wciśnięte klawisze. Blokuj domyślne akcje klawiszy gry tylko podczas aktywnej rozgrywki, nie w polach formularzy.
- Ostrzegaj o ghostingu i ograniczeniu liczby jednoczesnych klawiszy: czterech graczy na jednej klawiaturze nie da się zagwarantować programowo.
