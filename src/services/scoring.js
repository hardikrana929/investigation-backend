const levels = require('../config/difficulty');

function scoreCase(doc, suspectId) {
  const correct = doc.solution.culpritSuspectId === suspectId;
  const basePoints = correct ? levels[doc.difficulty].base : 0;
  const cluePoints = new Set(doc.progress.discoveredClueIds).size * 5;
  const hintPenalty = doc.progress.hintsUsed * 10;
  return { correct, basePoints, cluePoints, hintPenalty, total: Math.max(0, basePoints + cluePoints - hintPenalty) };
}
module.exports = { scoreCase };
