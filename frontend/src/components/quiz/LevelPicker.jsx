import { useEffect } from 'react';

import { Button } from '@mui/material';
import { LEVELS } from '@/constants';
import { wakeServer } from '@/services/noun.service';

import styles from './quiz.module.scss';

const HEADING_ID = 'level-picker-heading';

/**
 * Start screen. The levels are a fixed list, so the buttons render immediately while a warm-up request
 * wakes the serverless function and the Atlas connection in the background — by the time the user has
 * picked, the first question is usually one warm request away. An empty level is reported by the quiz.
 */
export const LevelPicker = ({ onSelect }) => {
  useEffect(() => {
    wakeServer();
  }, []);

  return (
    <section className={styles.card} aria-labelledby={HEADING_ID}>
      <h1 id={HEADING_ID} className={styles.title}>
        Der, die ili das?
      </h1>
      <p className={styles.subtitle}>Odaberi razinu riječi</p>

      <div className={styles.levelGrid}>
        {LEVELS.map((level) => (
          <Button key={level} variant="contained" className={styles.levelButton} onClick={() => onSelect(level)}>
            {level}
          </Button>
        ))}
        <Button variant="outlined" className={styles.allLevelsButton} onClick={() => onSelect(undefined)}>
          Sve razine
        </Button>
      </div>
    </section>
  );
};
