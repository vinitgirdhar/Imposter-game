/* Pure game rules. No DOM, no storage — easy to test in Node. */
(function (root) {
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;
  const MAX_NAME = 16;

  function secureRandom() {
    const c = typeof crypto !== 'undefined' ? crypto : null;
    if (c && c.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    return Math.random();
  }

  const randInt = (n, rand) => Math.floor(rand() * n);

  /** Fisher–Yates; returns a new array. */
  function shuffle(list, rand = secureRandom) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = randInt(i + 1, rand);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const maxImposters = (players) => Math.max(1, players - 1);

  /** Snap any config into a valid one: 3–20 players, 1..players-1 imposters. */
  function clampConfig({ players, imposters }) {
    const p = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(Number(players) || MIN_PLAYERS)));
    const i = Math.min(maxImposters(p), Math.max(1, Math.round(Number(imposters) || 1)));
    return { players: p, imposters: i };
  }

  /** Pick a pair not in `recent` when possible. */
  function pickPair(pairs, recent = [], rand = secureRandom) {
    const blocked = new Set(recent);
    const fresh = pairs.filter((p) => !blocked.has(p.id));
    const pool = fresh.length ? fresh : pairs;
    return pool[randInt(pool.length, rand)];
  }

  /** Remember the last pairs used; keep at most half the pool so picks stay random. */
  function rememberPair(recent, id, poolSize) {
    const limit = Math.max(1, Math.floor(poolSize / 2));
    return [...recent.filter((r) => r !== id), id].slice(-limit);
  }

  /**
   * Build a fresh round.
   * @returns {{pairId:string, category:string, crewWord:string, imposterWord:string, imposters:number[], starter:number}}
   */
  function createRound({ playerCount, imposterCount, pairs, recent = [], rand = secureRandom }) {
    const cfg = clampConfig({ players: playerCount, imposters: imposterCount });
    const pair = pickPair(pairs, recent, rand);
    const flip = rand() < 0.5;
    const seats = shuffle([...Array(cfg.players).keys()], rand);
    return {
      pairId: pair.id,
      category: pair.category,
      crewWord: flip ? pair.b : pair.a,
      imposterWord: flip ? pair.a : pair.b,
      imposters: seats.slice(0, cfg.imposters).sort((a, b) => a - b),
      starter: randInt(cfg.players, rand),
    };
  }

  const isImposter = (round, i) => round.imposters.includes(i);
  const wordFor = (round, i) => (isImposter(round, i) ? round.imposterWord : round.crewWord);

  const cleanName = (name) => String(name == null ? '' : name).replace(/\s+/g, ' ').trim();

  /** Returns an error message, or '' if the name is fine. */
  function validateName(name, taken) {
    const n = cleanName(name);
    if (!n) return 'Enter a name to continue';
    if (n.length > MAX_NAME) return `Keep it under ${MAX_NAME + 1} characters`;
    const key = n.toLocaleLowerCase();
    if (taken.some((t) => cleanName(t).toLocaleLowerCase() === key)) return 'That name is taken';
    return '';
  }

  /** Compare the group's picks with the real imposters. */
  function scoreVotes(round, votes) {
    const picked = [...new Set(votes)];
    const caught = round.imposters.filter((i) => picked.includes(i));
    return {
      caught,
      escaped: round.imposters.filter((i) => !picked.includes(i)),
      wrong: picked.filter((i) => !round.imposters.includes(i)),
      success: caught.length === round.imposters.length,
    };
  }

  const api = {
    MIN_PLAYERS, MAX_PLAYERS, MAX_NAME,
    shuffle, maxImposters, clampConfig, pickPair, rememberPair,
    createRound, isImposter, wordFor, cleanName, validateName, scoreVotes,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ImposterGame = api;
})(this);
