// Order matters: GET /api/noun/levels returns levels in this order, which is the order the picker shows.
const LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2']);
const ARTICLES = Object.freeze(['der', 'die', 'das']);

module.exports = { ARTICLES, LEVELS };
