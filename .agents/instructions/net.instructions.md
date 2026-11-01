---
description: "Use when working on online play: WebRTC, DataChannel, manual signaling codes, offer/answer, ICE, STUN/TURN, peer topology, lockstep, rollback, input sync, desync detection."
applyTo: "src/net/**"
---

# Ręczny signaling WebRTC

1. Host tworzy połączenie i DataChannel, generuje offer oraz ustawia localDescription.
2. Po zakończeniu ICE gathering host koduje aktualne localDescription, zawierające SDP z kandydatami ICE, i wyświetla kod zaproszenia.
3. Gość wkleja zaproszenie, ustawia remoteDescription, generuje answer i ustawia localDescription.
4. Po zakończeniu własnego ICE gathering gość wyświetla kod odpowiedzi.
5. Host wkleja odpowiedź i ustawia remoteDescription. Dopiero otwarcie kanału oraz zgodny handshake aplikacji oznaczają gotowość.

- Stosuj non-trickle ICE: jedna oferta i jedna odpowiedź na parę peerów. Dodaj timeouty, usuwanie listenerów i czytelne błędy.
- Kod to serializowany pakiet połączenia, potencjalnie długi, a nie krótki identyfikator pokoju. Krótki kod wymagałby zewnętrznego miejsca przechowywania danych.
- Pakiet powinien zawierać wersję formatu, typ offer/answer i identyfikator negocjacji. Weryfikuj schemat, rozmiar wejścia oraz limit danych po dekompresji.
- Kompresja i base64url są opcjonalne; nie zapewniają szyfrowania. Nie loguj pełnych kodów ani SDP. Poinformuj, że dane ICE mogą ujawniać adresy sieciowe i należy udostępniać je zaufanemu graczowi.
- Pokazuj stany generowania, oczekiwania, łączenia, połączenia i błędu. Zapewnij kopiowanie oraz ręczne zaznaczanie tekstu, gdy Clipboard API jest niedostępne.
- Kody dotyczą konkretnej negocjacji, nie są trwałymi zaproszeniami. Po zamknięciu połączenia lub zmianie sieci może być potrzebna nowa wymiana.
- Brak własnego backendu nie wyklucza zewnętrznego STUN. Jawnie ujawnij i konfiguruj jego użycie. Bez STUN mogą działać np. połączenia w LAN, ale nie zapewniaj szerokiej łączności internetowej.
- Bez TURN część sieci uniemożliwi połączenie; nie podawaj niezweryfikowanego procentu skuteczności. Nie dodawaj TURN ani serwera bez uzgodnienia z użytkownikiem.
- Dwa peery mogą obsługiwać debel po dwóch lokalnych graczy. Dla 3–4 przeglądarek najpierw ustal topologię; gwiazda ogranicza liczbę ręcznych negocjacji i nie wymusza host-authoritative simulation.

# Synchronizacja online

- Dla pierwszego prototypu rozważ lockstep z buforem inputów, zachowując możliwość późniejszego rollbacku. Przy brakujących danych lockstep czeka; nie obiecuj braku opóźnień.
- Dla docelowej responsywności rozważ rollback: historia stanów, predykcja brakujących inputów, cofanie i ponowne przeliczanie oraz ograniczone okno rollbacku.
- Zanim ruszy mecz, porównaj wersję protokołu, wersję symulacji, konfigurację, seed i przydział slotów graczy.
- Przesyłaj inputy z tickiem i właścicielem slotu; waliduj ich zakres, kolejność i duplikaty. Kontroluj rozbieżności stanu i obsłuż przerwanie sesji.
- Kanał reliable/ordered jest prostym punktem startowym. Unreliable/unordered wymaga redundancji lub retransmisji i potwierdzeń; nie wolno bezpowrotnie gubić inputów potrzebnych do symulacji.
- Obsłuż ukrycie karty, rozłączenie oraz zaległości ticków bez nieskończonego nadrabiania. Pauzę online trzeba uzgodnić między peerami.
- P2P nie zapewnia odporności na oszustwa. Nie deklaruj bezpieczeństwa rankingu bez osobnego projektu zaufania i weryfikacji.
