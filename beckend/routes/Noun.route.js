const express = require('express');

const Noun = require('../models/Noun');

const { LEVELS } = require('../constants/nouns');

const router = express.Router();

// `_id` is a storage detail; clients identify nouns by the numeric `id`.
const PUBLIC_FIELDS = { _id: 0, id: 1, article: 1, noun: 1, translation: 1, level: 1 };

const badRequest = (res, message) => res.status(400).json({ status: 'Error', message });

/** Returns a positive integer, or null for anything else — a bad id is a client error, not a failed DB cast. */
const parseId = (value) => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Lets the level picker show only levels that actually have nouns.
router.get('/levels', async (req, res, next) => {
  try {
    const counts = await Noun.aggregate([{ $group: { _id: '$level', count: { $sum: 1 } } }]);
    const countByLevel = Object.fromEntries(counts.map(({ _id, count }) => [_id, count]));
    const levels = LEVELS.map((level) => ({ level, count: countByLevel[level] ?? 0 }));

    res.status(200).json({ status: 'Success', levels });
  } catch (error) {
    next(error);
  }
});

/**
 * Random noun, optionally limited to one level. `exclude` is the id currently on screen, so the same
 * noun never comes twice in a row (unless it is the only one left in the level).
 */
router.get('/random', async (req, res, next) => {
  const { level, exclude } = req.query;

  if (level !== undefined && !LEVELS.includes(level)) {
    return badRequest(res, `level must be one of: ${LEVELS.join(', ')}`);
  }

  const excludeId = exclude === undefined ? null : parseId(exclude);
  if (exclude !== undefined && excludeId === null) {
    return badRequest(res, 'exclude must be a positive integer');
  }

  const levelMatch = level ? { level } : {};
  const sampleOne = (match) =>
    Noun.aggregate([{ $match: match }, { $sample: { size: 1 } }, { $project: PUBLIC_FIELDS }]);

  try {
    let [noun] = await sampleOne(excludeId ? { ...levelMatch, id: { $ne: excludeId } } : levelMatch);

    if (!noun && excludeId) {
      // The excluded noun was the only one in the level — repeating it beats a 404.
      [noun] = await sampleOne(levelMatch);
    }

    if (!noun) {
      return res.status(404).json({ status: 'Error', message: 'No nouns found' });
    }

    res.status(200).json({ status: 'Success', noun });
  } catch (error) {
    next(error);
  }
});

// Kept for the current frontend, which still picks ids itself; remove once it uses /random.
router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return badRequest(res, 'id must be a positive integer');
  }

  try {
    const noun = await Noun.findOne({ id }, PUBLIC_FIELDS).lean();

    if (!noun) {
      return res.status(404).json({ status: 'Error', message: 'No nouns found' });
    }

    res.status(200).json({ status: 'Success', noun });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
