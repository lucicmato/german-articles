import { useEffect, useState } from 'react';

import { Alert, Button, CircularProgress } from '@mui/material';
import { STATUS } from '@/constants';
import { getLevels } from '@/services/noun.service';

import styles from './quiz.module.scss';

const HEADING_ID = 'level-picker-heading';

/**
 * Start screen. Loading `/levels` here doubles as a warm-up: the serverless function and the Atlas
 * connection come up while the user is still choosing, so the first question appears without a wait.
 */
export const LevelPicker = ({ onSelect }) => {
  const [levels, setLevels] = useState([]);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getLevels({ signal: controller.signal })
      .then((result) => {
        setLevels(result);
        setStatus(STATUS.READY);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason.message);
        setStatus(STATUS.ERROR);
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setStatus(STATUS.LOADING);
    setAttempt((current) => current + 1);
  };

  const total = levels.reduce((sum, { count }) => sum + count, 0);

  return (
    <section className={styles.card} aria-labelledby={HEADING_ID} aria-busy={status === STATUS.LOADING}>
      <h1 id={HEADING_ID} className={styles.title}>
        Der, die ili das?
      </h1>
      <p className={styles.subtitle}>Odaberi razinu riječi</p>

      {status === STATUS.LOADING && (
        <div className={styles.loading} role="status">
          <CircularProgress size={24} />
          <span>Budim server…</span>
        </div>
      )}

      {status === STATUS.ERROR && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Pokušaj ponovno
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {status === STATUS.READY && (
        <div className={styles.levelGrid}>
          {levels.map(({ level, count }) => (
            <Button
              key={level}
              variant="contained"
              className={styles.levelButton}
              disabled={count === 0}
              onClick={() => onSelect(level)}
            >
              {level}
            </Button>
          ))}
          <Button
            variant="outlined"
            className={styles.allLevelsButton}
            disabled={total === 0}
            onClick={() => onSelect(undefined)}
          >
            Sve razine
          </Button>
        </div>
      )}
    </section>
  );
};
