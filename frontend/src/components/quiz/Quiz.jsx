import { useEffect, useRef, useState } from 'react';

import { Alert, Button, CircularProgress } from '@mui/material';
import { ARTICLES, STATUS } from '@/constants';
import { getRandomNoun } from '@/services/noun.service';

import styles from './quiz.module.scss';

const answerColor = (article, answer, correct) => {
  if (answer === null) return 'primary';
  if (article === correct) return 'success';
  return article === answer ? 'error' : 'primary';
};

/**
 * One question at a time. Each fetch is tied to an AbortController, so a slow response for an old
 * question can never overwrite a newer one. The previous id is sent as `exclude` so the same noun
 * never shows twice in a row; it lives in a ref because it must not re-trigger the fetch. A 404 means
 * the level has no nouns — that is not something a retry fixes, so it gets its own state.
 */
export const Quiz = ({ level, onChangeLevel }) => {
  const [noun, setNoun] = useState(null);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState(null);
  const [round, setRound] = useState(0);
  const previousIdRef = useRef();

  useEffect(() => {
    const controller = new AbortController();

    getRandomNoun({ level, exclude: previousIdRef.current, signal: controller.signal })
      .then((next) => {
        previousIdRef.current = next.id;
        setNoun(next);
        setStatus(STATUS.READY);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason.status === 404) {
          setStatus(STATUS.EMPTY);
          return;
        }
        setError(reason.message);
        setStatus(STATUS.ERROR);
      });

    return () => controller.abort();
  }, [level, round]);

  const nextQuestion = () => {
    setAnswer(null);
    setStatus(STATUS.LOADING);
    setRound((current) => current + 1);
  };

  const isReady = status === STATUS.READY;
  const answered = answer !== null;
  const isCorrect = answered && answer === noun.article;
  const result = answered ? (isCorrect ? 'correct' : 'wrong') : undefined;

  return (
    <section className={styles.card} data-result={result} aria-busy={status === STATUS.LOADING}>
      <header className={styles.quizHeader}>
        <span className={styles.levelBadge}>{level ?? 'Sve razine'}</span>
        <Button size="small" onClick={onChangeLevel}>
          Promijeni razinu
        </Button>
      </header>

      {status === STATUS.EMPTY && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={onChangeLevel}>
              Promijeni razinu
            </Button>
          }
        >
          {level ? `Razina ${level} još nema riječi.` : 'Još nema riječi.'} Odaberi neku drugu razinu.
        </Alert>
      )}

      {status === STATUS.ERROR && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={nextQuestion}>
              Pokušaj ponovno
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {(status === STATUS.LOADING || isReady) && (
        <>
          <Alert variant="filled" severity="info" icon={false} className={styles.translation}>
            {isReady ? noun.translation : ' '}
          </Alert>

          <div className={styles.questionBox}>
            {isReady ? <h2 lang="de">{noun.noun}</h2> : <CircularProgress size={28} aria-label="Učitavanje" />}
          </div>

          <div className={styles.answers} role="group" aria-label="Odaberi član">
            {ARTICLES.map((article) => (
              <Button
                key={article}
                lang="de"
                variant="contained"
                color={answerColor(article, answer, noun?.article)}
                className={styles.answerButton}
                disabled={!isReady}
                aria-disabled={answered}
                aria-pressed={answer === article}
                // Ignoring clicks instead of `disabled` keeps the green/red marking visible.
                onClick={() => !answered && setAnswer(article)}
              >
                {article}
              </Button>
            ))}
          </div>
        </>
      )}

      <p role="status" className={styles.result}>
        {answered && (
          <>
            {isCorrect ? 'Točno: ' : 'Netočno: '}
            <span lang="de">
              {noun.article} {noun.noun}
            </span>
          </>
        )}
      </p>

      <button type="button" className={styles.nextButton} disabled={!isReady} onClick={nextQuestion}>
        Idući / Next / Nächste
      </button>
    </section>
  );
};
