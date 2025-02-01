import React from "react";
import NounService from "../../services/noun.service.js";

import {Alert, Box, Button, Stack} from "@mui/material";
import {generateId} from "../../utils/helper.js";
import {articles, colors} from "../../enums.js";

import styles from "./style.module.scss";

const Home = () =>{
    const [color, setColor] = React.useState(colors.INITIALCOLOR);
    const [question, setQuestion] = React.useState();
    const [generatedId, setGeneratedId] = React.useState(generateId);

    React.useEffect(()=>{
        generatedId && NounService.getQuestion(generatedId).then((data)=>{
                    setQuestion(data.noun);
                }).catch((e)=>{
                    console.log('error', e)
                });
    }, [generatedId]);

    const handleOnClick = (e) => {
          setColor(question.article===e?colors.TRUTHYANSWERCOLOR:colors.FAULTYANSWERCOLOR);
    }

    return (
        <div
            className={styles.mainQuestionBox}
            style={{
                '--quiz-background-color': color,
            }}
        >
            <Alert variant="filled" severity="info">
                {question?.translation ?? ''}
            </Alert>
            <Box component="section" className={styles.questionBox}>
                <h2>{question?.noun || 'Loading...'}</h2>
            </Box>
            <Stack spacing={2} direction="column" className={styles.buttonStack}>
                <Button
                    variant="contained"
                    color="primary"
                    className={styles.answerButton}
                    onClick={() => handleOnClick(articles.DER)}
                >
                    Der
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    className={styles.answerButton}
                    onClick={() => handleOnClick(articles.DIE)}
                >
                    Die
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    className={styles.answerButton}
                    onClick={() => handleOnClick(articles.DAS)}
                >
                    Das
                </Button>
            </Stack>
            <button
                className={styles.nextButton}
                onClick={() => {
                    setColor(colors.INITIALCOLOR);
                    setGeneratedId(generateId());
                }}
            >
                Idući / Next / Nächste
            </button>
        </div>
    );
}

export default Home;