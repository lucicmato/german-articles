// Same order as the backend's ARTICLES; it is also the order of the answer buttons.
export const ARTICLES = Object.freeze(['der', 'die', 'das']);

// Mirrors the backend's LEVELS. Kept here so the picker renders instantly instead of waiting on a cold API.
export const LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2']);

export const STATUS = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
});
