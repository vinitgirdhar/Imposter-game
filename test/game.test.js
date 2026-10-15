// Run: node test/game.test.js
const assert = require('node:assert/strict');
const G = require('../js/game.js');
const { WORD_PAIRS } = require('../js/words.js');

// Database sanity: unique ids, no pair with identical words.
assert.equal(new Set(WORD_PAIRS.map((p) => p.id)).size, WORD_PAIRS.length, 'duplicate pair');
WORD_PAIRS.forEach((p) => assert.notEqual(p.a.toLowerCase(), p.b.toLowerCase(), p.id));
assert.ok(WORD_PAIRS.length >= 500, `only ${WORD_PAIRS.length} pairs`);
// Same two words in either order counts as a duplicate.
const keys = WORD_PAIRS.map((p) => [p.a, p.b].map((w) => w.toLowerCase()).sort().join('|'));
assert.equal(new Set(keys).size, keys.length, 'pair repeated in reverse order');
WORD_PAIRS.forEach((p) => [p.a, p.b].forEach((w) => assert.equal(w, w.trim(), `stray space in ${p.id}`)));

// Config clamping: imposters always < players.
assert.deepEqual(G.clampConfig({ players: 2, imposters: 5 }), { players: 3, imposters: 2 });
assert.deepEqual(G.clampConfig({ players: 99, imposters: 0 }), { players: 20, imposters: 1 });
assert.deepEqual(G.clampConfig({ players: 6, imposters: 6 }), { players: 6, imposters: 5 });

// Rounds: exact imposter count, crew share one word, imposters share the other.
for (let n = 0; n < 500; n++) {
  const players = 3 + (n % 18);
  const imposters = 1 + (n % (players - 1));
  const r = G.createRound({ playerCount: players, imposterCount: imposters, pairs: WORD_PAIRS });
  assert.equal(r.imposters.length, imposters);
  assert.equal(new Set(r.imposters).size, imposters);
  assert.notEqual(r.crewWord, r.imposterWord);
  const words = [...Array(players).keys()].map((i) => G.wordFor(r, i));
  assert.equal(words.filter((w) => w === r.imposterWord).length, imposters);
  assert.equal(words.filter((w) => w === r.crewWord).length, players - imposters);
  assert.ok(r.starter >= 0 && r.starter < players);
}

// No repeats while fresh pairs remain.
let recent = [];
for (let n = 0; n < 50; n++) {
  const p = G.pickPair(WORD_PAIRS, recent);
  assert.ok(!recent.includes(p.id), 'repeated pair');
  recent = G.rememberPair(recent, p.id, WORD_PAIRS.length);
}
// Exhausted pool still returns something.
assert.ok(G.pickPair(WORD_PAIRS.slice(0, 1), [WORD_PAIRS[0].id]));

// Names: required, length cap, case-insensitive duplicates.
assert.ok(G.validateName('  ', []));
assert.ok(G.validateName('x'.repeat(17), []));
assert.ok(G.validateName('alex ', ['Alex']));
assert.equal(G.validateName('Sam', ['Alex']), '');

// Voting.
const round = { imposters: [1, 4] };
assert.deepEqual(G.scoreVotes(round, [1, 4]), { caught: [1, 4], escaped: [], wrong: [], success: true });
assert.deepEqual(G.scoreVotes(round, [1, 2]), { caught: [1], escaped: [4], wrong: [2], success: false });

console.log(`ok — ${WORD_PAIRS.length} word pairs, all checks passed`);
