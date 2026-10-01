import { useState } from 'react';

import { LevelPicker } from '@/components/quiz/LevelPicker';
import { Quiz } from '@/components/quiz/Quiz';

import styles from './Home.module.scss';

/**
 * `selection` is wrapped in an object because `level: undefined` is a real choice ("all levels"),
 * so it cannot double as "nothing picked yet".
 */
export const Home = () => {
  const [selection, setSelection] = useState(null);

  return (
    <main className={styles.page}>
      {selection ? (
        <Quiz level={selection.level} onChangeLevel={() => setSelection(null)} />
      ) : (
        <LevelPicker onSelect={(level) => setSelection({ level })} />
      )}
    </main>
  );
};
