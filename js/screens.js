/* Screen views. Each returns { html, mount(el, ctx) -> cleanup? }.
   ctx exposes the current state and the actions from app.js. */
(function () {
  const G = window.ImposterGame;
  const { escapeHtml: esc, enter, rollCounter, shake, pop, haptic, splitText, confetti, toast, reduced } = window.FX;
  const gsap = window.gsap;

  const initial = (name) => esc(([...String(name).trim()][0] || '?').toLocaleUpperCase());
  const plural = (n, one, many) => (n === 1 ? one : many);
  const icon = {
    eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>',
    ear: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    minus: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function progress(done, total, from = done) {
    return `<div class="progress" data-anim>
      <div class="progress-meta"><span>Player ${Math.min(done + 1, total)} of ${total}</span><span>${done} ready</span></div>
      <div class="progress-track"><div class="progress-fill" data-from="${(from / total) * 100}" data-to="${(done / total) * 100}"></div></div>
    </div>`;
  }
  function animateProgress(el) {
    const fill = el.querySelector('.progress-fill');
    if (!fill) return;
    gsap.fromTo(fill, { width: `${fill.dataset.from}%` }, { width: `${fill.dataset.to}%`, duration: 0.9, ease: 'expo.out', delay: 0.15 });
  }

  /* ---------------- Home ---------------- */
  function home(ctx) {
    const canResume = ctx.canResume();
    return {
      html: `<section class="screen">
        <div class="screen-body center">
          <img class="logo" src="icon.svg" alt="" data-anim>
          <h1 class="title-xl" data-split>Imposter</h1>
          <p class="lead" data-anim>Everyone gets the same secret word.<br>Except the imposter.</p>
          <div class="card" data-anim>
            <ol class="steps">
              <li class="step"><span class="step-num">1</span><span><b>Pass the phone</b> — each player privately sees a word.</span></li>
              <li class="step"><span class="step-num">2</span><span><b>Give clues</b> about your word without saying it.</span></li>
              <li class="step"><span class="step-num">3</span><span><b>Vote</b> for whoever seems to have a different word.</span></li>
            </ol>
          </div>
        </div>
        <div class="screen-foot">
          ${canResume ? '<button class="btn btn-secondary" data-anim data-act="resume">Resume Round</button>' : ''}
          <button class="btn btn-primary" data-anim data-act="start">Start Game</button>
        </div>
      </section>`,
      mount(el) {
        el.querySelector('[data-act="start"]').onclick = ctx.openSetup;
        const r = el.querySelector('[data-act="resume"]');
        if (r) r.onclick = ctx.resume;
        if (!reduced()) {
          const t = gsap.to(el.querySelector('.logo'), { y: -8, rotation: -3, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.8 });
          return () => t.kill();
        }
      },
    };
  }

  /* ---------------- Setup ---------------- */
  function setup(ctx) {
    let { players, imposters } = ctx.state.config;
    const stepper = (key, label, value) => `
      <div class="stepper">
        <div><div class="stepper-label">${label}</div><div class="stepper-hint" data-hint="${key}"></div></div>
        <div class="stepper-ctrl">
          <button class="round-btn" data-step="${key}" data-dir="-1" aria-label="Fewer ${label.toLowerCase()}">${icon.minus}</button>
          <div class="counter" data-counter="${key}" aria-live="polite"><span>${value}</span></div>
          <button class="round-btn" data-step="${key}" data-dir="1" aria-label="More ${label.toLowerCase()}">${icon.plus}</button>
        </div>
      </div>`;
    return {
      html: `<section class="screen">
        <div class="screen-body">
          <div data-anim><p class="eyebrow">New game</p><h1 class="title">Who's playing?</h1></div>
          <div class="card" data-anim>${stepper('players', 'Players', players)}<div class="avatars" data-avatars></div></div>
          <div class="card" data-anim>${stepper('imposters', 'Imposters', imposters)}</div>
          <p class="setup-summary" data-anim data-summary></p>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="go">Start</button></div>
      </section>`,
      mount(el) {
        const q = (s) => el.querySelector(s);
        const avatars = q('[data-avatars]');
        const sync = (grew) => {
          const max = G.maxImposters(players);
          q('[data-step="players"][data-dir="-1"]').disabled = players <= G.MIN_PLAYERS;
          q('[data-step="players"][data-dir="1"]').disabled = players >= G.MAX_PLAYERS;
          q('[data-step="imposters"][data-dir="-1"]').disabled = imposters <= 1;
          q('[data-step="imposters"][data-dir="1"]').disabled = imposters >= max;
          q('[data-hint="players"]').textContent = `${G.MIN_PLAYERS} to ${G.MAX_PLAYERS}`;
          q('[data-hint="imposters"]').textContent = `Up to ${max}`;
          avatars.innerHTML = Array.from({ length: players }, (_, i) =>
            `<span class="avatar-dot${i >= players - imposters ? ' imp' : ''}">${i >= players - imposters ? '?' : ''}</span>`).join('');
          if (grew === 'players') pop(avatars.lastElementChild);
          if (grew === 'imposters') pop(avatars.children[players - imposters]);
          const crew = players - imposters;
          q('[data-summary]').textContent = `${crew} ${plural(crew, 'player shares', 'players share')} one word · ${imposters} ${plural(imposters, 'imposter gets', 'imposters get')} another`;
        };
        el.querySelectorAll('[data-step]').forEach((b) => {
          b.onclick = () => {
            const dir = Number(b.dataset.dir);
            const before = { players, imposters };
            ({ players, imposters } = G.clampConfig(b.dataset.step === 'players'
              ? { players: players + dir, imposters }
              : { players, imposters: imposters + dir }));
            if (before.players === players && before.imposters === imposters) return;
            haptic();
            if (before.players !== players) rollCounter(q('[data-counter="players"]'), players, dir);
            if (before.imposters !== imposters) rollCounter(q('[data-counter="imposters"]'), imposters, Math.sign(imposters - before.imposters));
            sync(dir > 0 ? b.dataset.step : null);
            ctx.saveConfig({ players, imposters });
          };
        });
        q('[data-act="go"]').onclick = () => ctx.beginGame({ players, imposters });
        sync();
        if (!reduced()) gsap.from(avatars.children, { scale: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.025, delay: 0.3 });
      },
    };
  }

  /* ---------------- Name entry ---------------- */
  function name(ctx) {
    const { round, names, lastNames } = ctx.state;
    const i = round.current;
    const taken = names.slice(0, i);
    const suggestions = lastNames.filter((n) => !G.validateName(n, taken)).slice(0, 8);
    return {
      html: `<section class="screen">
        <div class="screen-body top">
          ${progress(i, round.players)}
          <div data-anim><p class="eyebrow">Player ${i + 1}</p><h1 class="title">What's your name?</h1></div>
          <form data-anim data-form novalidate>
            <input class="field" name="name" type="text" placeholder="Your name" maxlength="${G.MAX_NAME}"
              autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" aria-label="Your name">
            <p class="field-error" data-error role="alert"></p>
          </form>
          ${suggestions.length ? `<div data-anim><p class="stepper-hint" style="margin:0 0 10px">From last game</p>
            <div class="chips">${suggestions.map((n) => `<button class="chip" type="button" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>` : ''}
          <div class="privacy-note" data-anim>${icon.eye}<span>Next you'll see your secret word. Make sure nobody is peeking.</span></div>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="go" disabled>Continue</button></div>
      </section>`,
      mount(el) {
        const input = el.querySelector('input');
        const btn = el.querySelector('[data-act="go"]');
        const err = el.querySelector('[data-error]');
        const submit = () => {
          const msg = G.validateName(input.value, taken);
          if (msg) { err.textContent = msg; shake(input); return; }
          input.blur();
          ctx.submitName(G.cleanName(input.value));
        };
        input.oninput = () => { btn.disabled = !G.cleanName(input.value); err.textContent = ''; };
        el.querySelector('[data-form]').onsubmit = (e) => { e.preventDefault(); submit(); };
        btn.onclick = submit;
        el.querySelectorAll('[data-name]').forEach((c) => {
          c.onclick = () => { input.value = c.dataset.name; input.oninput(); submit(); };
        });
        setTimeout(() => input.focus({ preventScroll: true }), 450);
      },
    };
  }

  /* ---------------- Secret word reveal ---------------- */
  function reveal(ctx) {
    const { round, names } = ctx.state;
    const i = round.current;
    return {
      html: `<section class="screen">
        <div class="screen-body">
          ${progress(i, round.players)}
          <div class="center" data-anim style="display:flex;flex-direction:column;gap:6px">
            <p class="eyebrow">Hi, ${esc(names[i])}</p>
            <h1 class="title" style="font-size:28px">Only you should see this</h1>
          </div>
          <div class="flip" data-anim>
            <div class="flip-inner" data-card role="button" tabindex="0" aria-label="Reveal my word">
              <div class="face face-back"><div class="q">?</div><div class="hint">Tap to reveal</div><div class="shine"></div></div>
              <div class="face face-front" data-front></div>
            </div>
          </div>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="toggle">Reveal My Word</button></div>
      </section>`,
      mount(el) {
        const card = el.querySelector('[data-card]');
        const front = el.querySelector('[data-front]');
        const btn = el.querySelector('[data-act="toggle"]');
        let shown = false;
        let busy = false;
        let showTl = null;
        const shine = gsap.to(el.querySelector('.shine'), { xPercent: 60, duration: 1.8, ease: 'power2.inOut', repeat: -1, repeatDelay: 1.6, delay: 1 });

        const show = () => {
          if (busy || shown) return;
          busy = true; shown = true; haptic(12);
          // The word only enters the DOM at this moment and is removed again on hide.
          front.innerHTML = `<p class="eyebrow">${esc(round.category)}</p>
            <div class="secret-word" data-word>${esc(G.wordFor(round, i))}</div>
            <p class="lead">Memorise it. Don't say it out loud.</p>`;
          const chars = splitText(front.querySelector('[data-word]'));
          btn.textContent = 'Hide & Pass';
          card.setAttribute('aria-label', 'Your word is shown');
          const tl = showTl = gsap.timeline({ onComplete: () => { busy = false; } });
          if (reduced()) {
            tl.set(card, { rotationY: 180 }).fromTo(front, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
          } else {
            tl.to(card, { scale: 0.94, duration: 0.15, ease: 'power2.out' })
              .to(card, { rotationY: 180, scale: 1, duration: 0.9, ease: 'expo.out' })
              .fromTo(front.querySelector('.eyebrow'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 }, '-=0.6')
              .fromTo(chars, { autoAlpha: 0, yPercent: 80, rotateX: -90 },
                { autoAlpha: 1, yPercent: 0, rotateX: 0, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.035 }, '-=0.55')
              .fromTo(front.querySelector('.lead'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, '-=0.2');
          }
        };

        const hide = (advance) => {
          if (showTl && showTl.isActive()) showTl.progress(1); // allow hiding mid-reveal
          if (busy || !shown) return;
          busy = true; haptic(12);
          const done = () => {
            front.innerHTML = '';
            shown = false; busy = false;
            btn.textContent = 'Reveal My Word';
            card.setAttribute('aria-label', 'Reveal my word');
            if (advance) ctx.hideAndPass();
          };
          if (reduced()) { gsap.set(card, { rotationY: 0 }); done(); return; }
          gsap.timeline({ onComplete: done })
            .to(front.children, { autoAlpha: 0, duration: 0.2 })
            .to(card, { rotationY: 0, duration: 0.6, ease: 'power3.inOut' }, '<0.05');
        };

        card.onclick = () => (shown ? null : show());
        card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } };
        btn.onclick = () => (shown ? hide(true) : show());

        // Privacy: if the app is backgrounded or the screen locks, cover the word.
        const onHidden = () => {
          if (document.hidden && shown) {
            gsap.killTweensOf([card, front.children]);
            gsap.set(card, { rotationY: 0, scale: 1 });
            front.innerHTML = ''; shown = false; busy = false;
            btn.textContent = 'Reveal My Word';
          }
        };
        document.addEventListener('visibilitychange', onHidden);
        return () => { shine.kill(); document.removeEventListener('visibilitychange', onHidden); front.innerHTML = ''; };
      },
    };
  }

  /* ---------------- Pass the phone ---------------- */
  function handoff(ctx) {
    const { round, names } = ctx.state;
    const i = round.current;
    const who = round.replay ? names[i] : `Player ${i + 1}`;
    return {
      html: `<section class="screen">
        <div class="screen-body center">
          ${i > 0 ? progress(i, round.players, i - 1) : ''}
          <div class="pass-visual" data-anim><div class="pass-ring"></div><div class="pass-ring"></div><div class="pass-phone"></div></div>
          <div data-anim style="display:flex;flex-direction:column;gap:10px">
            <p class="lead">Pass the phone to</p>
            <div class="next-name" data-split>${esc(who)}</div>
          </div>
          <p class="lead" data-anim style="font-size:15px">Hand it over without looking at the screen.</p>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="go">I'm ${esc(who)}</button></div>
      </section>`,
      mount(el) {
        animateProgress(el);
        el.querySelector('[data-act="go"]').onclick = ctx.acceptHandoff;
        if (reduced()) return;
        const rings = el.querySelectorAll('.pass-ring');
        const t1 = gsap.fromTo(rings, { scale: 0.5, autoAlpha: 0.7 }, { scale: 1.4, autoAlpha: 0, duration: 2, ease: 'power2.out', stagger: 1, repeat: -1 });
        const t2 = gsap.fromTo(el.querySelector('.pass-phone'), { x: -60, rotation: -14 },
          { x: 0, rotation: 0, duration: 1, ease: 'expo.out', delay: 0.2 });
        return () => { t1.kill(); t2.kill(); };
      },
    };
  }

  /* ---------------- Everyone ready ---------------- */
  function ready(ctx) {
    const { names, round } = ctx.state;
    const r = 96;
    const dots = names.slice(0, round.players).map((n, k) => {
      const a = (k / round.players) * Math.PI * 2 - Math.PI / 2;
      return `<span class="avatar-dot" style="position:absolute;left:calc(50% + ${Math.cos(a) * r}px - 14px);top:calc(50% + ${Math.sin(a) * r}px - 14px)">${initial(n)}</span>`;
    }).join('');
    return {
      html: `<section class="screen">
        <div class="screen-body center">
          <div data-anim style="position:relative;width:240px;height:240px;margin:0 auto">
            <div data-orbit style="position:absolute;inset:0">${dots}</div>
            <img src="icon.svg" alt="" style="position:absolute;left:50%;top:50%;width:92px;height:92px;margin:-46px;border-radius:26px;box-shadow:var(--shadow-btn)">
          </div>
          <h1 class="title" data-split>Everyone Has Their Word!</h1>
          <p class="lead" data-anim>Somebody among you got a different one.<br>Time to find out who.</p>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="go">Start Playing</button></div>
      </section>`,
      mount(el) {
        el.querySelector('[data-act="go"]').onclick = ctx.startPlaying;
        if (reduced()) return;
        const orbit = el.querySelector('[data-orbit]');
        gsap.from(orbit.children, { scale: 0, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.05, delay: 0.3 });
        const t = gsap.to(orbit, { rotation: 360, duration: 40, ease: 'none', repeat: -1 });
        const counter = gsap.to(orbit.children, { rotation: -360, duration: 40, ease: 'none', repeat: -1 });
        return () => { t.kill(); counter.kill(); };
      },
    };
  }

  /* ---------------- Clue round ---------------- */
  function play(ctx) {
    const { names, round } = ctx.state;
    const list = names.slice(0, round.players);
    const compact = list.length > 10;
    return {
      html: `<section class="screen">
        <div class="screen-body top">
          <span class="category-pill" data-anim>Category · ${esc(round.category)}</span>
          <div class="starter-line" data-anim data-starter><p class="lead">Picking who goes first…</p></div>
          <div class="scroll" data-anim style="flex:0 1 auto">
            <div class="players-grid" style="${compact ? 'grid-template-columns:repeat(3,1fr)' : ''}">
              ${list.map((n, k) => `<div class="player-chip" data-chip="${k}">${compact ? '' : `<span class="initial">${initial(n)}</span>`}<span class="nm">${esc(n)}</span></div>`).join('')}
            </div>
          </div>
          <div class="card" data-anim style="display:grid;gap:14px">
            <div class="tip"><span class="tip-icon">${icon.chat}</span><span>Go around once. Each player gives <b>one short clue</b> about their word — never the word itself.</span></div>
            <div class="tip"><span class="tip-icon">${icon.ear}</span><span>Listen for clues that feel slightly off. Then vote together.</span></div>
          </div>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="go" disabled>Start Voting</button></div>
      </section>`,
      mount(el) {
        const btn = el.querySelector('[data-act="go"]');
        const chips = Array.from(el.querySelectorAll('[data-chip]'));
        const line = el.querySelector('[data-starter]');
        btn.onclick = ctx.startVoting;
        const land = () => {
          chips.forEach((c, k) => c.classList.toggle('lit', k === round.starter));
          line.innerHTML = `<h2 class="title">${esc(list[round.starter])} goes first</h2><p class="lead" style="font-size:15px">Then continue in the order you passed the phone.</p>`;
          if (!reduced()) {
            gsap.from(line.children, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'expo.out', stagger: 0.08 });
            pop(chips[round.starter]);
          }
          haptic(20);
          btn.disabled = false;
        };
        if (reduced()) { land(); return; }
        // Roulette: highlight hops around and slows down, landing on the starter.
        const steps = list.length * 2 + round.starter + 1;
        const tl = gsap.timeline({ delay: 0.6, onComplete: land });
        let t = 0;
        for (let s = 0; s < steps; s++) {
          const k = s % list.length;
          const p = s / steps;
          t += 0.05 + p * p * 0.28;
          tl.call(() => { chips.forEach((c, j) => c.classList.toggle('lit', j === k)); haptic(4); }, null, t);
        }
        return () => tl.kill();
      },
    };
  }

  /* ---------------- Voting ---------------- */
  function vote(ctx) {
    const { names, round } = ctx.state;
    const need = round.imposters.length;
    const list = names.slice(0, round.players);
    let picks = (round.votes || []).filter((v) => v < list.length).slice(0, need);
    return {
      html: `<section class="screen">
        <div class="screen-body top">
          <div data-anim><p class="eyebrow">Vote</p><h1 class="title">${need === 1 ? "Who's the imposter?" : 'Who are the imposters?'}</h1></div>
          <p class="lead" data-anim>Discuss, then pick <b>${need}</b> together. <span class="vote-count" data-count></span></p>
          <div class="scroll" data-anim style="flex:1;margin:0 -2px">
            <div class="vote-grid" style="${list.length > 8 ? 'grid-template-columns:repeat(3,1fr)' : ''}">
              ${list.map((n, k) => `<button class="vote-tile" data-vote="${k}" aria-pressed="false">
                <span class="check">${icon.check}</span><span class="avatar">${initial(n)}</span><span class="nm">${esc(n)}</span></button>`).join('')}
            </div>
          </div>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" data-anim data-act="go" disabled>Reveal ${plural(need, 'the Imposter', 'the Imposters')}</button></div>
      </section>`,
      mount(el) {
        const btn = el.querySelector('[data-act="go"]');
        const count = el.querySelector('[data-count]');
        const tiles = Array.from(el.querySelectorAll('[data-vote]'));
        const sync = (changed) => {
          tiles.forEach((t, k) => {
            const on = picks.includes(k);
            t.classList.toggle('on', on);
            t.classList.toggle('dim', !on && picks.length === need);
            t.setAttribute('aria-pressed', String(on));
            if (k === changed) gsap.to(t.querySelector('.check'), { scale: on ? 1 : 0, duration: 0.4, ease: on ? 'back.out(3)' : 'power2.in' });
            else if (changed === undefined) gsap.set(t.querySelector('.check'), { scale: on ? 1 : 0 });
          });
          count.textContent = `${picks.length} / ${need}`;
          btn.disabled = picks.length !== need;
        };
        tiles.forEach((t, k) => {
          t.onclick = () => {
            if (picks.includes(k)) picks = picks.filter((p) => p !== k);
            else if (need === 1) picks = [k];
            else if (picks.length < need) picks = [...picks, k];
            else { shake(count); toast('Unselect someone first'); return; }
            haptic();
            sync(k);
            ctx.setVotes(picks);
          };
        });
        btn.onclick = () => ctx.revealResult(picks);
        sync();
      },
    };
  }

  /* ---------------- Reveal & results ---------------- */
  function result(ctx) {
    const { names, round } = ctx.state;
    const score = G.scoreVotes(round, round.votes || []);
    const many = round.imposters.length > 1;
    const verdict = score.success
      ? { cls: 'win', title: many ? 'Imposters caught!' : 'Imposter caught!', lead: 'Brilliant detective work.' }
      : score.caught.length
        ? { cls: 'lose', title: 'So close!', lead: `You found ${score.caught.length} of ${round.imposters.length}. The rest blended right in.` }
        : { cls: 'lose', title: many ? 'Imposters win!' : 'Imposter wins!', lead: 'They blended right in.' };
    const wrong = score.wrong.map((k) => esc(names[k]));
    return {
      html: `<section class="screen">
        <div class="screen-body result scroll">
          <div class="center" style="display:flex;flex-direction:column;gap:14px" data-intro>
            <div class="suspense" data-dots><i></i><i></i><i></i></div>
            <h1 class="title" style="font-size:28px">${many ? 'The imposters were…' : 'The imposter was…'}</h1>
          </div>
          <div class="imp-list">
            ${round.imposters.map((k) => `<div class="imp-card" data-imp>
              <div class="face face-back"><div class="q">?</div></div>
              <div class="face face-front"><span class="avatar">${initial(names[k])}</span><span class="nm">${esc(names[k])}</span>
                <span class="badge ${score.caught.includes(k) ? 'ok">Caught' : 'bad">Escaped'}</span></div>
            </div>`).join('')}
          </div>
          <div class="words-row" data-words>
            <div class="word-box imp"><small>Imposter word</small><b>${esc(round.imposterWord)}</b></div>
            <div class="word-box"><small>Everyone else</small><b>${esc(round.crewWord)}</b></div>
          </div>
          <div class="verdict ${verdict.cls}" data-verdict>
            <h2 class="title">${verdict.title}</h2>
            <p class="lead" style="margin-top:6px">${verdict.lead}${wrong.length ? `<br><span style="font-size:14px">Wrongly accused: ${wrong.join(', ')}</span>` : ''}</p>
          </div>
          <p class="skip-hint" data-skip>Tap to skip</p>
        </div>
        <div class="screen-foot" data-actions>
          <button class="btn btn-primary" data-act="again">Play Again</button>
          <div class="btn-row">
            <button class="btn btn-secondary" data-act="new">New Game</button>
            <button class="btn btn-secondary" data-act="home">Home</button>
          </div>
        </div>
      </section>`,
      mount(el) {
        const q = (s) => el.querySelector(s);
        const cards = Array.from(el.querySelectorAll('[data-imp]'));
        q('[data-act="again"]').onclick = ctx.playAgain;
        q('[data-act="new"]').onclick = ctx.newGame;
        q('[data-act="home"]').onclick = ctx.goHome;

        const hidden = [cards, q('[data-words]'), q('[data-verdict]'), q('[data-actions]')];
        gsap.set(hidden, { autoAlpha: 0 });
        const celebrate = () => {
          if (score.success) { confetti(); haptic([20, 60, 20]); } else { shake(q('[data-verdict] .title')); }
        };
        const tl = gsap.timeline({ delay: 0.35 });
        const fast = reduced();
        tl.fromTo(q('[data-dots]').children, { y: 0 }, fast ? { y: 0, duration: 0.3 } :
          { y: -10, duration: 0.32, ease: 'sine.inOut', stagger: 0.12, yoyo: true, repeat: 5 });
        cards.forEach((c) => {
          tl.fromTo(c, { autoAlpha: 0, y: 30, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: fast ? 0.2 : 0.5, ease: 'back.out(1.6)' }, '+=0.15')
            .to(c, fast ? { rotationY: 180, duration: 0.01 } : { rotationY: 180, duration: 0.9, ease: 'expo.inOut' }, '+=0.35')
            .call(() => haptic(25));
        });
        tl.to(q('[data-skip]'), { autoAlpha: 0, duration: 0.2 }, '+=0.3')
          .fromTo(q('[data-words]').children, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.12 })
          .set(q('[data-words]'), { autoAlpha: 1 }, '<')
          .fromTo(q('[data-verdict]'), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, '+=0.35')
          .call(celebrate)
          .fromTo(q('[data-actions]'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' }, '+=0.3');

        const skip = () => { if (tl.progress() < 1) tl.progress(1); };
        el.addEventListener('click', skip);
        return () => { tl.kill(); el.removeEventListener('click', skip); };
      },
    };
  }

  window.Screens = { home, setup, name, reveal, handoff, ready, play, vote, result };
})();
