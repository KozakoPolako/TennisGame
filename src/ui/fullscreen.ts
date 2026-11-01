interface FullscreenUI {
  courtPanel: HTMLElement;
  fullscreen: HTMLButtonElement;
  courtActions: HTMLElement;
  setupActions: HTMLElement;
}

export function bindFullscreen(ui: FullscreenUI, focusCourt: () => void): () => void {
  const events = new AbortController();
  const marker = document.createComment('game controls');
  ui.setupActions.before(marker);
  let expanded = false;
  let previousFocus: HTMLElement | null = null;
  let previousOverflow = '';
  let previousScroll = 0;
  let backgrounds: { element: HTMLElement; inert: boolean }[] = [];

  const setExpanded = (next: boolean, restoreFocus = true): void => {
    if (expanded === next) return;
    expanded = next;
    if (next) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousOverflow = document.body.style.overflow;
      previousScroll = window.scrollY;
      ui.courtActions.prepend(ui.setupActions);
      backgrounds = Array.from(document.querySelectorAll<HTMLElement>('.topbar, .intro, .setup-panel, .roadmap, .page-footer'))
        .map((element) => ({ element, inert: element.inert }));
      for (const { element } of backgrounds) element.inert = true;
      document.body.style.overflow = 'hidden';
      ui.courtPanel.setAttribute('role', 'dialog');
      ui.courtPanel.setAttribute('aria-modal', 'true');
    } else {
      marker.after(ui.setupActions);
      for (const { element, inert } of backgrounds) element.inert = inert;
      backgrounds = [];
      document.body.style.overflow = previousOverflow;
      ui.courtPanel.removeAttribute('role');
      ui.courtPanel.removeAttribute('aria-modal');
    }
    ui.courtPanel.classList.toggle('is-fullscreen', next);
    ui.fullscreen.setAttribute('aria-pressed', String(next));
    ui.fullscreen.textContent = next ? 'Powrót · Esc' : 'Pełny ekran ⛶';
    ui.fullscreen.title = next ? 'Przywróć standardowy widok' : 'Rozszerz grę na całe okno przeglądarki';
    if (next) focusCourt();
    else {
      window.scrollTo({ top: previousScroll, behavior: 'instant' });
      if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }
  };

  ui.fullscreen.addEventListener('click', () => setExpanded(!expanded), { signal: events.signal });
  document.addEventListener('keydown', (event) => {
    if (!expanded) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setExpanded(false);
    } else if (event.key === 'Tab') {
      const controls = Array.from(ui.courtPanel.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'))
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }, { signal: events.signal });

  return () => {
    events.abort();
    setExpanded(false, false);
    marker.remove();
  };
}