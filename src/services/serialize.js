function safeCase(doc, content = doc) {
  const discovered = new Set(doc.progress.discoveredClueIds.map(String));
  return {
    id: String(doc._id), title: content.title, story: content.story, difficulty: doc.difficulty, language: content.language || doc.language || 'en',
    suspects: content.suspects.map(({ id, name, description, motive, alibi }) => ({ id, name, description, motive, alibi })),
    clues: content.clues.map(({ id, label, description }) => ({ id, label, ...(discovered.has(id) ? { description } : {}), discovered: discovered.has(id) })),
    progress: { discoveredClueIds: [...discovered], hintsUsed: doc.progress.hintsUsed, hints: doc.hints.slice(0, doc.progress.hintsUsed), status: doc.status },
  };
}
function resultObject(doc, content = doc) {
  return { status: 'COMPLETED', correct: doc.result.correct, culprit: { id: content.solution.culpritSuspectId, name: content.suspects.find(s => s.id === content.solution.culpritSuspectId)?.name }, explanation: content.solution.explanation, score: { basePoints: doc.result.basePoints, cluePoints: doc.result.cluePoints, hintPenalty: doc.result.hintPenalty, total: doc.result.total } };
}
module.exports = { safeCase, resultObject };
