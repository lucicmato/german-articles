const mongoose = require('mongoose');

const { ARTICLES, LEVELS } = require('../constants/nouns');

const nounSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    article: { type: String, required: true, enum: ARTICLES },
    noun: { type: String, required: true },
    translation: { type: String, required: true },
    level: { type: String, required: true, enum: LEVELS, index: true },
  },
  { collection: 'Noun', versionKey: false },
);

module.exports = mongoose.model('Noun', nounSchema);
