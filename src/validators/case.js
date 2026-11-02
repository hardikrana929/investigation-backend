const { z } = require('zod');
const config = require('../config/difficulty');

const nonempty = (max) => z.string().trim().min(1).max(max);
const aiCaseSchema = z.object({
  title: nonempty(120), story: nonempty(4000),
  suspects: z.array(z.object({ id: nonempty(40), name: nonempty(80), description: nonempty(500), motive: nonempty(500), alibi: nonempty(500) }).strict()),
  clues: z.array(z.object({ id: nonempty(40), label: nonempty(100), description: nonempty(800), relevance: nonempty(800) }).strict()),
  hints: z.array(nonempty(400)),
  solution: z.object({ culpritSuspectId: nonempty(40), explanation: nonempty(2000), reasoning: nonempty(2000) }).strict(),
}).strict().superRefine((data, ctx) => {
  const ids = [...data.suspects.map(x => x.id), ...data.clues.map(x => x.id)];
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'IDs must be unique' });
  if (new Set(data.suspects.map(x => x.name.toLowerCase())).size !== data.suspects.length) ctx.addIssue({ code: 'custom', message: 'Suspect names must be unique' });
  if (!data.suspects.some(x => x.id === data.solution.culpritSuspectId)) ctx.addIssue({ code: 'custom', message: 'Culprit must match a suspect' });
});

function validateGenerated(raw, difficulty) {
  const parsed = aiCaseSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`AI schema invalid: ${parsed.error.issues.map(x => x.message).join('; ')}`);
  const expected = config[difficulty];
  const result = parsed.data;
  if (result.suspects.length !== expected.suspects || result.clues.length !== expected.clues || result.hints.length !== expected.hints) throw new Error('AI output has incorrect difficulty counts');
  const answer = result.suspects.find(s => s.id === result.solution.culpritSuspectId);
  const answerName = answer.name.toLowerCase();
  const answerBearingText = [result.title, result.story, ...result.clues.flatMap(c => [c.label, c.description]), ...result.hints, ...result.suspects.flatMap(s => [s.description, s.motive, s.alibi])].join(' ').toLowerCase();
  if (answerBearingText.includes(answerName)) throw new Error('AI output leaks the solution');
  return result;
}

module.exports = { aiCaseSchema, validateGenerated };
