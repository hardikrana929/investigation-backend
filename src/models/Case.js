const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
  premise: { type: String, required: true, maxlength: 500 }, title: { type: String, required: true }, story: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  language: { type: String, enum: ['en', 'hi', 'gu'], default: 'en' },
  translations: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE', index: true },
  suspects: [{ id: String, name: String, description: String, motive: String, alibi: String }],
  clues: [{ id: String, label: String, description: String, relevance: String }], hints: [String],
  solution: { culpritSuspectId: String, explanation: String, reasoning: String },
  progress: { discoveredClueIds: { type: [String], default: [] }, hintsUsed: { type: Number, default: 0 }, accusationSuspectId: String, completedAt: Date },
  result: { correct: Boolean, basePoints: Number, cluePoints: Number, hintPenalty: Number, total: Number },
}, { timestamps: true });

module.exports = mongoose.model('Case', CaseSchema);
