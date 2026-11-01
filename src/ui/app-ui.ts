import type { KeyboardMapping } from '../input/devices';
import { ONLINE_STATUS } from '../net/config';
import type { DeviceBinding } from '../session/local-session';

export function mountUI(root: HTMLElement) {
  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <a class="wordmark" href="./" aria-label="Baseline — strona główna"><span class="ball-logo" aria-hidden="true">◒</span> baseline<span class="wordmark-dot">®</span></a>
        <span class="edition">TENNIS CLUB / PROTOTYPE 001</span>
        <span class="build-tag">LOCAL FIRST</span>
      </header>
      <main>
        <section class="intro" aria-labelledby="title">
          <div><p class="eyebrow">MAŁY KORT. WIELKIE WYMIANY.</p><h1 id="title">Wróć na <em>kort.</em></h1></div>
          <p class="intro-copy">Tenis w rytmie retro.<br>Jedna przeglądarka, wspólna rozgrywka.<br><span>Fundament pod Twoją następną grę.</span></p>
        </section>
        <div class="game-layout">
          <aside class="setup-panel" aria-labelledby="setup-title">
            <div class="setup-toolbar">
              <div class="setup-heading"><p class="eyebrow">ZAGRAJ PO SWOJEMU</p><h2 id="setup-title">Przygotuj kort</h2></div>
              <div class="mode-card"><span class="mode-icon" aria-hidden="true">↔</span><div><strong>Lokalnie</strong><small>Klawiatura + kontrolery</small></div></div>
              <div class="player-count-field"><label class="field-label" for="player-count">ZAWODNICY NA KORCIE</label>
                <select id="player-count"><option value="1">1 osoba — maszyna do piłek</option><option value="2" selected>2 zawodników</option><option value="4">4 zawodników</option></select>
              </div>
              <div class="setup-actions">
                <button id="start" class="button button-primary" disabled>Uruchom demo <span aria-hidden="true">↗</span></button>
                <button id="reset" class="button button-secondary">Reset kortu</button>
                <button id="audio" class="button button-secondary" aria-pressed="false">Dźwięk: wył.</button>
              </div>
            </div>
            <div id="player-slots" class="player-slots"></div>
            <fieldset id="machine-settings" class="machine-settings" hidden>
              <legend>Maszyna do piłek</legend>
              <label>Siła podania<select id="machine-power"><option value="standard">Standardowa</option><option value="random">Losowa</option></select></label>
              <label>Kierunek wyrzutu<select id="machine-direction"><option value="standard">Standardowy</option><option value="random">Losowy</option></select></label>
              <p class="help">Standard: dotychczasowa siła i kolejność środek–lewo–prawo. Zmiana ustawienia resetuje trening i włącza pauzę.</p>
            </fieldset>
            <p id="validation" class="validation" role="alert"></p>
            <details class="controls-help"><summary>Sterowanie i informacje o kontrolerach</summary>
            <p class="help">Kliknij pole klawisza i naciśnij nowy klawisz, aby zmienić mapowanie. Na padzie: lewy analog / krzyżak + dolny przycisk. Przytrzymaj zamach, aby ładować FLAT; puść, aby uderzyć. Pełna moc po 0,5 s, widoczna na pasku pod zawodnikiem. Podczas ładowania i zamachu ruch jest zablokowany — najpierw ustaw się z boku piłki. Jeden strzał na puszczenie. Minimalny odstęp między strzałami: 0,5 s. Pauza i utrata fokusu anulują ładowanie.</p>
            <p id="device-status" class="help" role="status">Podłącz kontroler i naciśnij jego przycisk, aby go wykryć.</p>
            <p class="help ghosting">Wspólna klawiatura może gubić jednoczesne naciśnięcia (ghosting). Dla 4 osób zalecane są pady.</p>
            </details>
          </aside>
          <section id="court-panel" class="court-panel" aria-labelledby="court-title">
            <div class="panel-heading"><h2 id="court-title"><span class="status-dot"></span> KORT TRENINGOWY</h2><div class="court-heading-actions"><button id="panoramic" class="button button-secondary" aria-pressed="false" aria-controls="court" title="Szerszy widok stadionu bez rozciągania kortu">Panorama: wył.</button><button id="fullscreen" class="button button-secondary" aria-pressed="false" aria-controls="court-panel" title="Rozszerz grę na całe okno przeglądarki">Pełny ekran ⛶</button></div></div>
            <div class="court-stage"><div id="court"></div></div>
            <div class="court-footer"><span id="session-status" role="status">Przygotowanie renderera…</span><span class="tick-label">60 HZ · TICK <output id="tick">000000</output></span></div>
            <div class="demo-note"><span class="note-mark">i</span><div><p id="mode-description"></p><p id="training-status" hidden></p></div></div>
          </section>
        </div>
        <section class="roadmap" aria-label="Status projektu">
          <article><span class="feature-number">01 / GOTOWE</span><h3>Lokalny fundament</h3><p>Renderowanie pixel art, stały krok symulacji i niezależne urządzenia dla każdego slotu.</p></article>
          <article><span class="feature-number">02 / TRENING SOLO</span><h3>Maszyna do piłek</h3><p>Ćwicz odbicia z nieruchomą maszyną. Pełny mecz, serwis i punktacja pozostają kolejnym etapem.</p></article>
          <article><span class="feature-number">03 / ${ONLINE_STATUS.label.toUpperCase()}</span><h3>Online bez lobby-serwera</h3><p>${ONLINE_STATUS.description}</p><p class="network-note">Obecnie brak połączeń sieciowych i STUN/TURN. Bez TURN część sieci może uniemożliwić P2P.</p></article>
        </section>
      </main>
      <footer class="page-footer"><span>BASELINE TENNIS CLUB</span><span>TYPE SCRIPT / PIXI JS / WEB RTC READY ARCHITECTURE</span></footer>
    </div>`;

  const get = <T extends HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Brak elementu interfejsu: ${selector}`);
    return element;
  };

  const slots = get<HTMLDivElement>('#player-slots');
  return {
    court: get<HTMLDivElement>('#court'),
    courtPanel: get<HTMLElement>('#court-panel'),
    fullscreen: get<HTMLButtonElement>('#fullscreen'),
    panoramic: get<HTMLButtonElement>('#panoramic'),
    courtActions: get<HTMLDivElement>('.court-heading-actions'),
    setupActions: get<HTMLDivElement>('.setup-actions'),
    start: get<HTMLButtonElement>('#start'),
    reset: get<HTMLButtonElement>('#reset'),
    audio: get<HTMLButtonElement>('#audio'),
    count: get<HTMLSelectElement>('#player-count'),
    status: get<HTMLSpanElement>('#session-status'),
    tick: get<HTMLOutputElement>('#tick'),
    modeDescription: get<HTMLParagraphElement>('#mode-description'),
    trainingStatus: get<HTMLParagraphElement>('#training-status'),
    validation: get<HTMLParagraphElement>('#validation'),
    deviceStatus: get<HTMLParagraphElement>('#device-status'),
    slots,
    machineSettings: get<HTMLFieldSetElement>('#machine-settings'),
    machinePower: get<HTMLSelectElement>('#machine-power'),
    machineDirection: get<HTMLSelectElement>('#machine-direction'),
    renderSlots(bindings: readonly DeviceBinding[], mappings: readonly KeyboardMapping[], pads: readonly Gamepad[]): void {
      slots.replaceChildren();
      bindings.forEach((binding, index) => {
        const section = document.createElement('div');
        section.className = 'player-slot';
        section.style.setProperty('--player-color', ['#f4ba65', '#8fd6cf', '#e7a4bd', '#d2d881'][index] ?? '#fff');
        const label = document.createElement('label');
        label.className = 'player-label';
        label.htmlFor = `device-${index}`;
        label.textContent = `P${index + 1} · ${index % 2 === 0 ? 'Dół' : 'Góra'}`;
        const select = document.createElement('select');
        select.id = label.htmlFor;
        select.dataset.slot = String(index);
        select.add(new Option('Klawiatura', 'keyboard'));
        for (const pad of pads) {
          const option = new Option(`Pad ${pad.index + 1} · ${pad.id}${pad.mapping !== 'standard' ? ' (niestandardowy — niedostępny)' : ''}`, `gamepad:${pad.index}`);
          option.disabled = pad.mapping !== 'standard';
          select.add(option);
        }
        if (binding.kind === 'gamepad' && !pads.some((pad) => pad.index === binding.index)) {
          select.add(new Option(`Pad ${binding.index + 1} · odłączony`, `gamepad:${binding.index}`));
        }
        select.value = binding.kind === 'keyboard' ? 'keyboard' : `gamepad:${binding.index}`;
        section.append(label, select);
        const mapping = mappings[index];
        if (binding.kind === 'keyboard' && mapping) {
          const keys = document.createElement('div');
          keys.className = 'key-map';
          const labels: Record<keyof KeyboardMapping, string> = { up: '↑', down: '↓', left: '←', right: '→', hit: 'Zamach' };
          for (const action of ['up', 'down', 'left', 'right', 'hit'] as const) {
            const keyLabel = document.createElement('label');
            keyLabel.textContent = labels[action];
            const input = document.createElement('input');
            input.readOnly = true;
            input.value = formatKey(mapping[action]);
            input.dataset.profile = String(index);
            input.dataset.action = action;
            input.setAttribute('aria-label', `P${index + 1}: ${labels[action]}`);
            keyLabel.append(input);
            keys.append(keyLabel);
          }
          section.append(keys);
        }
        slots.append(section);
      });
    },
  };
}

export function formatKey(code: string): string {
  return code.replace('Key', '').replace('Arrow', '').replace('Numpad', 'N').replace('Digit', '').replace('Slash', '/');
}