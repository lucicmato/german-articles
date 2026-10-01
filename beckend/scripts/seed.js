require('dotenv').config();

const mongoose = require('mongoose');

const Noun = require('../models/Noun');
const words = require('../data/words.json');

/**
 * Upserts data/words.json by the numeric `id`, so re-running it after adding words updates instead
 * of duplicating. The exported `_id` is dropped on purpose — `id` is the key we own. Everything is
 * validated first, so one bad entry aborts the run instead of leaving the collection half-written.
 */
const seed = async () => {
  const docs = words.map(({ _id, ...word }) => word);

  const invalid = docs.map((doc) => ({ doc, error: new Noun(doc).validateSync() })).filter(({ error }) => error);

  if (invalid.length > 0) {
    invalid.forEach(({ doc, error }) => console.error(`id ${doc.id}: ${error.message}`));
    throw new Error(`${invalid.length} invalid entries, nothing written`);
  }

  // A repeated id would silently overwrite the earlier word, so it has to fail loudly.
  for (const field of ['id', 'noun']) {
    const seen = new Set();
    const duplicates = docs.map((doc) => doc[field]).filter((value) => seen.size === seen.add(value).size);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate ${field} in words.json: ${[...new Set(duplicates)].join(', ')}`);
    }
  }

  await mongoose.connect(process.env.MONGO_URL);
  await Noun.createIndexes();

  const result = await Noun.bulkWrite(
    docs.map((doc) => ({ updateOne: { filter: { id: doc.id }, update: { $set: doc }, upsert: true } })),
  );

  console.log(
    `Seeded ${docs.length}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ` +
      `${result.matchedCount - result.modifiedCount} unchanged`,
  );
};

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
