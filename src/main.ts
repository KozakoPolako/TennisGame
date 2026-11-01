import './style.css';
import { MenuAudio } from './audio/menu-audio';
import { BALL_MACHINE, TICK_RATE, type PlayerCount } from './core/simulation';
import { InputDevices, mappingConflicts, type KeyboardMapping } from './input/devices';
import { CourtRenderer } from './render/court-renderer';
import { createBindings, LocalSession } from './session/local-session';
import { formatKey, mountUI } from './ui/app-ui';
import { bindFullscreen } from './ui/fullscreen';

async function bootstrap(): Promise<() => void> {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw new Error('Brak kontenera aplikacji.');
  const ui = mountUI(root);
  const session = new LocalSession();
  const input = new InputDevices();
  const renderer = new CourtRenderer();
  const audio = new MenuAudio();
  const events = new AbortController();
  const options = { signal: events.signal };
  let bindings = createBindings(2);
  let pads: Gamepad[] = [];
  let running = false;
  let previousTime = 0;
  let frame = 0;
  let deviceSignature = '';

  const selectedCount = (): PlayerCount => ui.count.value === '1' ? 1 : ui.count.value === '4' ? 4 : 2;
  const renderTrainingStatus = (): void => {
    const training = session.state.training;
    ui.trainingStatus.hidden = !training;
    ui.trainingStatus.textContent = training
      ? `${training.phase === 'ready' ? training.launches >= BALL_MACHINE.capacity ? 'Kosz pusty — zresetuj kort' : `Podanie za ${Math.ceil(training.countdown / TICK_RATE)} s` : training.phase === 'incoming' ? 'Odbij nadlatującą piłkę' : 'FLAT — piłka odbita'} · Podania: ${training.launches} · Odbicia: ${training.returns} · Trafienia w ciało: ${training.bodyHits} · Piłki na korcie: ${session.state.looseBalls.length}`
      : '';
  };
  const renderMode = (): void => {
    ui.machineSettings.hidden = !session.state.training;
    ui.modeDescription.textContent = session.state.training
      ? 'Trening solo przy pustych trybunach — nieruchoma maszyna podaje według wybranych ustawień siły i kierunku. Standard to dotychczasowe podania środek–lewo–prawo. FLAT: szybkie, płaskie uderzenie bez rotacji. Ustaw się obok toru piłki — trafienie w ciało kończy próbę. Kierunek zależy od odstępu i momentu kontaktu: z dołu kortu wczesny bekhend kieruje piłkę w prawo, późny w lewo; forhend odwrotnie. Piłki odbijają się od obudowy i kosza maszyny; trafienie aktywną piłką kończy próbę i uruchamia kolejne podanie. Piłki zostają do resetu (kosz: 100 piłek); leżące piłki nie blokują ruchu. Dotknięcie taśmy nie oznacza let podczas wymiany. Bez punktacji meczowej.'
      : 'Piaskownica sterowania — sędzia, ball kids i publiczność są już na stadionie. W trybach 2 i 4 graczy piłka jest statyczna; serwis, wymiany i punktacja pozostają do implementacji. Animacja oklasków jest przygotowana do podłączenia po punkcie. Let dotyczy wyłącznie serwisu, który po dotknięciu siatki trafia w prawidłowe pole.';
    renderTrainingStatus();
  };
  const renderSlots = (): void => ui.renderSlots(bindings, input.mappings, pads);
  const pause = (): void => {
    running = false;
    input.setActive(false);
    session.cancelCharges();
    session.clearTiming();
    renderer.draw(session.state);
    ui.start.textContent = session.state.training ? 'Uruchom trening ↗' : 'Uruchom demo ↗';
    ui.status.textContent = 'Pauza · gotowy do wejścia na kort';
  };
  const validate = (): boolean => {
    const keyboardMappings = bindings.flatMap((binding) => binding.kind === 'keyboard' ? input.mappings.slice(binding.profile, binding.profile + 1) : []);
    const conflicts = mappingConflicts(keyboardMappings);
    const padIndices = bindings.flatMap((binding) => binding.kind === 'gamepad' ? [binding.index] : []);
    const missingPad = padIndices.some((index) => !pads.some((pad) => pad.index === index && pad.mapping === 'standard'));
    ui.validation.textContent = conflicts.length ? `Konflikt klawiszy: ${conflicts.map(formatKey).join(', ')}.`
      : new Set(padIndices).size !== padIndices.length ? 'Jeden pad może obsługiwać tylko jeden slot.'
      : missingPad ? 'Wybrany pad jest odłączony lub ma nieobsługiwane mapowanie.' : '';
    return ui.validation.textContent === '';
  };

  renderSlots();
  renderMode();
  try {
    await renderer.init(ui.court);
  } catch (error) {
    input.dispose();
    ui.status.textContent = 'Nie udało się uruchomić WebGL. Sprawdź akcelerację sprzętową przeglądarki i odśwież stronę.';
    throw error;
  }
  renderer.draw(session.state);
  const disposeFullscreen = bindFullscreen(ui, () => renderer.focus());
  ui.panoramic.addEventListener('click', () => {
    const enabled = ui.panoramic.getAttribute('aria-pressed') !== 'true';
    ui.panoramic.setAttribute('aria-pressed', String(enabled));
    ui.panoramic.textContent = `Panorama: ${enabled ? 'wł.' : 'wył.'}`;
    renderer.setPanoramic(enabled);
    renderer.focus();
  }, options);
  ui.start.disabled = false;
  ui.status.textContent = 'Gotowy · uruchom demonstrację';

  ui.start.addEventListener('click', () => {
    if (running) { pause(); return; }
    if (!validate()) return;
    running = true;
    session.clearTiming();
    previousTime = performance.now();
    input.setActive(true);
    renderer.focus();
    ui.start.textContent = session.state.training ? 'Wstrzymaj trening Ⅱ' : 'Wstrzymaj demo Ⅱ';
    ui.status.textContent = session.state.training ? 'Trening aktywny · maszyna do piłek' : 'Demo aktywne · ruch i zamach';
    void audio.playStart();
  }, options);

  const reset = (): void => {
    session.reset(selectedCount(), {
      power: ui.machinePower.value === 'random' ? 'random' : 'standard',
      direction: ui.machineDirection.value === 'random' ? 'random' : 'standard',
    });
    pause();
    renderMode();
    ui.tick.value = '000000';
    renderer.draw(session.state);
  };
  ui.reset.addEventListener('click', reset, options);
  ui.machinePower.addEventListener('change', reset, options);
  ui.machineDirection.addEventListener('change', reset, options);
  ui.count.addEventListener('change', () => {
    bindings = createBindings(selectedCount());
    reset();
    renderSlots();
    validate();
  }, options);
  ui.audio.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    ui.audio.setAttribute('aria-pressed', String(audio.enabled));
    ui.audio.textContent = `Dźwięk: ${audio.enabled ? 'wł.' : 'wył.'}`;
    void audio.playStart();
  }, options);
  ui.slots.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const index = Number(event.target.dataset.slot);
    bindings[index] = event.target.value === 'keyboard'
      ? { kind: 'keyboard', profile: index }
      : { kind: 'gamepad', index: Number(event.target.value.split(':')[1]) };
    pause();
    renderSlots();
    validate();
  }, options);
  ui.slots.addEventListener('keydown', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.key === 'Tab' || event.key === 'Escape') return;
    event.preventDefault();
    if (!event.code || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
    const mapping = input.mappings[Number(event.target.dataset.profile)];
    const action = event.target.dataset.action as keyof KeyboardMapping;
    if (!mapping || !(action in mapping)) return;
    pause();
    mapping[action] = event.code;
    event.target.value = formatKey(event.code);
    validate();
  }, options);
  window.addEventListener('blur', pause, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);

  const refreshPads = (): void => {
    // biome-ignore lint/complexity/useOptionalChain: a type predicate must return boolean, not undefined
    pads = Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => pad !== null && pad.connected);
    const signature = JSON.stringify(pads.map((pad) => [pad.index, pad.id, pad.mapping]));
    if (signature === deviceSignature) return;
    deviceSignature = signature;
    renderSlots();
    ui.deviceStatus.textContent = pads.length
      ? `Wykryte pady: ${pads.length}.${pads.some((pad) => pad.mapping !== 'standard') ? ' Niestandardowe mapowania wymagają przyszłego adaptera.' : ''}`
      : 'Podłącz kontroler i naciśnij jego przycisk, aby go wykryć.';
    if (!validate()) pause();
  };
  const animate = (time: number): void => {
    refreshPads();
    if (running) {
      session.advance(time - previousTime, () => input.sample(bindings));
      renderer.draw(session.state);
      ui.tick.value = String(session.state.tick).padStart(6, '0');
      renderTrainingStatus();
    }
    previousTime = time;
    frame = requestAnimationFrame(animate);
  };
  refreshPads();
  frame = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frame);
    events.abort();
    disposeFullscreen();
    input.dispose();
    renderer.dispose();
    audio.dispose();
  };
}

let disposed = false;
let cleanup: (() => void) | undefined;
void bootstrap().then((dispose) => {
  if (disposed) dispose();
  else cleanup = dispose;
}).catch((error: unknown) => { console.error('Nie udało się uruchomić aplikacji.', error); });

if (import.meta.hot) {
  import.meta.hot.dispose(() => { disposed = true; cleanup?.(); });
}