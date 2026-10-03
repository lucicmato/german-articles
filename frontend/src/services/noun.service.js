import axios from 'axios';

import { API_TIMEOUT_MS, API_URL } from '@/config';

const api = axios.create({ baseURL: API_URL, timeout: API_TIMEOUT_MS });

/**
 * Turns axios errors into a plain Error carrying the backend's message and HTTP status. Cancellations
 * are rethrown untouched so callers can tell "the user moved on" apart from a real failure.
 */
const get = async (path, config) => {
  try {
    const { data } = await api.get(path, config);
    return data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    const failure = new Error(error.response?.data?.message ?? 'Server nije dostupan.');
    failure.status = error.response?.status;
    throw failure;
  }
};

/**
 * Fire-and-forget warm-up for the cold start. `/levels` rather than `/health` because it goes through the
 * database middleware, so the Atlas connection opens too. Failures are ignored — the quiz reports its own.
 */
export const wakeServer = () => get('/api/noun/levels').catch(() => {});

// axios drops undefined params, so "all levels" and "nothing to exclude" need no special casing.
export const getRandomNoun = async ({ level, exclude, signal } = {}) =>
  (await get('/api/noun/random', { params: { level, exclude }, signal })).noun;
