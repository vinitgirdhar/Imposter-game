/* App shell: state, browser persistence, routing, theme. */
(function () {
  const G = window.ImposterGame;
  const PAIRS = window.IMPOSTER_WORDS;
  const { enter, leave, bindPress, ambient, toast } = window.FX;
  const gsap = window.gsap;
  const KEY = 'imposter.v1';
  const PHASES = ['name', 'reveal', 'handoff', 'ready', 'play', 'vote', 'result'];

  /* ---------- Persistence (localStorage only; nothing leaves the device) ---------- */
  const defaults = () => ({
    config: { players: 5, imposters: 1 },
    names: [],
    lastNames: [],
    recent: [],
    theme: null,
    view: 'home',
    round: null,
  });

  function validRound(r) {
    if (!r || typeof r !== 'object') return null;
    const ok = PHASES.includes(r.phase)
      && Number.isInteger(r.players) && r.players >= G.MIN_PLAYERS && r.players <= G.MAX_PLAYERS
      && Number.isInteger(r.current) && r.current >= 0 && r.current < r.players
      && Array.isArray(r.imposters) && r.imposters.length >= 1 && r.imposters.length < r.players
      && typeof r.crewWord === 'string' && typeof r.imposterWord === 'string';
    return ok ? r : null;
  }

  function load() {
    const base = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      const s = {
        ...base,
        config: G.clampConfig({ ...base.config, ...(saved.config || {}) }),
        names: Array.isArray(saved.names) ? saved.names.map(String) : [],
        lastNames: Array.isArray(saved.lastNames) ? saved.lastNames.map(String) : [],
        recent: Array.isArray(saved.recent) ? saved.recent.map(String) : [],
        theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : null,
        round: validRound(saved.round),
      };
      // A round past name entry needs a name for every seat that has played.
      if (s.round && s.round.phase !== 'name' && s.names.length < Math.min(s.round.current + 1, s.round.players)) s.round = null;
      // Always reopen on Home; an unfinished round can be resumed from there.
      return { ...s, view: 'home' };
    } catch (e) {
      return base;
    }
  }

  let state = load();
  function save() {
    try {
      const { view, ...rest } = state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch (e) { /* storage full or blocked: game still works in memory */ }
  }
  function update(patch) { state = { ...state, ...patch }; save(); }
  function updateRound(patch) { update({ round: { ...state.round, ...patch } }); }

  /* ---------- Round creation ---------- */
  function newRound(config, replay) {
    const r = G.createRound({ playerCount: config.players, imposterCount: config.imposters, pairs: PAIRS, recent: state.recent });
    update({ recent: G.rememberPair(state.recent, r.pairId, PAIRS.length) });
    return { ...r, players: config.players, current: 0, votes: [], replay, phase: replay ? 'handoff' : 'name' };
  }

  /* ---------- Actions (exposed to screens) ---------- */
  const ctx = {
    get state() { return state; },
    canResume: () => !!state.round && state.round.phase !== 'result',
    openSetup: () => { update({ view: 'setup' }); render(); },
    resume: () => { update({ view: 'round' }); render(); },
    saveConfig: (config) => update({ config: G.clampConfig(config) }),
    beginGame(config) {
      const cfg = G.clampConfig(config);
      const lastNames = state.names.length ? state.names : state.lastNames;
      update({ config: cfg, names: [], lastNames });
      update({ round: newRound(cfg, false), view: 'round' });
      render();
    },
    submitName(name) {
      const i = state.round.current;
      const taken = state.names.slice(0, i);
      if (G.validateName(name, taken)) return; // guard against double submits
      update({ names: [...taken, name] });
      updateRound({ phase: 'reveal' });
      render();
    },
    hideAndPass() {
      const { current, players } = state.round;
      // Persist the advance first so a reload can never land back on a revealed word.
      updateRound(current < players - 1 ? { current: current + 1, phase: 'handoff' } : { phase: 'ready' });
      render();
    },
    acceptHandoff: () => { updateRound({ phase: state.round.replay ? 'reveal' : 'name' }); render(); },
    startPlaying: () => { updateRound({ phase: 'play' }); render(); },
    startVoting: () => { updateRound({ phase: 'vote', votes: [] }); render(); },
    setVotes: (votes) => updateRound({ votes }),
    revealResult(votes) {
      if (votes.length !== state.round.imposters.length) return;
      updateRound({ votes, phase: 'result' });
      render();
    },
    playAgain() {
      update({ round: newRound(state.config, true), view: 'round' });
      render();
    },
    newGame: () => { update({ round: null, view: 'setup' }); render(); },
    goHome: () => { update({ round: null, view: 'home' }); render(); },
  };

  /* ---------- Router ---------- */
  const stage = document.getElementById('stage');
  const quitBtn = document.getElementById('btn-quit');
  const titleEl = document.getElementById('topbar-title');
  const TITLES = { setup: '', name: 'Secret words', reveal: 'Secret words', handoff: 'Secret words', ready: '', play: 'Clue round', vote: 'Voting', result: 'Results' };

  const screenName = () => {
    if (state.view === 'setup') return 'setup';
    if (state.view === 'round' && state.round) return state.round.phase;
    return 'home';
  };

  let cleanup = null;
  let busy = false;
  let queued = false;

  async function render() {
    if (busy) { queued = true; return; }
    busy = true;
    stage.style.pointerEvents = 'none'; // block double taps mid-transition
    const name = screenName();
    const old = stage.firstElementChild;
    if (cleanup) { cleanup(); cleanup = null; }
    if (old) await leave(old);
    stage.innerHTML = '';

    const view = window.Screens[name](ctx);
    stage.innerHTML = view.html;
    const el = stage.firstElementChild;
    quitBtn.hidden = !(state.view === 'round' && name !== 'result');
    titleEl.textContent = TITLES[name] || '';
    cleanup = view.mount(el, ctx) || null;
    enter(el);
    await new Promise((r) => setTimeout(r, 320)); // unlock input once the screen has mostly landed

    stage.style.pointerEvents = '';
    busy = false;
    if (queued) { queued = false; render(); }
  }

  /* ---------- Leave-game sheet ---------- */
  function confirmQuit() {
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="sheet-backdrop" data-close></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
        <h2 id="sheet-t">Leave this round?</h2>
        <p>Words and votes for this round will be discarded.</p>
        <button class="btn btn-danger" data-quit>Leave Round</button>
        <button class="btn btn-secondary" data-close>Keep Playing</button>
      </div>`;
    const sheet = root.querySelector('.sheet');
    const back = root.querySelector('.sheet-backdrop');
    gsap.fromTo(back, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
    gsap.fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' });
    const close = (then) => {
      gsap.to(back, { autoAlpha: 0, duration: 0.2 });
      gsap.to(sheet, { yPercent: 100, duration: 0.3, ease: 'power2.in', onComplete: () => { root.innerHTML = ''; if (then) then(); } });
    };
    root.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => close(); });
    root.querySelector('[data-quit]').onclick = () => close(ctx.goHome);
  }
  quitBtn.onclick = confirmQuit;

  /* ---------- Theme ---------- */
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  const effectiveTheme = () => state.theme || (darkMq.matches ? 'dark' : 'light');
  function applyTheme() {
    const root = document.documentElement;
    if (state.theme) root.dataset.theme = state.theme; else delete root.dataset.theme;
    root.dataset.dark = effectiveTheme() === 'dark' ? '1' : '0';
  }
  document.getElementById('btn-theme').onclick = (e) => {
    update({ theme: effectiveTheme() === 'dark' ? 'light' : 'dark' });
    applyTheme();
    gsap.fromTo(e.currentTarget.querySelectorAll('svg'), { rotation: -90, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.6, ease: 'back.out(2)' });
  };
  darkMq.addEventListener('change', applyTheme);

  /* ---------- Back button guard ---------- */
  // Browser "back" must never step into an earlier player's word, so we trap it.
  history.replaceState({ imposter: 1 }, '');
  history.pushState({ imposter: 2 }, '');
  window.addEventListener('popstate', () => {
    history.pushState({ imposter: 2 }, '');
    const name = screenName();
    if (name === 'setup') ctx.goHome();
    else if (name !== 'home') toast('Use the buttons on screen');
  });

  /* ---------- Boot ---------- */
  applyTheme();
  bindPress(document.body);
  ambient();
  render();
})();
