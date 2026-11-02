const express = require('express');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const levels = require('../config/difficulty');
const { generateMystery, translateMystery } = require('../services/gemini');
const { safeCase, resultObject } = require('../services/serialize');
const { scoreCase } = require('../services/scoring');

const router = express.Router();
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.route?.path || req.path}`;
    const now = Date.now(); const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a little and try again.' } });
    recent.push(now); hits.set(key, recent); next();
  };
}
const languageNames = { en: 'English', hi: 'Hindi', gu: 'Gujarati' };
function requestedLanguage(req) {
  const language = req.query.language || 'en';
  if (!languageNames[language]) throw fail(400, 'VALIDATION_ERROR', 'Select a supported language.');
  return language;
}
function sourceContent(doc) {
  return {
    title: doc.title,
    story: doc.story,
    suspects: doc.suspects.map(({ id, name, description, motive, alibi }) => ({ id, name, description, motive, alibi })),
    clues: doc.clues.map(({ id, label, description, relevance }) => ({ id, label, description, relevance })),
    hints: [...doc.hints],
    solution: { culpritSuspectId: doc.solution.culpritSuspectId, explanation: doc.solution.explanation, reasoning: doc.solution.reasoning },
  };
}
async function contentFor(doc, language) {
  if (language === doc.language) return sourceContent(doc);
  const translation = doc.translations?.get(language);
  if (translation) return { ...translation, language };
  const translated = await translateMystery(sourceContent(doc), doc.difficulty, language);
  doc.translations.set(language, translated);
  await doc.save();
  return { ...translated, language };
}
async function getActive(id) {
  if (!mongoose.isValidObjectId(id)) throw fail(400, 'VALIDATION_ERROR', 'Invalid case ID.');
  const doc = await Case.findById(id);
  if (!doc) throw fail(404, 'CASE_NOT_FOUND', 'Mystery not found.');
  if (doc.status !== 'ACTIVE') throw fail(409, 'CASE_ALREADY_COMPLETED', 'This mystery is already completed.');
  return doc;
}

router.post('/', rateLimit(8, 10 * 60 * 1000), async (req, res, next) => {
  try {
    const premise = typeof req.body?.premise === 'string' ? req.body.premise.trim() : '';
    const difficulty = req.body?.difficulty;
    const language = req.body?.language || 'en';
    if (premise.length < 20 || premise.length > 500 || !levels[difficulty] || !languageNames[language]) throw fail(400, 'VALIDATION_ERROR', 'Enter a premise of 20–500 characters, choose a difficulty, and select a supported language.');
    let generated;
    try { generated = await generateMystery(premise, difficulty, language); }
    catch (error) { console.error(JSON.stringify({ event: 'generation_failed', type: error.name })); throw fail(502, 'AI_PROVIDER_ERROR', 'Could not build a valid mystery. Please try again.'); }
    const doc = await Case.create({ premise, difficulty, language, ...generated });
    res.status(201).json({ data: { case: safeCase(doc) }, error: null });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => { try { const doc = await Case.findById(req.params.id); if (!doc) throw fail(404, 'CASE_NOT_FOUND', 'Mystery not found.'); res.json({ data: { case: safeCase(doc, await contentFor(doc, requestedLanguage(req))) }, error: null }); } catch (e) { next(e); } });

router.post('/:id/clues/:clueId/discover', async (req, res, next) => {
  try {
    const doc = await getActive(req.params.id); const clue = doc.clues.find(c => c.id === req.params.clueId);
    if (!clue) throw fail(404, 'CLUE_NOT_FOUND', 'Clue not found.');
    if (!doc.progress.discoveredClueIds.includes(clue.id)) { doc.progress.discoveredClueIds.push(clue.id); await doc.save(); }
    const content = await contentFor(doc, requestedLanguage(req)); const localizedClue = content.clues.find(item => item.id === clue.id);
    res.json({ data: { clue: { id: clue.id, label: localizedClue.label, description: localizedClue.description, discovered: true }, progress: { discoveredClueIds: doc.progress.discoveredClueIds, cluesDiscovered: new Set(doc.progress.discoveredClueIds).size, cluesTotal: doc.clues.length } }, error: null });
  } catch (e) { next(e); }
});

router.post('/:id/hints', rateLimit(12, 60 * 1000), async (req, res, next) => {
  try {
    const doc = await getActive(req.params.id);
    if (doc.progress.hintsUsed >= levels[doc.difficulty].hints) throw fail(409, 'HINT_LIMIT_REACHED', 'No hints remain for this mystery.');
    const index = doc.progress.hintsUsed; doc.progress.hintsUsed += 1; await doc.save();
    const content = await contentFor(doc, requestedLanguage(req));
    res.json({ data: { hint: { index: index + 1, text: content.hints[index] }, hintsUsed: doc.progress.hintsUsed, hintsRemaining: levels[doc.difficulty].hints - doc.progress.hintsUsed }, error: null });
  } catch (e) { next(e); }
});

router.post('/:id/accuse', async (req, res, next) => {
  try {
    const doc = await getActive(req.params.id); const suspectId = req.body?.suspectId;
    if (typeof suspectId !== 'string' || !doc.suspects.some(s => s.id === suspectId)) throw fail(404, 'SUSPECT_NOT_FOUND', 'Choose a suspect from this case.');
    const score = scoreCase(doc, suspectId); doc.status = 'COMPLETED'; doc.progress.accusationSuspectId = suspectId; doc.progress.completedAt = new Date(); doc.result = score; await doc.save();
    res.json({ data: { result: resultObject(doc, await contentFor(doc, requestedLanguage(req))) }, error: null });
  } catch (e) { next(e); }
});

router.get('/:id/result', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'VALIDATION_ERROR', 'Invalid case ID.');
    const doc = await Case.findById(req.params.id); if (!doc) throw fail(404, 'CASE_NOT_FOUND', 'Mystery not found.');
    if (doc.status !== 'COMPLETED') throw fail(409, 'CASE_NOT_COMPLETED', 'Submit an accusation before viewing results.');
    res.json({ data: { result: resultObject(doc, await contentFor(doc, requestedLanguage(req))) }, error: null });
  } catch (e) { next(e); }
});
module.exports = router;
