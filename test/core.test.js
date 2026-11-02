const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreCase } = require('../src/services/scoring');
const { safeCase } = require('../src/services/serialize');
const { validateGenerated } = require('../src/validators/case');

function mystery(n) {
  return { title: 'The Quiet Gallery', story: 'A painting vanished during a private gallery event.',
    suspects: Array.from({ length: n.suspects }, (_, i) => ({ id: `suspect_${i+1}`, name: `Guest ${i+1}`, description: 'A guest at the gallery.', motive: 'A personal connection to the painting.', alibi: 'Was in the east hall.' })),
    clues: Array.from({ length: n.clues }, (_, i) => ({ id: `clue_${i+1}`, label: `Evidence ${i+1}`, description: 'A small detail in the gallery.', relevance: 'It narrows the timeline.' })),
    hints: Array.from({ length: n.hints }, (_, i) => `Compare the timeline at step ${i+1}.`),
    solution: { culpritSuspectId: 'suspect_1', explanation: 'The first clue establishes the timeline and the second confirms access.', reasoning: 'Consistent evidence chain.' } };
}

test('scores correct and incorrect accusations from persisted progress', () => {
  const base = { difficulty: 'Medium', solution: { culpritSuspectId: 'suspect_1' }, progress: { discoveredClueIds: ['clue_1','clue_1','clue_2'], hintsUsed: 2 } };
  assert.deepEqual(scoreCase(base, 'suspect_1'), { correct: true, basePoints: 150, cluePoints: 10, hintPenalty: 20, total: 140 });
  assert.deepEqual(scoreCase(base, 'suspect_2'), { correct: false, basePoints: 0, cluePoints: 10, hintPenalty: 20, total: 0 });
});

test('validates exact counts for all difficulty levels', () => {
  for (const [level, counts] of Object.entries({ Easy: {suspects:3,clues:5,hints:2}, Medium: {suspects:4,clues:7,hints:3}, Hard: {suspects:5,clues:9,hints:3} })) assert.equal(validateGenerated(mystery(counts), level).suspects.length, counts.suspects);
  assert.throws(() => validateGenerated(mystery({suspects:3,clues:5,hints:2}), 'Medium'), /incorrect difficulty counts/);
});

test('rejects answer leakage in story, clues, or hints', () => {
  const leaked = mystery({suspects:3,clues:5,hints:2});
  leaked.suspects[0].name = 'Alex Vale';
  leaked.clues[1].description = 'The note was signed by Alex Vale.';
  assert.throws(() => validateGenerated(leaked, 'Easy'), /leaks the solution/);
});

test('active serialization hides solution and undiscovered clue details', () => {
  const doc = { _id: 'abc123', title:'Case',story:'Story',difficulty:'Easy',status:'ACTIVE',suspects:[{id:'s1',name:'One',description:'Public',motive:'Motive',alibi:'Alibi'}],clues:[{id:'c1',label:'Locked',description:'secret evidence',relevance:'private'},{id:'c2',label:'Found',description:'public evidence',relevance:'private'}],hints:['Hint one'],solution:{culpritSuspectId:'s1',explanation:'secret'},progress:{discoveredClueIds:['c2'],hintsUsed:1} };
  const result = safeCase(doc);
  assert.equal(result.clues[0].description, undefined);
  assert.equal(result.clues[1].description, 'public evidence');
  assert.equal(JSON.stringify(result).includes('culpritSuspectId'), false);
  assert.equal(JSON.stringify(result).includes('secret evidence'), false);
});
